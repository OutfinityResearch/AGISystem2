/**
 * DS(/theory/dsl_commands_reasoning.js) - Reasoning DSL Commands
 *
 * Implements Sys2DSL commands for logical reasoning and validation:
 * - VALIDATE: Check theory consistency
 * - PROVE: Attempt to prove statements
 * - HYPOTHESIZE: Generate hypotheses based on patterns
 * - ANALOGICAL: Perform analogical reasoning
 * - CHECK_CONTRADICTION: Detect contradictions in knowledge base
 * - CHECK_WOULD_CONTRADICT: Check if new fact would cause contradiction
 * - REGISTER_FUNCTIONAL: Mark relation as functional (single-valued)
 * - REGISTER_CARDINALITY: Set cardinality constraints
 *
 * See also: DS(/reason/contradiction_detector), DS(/theory/dsl_commands_inference)
 *
 * @module theory/dsl_commands_reasoning
 */

class DSLCommandsReasoning {
  constructor({ conceptStore, contradictionDetector, parser, coreCommands }) {
    this.conceptStore = conceptStore;
    this.contradictionDetector = contradictionDetector;
    this.parser = parser;
    this.coreCommands = coreCommands;
  }

  // =========================================================================
  // Validation Commands
  // =========================================================================

  /**
   * VALIDATE: Check consistency of current theory
   * Syntax: @var VALIDATE [scope]
   */
  cmdValidate(argTokens, env, facts) {
    const scope = argTokens.length > 0 ? this.parser.expandString(argTokens[0], env) : 'all';
    const issues = [];

    for (const fact of facts) {
      if (fact.relation === 'LOCATED_IN') {
        const disjointFacts = facts.filter(
          (f) => f.relation === 'DISJOINT_WITH'
            && (f.subject === fact.object || f.object === fact.object)
        );
        for (const df of disjointFacts) {
          const otherZone = df.subject === fact.object ? df.object : df.subject;
          const conflicting = facts.filter(
            (f) => f.subject === fact.subject
              && f.relation === 'CASTS'
              && this._requiresZone(f.object, otherZone, facts)
          );
          if (conflicting.length > 0) {
            issues.push({
              type: 'DISJOINT_VIOLATION',
              subject: fact.subject,
              location: fact.object,
              conflictZone: otherZone,
              ability: conflicting[0].object
            });
          }
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
      scope,
      factCount: facts.length
    };
  }

  _requiresZone(ability, zone, facts) {
    if (ability === 'Magic' && zone === 'MagicZone') return true;
    return false;
  }

  /**
   * PROVE: Attempt to prove a statement
   * Syntax: @var PROVE Subject Relation Object
   */
  cmdProve(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('PROVE expects Subject Relation Object');
    }
    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    const direct = facts.find(
      (f) => f.subject === subject && f.relation === relation && f.object === object
    );
    if (direct) {
      return { proven: true, method: 'direct', confidence: 1.0 };
    }

    const props = this.coreCommands.getRelationProperties(relation);
    if (props.transitive) {
      const chain = this._findTransitiveChain(subject, relation, object, facts);
      if (chain) {
        return { proven: true, method: 'transitive', chain, confidence: 0.9 };
      }
    }

    if (props.symmetric) {
      const reverse = facts.find(
        (f) => f.subject === object && f.relation === relation && f.object === subject
      );
      if (reverse) {
        return { proven: true, method: 'symmetric', confidence: 1.0 };
      }
    }

    return { proven: false, method: 'exhausted', confidence: 0 };
  }

  _findTransitiveChain(start, relation, end, facts, visited = new Set()) {
    if (visited.has(start)) return null;
    visited.add(start);

    const directLinks = facts.filter((f) => f.subject === start && f.relation === relation);
    for (const link of directLinks) {
      if (link.object === end) {
        return [start, end];
      }
      const subChain = this._findTransitiveChain(link.object, relation, end, facts, visited);
      if (subChain) {
        return [start, ...subChain];
      }
    }
    return null;
  }

  /**
   * HYPOTHESIZE: Generate hypotheses based on patterns
   * Syntax: @var HYPOTHESIZE Subject [Relation] [limit=N]
   */
  cmdHypothesize(argTokens, env, facts) {
    if (argTokens.length < 1) {
      throw new Error('HYPOTHESIZE expects at least a subject');
    }
    const subject = this.parser.expandString(argTokens[0], env);
    const relation = argTokens.length > 1 && !argTokens[1].startsWith('limit=')
      ? this.parser.expandString(argTokens[1], env)
      : null;
    let limit = 5;
    for (const arg of argTokens) {
      if (arg.startsWith('limit=')) {
        limit = parseInt(arg.split('=')[1], 10);
      }
    }

    const hypotheses = [];
    const types = facts.filter((f) => f.subject === subject && f.relation === 'IS_A');

    for (const typeFact of types) {
      const sameType = facts.filter(
        (f) => f.relation === 'IS_A' && f.object === typeFact.object && f.subject !== subject
      );
      for (const peer of sameType) {
        const peerFacts = facts.filter(
          (f) => f.subject === peer.subject && (!relation || f.relation === relation)
        );
        for (const pf of peerFacts) {
          const existing = facts.find(
            (f) => f.subject === subject && f.relation === pf.relation && f.object === pf.object
          );
          if (!existing) {
            hypotheses.push({
              subject,
              relation: pf.relation,
              object: pf.object,
              basis: `${peer.subject} (same ${typeFact.object})`,
              confidence: 0.6
            });
          }
        }
      }
    }

    const unique = [];
    const seen = new Set();
    for (const h of hypotheses) {
      const key = `${h.subject}:${h.relation}:${h.object}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(h);
      }
    }

    return {
      subject,
      hypotheses: unique.slice(0, limit),
      count: unique.length
    };
  }

  /**
   * ANALOGICAL: Perform analogical reasoning
   * Syntax: @var ANALOGICAL source_a=A source_b=B target_c=C
   */
  cmdAnalogical(argTokens, env) {
    const params = {};
    for (const token of argTokens) {
      const expanded = this.parser.expandString(token, env);
      if (expanded.includes('=')) {
        const [key, value] = expanded.split('=');
        params[key] = value;
      }
    }

    const { source_a, source_b, target_c } = params;
    if (!source_a || !source_b || !target_c) {
      throw new Error('ANALOGICAL requires source_a, source_b, and target_c parameters');
    }

    const conceptA = this.conceptStore.getConcept(source_a);
    const conceptB = this.conceptStore.getConcept(source_b);
    const conceptC = this.conceptStore.getConcept(target_c);

    if (!conceptA || !conceptB || !conceptC) {
      return { error: 'One or more concepts not found', params };
    }

    const centerA = conceptA.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerB = conceptB.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerC = conceptC.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);

    const delta = new Int8Array(centerA.length);
    const targetD = new Int8Array(centerC.length);

    for (let i = 0; i < centerA.length; i++) {
      delta[i] = centerB[i] - centerA[i];
      targetD[i] = Math.max(-127, Math.min(127, centerC[i] + delta[i]));
    }

    let nearest = null;
    let nearestDist = Infinity;
    for (const label of this.conceptStore.listConcepts()) {
      if (label === source_a || label === source_b || label === target_c) continue;
      const concept = this.conceptStore.getConcept(label);
      if (!concept || !concept.diamonds[0]) continue;

      const center = concept.diamonds[0].center;
      let dist = 0;
      for (let i = 0; i < center.length; i++) {
        dist += Math.abs(center[i] - targetD[i]);
      }
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = label;
      }
    }

    return {
      analogy: `${source_a} : ${source_b} :: ${target_c} : ${nearest || '?'}`,
      result: nearest,
      delta: Array.from(delta),
      confidence: nearest ? Math.max(0, 1 - nearestDist / (centerA.length * 128)) : 0
    };
  }

  // =========================================================================
  // Contradiction Detection Commands
  // =========================================================================

  /**
   * CHECK_CONTRADICTION: Check knowledge base for contradictions
   * Syntax: @var CHECK_CONTRADICTION [scope]
   */
  cmdCheckContradiction(argTokens, env, facts) {
    const options = {};

    for (const arg of argTokens) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded === 'disjointness') options.checkDisjointness = true;
      if (expanded === 'functional') options.checkFunctional = true;
      if (expanded === 'taxonomic') options.checkTaxonomic = true;
      if (expanded === 'cardinality') options.checkCardinality = true;
    }

    const report = this.contradictionDetector.detectAll(facts, options);

    return {
      consistent: report.consistent,
      contradictions: report.contradictions,
      summary: report.consistent
        ? 'No contradictions found.'
        : `Found ${report.contradictions.length} contradiction(s).`,
      factCount: report.checkedFacts
    };
  }

  /**
   * CHECK_WOULD_CONTRADICT: Check if a new fact would cause contradiction
   * Syntax: @var CHECK_WOULD_CONTRADICT Subject Relation Object
   */
  cmdCheckWouldContradict(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('CHECK_WOULD_CONTRADICT expects Subject Relation Object');
    }

    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    const newFact = { subject, relation, object };
    const result = this.contradictionDetector.wouldContradict(newFact, facts);

    return {
      wouldContradict: result.wouldContradict,
      reason: result.reason,
      contradictions: result.contradictions || [],
      proposedFact: newFact
    };
  }

  /**
   * REGISTER_FUNCTIONAL: Mark a relation as functional (single-valued)
   * Syntax: @var REGISTER_FUNCTIONAL RelationName
   */
  cmdRegisterFunctional(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('REGISTER_FUNCTIONAL expects a relation name');
    }

    const relation = this.parser.expandString(argTokens[0], env);
    this.contradictionDetector.registerFunctionalRelation(relation);

    return { ok: true, relation, type: 'functional' };
  }

  /**
   * REGISTER_CARDINALITY: Set cardinality constraints
   * Syntax: @var REGISTER_CARDINALITY SubjectType Relation min=N max=M
   */
  cmdRegisterCardinality(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('REGISTER_CARDINALITY expects SubjectType Relation [min=N] [max=M]');
    }

    const subjectType = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    let min;
    let max;

    for (let i = 2; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);
      if (arg.startsWith('min=')) {
        min = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('max=')) {
        const val = arg.split('=')[1];
        max = val === '*' ? '*' : parseInt(val, 10);
      }
    }

    this.contradictionDetector.registerCardinalityConstraint(subjectType, relation, min, max);

    return { ok: true, subjectType, relation, min, max };
  }
}

module.exports = DSLCommandsReasoning;
