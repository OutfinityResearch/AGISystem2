/**
 * AGISystem2 - HDC Strategy Registry
 * @module hdc/strategies/index
 *
 * Manages available HDC strategies and provides selection mechanism.
 */

import { denseBinaryStrategy } from './dense-binary.mjs';
import { sparsePolynomialStrategy } from './sparse-polynomial.mjs';

/**
 * Registry of available strategies
 * @type {Map<string, Object>}
 */
const strategies = new Map();

// Register strategies
strategies.set('dense-binary', denseBinaryStrategy);
strategies.set('sparse-polynomial', sparsePolynomialStrategy);

// Backward compatibility alias
strategies.set('fractal-semantic', sparsePolynomialStrategy);

/**
 * Get a strategy by ID
 * @param {string} strategyId
 * @returns {Object} Strategy object
 * @throws {Error} If strategy not found
 */
export function getStrategy(strategyId) {
  const strategy = strategies.get(strategyId);
  if (!strategy) {
    const available = Array.from(strategies.keys()).join(', ');
    throw new Error(`Unknown HDC strategy: ${strategyId}. Available: ${available}`);
  }
  return strategy;
}

/**
 * Register a new strategy
 * @param {string} strategyId
 * @param {Object} strategy
 */
export function registerStrategy(strategyId, strategy) {
  if (strategies.has(strategyId)) {
    throw new Error(`Strategy already registered: ${strategyId}`);
  }
  strategies.set(strategyId, strategy);
}

/**
 * Get list of available strategy IDs
 * @returns {string[]}
 */
export function listStrategies() {
  return Array.from(strategies.keys());
}

/**
 * Get default strategy
 * @returns {Object}
 */
export function getDefaultStrategy() {
  return denseBinaryStrategy;
}

export default {
  getStrategy,
  registerStrategy,
  listStrategies,
  getDefaultStrategy
};
