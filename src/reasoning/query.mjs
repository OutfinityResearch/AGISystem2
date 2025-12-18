/**
 * AGISystem2 - Query Engine
 * @module reasoning/query
 *
 * TRUE HOLOGRAPHIC COMPUTING QUERY!
 * Uses Master Equation: Answer = KB ⊕ Query⁻¹
 * Plus transitive chains and rule derivations.
 *
 * This module coordinates:
 * - HDC Master Equation (query-hdc.mjs)
 * - Direct KB search (query-kb.mjs)
 * - Transitive reasoning (query-transitive.mjs)
 * - Rule derivations (query-rules.mjs)
 */

import { bind, similarity } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { MAX_HOLES, SIMILARITY_THRESHOLD } from '../core/constants.mjs';
import { TRANSITIVE_RELATIONS } from './transitive.mjs';

// Import sub-modules
import { searchHDC, isValidEntity, RESERVED } from './query-hdc.mjs';
import { searchKBDirect, isTypeClass, isFactNegated, sameBindings, filterTypeClasses, filterNegated, searchBundlePattern } from './query-kb.mjs';
import { searchTransitive, isTransitiveRelation } from './query-transitive.mjs';
import { searchViaRules } from './query-rules.mjs';
import { searchCompoundSolutions } from './query-compound.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Query:${category}]`, ...args);
}

// Re-export for backwards compatibility
export { RESERVED, isValidEntity };

