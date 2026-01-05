/**
 * AGISystem2 - Query Engine
 * @module reasoning/query/engine
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
 * - Meta-operators (query-meta-ops.mjs)
 */

import { bind, similarity } from '../../core/operations.mjs';
import { withPosition } from '../../core/position.mjs';
import { MAX_HOLES, SIMILARITY_THRESHOLD } from '../../core/constants.mjs';

// Import sub-modules
import { searchHDC, isValidEntity, RESERVED } from '../query-hdc.mjs';
import { searchKBDirect, isTypeClass, isFactNegated, sameBindings, filterTypeClasses, filterNegated, searchBundlePattern } from '../query-kb.mjs';
import { searchTransitive, isTransitiveRelation, findAllTransitiveTargets } from '../query-transitive.mjs';
import { searchViaRules } from '../query-rules.mjs';
import { searchCompoundSolutions } from '../query-compound.mjs';
import { debug_trace } from '../../utils/debug.js';
import { searchTypeInductionHasProperty } from '../query-induction.mjs';
import { verifyPlan as verifyStoredPlan } from '../planning/solver.mjs';
import { extractNumericArg, searchAbduce, searchExplain, searchWhatif } from './advanced-ops.mjs';
import { timeBlock } from '../perf.mjs';

// Import meta-operators (DS17)
import {
  searchSimilar as searchSimilarOp,
  searchPropertyInheritance as searchPropertyInheritanceOp,
  searchPropertyInheritanceByValue as searchPropertyInheritanceByValueOp,
  isPropertyNegated,
  getAllParentTypes,
  entityIsA as entityIsAOp,
  searchInduce,
  searchBundle,
  searchDifference,
  searchAnalogy,
  searchDeduce
} from '../query-meta-ops.mjs';

// Import abduction engine

function dbg(category, ...args) {
  debug_trace(`[Query:${category}]`, ...args);
}

