/**
 * AGISystem2 - Rule-Based Query Operations
 * @module reasoning/query-rules
 *
 * Query via rule derivations and condition matching.
 */

import { TRANSITIVE_RELATIONS } from './transitive.mjs';
import { reachesTransitively } from './query-transitive.mjs';
import { isFactNegated } from './query-kb.mjs';
import { debug_trace } from '../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[QueryRules:${category}]`, ...args);
}

/**
 * Search via rule derivations
 * @param {Session} session - Session with KB and rules
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments with positions
 * @param {Array} holes - Holes with positions
 * @returns {Array} Rule-derived results with bindings
 */
export function searchViaRules(session, operatorName, knowns, holes) {
  const results = [];

  // Try each rule whose conclusion matches our query operator
  for (const rule of session.rules) {
    if (!rule.hasVariables || !rule.conclusionAST) continue;

    const concOp = extractOperator(rule.conclusionAST);
    if (concOp !== operatorName) continue;

    const concArgs = extractArgs(rule.conclusionAST);
    if (concArgs.length !== knowns.length + holes.length) continue;

    // Try to unify known arguments
    const bindings = new Map();
    let unifyOk = true;

    for (const known of knowns) {
      const argIndex = known.index - 1;
      const concArg = concArgs[argIndex];
      if (concArg?.isVariable) {
        bindings.set(concArg.name, known.name);
      } else if (concArg?.name !== known.name) {
        unifyOk = false;
        break;
      }
    }

    if (!unifyOk) continue;

    // Try to find values for holes by proving conditions
    const holeVarNames = [];
    for (const hole of holes) {
      const argIndex = hole.index - 1;
      const concArg = concArgs[argIndex];
      if (concArg?.isVariable) {
        holeVarNames.push({ holeName: hole.name, varName: concArg.name });
      }
    }

    // Try proving the rule's condition with various substitutions
    const conditionMatches = findConditionMatches(session, rule, bindings);

    for (const cm of conditionMatches) {
      const factBindings = new Map();
      let valid = true;

      for (const { holeName, varName } of holeVarNames) {
        const value = cm.get(varName);
        if (value) {
          factBindings.set(holeName, {
            answer: value,
            similarity: 0.85,
            method: 'rule_derived'
          });
        } else {
          valid = false;
          break;
        }
      }

      if (valid && factBindings.size === holes.length) {
        // Check if this derived fact is negated
        const args = [];
        for (const concArg of concArgs) {
          if (concArg.isVariable) {
            args.push(cm.get(concArg.name));
          } else {
            args.push(concArg.name);
          }
        }

        if (isFactNegated(session, operatorName, args)) {
          dbg('RULES', `Skipping negated: ${operatorName} ${args.join(' ')}`);
          continue;
        }

        // Build proof steps showing how rule was applied
        const proofSteps = [];
        // Show which condition facts matched
        for (const [varName, value] of cm) {
          if (!bindings.has(varName)) {
            proofSteps.push(`${varName}=${value}`);
          }
        }
        proofSteps.push(`Applied rule: ${rule.name || rule.source?.substring(0, 40) || 'rule'}`);

        // Add steps to each binding entry
        for (const [holeName, bindingData] of factBindings) {
          bindingData.steps = proofSteps;
        }

        results.push({
          bindings: factBindings,
          score: 0.85,
          method: 'rule_derived',
          rule: rule.name,
          steps: proofSteps
        });
      }
    }
  }

  return results;
}

/**
 * Find all condition matches for a rule
 * Enhanced to handle compound Or/And conditions and transitive relations
 * @param {Session} session - Session with KB
 * @param {Object} rule - Rule with conditionParts or conditionAST
 * @param {Map} initialBindings - Initial variable bindings
 * @returns {Array<Map>} Array of binding maps
 */
export function findConditionMatches(session, rule, initialBindings) {
  // Use conditionParts if available (handles compound conditions)
  if (rule.conditionParts) {
    return findCompoundMatches(session, rule.conditionParts, initialBindings);
  }

  // Simple condition - use conditionAST
  const condAST = rule.conditionAST;
  if (!condAST) return [];

  return findLeafConditionMatches(session, condAST, initialBindings);
}

/**
 * Recursively find matches for compound condition structures (Or/And/leaf)
 * @param {Session} session - Session with KB
 * @param {Object} condPart - Condition part (Or/And/leaf structure)
 * @param {Map} initialBindings - Initial variable bindings
 * @returns {Array<Map>} Array of binding maps
 */
