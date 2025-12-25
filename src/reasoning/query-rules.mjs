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

  const flattenConclusionLeaves = (rule) => {
    if (!rule?.conclusionParts) return [rule?.conclusionAST].filter(Boolean);
    const leaves = [];
    const walk = (part) => {
      if (!part) return;
      if (part.type === 'leaf' && part.ast) {
        leaves.push(part.ast);
        return;
      }
      // Do not treat Not(P) as P for rule-derived answers.
      if (part.type === 'Not') return;
      if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
        for (const p of part.parts) walk(p);
      }
    };
    walk(rule.conclusionParts);
    return leaves.length > 0 ? leaves : [rule.conclusionAST].filter(Boolean);
  };

  // Try each rule whose conclusion matches our query operator
  for (const rule of session.rules) {
    if (!rule.hasVariables) continue;

    const concAsts = flattenConclusionLeaves(rule);
    for (const concAST of concAsts) {
      if (!concAST) continue;

      const concOp = extractOperator(concAST);
      if (concOp !== operatorName) continue;

      const concArgs = extractArgs(concAST);
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
      const holeBindings = [];
      for (const hole of holes) {
        const argIndex = hole.index - 1;
        const concArg = concArgs[argIndex];
        if (concArg?.isVariable) {
          holeBindings.push({ holeName: hole.name, varName: concArg.name });
        } else if (concArg?.name) {
          holeBindings.push({ holeName: hole.name, constValue: concArg.name });
        }
      }

      // Try proving the rule's condition with various substitutions
      const conditionMatches = findConditionMatches(session, rule, bindings);

      for (const match of conditionMatches) {
        const cm = match.bindings;
        const factBindings = new Map();
        let valid = true;

        for (const binding of holeBindings) {
          const value = binding.varName ? cm.get(binding.varName) : binding.constValue;
          if (value) {
            factBindings.set(binding.holeName, {
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

          // Build proof steps showing how rule was applied, with evidence facts first.
          const proofSteps = [];
          for (const s of match.steps || []) {
            if (typeof s === 'string' && s.trim()) proofSteps.push(s.trim());
          }
          proofSteps.push(`Applied rule: ${rule.name || rule.source?.substring(0, 40) || 'rule'}`);

          // Add steps to each binding entry
          for (const [, bindingData] of factBindings) {
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
  const added = new Set();
  const addMatch = (matches, match) => {
    const key = [...match.bindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
    if (!added.has(key)) {
      added.add(key);
      matches.push(match);
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
      for (const match of branchMatches) {
        addMatch(matches, match);
      }
    }
    return matches;
  }

  // And node - intersection of all branches (recursive)
  if (condPart.type === 'And' && condPart.parts) {
    let candidates = [{ bindings: new Map(initialBindings), steps: [] }];

    for (const part of condPart.parts) {
      const branchMatches = findCompoundMatches(session, part, initialBindings);
      const next = [];

      for (const c of candidates) {
        for (const b of branchMatches) {
          if (!bindingsCompatible(c.bindings, b.bindings)) continue;
          const merged = new Map(c.bindings);
          for (const [k, v] of b.bindings) merged.set(k, v);
          next.push({ bindings: merged, steps: [...(c.steps || []), ...(b.steps || [])] });
        }
      }

      candidates = next;
      if (candidates.length === 0) break;
    }

    const out = [];
    for (const m of candidates) addMatch(out, m);
    return out;
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
function findIsAPath(session, from, to, maxDepth = 10) {
  if (from === to) return [];
  const queue = [{ node: from, path: [] }];
  const visited = new Set([from]);

  while (queue.length > 0) {
    const { node, path } = queue.shift();
    if (path.length >= maxDepth) continue;

    for (const fact of session.kbFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.operator !== 'isA') continue;
      if (meta.args?.[0] !== node) continue;
      const parent = meta.args?.[1];
      if (!parent || visited.has(parent)) continue;

      const nextPath = [...path, `isA ${node} ${parent}`];
      if (parent === to) return nextPath;
      visited.add(parent);
      queue.push({ node: parent, path: nextPath });
    }
  }

  return [];
}

export function findLeafConditionMatches(session, condAST, initialBindings) {
  const matches = [];
  const addedBindings = new Set();

  const condOp = extractOperator(condAST);
  const condArgs = extractArgs(condAST);

  // Search KB for facts matching condition pattern (direct matches)
  for (const fact of session.kbFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact.metadata;
    if (!meta || meta.operator !== condOp) continue;
    if (!meta.args || meta.args.length !== condArgs.length) continue;

    const newBindings = new Map(initialBindings);
    let matchOk = true;
    const steps = [];
    // Always include the matched fact as evidence.
    steps.push(`${meta.operator} ${meta.args.join(' ')}`.trim());

    let usedTypeMatch = false;
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
        usedTypeMatch = true;
        // Add an isA chain as evidence for the type match (best-effort).
        const chain = findIsAPath(session, factArg, expected);
        for (const s of chain) steps.push(s);
      }
    }

    if (matchOk) {
      if (usedTypeMatch && condOp === 'has') {
        const inferredArgs = condArgs.map(arg =>
          arg?.isVariable ? newBindings.get(arg.name) : arg?.name
        );
        if (inferredArgs.every(Boolean)) {
          steps.push(`Inherited via value type: ${condOp} ${inferredArgs.join(' ')}`);
        }
      }
      const key = [...newBindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
      if (!addedBindings.has(key)) {
        addedBindings.add(key);
        matches.push({ bindings: newBindings, steps });
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
        session.reasoningStats.kbScans++;
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
              matches.push({ bindings: newBindings, steps: [] });
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
