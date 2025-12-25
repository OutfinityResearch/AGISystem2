/**
 * AGISystem2 - Direct KB Query Operations
 * @module reasoning/query-kb
 *
 * Symbolic, exact KB matching and filtering.
 */

import { similarity } from '../core/operations.mjs';
import { getThresholds } from '../core/constants.mjs';
import { debug_trace } from '../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[QueryKB:${category}]`, ...args);
}

/**
 * Search KB directly for matches (symbolic, exact)
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments with positions
 * @param {Array} holes - Holes with positions
 * @param {Object} options - Query options
 * @param {number|null} options.maxResults - Stop after collecting this many matches
 * @returns {Array} Matching results with bindings
 */
export function searchKBDirect(session, operatorName, knowns, holes, options = {}) {
  const results = [];

  const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;

  const componentKB = session.componentKB;
  let scanFacts = session.kbFacts;
  if (componentKB && operatorName) {
    // NOTE: direct KB search must be exact (no synonym expansion), to preserve semantics.
    scanFacts = componentKB.findByOperator(operatorName, false);
  }

  for (const fact of scanFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact?.metadata;
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
      // Build proof steps from fact metadata (e.g., CSP constraint satisfaction)
      const steps = [];
      if (meta.proof) {
        steps.push(meta.proof);
      }
      steps.push(`${operatorName} ${meta.args.join(' ')}`);

      const factBindings = new Map();
      for (const hole of holes) {
        const argIndex = hole.index - 1;
        if (meta.args[argIndex]) {
          factBindings.set(hole.name, {
            answer: meta.args[argIndex],
            similarity: 0.95,
            method: 'direct',
            steps  // Include proof steps in each binding
          });
        }
      }

      if (factBindings.size === holes.length) {
        results.push({
          bindings: factBindings,
          score: 0.95,
          factName: fact.name,
          method: 'direct',
          steps
        });
      }

      if (maxResults !== null && results.length >= maxResults) {
        break;
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
  const componentKB = session.componentKB;
  const scanFacts = componentKB?.findByArg1 ? componentKB.findByArg1(name, false) : session.kbFacts;

  for (const fact of scanFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact?.metadata;
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
  const componentKB = session.componentKB;
  const scanFacts = componentKB?.findByOperator ? componentKB.findByOperator('Not', false) : session.kbFacts;

  for (const fact of scanFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact?.metadata;
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

/**
 * Search for common properties across bundle/induce pattern sources
 * When querying with a bundled/induced pattern, find properties common to all sources
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name (e.g., 'can', 'has')
 * @param {Array} knowns - Known arguments (may include pattern references)
 * @param {Array} holes - Holes to fill
 * @returns {Array} Results with common properties
 */
export function searchBundlePattern(session, operatorName, knowns, holes) {
  const results = [];
  const strategy = session.hdcStrategy || 'dense-binary';
  const thresholds = getThresholds(strategy);
  const bundleScore = thresholds.BUNDLE_COMMON_SCORE;

  // Check if any known is a bundle/induce pattern
  for (const known of knowns) {
    // Handle reference prefix ($mammalPattern -> mammalPattern)
    const patternName = known.name?.startsWith('$') ? known.name.slice(1) : known.name;

    // Look for bundle/induce pattern in KB
    const patternFact = session.kbFacts.find(f =>
      f.name === patternName &&
      (f.metadata?.operator === 'bundlePattern' || f.metadata?.operator === 'inducePattern')
    );

    if (!patternFact) continue;

    // induce stores 'sources', bundle stores 'items'
    const sourceEntities = patternFact.metadata.sources || patternFact.metadata.items || [];
    dbg('BUNDLE', `Found pattern: ${patternName}, sources:`, sourceEntities);

    if (sourceEntities.length === 0) continue;

    // For each source entity, collect properties for the given operator
    const entityProperties = new Map(); // entity -> Set of property values

    for (const entity of sourceEntities) {
      const props = new Set();

      for (const fact of session.kbFacts) {
        session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (!meta || meta.operator !== operatorName) continue;

        // Check if this fact is about our entity (arg0 matches)
        if (meta.args?.[0] === entity) {
          const propValue = meta.args?.[1];
          if (propValue) {
            props.add(propValue);
          }
        }
      }

      entityProperties.set(entity, props);
      dbg('BUNDLE', `Entity ${entity} has ${operatorName} properties:`, [...props]);
    }

    // Find intersection - properties common to ALL entities
    let commonProps = null;
    for (const [entity, props] of entityProperties) {
      if (commonProps === null) {
        commonProps = new Set(props);
      } else {
        // Intersection
        commonProps = new Set([...commonProps].filter(p => props.has(p)));
      }
    }

    if (!commonProps || commonProps.size === 0) {
      dbg('BUNDLE', 'No common properties found');
      continue;
    }

    dbg('BUNDLE', `Common properties:`, [...commonProps]);

    // Create results for each common property
    for (const prop of commonProps) {
      const bindings = new Map();
      for (const hole of holes) {
        bindings.set(hole.name, {
          answer: prop,
          similarity: bundleScore,
          method: 'bundle_common'
        });
      }

      results.push({
        bindings,
        score: bundleScore,
        method: 'bundle_common',
        sources: sourceEntities
      });
    }
  }

  return results;
}