export function findCompoundMatches(session, condPart, initialBindings) {
  const addedBindings = new Set();
  const addMatch = (matches, binding) => {
    const key = [...binding.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
    if (!addedBindings.has(key)) {
      addedBindings.add(key);
      matches.push(binding);
    }
  };

  // Leaf node - find direct matches
  if (condPart.type === 'leaf' && condPart.ast) {
    return findLeafConditionMatches(session, condPart.ast, initialBindings);
  }

  // Or node - union all matches from all branches (recursive)
  if (condPart.type === 'Or' && condPart.parts) {
    const matches = [];
    for (const part of condPart.parts) {
      const branchMatches = findCompoundMatches(session, part, initialBindings);
      for (const binding of branchMatches) {
        addMatch(matches, binding);
      }
    }
    return matches;
  }

  // And node - intersection of all branches (recursive)
  if (condPart.type === 'And' && condPart.parts) {
    let candidateBindings = null;

    for (const part of condPart.parts) {
      const branchMatches = findCompoundMatches(session, part, initialBindings);

      if (candidateBindings === null) {
        candidateBindings = branchMatches;
      } else {
        // Intersect: keep only bindings compatible with branch
        candidateBindings = candidateBindings.filter(cb => {
          return branchMatches.some(bm => bindingsCompatible(cb, bm));
        });
      }
    }

    return candidateBindings || [];
  }

  return [];
}

/**
 * Check if two binding maps are compatible (same values for shared keys)
 * @param {Map} bindings1 - First binding map
 * @param {Map} bindings2 - Second binding map
 * @returns {boolean} True if compatible
 */
export function bindingsCompatible(bindings1, bindings2) {
  for (const [key, val1] of bindings1) {
    if (bindings2.has(key) && bindings2.get(key) !== val1) {
      return false;
    }
  }
  return true;
}

/**
 * Find matches for a single (leaf) condition AST
 * @param {Session} session - Session with KB
 * @param {Object} condAST - Condition AST
 * @param {Map} initialBindings - Initial variable bindings
 * @returns {Array<Map>} Array of binding maps
 */
export function findLeafConditionMatches(session, condAST, initialBindings) {
  const matches = [];
  const addedBindings = new Set();

  const condOp = extractOperator(condAST);
  const condArgs = extractArgs(condAST);

  // Search KB for facts matching condition pattern (direct matches)
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (!meta || meta.operator !== condOp) continue;
    if (!meta.args || meta.args.length !== condArgs.length) continue;

    const newBindings = new Map(initialBindings);
    let matchOk = true;

    for (let i = 0; i < condArgs.length; i++) {
      const condArg = condArgs[i];
      const factArg = meta.args[i];

      if (condArg?.isVariable) {
        const existing = newBindings.get(condArg.name);
        if (existing && existing !== factArg) {
          matchOk = false;
          break;
        }
        newBindings.set(condArg.name, factArg);
      } else if (condArg?.name !== factArg) {
        const expected = condArg?.name;
        const typeMatch = expected && reachesTransitively(session, 'isA', factArg, expected);
        if (!typeMatch) {
          matchOk = false;
          break;
        }
      }
    }

    if (matchOk) {
      const key = [...newBindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
      if (!addedBindings.has(key)) {
        addedBindings.add(key);
        matches.push(newBindings);
      }
    }
  }

  // For transitive relations, also find entities that match via chains
  if (TRANSITIVE_RELATIONS.has(condOp) && condArgs.length === 2) {
    const arg0 = condArgs[0];
    const arg1 = condArgs[1];

    // Case: "isA ?x Target" - find all entities that are transitively Target
    if (arg0?.isVariable && !arg1?.isVariable) {
      const targetValue = arg1.name;
      const checkedEntities = new Set();
      for (const fact of session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === condOp && meta.args?.[0]) {
          const entity = meta.args[0];
          if (checkedEntities.has(entity)) continue;
          checkedEntities.add(entity);

          if (reachesTransitively(session, condOp, entity, targetValue)) {
            const newBindings = new Map(initialBindings);
            newBindings.set(arg0.name, entity);
            const key = [...newBindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
            if (!addedBindings.has(key)) {
              addedBindings.add(key);
              matches.push(newBindings);
            }
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Extract operator from AST
 * @param {Object} ast - AST node
 * @returns {string|null} Operator name
 */
export function extractOperator(ast) {
  if (!ast) return null;
  if (ast.operator?.name) return ast.operator.name;
  if (ast.operator?.value) return ast.operator.value;
  if (ast.name) return ast.name;
  return null;
}

/**
 * Extract args from AST
 * @param {Object} ast - AST node
 * @returns {Array} Array of arg info objects
 */
export function extractArgs(ast) {
  if (!ast?.args) return [];
  return ast.args.map(arg => ({
    name: arg.name || arg.value,
    isVariable: arg.type === 'Variable' || arg.type === 'Hole' || (arg.name && arg.name.startsWith('$'))
  }));
}
