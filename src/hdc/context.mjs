/**
 * AGISystem2 - HDC Context (Session-local)
 * @module hdc/context
 *
 * Provides a session-owned wrapper over an HDC strategy.
 * Stateless strategies can share a singleton implementation; stateful strategies
 * can expose createInstance() to get a fresh per-session instance.
 */

import { getStrategy } from './facade.mjs';

const STRATEGY_INSTANCE_PROP = '__sys2StrategyInstance';

function attachStrategyInstance(vector, strategy) {
  if (!vector || typeof vector !== 'object') return vector;
  try {
    if (!Object.isExtensible(vector)) return vector;
    // Keep it non-enumerable to avoid affecting logs/serialization.
    Object.defineProperty(vector, STRATEGY_INSTANCE_PROP, {
      value: strategy,
      enumerable: false,
      configurable: true
    });
  } catch {
    // Best-effort tagging; some vectors may be non-extensible.
  }
  return vector;
}

/**
 * Create a session-local HDC context.
 * @param {Object} options
 * @param {string} options.strategyId
 * @param {number} options.geometry
 * @param {Object} [options.session] - Optional session reference for strategy initialization
 * @returns {Object} HDC context
 */
export function createHDCContext({ strategyId, geometry, session = null } = {}) {
  if (!strategyId) throw new Error('createHDCContext requires strategyId');
  const base = getStrategy(strategyId);
  const strategy = typeof base?.createInstance === 'function'
    ? base.createInstance({ strategyId, geometry, session })
    : base;

  return {
    strategyId,
    geometry,
    strategy,

    // Factory
    createZero: (geo = geometry) => attachStrategyInstance(strategy.createZero(geo), strategy),
    createRandom: (geo = geometry, seed = null) => attachStrategyInstance(strategy.createRandom(geo, seed), strategy),
    createFromName: (name, geo = geometry, theoryId = 'default') => attachStrategyInstance(strategy.createFromName(name, geo, theoryId), strategy),
    deserialize: (serialized) => attachStrategyInstance(strategy.deserialize(serialized), strategy),

    // Ops
    bind: (a, b) => attachStrategyInstance(strategy.bind(a, b), strategy),
    bindAll: (...vectors) => attachStrategyInstance(strategy.bindAll(...vectors), strategy),
    bundle: (vectors, tieBreaker = null) => attachStrategyInstance(strategy.bundle(vectors, tieBreaker), strategy),
    unbind: (composite, component) => attachStrategyInstance(strategy.unbind(composite, component), strategy),
    similarity: (a, b) => strategy.similarity(a, b),
    distance: (a, b) => strategy.distance(a, b),
    topKSimilar: (query, vocabulary, k = 5) => strategy.topKSimilar(query, vocabulary, k, session),

    // Utils
    clone: (v) => attachStrategyInstance(strategy.clone(v), strategy),
    equals: (a, b) => strategy.equals(a, b),
    serialize: (v) => strategy.serialize(v),
    serializeKB: (facts) => strategy.serializeKB(facts),
    deserializeKB: (serialized) => strategy.deserializeKB(serialized),

    Vector: strategy.Vector
  };
}

export default { createHDCContext };