export class QueryEngine {
  /**
   * Create query engine
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Execute query using HDC Master Equation + Symbolic Reasoning
   * @param {Statement} statement - Query statement with holes
   * @returns {QueryResult} - includes allResults from HDC and symbolic
   */
  execute(statement) {
    // Step 1: Identify holes and knowns
    const holes = [];
    const knowns = [];
    const operator = this.session.resolve(statement.operator);
    const operatorName = statement.operator?.name || statement.operator?.value;

    for (let i = 0; i < statement.args.length; i++) {
      const arg = statement.args[i];
      if (arg.type === 'Hole') {
        holes.push({ index: i + 1, name: arg.name });
      } else {
        knowns.push({
          index: i + 1,
          name: arg.name || arg.value,
          vector: this.session.resolve(arg)
        });
      }
    }

    if (holes.length === 0) {
      return this.directMatch(operator, knowns, statement);
    }

    if (holes.length > MAX_HOLES) {
      return {
        success: false,
        reason: `Too many holes (max ${MAX_HOLES})`,
        bindings: new Map(),
        allResults: []
      };
    }

    // Special case: 'similar' operator - find similar concepts via HDC
    if (operatorName === 'similar' && knowns.length === 1 && holes.length === 1) {
      return this.searchSimilar(knowns[0], holes[0]);
    }

    // Step 2: Collect results from multiple sources
    const allResults = [];

    // SOURCE 1: HDC Master Equation (true holographic computing)
    const hdcMatches = searchHDC(this.session, operatorName, knowns, holes, operator);
    allResults.push(...hdcMatches);
    dbg('HDC', `Found ${hdcMatches.length} HDC matches`);

    // Track HDC usage
    this.session.reasoningStats.hdcQueries++;
    if (hdcMatches.length > 0) {
      this.session.reasoningStats.hdcSuccesses++;
      this.session.reasoningStats.hdcBindings += hdcMatches.length;
    }

    // SOURCE 2: Direct KB matches (symbolic, exact) - HIGHEST PRIORITY
    const directMatches = searchKBDirect(this.session, operatorName, knowns, holes);
    // Replace HDC duplicates with direct (direct is more reliable)
    for (const dm of directMatches) {
      const existingIdx = allResults.findIndex(r =>
        sameBindings(r.bindings, dm.bindings, holes)
      );
      if (existingIdx >= 0) {
        // Replace HDC with direct if direct has higher priority
        if (allResults[existingIdx].method === 'hdc') {
          allResults[existingIdx] = dm;
        }
      } else {
        allResults.push(dm);
      }
    }
    dbg('DIRECT', `Found ${directMatches.length} direct matches`);

    // SOURCE 3: Transitive reasoning (for isA, locatedIn, partOf, etc.)
    // Now supports 1 or 2 holes
    if (isTransitiveRelation(operatorName) && holes.length <= 2) {
      const transitiveMatches = searchTransitive(this.session, operatorName, knowns, holes);
      // Replace HDC duplicates with transitive (transitive is more reliable)
      for (const tm of transitiveMatches) {
        const existingIdx = allResults.findIndex(r =>
          sameBindings(r.bindings, tm.bindings, holes)
        );
        if (existingIdx >= 0) {
          // Replace HDC with transitive
          if (allResults[existingIdx].method === 'hdc') {
            allResults[existingIdx] = tm;
          }
        } else {
          allResults.push(tm);
        }
      }
      dbg('TRANS', `Found ${transitiveMatches.length} transitive matches`);
    }

    // Source 4: Rule-derived results
    const ruleMatches = searchViaRules(this.session, operatorName, knowns, holes);
    for (const rm of ruleMatches) {
      const exists = allResults.some(r =>
        r.bindings.get(holes[0]?.name)?.answer === rm.bindings.get(holes[0]?.name)?.answer
      );
      if (!exists) {
        allResults.push(rm);
      }
    }
    dbg('RULES', `Found ${ruleMatches.length} rule-derived matches`);

    // SOURCE 4.5: Property Inheritance (can/has/likes etc. through isA chain)
    const inheritableOps = new Set(['can', 'has', 'likes', 'knows', 'owns', 'uses']);
    if (inheritableOps.has(operatorName) && knowns.length === 1 && holes.length === 1 && knowns[0].index === 1) {
      const entityName = knowns[0].name;
      const inheritMatches = this.searchPropertyInheritance(operatorName, entityName, holes[0].name);
      for (const im of inheritMatches) {
        const exists = allResults.some(r =>
          sameBindings(r.bindings, im.bindings, holes)
        );
        if (!exists) {
          allResults.push(im);
        }
      }
      dbg('INHERIT', `Found ${inheritMatches.length} property inheritance matches`);
    }

    // SOURCE 5: Compound CSP solutions (HDC-bundled multi-assignment solutions)
    const compoundMatches = searchCompoundSolutions(this.session, operatorName, knowns, holes);
    for (const cm of compoundMatches) {
      const exists = allResults.some(r =>
        sameBindings(r.bindings, cm.bindings, holes)
      );
      if (!exists) {
        allResults.push(cm);
      }
    }
    dbg('COMPOUND', `Found ${compoundMatches.length} compound solution matches`);

    // SOURCE 6: Bundle/Induce pattern queries (find common properties)
    const bundleMatches = searchBundlePattern(this.session, operatorName, knowns, holes);
    for (const bm of bundleMatches) {
      const exists = allResults.some(r =>
        sameBindings(r.bindings, bm.bindings, holes)
      );
      if (!exists) {
        allResults.push(bm);
      }
    }
    dbg('BUNDLE', `Found ${bundleMatches.length} bundle pattern matches`);

    // Filter out type classes for modal operators (can, must, cannot)
    let filteredResults = filterTypeClasses(allResults, this.session, operatorName);

    // Also filter negated facts for rule_derived and hdc
    filteredResults = filterNegated(filteredResults, this.session, operatorName, knowns);

    // Sort by: 1) method priority (direct > transitive > property_inheritance > bundle > compound_csp > rule > hdc), 2) score
    const methodPriority = { direct: 7, transitive: 6, property_inheritance: 5, bundle_common: 4, compound_csp: 3, rule_derived: 2, hdc: 1 };
    filteredResults.sort((a, b) => {
      const pa = methodPriority[a.method] || 0;
      const pb = methodPriority[b.method] || 0;
      if (pa !== pb) return pb - pa; // Higher priority first
      return b.score - a.score; // Then by score
    });

    // Build primary bindings from best result
    const bindings = new Map();

    if (filteredResults.length > 0) {
      const best = filteredResults[0];
      for (const [holeName, binding] of best.bindings) {
        const alternatives = filteredResults.slice(1)
          .map(r => r.bindings.get(holeName))
          .filter(b => b && b.answer !== binding.answer)
          .slice(0, 3)
          .map(b => ({ value: b.answer, similarity: b.similarity }));

        bindings.set(holeName, {
          answer: binding.answer,
          similarity: binding.similarity,
          alternatives,
          method: binding.method || 'direct'
        });
      }
    }

    const confidence = filteredResults.length > 0 ? filteredResults[0].score : 0;
    const ambiguous = filteredResults.length > 1 &&
                      (filteredResults[0].score - filteredResults[1].score) < 0.1;

    return {
      success: filteredResults.length > 0,
      bindings,
      confidence,
      ambiguous,
      allResults: filteredResults
    };
  }

  /**
   * Direct match query (no holes) - existence check
   */
  directMatch(operator, knowns, statement) {
    let queryVec = operator;
    for (const known of knowns) {
      queryVec = bind(queryVec, withPosition(known.index, known.vector));
    }

    const matches = [];
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(queryVec, fact.vector);
      if (sim > SIMILARITY_THRESHOLD) {
        matches.push({ similarity: sim, name: fact.name });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      success: matches.length > 0,
      matches,
      confidence: matches.length > 0 ? matches[0].similarity : 0,
      bindings: new Map()
    };
  }

