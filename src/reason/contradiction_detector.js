/**
 * ContradictionDetector - Detects logical contradictions in the knowledge base
 *
 * Supports:
 * - Disjointness violations (X IS_A A and X IS_A B where A DISJOINT_WITH B)
 * - Functional relation violations (X REL Y and X REL Z where REL is functional)
 * - Taxonomic inconsistencies (cycles, inherited disjointness)
 * - Cardinality violations
 */

class ContradictionDetector {
  constructor(deps = {}) {
    this.store = deps.store || null;
    this.reasoner = deps.reasoner || null;
    this.config = deps.config || null;

    // Constraints
    this.functionalRelations = new Set();
    this.cardinalityConstraints = new Map(); // "subject|relation" → { min, max }

    // Default functional relations
    this.functionalRelations.add('BORN_IN');
    this.functionalRelations.add('BIOLOGICAL_MOTHER');
    this.functionalRelations.add('BIOLOGICAL_FATHER');
  }

  /**
   * Main entry point: detect all contradictions in facts
   */
  detectAll(facts, options = {}) {
    const contradictions = [];

    if (options.checkDisjointness !== false) {
      contradictions.push(...this.checkDisjointness(facts));
    }

    if (options.checkFunctional !== false) {
      contradictions.push(...this.checkFunctional(facts));
    }

    if (options.checkTaxonomic !== false) {
      contradictions.push(...this.checkTaxonomic(facts));
    }

    if (options.checkCardinality !== false) {
      contradictions.push(...this.checkCardinality(facts));
    }

    return {
      consistent: contradictions.length === 0,
      contradictions,
      checkedFacts: facts.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if adding a new fact would cause contradiction
   */
  wouldContradict(newFact, existingFacts) {
    const allFacts = [...existingFacts, newFact];
    const report = this.detectAll(allFacts);

    if (!report.consistent) {
      // Find contradictions involving the new fact
      const involving = report.contradictions.filter((c) =>
        c.facts && c.facts.some((f) =>
          f.subject === newFact.subject
          && f.relation === newFact.relation
          && f.object === newFact.object
        )
      );

      return {
        wouldContradict: involving.length > 0,
        contradictions: involving,
        reason: involving.length > 0 ? involving[0].type : null
      };
    }

    return { wouldContradict: false };
  }

  /**
   * Check disjointness violations
   */
  checkDisjointness(facts) {
    const contradictions = [];
    const disjointPairs = this._getDisjointPairs(facts);

    if (disjointPairs.length === 0) {
      return contradictions;
    }

    // Build type assignments: entity → Set<types> (including inherited)
    const typeAssignments = this._buildTypeAssignments(facts);

    // Check each entity against disjoint pairs
    for (const [entity, types] of typeAssignments) {
      for (const [typeA, typeB] of disjointPairs) {
        const hasA = types.has(typeA) || this._hasAncestor(types, typeA, facts);
        const hasB = types.has(typeB) || this._hasAncestor(types, typeB, facts);

        if (hasA && hasB) {
          const causingFacts = this._findTypeFacts(entity, typeA, typeB, facts);
          contradictions.push({
            type: 'DISJOINT_VIOLATION',
            severity: 'ERROR',
            entity,
            types: [typeA, typeB],
            facts: causingFacts,
            explanation: `${entity} cannot be both ${typeA} and ${typeB} (they are disjoint)`,
            resolution: [
              `Retract a fact making ${entity} a ${typeA}`,
              `Retract a fact making ${entity} a ${typeB}`
            ]
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Check functional relation violations
   */
  checkFunctional(facts) {
    const contradictions = [];

    for (const relation of this.functionalRelations) {
      // Group facts by subject
      const bySubject = new Map();
      for (const fact of facts) {
        if (fact.relation === relation) {
          if (!bySubject.has(fact.subject)) {
            bySubject.set(fact.subject, []);
          }
          bySubject.get(fact.subject).push(fact);
        }
      }

      // Check for multiple values
      for (const [subject, relFacts] of bySubject) {
        if (relFacts.length > 1) {
          const objects = relFacts.map((f) => f.object);
          // Check if objects are equivalent
          if (!this._areEquivalent(objects, facts)) {
            contradictions.push({
              type: 'FUNCTIONAL_VIOLATION',
              severity: 'ERROR',
              subject,
              relation,
              values: objects,
              facts: relFacts,
              explanation: `${subject} has multiple ${relation} values: ${objects.join(', ')} (${relation} should be single-valued)`,
              resolution: objects.map((o) => `Retract "${subject} ${relation} ${o}"`)
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Check taxonomic consistency (cycles, inherited disjointness)
   */
  checkTaxonomic(facts) {
    const contradictions = [];

    // Check for cycles in IS_A hierarchy
    const cycles = this._findCycles(facts, 'IS_A');
    for (const cycle of cycles) {
      contradictions.push({
        type: 'TAXONOMIC_CYCLE',
        severity: 'ERROR',
        cycle,
        facts: this._cycleToFacts(cycle, facts),
        explanation: `Circular taxonomy detected: ${cycle.join(' → ')} → ${cycle[0]}`,
        resolution: ['Break the cycle by retracting one IS_A relation']
      });
    }

    // Check inherited disjointness
    const disjointPairs = this._getDisjointPairs(facts);
    for (const [typeA, typeB] of disjointPairs) {
      const descendantsA = this._getDescendants(typeA, facts);
      const descendantsB = this._getDescendants(typeB, facts);

      // Check for overlap in descendants
      for (const descA of descendantsA) {
        if (descendantsB.has(descA)) {
          contradictions.push({
            type: 'INHERITED_DISJOINT',
            severity: 'ERROR',
            concept: descA,
            disjointAncestors: [typeA, typeB],
            explanation: `${descA} inherits from both ${typeA} and ${typeB} which are disjoint`,
            resolution: [
              `Retract ${descA} IS_A ... path to ${typeA}`,
              `Retract ${descA} IS_A ... path to ${typeB}`
            ]
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Check cardinality constraints
   */
  checkCardinality(facts) {
    const contradictions = [];

    for (const [key, constraint] of this.cardinalityConstraints) {
      const [subjectPattern, relation] = key.split('|');

      // Find all subjects matching the pattern
      const subjects = this._findSubjectsOfType(subjectPattern, facts);

      for (const subject of subjects) {
        const relFacts = facts.filter(
          (f) => f.subject === subject && f.relation === relation
        );
        const count = relFacts.length;

        if (constraint.min !== undefined && count < constraint.min) {
          contradictions.push({
            type: 'CARDINALITY_MIN_VIOLATION',
            severity: 'WARNING',
            subject,
            relation,
            count,
            minimum: constraint.min,
            explanation: `${subject} has ${count} ${relation} relations, but minimum is ${constraint.min}`,
            resolution: [`Add more ${relation} relations for ${subject}`]
          });
        }

        if (constraint.max !== undefined && constraint.max !== '*' && count > constraint.max) {
          contradictions.push({
            type: 'CARDINALITY_MAX_VIOLATION',
            severity: 'ERROR',
            subject,
            relation,
            count,
            maximum: constraint.max,
            facts: relFacts,
            explanation: `${subject} has ${count} ${relation} relations, but maximum is ${constraint.max}`,
            resolution: relFacts.map((f) => `Retract "${f.subject} ${f.relation} ${f.object}"`)
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Register a functional (single-valued) relation
   */
  registerFunctionalRelation(relationName) {
    this.functionalRelations.add(relationName);
  }

  /**
   * Register a cardinality constraint
   */
  registerCardinalityConstraint(subjectType, relation, min, max) {
    const key = `${subjectType}|${relation}`;
    this.cardinalityConstraints.set(key, { min, max });
  }

  // ========================================================================
  // Private helpers
  // ========================================================================

  _getDisjointPairs(facts) {
    const pairs = [];
    for (const fact of facts) {
      if (fact.relation === 'DISJOINT_WITH') {
        pairs.push([fact.subject, fact.object]);
      }
    }
    return pairs;
  }

  _buildTypeAssignments(facts) {
    const assignments = new Map();
    const isAFacts = facts.filter((f) => f.relation === 'IS_A');

    for (const fact of isAFacts) {
      if (!assignments.has(fact.subject)) {
        assignments.set(fact.subject, new Set());
      }
      assignments.get(fact.subject).add(fact.object);
    }

    return assignments;
  }

  _hasAncestor(types, target, facts) {
    for (const type of types) {
      const ancestors = this._getAncestors(type, facts);
      if (ancestors.has(target)) {
        return true;
      }
    }
    return false;
  }

  _getAncestors(concept, facts, visited = new Set()) {
    const ancestors = new Set();
    if (visited.has(concept)) return ancestors;
    visited.add(concept);

    const directParents = facts
      .filter((f) => f.subject === concept && f.relation === 'IS_A')
      .map((f) => f.object);

    for (const parent of directParents) {
      ancestors.add(parent);
      const grandparents = this._getAncestors(parent, facts, visited);
      for (const gp of grandparents) {
        ancestors.add(gp);
      }
    }

    return ancestors;
  }

  _getDescendants(concept, facts, visited = new Set()) {
    const descendants = new Set();
    if (visited.has(concept)) return descendants;
    visited.add(concept);

    const directChildren = facts
      .filter((f) => f.object === concept && f.relation === 'IS_A')
      .map((f) => f.subject);

    for (const child of directChildren) {
      descendants.add(child);
      const grandchildren = this._getDescendants(child, facts, visited);
      for (const gc of grandchildren) {
        descendants.add(gc);
      }
    }

    return descendants;
  }

  _findTypeFacts(entity, typeA, typeB, facts) {
    const result = [];

    // Find direct IS_A facts
    for (const fact of facts) {
      if (fact.subject === entity && fact.relation === 'IS_A') {
        if (fact.object === typeA || fact.object === typeB) {
          result.push(fact);
        }
        // Check if this leads to typeA or typeB
        const ancestors = this._getAncestors(fact.object, facts);
        if (ancestors.has(typeA) || ancestors.has(typeB)) {
          result.push(fact);
        }
      }
    }

    // Add disjointness fact
    const disjFact = facts.find(
      (f) => f.relation === 'DISJOINT_WITH'
        && ((f.subject === typeA && f.object === typeB)
          || (f.subject === typeB && f.object === typeA))
    );
    if (disjFact) {
      result.push(disjFact);
    }

    return result;
  }

  _areEquivalent(objects, facts) {
    if (objects.length < 2) return true;

    const first = objects[0];
    for (let i = 1; i < objects.length; i++) {
      const other = objects[i];
      // Check if there's an EQUIVALENT_TO relation
      const equiv = facts.some(
        (f) => f.relation === 'EQUIVALENT_TO'
          && ((f.subject === first && f.object === other)
            || (f.subject === other && f.object === first))
      );
      if (!equiv && first !== other) {
        return false;
      }
    }
    return true;
  }

  _findCycles(facts, relation) {
    const cycles = [];
    const graph = new Map();

    // Build adjacency list
    for (const fact of facts) {
      if (fact.relation === relation) {
        if (!graph.has(fact.subject)) {
          graph.set(fact.subject, []);
        }
        graph.get(fact.subject).push(fact.object);
      }
    }

    // DFS for cycles
    const visited = new Set();
    const recStack = new Set();
    const path = [];

    const dfs = (node) => {
      if (recStack.has(node)) {
        // Found cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }

      path.pop();
      recStack.delete(node);
    };

    for (const node of graph.keys()) {
      dfs(node);
    }

    return cycles;
  }

  _cycleToFacts(cycle, facts) {
    const result = [];
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const fact = facts.find(
        (f) => f.subject === from && f.relation === 'IS_A' && f.object === to
      );
      if (fact) result.push(fact);
    }
    return result;
  }

  _findSubjectsOfType(typeName, facts) {
    const subjects = new Set();
    for (const fact of facts) {
      if (fact.relation === 'IS_A' && fact.object === typeName) {
        subjects.add(fact.subject);
      }
    }
    return subjects;
  }
}

module.exports = ContradictionDetector;
