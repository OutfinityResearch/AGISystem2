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

    // Căutăm cel mai apropiat diamond după L1 mascat.
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