  /**
   * Search for concepts similar to a given concept using property-based similarity
   * Computes similarity based on shared properties (has, can, isA parent, etc.)
   * @param {Object} known - The known concept {name, vector}
   * @param {Object} hole - The hole to fill {name}
   * @returns {QueryResult} Similar concepts ranked by property overlap
   */
  searchSimilar(known, hole) {
    const knownName = known.name;
    const componentKB = this.session?.componentKB;

    // Collect properties of the known concept
    const knownProps = new Set();
    if (componentKB) {
      // Get all facts about knownName
      const facts = componentKB.findByArg0(knownName);
      for (const f of facts) {
        this.session.reasoningStats.kbScans++;
        // Add "operator:arg1" as a property key
        if (f.args?.[1]) {
          knownProps.add(`${f.operator}:${f.args[1]}`);
        }
      }
    } else {
      // Fallback: scan KB directly
      for (const fact of this.session.kbFacts) {
        this.session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (meta?.args?.[0] === knownName && meta?.args?.[1]) {
          knownProps.add(`${meta.operator}:${meta.args[1]}`);
        }
      }
    }

    if (knownProps.size === 0) {
      return { success: false, bindings: new Map(), allResults: [] };
    }

    // Find other concepts and count shared properties
    const candidates = new Map(); // name -> {shared, total}
    const processed = new Set([knownName]);

    if (componentKB) {
      for (const fact of componentKB.facts) {
        this.session.reasoningStats.kbScans++;
        const candidate = fact.args?.[0];
        if (!candidate || processed.has(candidate)) continue;
        if (['isA', 'has', 'can', 'likes', 'knows', 'owns', 'uses'].includes(candidate)) continue;

        // Get this candidate's properties
        if (!candidates.has(candidate)) {
          const candFacts = componentKB.findByArg0(candidate);
          const candProps = new Set();
          for (const cf of candFacts) {
            if (cf.args?.[1]) {
              candProps.add(`${cf.operator}:${cf.args[1]}`);
            }
          }
          // Count shared properties
          let shared = 0;
          for (const prop of candProps) {
            if (knownProps.has(prop)) shared++;
          }
          if (candProps.size > 0) {
            candidates.set(candidate, {
              shared,
              total: candProps.size,
              similarity: shared / Math.max(knownProps.size, candProps.size)
            });
          }
        }
        processed.add(candidate);
      }
    }

    // Sort by similarity (shared property ratio)
    const results = [...candidates.entries()]
      .filter(([_, data]) => data.shared > 0)
      .sort((a, b) => b[1].similarity - a[1].similarity)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        similarity: data.similarity,
        shared: data.shared,
        method: 'property_similarity'
      }));

    const allResults = results.map(r => ({
      bindings: new Map([[hole.name, { answer: r.name, similarity: r.similarity, method: 'similar' }]]),
      score: r.similarity,
      method: 'similar'
    }));

    const bindings = new Map();
    if (results.length > 0) {
      bindings.set(hole.name, {
        answer: results[0].name,
        similarity: results[0].similarity,
        alternatives: results.slice(1, 4).map(r => ({ value: r.name, similarity: r.similarity })),
        method: 'similar'
      });
    }

    return {
      success: results.length > 0,
      bindings,
      confidence: results.length > 0 ? results[0].similarity : 0,
      ambiguous: results.length > 1,
      allResults
    };
  }

  /**
   * Search for properties via isA inheritance chain
   * e.g., can Rex Bark because Rex isA GermanShepherd isA Shepherd isA WorkingDog isA Dog, and Dog can Bark
   * @param {string} operator - Property operator (can, has, etc.)
   * @param {string} entityName - Entity to search properties for
   * @param {string} holeName - Name of the hole variable
   * @returns {Array} Query results with bindings and proof steps
   */
  searchPropertyInheritance(operator, entityName, holeName) {
    const results = [];
    const visited = new Set();
    const componentKB = this.session?.componentKB;

    // Build isA chain for entity
    const isAChain = [];
    const queue = [{ entity: entityName, depth: 0, steps: [] }];

    while (queue.length > 0) {
      const { entity: current, depth, steps } = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      // Find all properties at this level
      const propsAtLevel = [];
      if (componentKB) {
        const facts = componentKB.findByOperatorAndArg0(operator, current);
        for (const fact of facts) {
          if (fact.args?.[1]) {
            propsAtLevel.push({ value: fact.args[1], holder: current });
          }
        }
      } else {
        for (const fact of this.session.kbFacts) {
          this.session.reasoningStats.kbScans++;
          const meta = fact.metadata;
          if (meta?.operator === operator && meta.args?.[0] === current && meta.args?.[1]) {
            propsAtLevel.push({ value: meta.args[1], holder: current });
          }
        }
      }

      // Add results for this level
      for (const prop of propsAtLevel) {
        // Check if this property is negated for the original entity
        if (this.isPropertyNegated(operator, entityName, prop.value)) {
          continue;
        }

        // Build proof steps for inheritance
        const fullSteps = [...steps, `${operator} ${prop.holder} ${prop.value}`];

        const factBindings = new Map();
        factBindings.set(holeName, {
          answer: prop.value,
          similarity: 0.9 - (depth * 0.05),
          method: 'property_inheritance',
          steps: fullSteps
        });

        results.push({
          bindings: factBindings,
          score: 0.9 - (depth * 0.05),
          method: 'property_inheritance',
          depth,
          inheritedFrom: prop.holder
        });
      }

      // Find parents via isA
      if (componentKB) {
        const isAFacts = componentKB.findByOperatorAndArg0('isA', current);
        for (const fact of isAFacts) {
          const parent = fact.args?.[1];
          if (parent && !visited.has(parent)) {
            const newSteps = [...steps, `isA ${current} ${parent}`];
            queue.push({ entity: parent, depth: depth + 1, steps: newSteps });
          }
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'isA' && meta.args?.[0] === current) {
            const parent = meta.args[1];
            if (parent && !visited.has(parent)) {
              const newSteps = [...steps, `isA ${current} ${parent}`];
              queue.push({ entity: parent, depth: depth + 1, steps: newSteps });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if a property is negated for an entity (directly or via type)
   * Uses HDC similarity matching to compare against Not references
   * @param {string} operator - Property operator
   * @param {string} entity - Entity name
   * @param {string} value - Property value
   * @returns {boolean} True if negated
   */
  isPropertyNegated(operator, entity, value) {
    // Check if there's a negation that applies to this entity or any parent type
    const entitiesToCheck = [entity, ...this.getAllParentTypes(entity)];

    for (const ent of entitiesToCheck) {
      // Check direct negation via Not $ref pattern using HDC similarity
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'Not') {
          const negatedRef = meta.args?.[0];
          if (negatedRef) {
            const refName = negatedRef.replace(/^\$/, '');
            const negatedVec = this.session.scope.get(refName);
            if (!negatedVec) continue;

            // Build a vector for the property we're checking
            const checkFact = {
              operator: { type: 'Identifier', name: operator },
              args: [
                { type: 'Identifier', name: ent },
                { type: 'Identifier', name: value }
              ]
            };

            const checkVec = this.session.executor.buildStatementVector(checkFact);
            if (!checkVec) continue;

            // Compare using HDC similarity
            this.session.reasoningStats.similarityChecks++;
            const sim = this.session.similarity(checkVec, negatedVec);

            // Use threshold for match (0.85 is typical for rule matching)
            if (sim > 0.85) {
              return true;
            }
          }
        }
      }

      // Also check for explicit "Not operator entity value" facts
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (!meta) continue;

        if (meta.operator === 'Not' && meta.args?.length >= 3) {
          const negOp = meta.args[0];
          const negEntity = meta.args[1];
          const negValue = meta.args[2];

          if (negOp === operator && negEntity === ent && negValue === value) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all parent types for an entity via isA chain
   * @param {string} entity - Entity name
   * @returns {Array<string>} Array of parent type names
   */
  getAllParentTypes(entity) {
    const parents = [];
    const visited = new Set();
    const queue = [entity];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          const parent = meta.args[1];
          if (parent && !visited.has(parent)) {
            parents.push(parent);
            queue.push(parent);
          }
        }
      }
    }
    return parents;
  }

  /**
   * Check if entity is a type via isA chain
   * @param {string} entity - Entity name
   * @param {string} type - Type to check
   * @returns {boolean} True if entity isA type
   */
  entityIsA(entity, type) {
    const visited = new Set();
    const queue = [entity];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === type) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          const parent = meta.args[1];
          if (parent && !visited.has(parent)) {
            queue.push(parent);
          }
        }
      }
    }
    return false;
  }

  // Delegate methods for backwards compatibility
  isTypeClass(name) {
    return isTypeClass(this.session, name);
  }

  isFactNegated(operator, args) {
    return isFactNegated(this.session, operator, args);
  }
}

export default QueryEngine;
