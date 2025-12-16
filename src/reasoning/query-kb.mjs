/**
 * AGISystem2 - Direct KB Query Operations
 * @module reasoning/query-kb
 *
 * Symbolic, exact KB matching and filtering.
 */

import { similarity } from '../core/operations.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[QueryKB:${category}]`, ...args);
}

/**
 * Search KB directly for matches (symbolic, exact)
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments with positions
 * @param {Array} holes - Holes with positions
 * @returns {Array} Matching results with bindings
 */
export function searchKBDirect(session, operatorName, knowns, holes) {
  const results = [];

  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (!meta || meta.operator !== operatorName) continue;
    if (!meta.args) continue;

    // Check if knowns match
    let matches = true;
    for (const known of knowns) {
      const argIndex = known.index - 1;
      if (meta.args[argIndex] !== known.name) {
        matches = false;
        break;
      }
    }

    if (matches) {
      const factBindings = new Map();
      for (const hole of holes) {
        const argIndex = hole.index - 1;
        if (meta.args[argIndex]) {
          factBindings.set(hole.name, {
            answer: meta.args[argIndex],
            similarity: 0.95,
            method: 'direct'
          });
        }
      }

      if (factBindings.size === holes.length) {
        results.push({
          bindings: factBindings,
          score: 0.95,
          factName: fact.name,
          method: 'direct'
        });
      }
    }
  }

  return results;
}

/**
 * Check if a name is a type class (has sub-types in KB)
 * @param {Session} session - Session with KB
 * @param {string} name - Name to check
 * @returns {boolean} True if type class
 */
export function isTypeClass(session, name) {
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === 'isA' && meta.args?.[1] === name) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a fact is explicitly negated in KB
 * @param {Session} session - Session with KB
 * @param {string} operator - Fact operator
 * @param {Array} args - Fact arguments
 * @returns {boolean} True if negated
 */
export function isFactNegated(session, operator, args) {
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator !== 'Not') continue;

    // Get the reference that Not is applied to
    const refName = meta.args?.[0]?.replace('$', '');
    if (!refName) continue;

    // Look up what that reference points to
    const refText = session.referenceTexts?.get(refName);
    if (!refText) continue;

    // Check if it matches our fact
    const expectedText = `${operator} ${args.join(' ')}`;
    if (refText === expectedText) {
      return true;
    }
  }
  return false;
}

/**
 * Compare if two binding maps have same answers for all holes
 * @param {Map} bindings1 - First binding map
 * @param {Map} bindings2 - Second binding map
 * @param {Array} holes - Holes to compare
 * @returns {boolean} True if same bindings
 */
export function sameBindings(bindings1, bindings2, holes) {
  for (const hole of holes) {
    const a1 = bindings1.get(hole.name)?.answer;
    const a2 = bindings2.get(hole.name)?.answer;
    if (a1 !== a2) return false;
  }
  return true;
}

/**
 * Filter results to exclude type classes for modal operators
 * @param {Array} results - Query results
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name
 * @returns {Array} Filtered results
 */
export function filterTypeClasses(results, session, operatorName) {
  const modalOps = new Set(['can', 'must', 'cannot', 'hasStatus']);

  if (!modalOps.has(operatorName)) return results;

  return results.filter(result => {
    for (const [holeName, binding] of result.bindings) {
      const value = binding.answer;
      if (isTypeClass(session, value)) {
        dbg('FILTER', `Excluding type class from modal: ${value}`);
        return false;
      }
    }
    return true;
  });
}

/**
 * Filter results to exclude negated facts
 * @param {Array} results - Query results
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments
 * @returns {Array} Filtered results
 */
export function filterNegated(results, session, operatorName, knowns) {
  return results.filter(result => {
    const args = [];
    for (const [holeName, binding] of result.bindings) {
      args.push(binding.answer);
    }
    // Add knowns
    for (const known of knowns) {
      args[known.index - 1] = known.name;
    }
    if (isFactNegated(session, operatorName, args)) {
      dbg('FILTER', `Excluding negated: ${operatorName} ${args.join(' ')}`);
      return false;
    }
    return true;
  });
}
