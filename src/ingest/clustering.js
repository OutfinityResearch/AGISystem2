const BoundedDiamond = require('../core/bounded_diamond');

class ClusterManager {
  constructor({ config, math, vspace }) {
    this.config = config;
    this.math = math;
    this.vspace = vspace;
    this.splitFactor = 1.5;
  }

  updateClusters(concept, vec) {
    const diamonds = concept.diamonds;
    if (!diamonds || diamonds.length === 0) {
      const d = new BoundedDiamond(concept.label, concept.label, this.vspace.dimensions);
      d.initialiseFromVector(vec);
      concept.diamonds = [d];
      return concept.diamonds;
    }

    // If there is exactly one diamond and it is still in its initial
    // "empty" state (all zeros, no radius, no relevance mask), re‑initialise
    // it directly from the new vector instead of widening from zero.
    if (diamonds.length === 1) {
      const d0 = diamonds[0];
      if (d0.l1Radius === 0) {
        let maskHasBits = false;
        const bytes = d0.relevanceMask.length;
        for (let i = 0; i < bytes; i += 1) {
          if (d0.relevanceMask[i] !== 0) {
            maskHasBits = true;
            break;
          }
        }
        if (!maskHasBits) {
          d0.initialiseFromVector(vec);
          return diamonds;
        }
      }
    }

    // Find nearest diamond by masked L1 distance.
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < diamonds.length; i += 1) {
      const d = diamonds[i];
      const dist = this.math.distanceMaskedL1(vec, d);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = i;
      }
    }
    const target = diamonds[bestIndex];

    if (bestDistance === Infinity || this.shouldSplit(target, vec)) {
      const d = new BoundedDiamond(concept.label, concept.label, this.vspace.dimensions);
      d.initialiseFromVector(vec);
      diamonds.push(d);
      return diamonds;
    }

    // Lărgim diamondul existent: actualizăm min/max și centrul aproximativ.
    const dims = this.vspace.dimensions;
    for (let i = 0; i < dims; i += 1) {
      const value = vec[i];
      if (value < target.minValues[i]) {
        target.minValues[i] = value;
      }
      if (value > target.maxValues[i]) {
        target.maxValues[i] = value;
      }
      target.center[i] = (target.minValues[i] + target.maxValues[i]) >> 1;
    }

    // Recalculăm un radius L1 simplu față de centru.
    let radius = 0;
    for (let i = 0; i < dims; i += 1) {
      const diff = vec[i] - target.center[i];
      radius += diff >= 0 ? diff : -diff;
    }
    target.l1Radius = Math.max(target.l1Radius, radius);
    return diamonds;
  }

  shouldSplit(diamond, vec) {
    if (!diamond.l1Radius) {
      return false;
    }
    const dist = this.math.distanceMaskedL1(vec, diamond);
    if (!Number.isFinite(dist)) {
      return true;
    }
    return dist > diamond.l1Radius * this.splitFactor;
  }

  mergeCandidates(concept) {
    return concept.diamonds || [];
  }
}

module.exports = ClusterManager;
