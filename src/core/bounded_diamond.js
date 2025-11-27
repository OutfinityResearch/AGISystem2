const MathEngine = require('./math_engine');

class BoundedDiamond {
  constructor(vspaceOrId, optionsOrLabel, maybeDimensions) {
    if (vspaceOrId && typeof vspaceOrId.allocVector === 'function') {
      const vspace = vspaceOrId;
      const opts = optionsOrLabel || {};
      const uuid = opts.uuid || opts.label || null;
      const label = opts.label || opts.uuid || null;
      this.id = uuid;
      this.label = label;
      const dim = vspace.dimensions;
      this.minValues = vspace.allocVector();
      this.maxValues = vspace.allocVector();
      this.center = vspace.allocVector();
      this.relevanceMask = vspace.allocMask();
    } else {
      const id = vspaceOrId;
      const label = optionsOrLabel;
      const dimensions = maybeDimensions;
      this.id = id;
      this.label = label;
      this.minValues = new Int8Array(dimensions);
      this.maxValues = new Int8Array(dimensions);
      this.center = new Int8Array(dimensions);
      const maskBytes = Math.ceil(dimensions / 8);
      this.relevanceMask = new Uint8Array(maskBytes);
    }
    this.l1Radius = 0;
    this.lshFingerprint = BigInt(0);
  }

  resetBounds() {
    this.minValues.fill(0);
    this.maxValues.fill(0);
    this.center.fill(0);
    this.relevanceMask.fill(0);
    this.l1Radius = 0;
  }

  initialiseFromVector(vector) {
    this.updateFromExamples([vector]);
  }

  updateFromExamples(vectors) {
    if (!vectors || vectors.length === 0) {
      this.resetBounds();
      return;
    }
    const dim = this.center.length;
    const first = vectors[0];
    for (let i = 0; i < dim; i += 1) {
      const value = first[i] || 0;
      this.minValues[i] = value;
      this.maxValues[i] = value;
    }
    for (let vIndex = 1; vIndex < vectors.length; vIndex += 1) {
      const vec = vectors[vIndex];
      for (let i = 0; i < dim; i += 1) {
        const value = vec[i] || 0;
        if (value < this.minValues[i]) {
          this.minValues[i] = value;
        }
        if (value > this.maxValues[i]) {
          this.maxValues[i] = value;
        }
      }
    }
    for (let i = 0; i < dim; i += 1) {
      this.center[i] = (this.minValues[i] + this.maxValues[i]) >> 1;
    }
    let maxRadius = 0;
    for (let vIndex = 0; vIndex < vectors.length; vIndex += 1) {
      const vec = vectors[vIndex];
      let distance = 0;
      for (let i = 0; i < dim; i += 1) {
        const diff = vec[i] - this.center[i];
        distance += diff >= 0 ? diff : -diff;
      }
      if (distance > maxRadius) {
        maxRadius = distance;
      }
    }
    this.l1Radius = maxRadius;
    this.relevanceMask.fill(0);
    for (let vIndex = 0; vIndex < vectors.length; vIndex += 1) {
      const vec = vectors[vIndex];
      for (let i = 0; i < dim; i += 1) {
        const value = vec[i];
        if (value !== 0) {
          const byteIndex = (i / 8) | 0;
          const bitIndex = i % 8;
          this.relevanceMask[byteIndex] |= 1 << bitIndex;
        }
      }
    }
  }

  contains(point, options) {
    const opts = options || {};
    const radiusScale = typeof opts.radiusScale === 'number' ? opts.radiusScale : 1;
    const mask = opts.mask || this.relevanceMask;
    const distance = MathEngine.distanceMaskedL1(point, this, mask);
    if (!Number.isFinite(distance)) {
      return false;
    }
    if (this.l1Radius === 0) {
      return distance === 0;
    }
    const threshold = this.l1Radius * radiusScale;
    return distance <= threshold;
  }

  merge(other) {
    const dim = this.center.length;
    for (let i = 0; i < dim; i += 1) {
      if (other.minValues[i] < this.minValues[i]) {
        this.minValues[i] = other.minValues[i];
      }
      if (other.maxValues[i] > this.maxValues[i]) {
        this.maxValues[i] = other.maxValues[i];
      }
    }
    for (let i = 0; i < dim; i += 1) {
      this.center[i] = (this.minValues[i] + this.maxValues[i]) >> 1;
    }
    let maxRadius = this.l1Radius;
    const candidates = [other.minValues, other.maxValues];
    for (let cIndex = 0; cIndex < candidates.length; cIndex += 1) {
      const vec = candidates[cIndex];
      let distance = 0;
      for (let i = 0; i < dim; i += 1) {
        const diff = vec[i] - this.center[i];
        distance += diff >= 0 ? diff : -diff;
      }
      if (distance > maxRadius) {
        maxRadius = distance;
      }
    }
    this.l1Radius = maxRadius;
    const bytes = this.relevanceMask.length;
    for (let i = 0; i < bytes; i += 1) {
      this.relevanceMask[i] |= other.relevanceMask[i];
    }
  }

  distance(point, maskOverride) {
    return MathEngine.distanceMaskedL1(point, this, maskOverride);
  }

  /**
   * Expand diamond to include a new observation vector
   * @param {Int8Array} vector - New observation to include
   */
  expand(vector) {
    const dim = this.center.length;

    // Update min/max bounds to include the new vector
    for (let i = 0; i < dim; i++) {
      const value = vector[i] || 0;
      if (value < this.minValues[i]) {
        this.minValues[i] = value;
      }
      if (value > this.maxValues[i]) {
        this.maxValues[i] = value;
      }
    }

    // Recalculate center
    for (let i = 0; i < dim; i++) {
      this.center[i] = (this.minValues[i] + this.maxValues[i]) >> 1;
    }

    // Recalculate L1 radius
    let distance = 0;
    for (let i = 0; i < dim; i++) {
      const diff = vector[i] - this.center[i];
      distance += diff >= 0 ? diff : -diff;
    }
    if (distance > this.l1Radius) {
      this.l1Radius = distance;
    }

    // Update relevance mask for non-zero dimensions
    for (let i = 0; i < dim; i++) {
      const value = vector[i];
      if (value !== 0) {
        const byteIndex = (i / 8) | 0;
        const bitIndex = i % 8;
        this.relevanceMask[byteIndex] |= 1 << bitIndex;
      }
    }
  }
}

module.exports = BoundedDiamond;