export const METHOD_PRIORITY = {
  direct: 7,
  transitive: 6,
  property_inheritance: 5,
  type_induction: 4.5,
  bundle_common: 4,
  compound_csp: 3,
  rule_derived: 2,
  hdc: 1,
  hdc_level: 1,
  // Holographic engine output
  hdc_validated: 1
};

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
  execute(statement, options = {}) {
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
        const name =
          typeof arg.name === 'string'
            ? arg.name
            : (arg.value !== undefined && arg.value !== null)
              ? String(arg.value)
              : typeof arg.toString === 'function'
                ? arg.toString()
                : null;
        knowns.push({
          index: i + 1,
          name,
          node: arg,
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

    // Special case: 'similar' operator - find similar concepts via property matching
    if (operatorName === 'similar' && knowns.length === 1 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.similar', () =>
        searchSimilarOp(this.session, knowns[0], holes[0])
      );
    }

    // Meta-operator: 'verifyPlan' - validate a stored plan by simulating it over the action model.
    // Signature: verifyPlan <planName> ?ok
    if (operatorName === 'verifyPlan' && knowns.length === 1 && holes.length === 1) {
      const planName = knowns[0]?.name;
      const res = timeBlock(this.session, 'query.meta.verify_plan', () =>
        verifyStoredPlan(this.session, planName)
      );
      // Avoid reserved boolean literals in NL output filtering; use semantic labels.
      const ok = res?.success && res?.valid ? 'valid' : 'invalid';
      const steps = Array.isArray(res?.steps) ? res.steps : [];
      const bindings = new Map();
      bindings.set(holes[0].name, {
        answer: ok,
        similarity: 1.0,
        method: 'plan_verify',
        steps
      });
      return {
        success: true,
        bindings,
        allResults: [{ bindings, score: 1.0, method: 'plan_verify', steps }]
      };
    }

    // Meta-operator: 'induce' - find common properties (intersection)
    if (operatorName === 'induce' && knowns.length >= 2 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.induce', () =>
        searchInduce(this.session, knowns, holes[0])
      );
    }

    // Meta-operator: 'bundle' - combine all properties (union)
    if (operatorName === 'bundle' && knowns.length >= 2 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.bundle', () =>
        searchBundle(this.session, knowns, holes[0])
      );
    }

    // Meta-operator: 'difference' - find unique properties
    if (operatorName === 'difference' && knowns.length === 2 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.difference', () =>
        searchDifference(this.session, knowns[0], knowns[1], holes[0])
      );
    }

    // Meta-operator: 'analogy' - A:B :: C:?
    if (operatorName === 'analogy' && knowns.length === 3 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.analogy', () =>
        searchAnalogy(this.session, knowns[0], knowns[1], knowns[2], holes[0])
      );
    }

    // Meta-operator: 'abduce' - find best explanation for an observation
    if (operatorName === 'abduce' && knowns.length >= 1 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.abduce', () =>
        searchAbduce(this.session, knowns, holes[0])
      );
    }

    // Meta-operator: 'explain' - produce a human-readable explanation for a goal
    // Signature: explain <goal> ?explanation
    // Goal may be provided as a Compound `(op ...)` or as a Reference to a proposition.
    if (operatorName === 'explain' && knowns.length >= 1 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.explain', () =>
        searchExplain(this.session, knowns, holes[0])
      );
    }

    // Meta-operator: 'whatif' - counterfactual reasoning
    if (operatorName === 'whatif' && knowns.length >= 2 && holes.length === 1) {
      return timeBlock(this.session, 'query.meta.whatif', () =>
        searchWhatif(this.session, knowns, holes[0])
      );
    }

    // Meta-operator: 'deduce' - forward-chaining deduction with filter
    // Signature: deduce $source $filter ?result [depth] [limit]
    if (operatorName === 'deduce' && knowns.length >= 2 && holes.length === 1) {
      // Extract depth and limit from additional args (if present as numeric values)
      const depth = extractNumericArg(statement.args, 3) || 1;
      const limit = extractNumericArg(statement.args, 4) || 10;
      return timeBlock(this.session, 'query.meta.deduce', () =>
        searchDeduce(this.session, knowns[0], knowns[1], holes[0], depth, limit)
      );
    }

    const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;
    const isExactStrategy = (this.session?.hdcStrategy || 'exact') === 'exact';

    // Step 2: Collect results from multiple sources
    const allResults = [];

    // SOURCE 1: HDC Master Equation (true holographic computing)
    // For capped queries, defer HDC until needed (it's lowest priority).
    let ranHdc = false;
    const runHdc = () => {
      const hdcMatches = timeBlock(this.session, 'query.hdc', () =>
        searchHDC(this.session, operatorName, knowns, holes, operator, {
          useLevelOptimization: options.useLevelOptimization ?? true
        })
      );
      allResults.push(...hdcMatches);
      dbg('HDC', `Found ${hdcMatches.length} HDC matches`);

      // Track HDC usage
      this.session.reasoningStats.hdcQueries++;
      if (hdcMatches.length > 0) {
        this.session.reasoningStats.hdcSuccesses++;
        this.session.reasoningStats.hdcBindings += hdcMatches.length;
      }
      return hdcMatches;
    };

    // In EXACT strategy, symbolic/operator-indexed methods are strictly cheaper and more precise.
    // Only fall back to HDC when the symbolic pipeline cannot find any usable answer.
    if (maxResults === null && !isExactStrategy) {
      runHdc();
      ranHdc = true;
    }

    // SOURCE 2: Direct KB matches (symbolic, exact) - HIGHEST PRIORITY
    const directMatches = timeBlock(this.session, 'query.direct', () =>
      searchKBDirect(this.session, operatorName, knowns, holes, { maxResults })
    );
    // Replace HDC duplicates with direct (direct is more reliable)
    for (const dm of directMatches) {
      const existingIdx = allResults.findIndex(r =>
        sameBindings(r.bindings, dm.bindings, holes)
      );
      if (existingIdx >= 0) {
        const existing = allResults[existingIdx];
        const existingPriority = METHOD_PRIORITY[existing.method] || 0;
        const replacementPriority = METHOD_PRIORITY[dm.method] || 0;
        if (replacementPriority > existingPriority) {
          allResults[existingIdx] = dm;
        }
      } else {
        allResults.push(dm);
      }
    }
    dbg('DIRECT', `Found ${directMatches.length} direct matches`);

    // SOURCE 3: Transitive reasoning (for isA, locatedIn, partOf, etc.)
    // Now supports 1 or 2 holes
    if (isTransitiveRelation(operatorName, this.session) && holes.length <= 2) {
      const transitiveMatches = timeBlock(this.session, 'query.transitive', () =>
        searchTransitive(this.session, operatorName, knowns, holes)
      );
      // Replace HDC duplicates with transitive (transitive is more reliable)
      for (const tm of transitiveMatches) {
        const existingIdx = allResults.findIndex(r =>
          sameBindings(r.bindings, tm.bindings, holes)
        );
        if (existingIdx >= 0) {
          const existing = allResults[existingIdx];
          const existingPriority = METHOD_PRIORITY[existing.method] || 0;
          const replacementPriority = METHOD_PRIORITY[tm.method] || 0;
          if (replacementPriority > existingPriority) {
            allResults[existingIdx] = tm;
          }
        } else {
          allResults.push(tm);
        }
      }
      dbg('TRANS', `Found ${transitiveMatches.length} transitive matches`);
    }

    // Source 4: Rule-derived results
    // Replace HDC duplicates with rule_derived (rule_derived is more reliable)
    const ruleMatches = timeBlock(this.session, 'query.rules', () =>
      searchViaRules(this.session, operatorName, knowns, holes)
    );
    for (const rm of ruleMatches) {
      const existingIdx = allResults.findIndex(r =>
        sameBindings(r.bindings, rm.bindings, holes)
      );
      if (existingIdx >= 0) {
        const existing = allResults[existingIdx];
        const existingPriority = METHOD_PRIORITY[existing.method] || 0;
        const replacementPriority = METHOD_PRIORITY[rm.method] || 0;
        if (replacementPriority > existingPriority) {
          allResults[existingIdx] = rm;
        }
      } else {
        allResults.push(rm);
      }
    }
    dbg('RULES', `Found ${ruleMatches.length} rule-derived matches`);

    // SOURCE 4.5: Property Inheritance (theory-driven via SemanticIndex)
    const isInheritable = this.session?.semanticIndex?.isInheritableProperty
      ? this.session.semanticIndex.isInheritableProperty(operatorName)
      : false;

    if (isInheritable && knowns.length === 1 && holes.length === 1) {
      if (knowns[0].index === 1) {
        const entityName = knowns[0].name;
        const inheritMatches = timeBlock(this.session, 'query.property_inheritance', () =>
          searchPropertyInheritanceOp(this.session, operatorName, entityName, holes[0].name)
        );
        for (const im of inheritMatches) {
          const exists = allResults.some(r =>
            sameBindings(r.bindings, im.bindings, holes)
          );
          if (!exists) {
            allResults.push(im);
          }
        }
        dbg('INHERIT', `Found ${inheritMatches.length} property inheritance matches`);
      } else if (knowns[0].index === 2) {
        const valueName = knowns[0].name;
        const inheritMatches = timeBlock(this.session, 'query.property_inheritance_by_value', () =>
          searchPropertyInheritanceByValueOp(this.session, operatorName, valueName, holes[0].name)
        );
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
    }

    // SOURCE 4.6: Element propagation via subsetOf (x ∈ A and A ⊆ B => x ∈ B)
    if (operatorName === 'elementOf' && knowns.length === 1 && holes.length === 1 && knowns[0].index === 1) {
      const entityName = knowns[0].name;
      const componentKB = this.session?.componentKB;
      const baseSets = new Set();

      if (componentKB) {
        const facts = componentKB.findByOperatorAndArg0('elementOf', entityName);
        for (const fact of facts) {
          if (fact.args?.[1]) baseSets.add(fact.args[1]);
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'elementOf' && meta.args?.[0] === entityName && meta.args?.[1]) {
            baseSets.add(meta.args[1]);
          }
        }
      }

      for (const baseSet of baseSets) {
        const targets = findAllTransitiveTargets(this.session, 'subsetOf', baseSet);
        for (const target of targets) {
          const steps = [`elementOf ${entityName} ${baseSet}`, ...target.steps];
          const factBindings = new Map();
          factBindings.set(holes[0].name, {
            answer: target.value,
            similarity: 0.85 - (target.depth * 0.05),
            method: 'rule_derived',
            steps
          });

          const exists = allResults.some(r =>
            sameBindings(r.bindings, factBindings, holes)
          );
          if (!exists) {
            allResults.push({
              bindings: factBindings,
              score: 0.85 - (target.depth * 0.05),
              method: 'rule_derived',
              steps
            });
          }
        }
      }
      dbg('INHERIT', `Found ${baseSets.size} element propagation base sets`);
    }

    // SOURCE 4.7: Transitive implication results (P implies Q, Q implies R => P implies R)
    if (operatorName === 'implies' && knowns.length === 1 && holes.length === 1 && knowns[0].index === 1) {
      const antecedent = knowns[0].name;
      const targets = findAllTransitiveTargets(this.session, 'implies', antecedent);
      for (const target of targets) {
        const factBindings = new Map();
        factBindings.set(holes[0].name, {
          answer: target.value,
          similarity: 0.85 - (target.depth * 0.05),
          method: 'transitive',
          steps: target.steps
        });

        const exists = allResults.some(r =>
          sameBindings(r.bindings, factBindings, holes)
        );
        if (!exists) {
          allResults.push({
            bindings: factBindings,
            score: 0.85 - (target.depth * 0.05),
            method: 'transitive',
            depth: target.depth,
            steps: target.steps
          });
        }
      }
      dbg('TRANSITIVE', `Found ${targets.length} transitive implies matches`);
    }

    // SOURCE 5: Compound CSP solutions (HDC-bundled multi-assignment solutions)
    const compoundMatches = timeBlock(this.session, 'query.compound', () =>
      searchCompoundSolutions(this.session, operatorName, knowns, holes)
    );
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
    const bundleMatches = timeBlock(this.session, 'query.bundle_pattern', () =>
      searchBundlePattern(this.session, operatorName, knowns, holes)
    );
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

    // For capped queries: if we still don't have enough high-priority results, run HDC last.
    if (!ranHdc && maxResults !== null && filteredResults.length < maxResults) {
      runHdc();
      ranHdc = true;
      filteredResults = filterTypeClasses(allResults, this.session, operatorName);
      filteredResults = filterNegated(filteredResults, this.session, operatorName, knowns);
    }

    // For uncapped queries in EXACT: run HDC only as a last resort when symbolic sources failed.
    if (!ranHdc && maxResults === null && filteredResults.length === 0) {
      runHdc();
      ranHdc = true;
      filteredResults = filterTypeClasses(allResults, this.session, operatorName);
      filteredResults = filterNegated(filteredResults, this.session, operatorName, knowns);
    }

    // SOURCE 7 (fallback): bAbI16-style induction for missing hasProperty values.
    // Only activate when no other source produced a usable answer.
    if (filteredResults.length === 0 && operatorName === 'hasProperty' && knowns.length === 1 && holes.length === 1) {
      if (knowns[0].index === 1) {
        const entityName = knowns[0].name;
        // AutoDiscovery/bAbI16 often expects induction even with a single peer example.
        // Keep it as a low-confidence fallback only when no other source answered.
        const induced = timeBlock(this.session, 'query.induction', () =>
          searchTypeInductionHasProperty(this.session, entityName, holes[0], { minSupport: 1 })
        );
        for (const r of induced) filteredResults.push(r);
      }
    }

    // Sort by: 1) method priority (direct > transitive > property_inheritance > bundle > compound_csp > rule > hdc), 2) score
    filteredResults.sort((a, b) => {
      const pa = METHOD_PRIORITY[a.method] || 0;
      const pb = METHOD_PRIORITY[b.method] || 0;
      if (pa !== pb) return pb - pa; // Higher priority first
      return b.score - a.score; // Then by score
    });

    if (maxResults !== null) {
      filteredResults = filteredResults.slice(0, maxResults);
    }

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
          method: binding.method || 'direct',
          steps: binding.steps
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
    return timeBlock(this.session, 'query.direct_match', () => {
      const canonicalizeToken = (name) => {
        if (!this.session?.canonicalizationEnabled) return name;
        const kb = this.session?.componentKB;
        if (!kb || typeof kb.canonicalizeName !== 'function') return name;
        return kb.canonicalizeName(String(name ?? ''));
      };

      const operatorNameRaw = statement?.operator?.name || statement?.operator?.value || null;
      const operatorName = operatorNameRaw ? canonicalizeToken(operatorNameRaw) : null;
      const args = knowns
        .map(k => k?.name)
        .filter(v => v !== null && v !== undefined)
        .map(v => canonicalizeToken(String(v)));
      const isExact = (this.session?.hdcStrategy || 'exact') === 'exact';

      // Fast-path: exact fact match via metadata index.
      // This avoids O(|KB|) similarity scans which get very expensive once large theory packs (e.g., URC) are loaded.
      if (operatorName && args.length === knowns.length) {
        const truthIndex = this.session?.truthFactIndex || null;
        const theoryIndex = this.session?.theoryFactIndex || null;
        const allIndex = this.session?.factIndex || null;

        const exact =
          truthIndex?.getNary?.(operatorName, args) ||
          theoryIndex?.getNary?.(operatorName, args) ||
          allIndex?.getNary?.(operatorName, args) ||
          null;

        if (exact) {
          return {
            success: true,
            matches: [{ similarity: 1.0, name: exact.name || null }],
            confidence: 1.0,
            bindings: new Map()
          };
        }

        // In EXACT strategy, do not fall back to expensive similarity scans for "no holes" existence checks.
        if (isExact) {
          return {
            success: false,
            matches: [],
            confidence: 0,
            bindings: new Map()
          };
        }
      }

      let queryVec = operator;
      for (const known of knowns) {
        queryVec = bind(queryVec, withPosition(known.index, known.vector, this.session));
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
    });
  }

  // ============================================================================
  // Delegate methods - implementations moved to query-meta-ops.mjs
  // ============================================================================

  /**
   * Search for concepts similar to a given concept
   * @deprecated Use searchSimilarOp directly for new code
   */
  searchSimilar(known, hole) {
    return searchSimilarOp(this.session, known, hole);
  }

  /**
   * Search for properties via isA inheritance chain
   * @deprecated Use searchPropertyInheritanceOp directly for new code
   */
  searchPropertyInheritance(operator, entityName, holeName) {
    return searchPropertyInheritanceOp(this.session, operator, entityName, holeName);
  }

  /**
   * Check if a property is negated for an entity
   */
  isPropertyNegated(operator, entity, value) {
    return isPropertyNegated(this.session, operator, entity, value);
  }

  /**
   * Get all parent types for an entity via isA chain
   */
  getAllParentTypes(entity) {
    return getAllParentTypes(this.session, entity);
  }

  /**
   * Check if entity is a type via isA chain
   */
  entityIsA(entity, type) {
    return entityIsAOp(this.session, entity, type);
  }

  // Delegate methods for backwards compatibility with query-kb.mjs
  isTypeClass(name) {
    return isTypeClass(this.session, name);
  }

  isFactNegated(operator, args) {
    return isFactNegated(this.session, operator, args);
  }

  // NOTE: DS06 advanced meta-operators (abduce/explain/whatif) and numeric parsing live in
  // `query/advanced-ops.mjs` to keep this file smaller.
}

export default QueryEngine;
