/**
 * AGISystem2 - Induction helpers for query()
 * @module reasoning/query-induction
 *
 * Lightweight bAbI16-style induction:
 * if an entity E has type T and several other known members of T share the same
 * unary property value, infer that E likely shares it too.
 *
 * This is intentionally conservative (requires unanimity among observed peers)
 * and only fires as a fallback when the query would otherwise return no results.
 */

import { debug_trace } from '../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[QueryInduction:${category}]`, ...args);
}

function getFactsByArg0(session, arg0) {
  const kb = session?.componentKB;
  if (kb) return kb.findByArg0(arg0) || [];
  return session.kbFacts
    .map(f => f.metadata)
    .filter(m => m?.args?.[0] === arg0)
    .map(m => ({ operator: m.operator, args: m.args }));
}

function getFactsByArg1(session, arg1) {
  const kb = session?.componentKB;
  if (kb) return kb.findByArg1(arg1) || [];
  return session.kbFacts
    .map(f => f.metadata)
    .filter(m => m?.args?.[1] === arg1)
    .map(m => ({ operator: m.operator, args: m.args }));
}

function getDirectTypes(session, entityName) {
  return getFactsByArg0(session, entityName)
    .filter(f => f.operator === 'isA' && f.args?.[1])
    .map(f => f.args[1]);
}

function getPeersOfType(session, typeName, excludeEntity) {
  return getFactsByArg1(session, typeName)
    .filter(f => f.operator === 'isA' && f.args?.[0] && f.args[0] !== excludeEntity)
    .map(f => f.args[0]);
}

function getHasPropertyValues(session, entityName) {
  return getFactsByArg0(session, entityName)
    .filter(f => f.operator === 'hasProperty' && f.args?.[1])
    .map(f => f.args[1]);
}

/**
 * Induce a missing `hasProperty(entity, ?x)` value using type peers.
 *
 * @param {Session} session
 * @param {string} entityName
 * @param {Object} hole - hole descriptor {name}
 * @param {Object} [options]
 * @param {number} [options.minSupport] - minimum number of peer examples
 * @returns {Array} query result candidates (same shape as searchKBDirect entries)
 */
export function searchTypeInductionHasProperty(session, entityName, hole, options = {}) {
  const minSupport = Number.isFinite(options.minSupport) ? options.minSupport : 1;

  const types = getDirectTypes(session, entityName);
  if (types.length === 0) return [];

  for (const typeName of types) {
    const peers = getPeersOfType(session, typeName, entityName);
    if (peers.length < minSupport) continue;

    const valueCounts = new Map();
    let contributingPeers = 0;

    for (const peer of peers) {
      const values = getHasPropertyValues(session, peer);
      if (values.length === 0) continue;
      contributingPeers++;
      for (const v of values) valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
    }

    if (contributingPeers < minSupport) continue;
    if (valueCounts.size !== 1) continue; // require unanimity among observed peers

    const [[value, count]] = [...valueCounts.entries()];
    if (count < minSupport) continue;

    dbg('HIT', `${entityName} inferred hasProperty ${value} from type ${typeName} (${count}/${contributingPeers})`);

    const bindings = new Map();
    bindings.set(hole.name, {
      answer: value,
          similarity: minSupport <= 1 ? 0.35 : 0.55,
          method: 'type_induction',
          steps: [
            `isA ${entityName} ${typeName}`,
            `induction: among ${typeName} peers, observed ${count}/${contributingPeers} with ${value}`,
            `therefore hasProperty ${entityName} ${value}`
          ]
        });

    return [{
      bindings,
      score: minSupport <= 1 ? 0.35 : 0.55,
      factName: null,
      method: 'type_induction',
      steps: bindings.get(hole.name).steps
    }];
  }

  return [];
}
