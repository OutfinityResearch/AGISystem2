/**
 * AGISystem2 - HDC Operations
 * @module core/operations
 *
 * BACKWARD COMPATIBILITY LAYER
 * Re-exports operations from hdc/facade for existing code.
 *
 * New code should import directly from hdc/facade:
 *   import { bind, bundle, similarity } from '../hdc/facade.mjs';
 */

import {
  bind as hdcBind,
  bindAll as hdcBindAll,
  bundle as hdcBundle,
  similarity as hdcSimilarity,
  distance as hdcDistance,
  topKSimilar as hdcTopKSimilar,
  isOrthogonal as hdcIsOrthogonal,
  unbind as hdcUnbind,
  getDefaultGeometry as hdcGetDefaultGeometry,
  setDefaultGeometry as hdcSetDefaultGeometry
} from '../hdc/facade.mjs';

// Re-export all operations
export const bind = hdcBind;
export const bindAll = hdcBindAll;
export const bundle = hdcBundle;
export const similarity = hdcSimilarity;
export const distance = hdcDistance;
export const topKSimilar = hdcTopKSimilar;
export const isOrthogonal = hdcIsOrthogonal;
export const unbind = hdcUnbind;
export const getDefaultGeometry = hdcGetDefaultGeometry;
export const setDefaultGeometry = hdcSetDefaultGeometry;

export default {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind,
  getDefaultGeometry,
  setDefaultGeometry
};
