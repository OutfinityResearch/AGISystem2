/**
 * AGISystem2 - Binary Hyperdimensional Vector
 * @module core/vector
 *
 * BACKWARD COMPATIBILITY LAYER
 * Re-exports Vector from hdc/facade for existing code.
 *
 * New code should import directly from hdc/facade:
 *   import { createFromName, bind, bundle } from '../hdc/facade.mjs';
 */

import { Vector as HDCVector } from '../hdc/facade.mjs';

// Re-export the Vector class for backward compatibility
export const Vector = HDCVector;

export default Vector;
