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
import { searchKBDirect, isTypeClass, isFactNegated, sameBindings, filterTypeClasses, filterNegated } from './query-kb.mjs';
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

    // Filter out type classes for modal operators (can, must, cannot)
    let filteredResults = filterTypeClasses(allResults, this.session, operatorName);

    // Also filter negated facts for rule_derived and hdc
    filteredResults = filterNegated(filteredResults, this.session, operatorName, knowns);

    // Sort by: 1) method priority (direct > transitive > compound_csp > rule > hdc), 2) score
    const methodPriority = { direct: 5, transitive: 4, compound_csp: 3, rule_derived: 2, hdc: 1 };
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

  // Delegate methods for backwards compatibility
  isTypeClass(name) {
    return isTypeClass(this.session, name);
  }

  isFactNegated(operator, args) {
    return isFactNegated(this.session, operator, args);
  }
}

export default QueryEngine;
