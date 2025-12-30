/**
 * AGISystem2 - Query Meta-Operators
 * @module reasoning/query-meta-ops
 *
 * Thin facade for DS17 meta-query operators.
 * Implementation lives in smaller focused modules under `./query-meta-ops/`.
 */

// Re-export inheritance helpers for backwards compatibility
export {
  searchPropertyInheritance,
  searchPropertyInheritanceByValue,
  isPropertyNegated,
  getAllParentTypes,
  entityIsA
} from './query-inheritance.mjs';

export {
  searchSimilar,
  searchInduce,
  searchBundle,
  searchDifference,
  shouldIncludeProperty
} from './query-meta-ops/property-sets.mjs';

export {
  searchAnalogy,
  searchDeduce
} from './query-meta-ops/analogy-deduce.mjs';

