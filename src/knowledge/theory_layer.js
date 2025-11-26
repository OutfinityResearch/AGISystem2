/**
 * TheoryLayer - Contextual overlay for non-monotonic logic and counterfactuals
 *
 * Specifies overrides (min/max/radius/masks) on dimensions for concepts.
 * Immutable after creation to maintain determinism.
 *
 * DS: DS(/knowledge/theory_layer.js)
 */

const BoundedDiamond = require('../core/bounded_diamond');

class TheoryLayer {
  /**
   * Create a new theory layer
   * @param {Object} config - Config instance or {dimensions} object
   * @param {Object} params - Layer parameters
   * @param {string} params.id - Unique layer identifier
   * @param {string} [params.label] - Human-readable label
   * @param {number} [params.priority=0] - Layer priority (higher = applied later)
   * @param {Object} [params.metadata={}] - Provenance info (source, timestamp)
   * @param {Int8Array} [params.overrideMin] - Min value overrides per dimension
   * @param {Int8Array} [params.overrideMax] - Max value overrides per dimension
   * @param {number} [params.overrideRadius] - Radius override
   * @param {Uint8Array} [params.definitionMask] - Which dims this layer affects
   * @param {Uint8Array} [params.axiologyMask] - Value-centric axes highlight
   */
  constructor(config, params = {}) {
    const dimensions = typeof config === 'number'
      ? config
      : (config && config.get ? config.get('dimensions') : config.dimensions);

    if (!dimensions || dimensions <= 0) {
      throw new Error('TheoryLayer requires valid dimensions');
    }

    this.dimensions = dimensions;
    this.id = params.id || `layer_${Date.now()}`;
    this.label = params.label || this.id;
    this.priority = typeof params.priority === 'number' ? params.priority : 0;

    // Provenance metadata
    this.metadata = {
      source: params.metadata?.source || 'runtime',
      timestamp: params.metadata?.timestamp || new Date().toISOString(),
      ...(params.metadata || {})
    };

    // Allocate buffers
    const maskBytes = Math.ceil(dimensions / 8);

    // Definition mask: which dimensions this layer has opinions about
    this.definitionMask = params.definitionMask
      ? new Uint8Array(params.definitionMask)
      : new Uint8Array(maskBytes);

    // Optional axiology mask for value-centric reasoning
    this.axiologyMask = params.axiologyMask
      ? new Uint8Array(params.axiologyMask)
      : null;

    // Override values
    this.overrideMin = params.overrideMin
      ? new Int8Array(params.overrideMin)
      : new Int8Array(dimensions);

    this.overrideMax = params.overrideMax
      ? new Int8Array(params.overrideMax)
      : new Int8Array(dimensions);

    this.overrideRadius = typeof params.overrideRadius === 'number'
      ? params.overrideRadius
      : null;

    // Store facts associated with this layer (for counterfactuals)
    this.facts = Array.isArray(params.facts) ? [...params.facts] : [];

    // Freeze to enforce immutability
    Object.freeze(this.metadata);
  }

  /**
   * Check if this layer covers (has an opinion about) a specific dimension
   * @param {number} dimIndex - Dimension index to check
   * @returns {boolean} True if the layer defines this dimension
   */
  covers(dimIndex) {
    if (dimIndex < 0 || dimIndex >= this.dimensions) {
      return false;
    }
    const byteIndex = Math.floor(dimIndex / 8);
    const bitIndex = dimIndex % 8;
    return (this.definitionMask[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * Set a dimension as covered by this layer
   * @param {number} dimIndex - Dimension to mark as covered
   * @param {number} [minVal] - Override min value
   * @param {number} [maxVal] - Override max value
   */
  setDimension(dimIndex, minVal, maxVal) {
    if (dimIndex < 0 || dimIndex >= this.dimensions) {
      return;
    }
    const byteIndex = Math.floor(dimIndex / 8);
    const bitIndex = dimIndex % 8;
    this.definitionMask[byteIndex] |= (1 << bitIndex);

    if (typeof minVal === 'number') {
      this.overrideMin[dimIndex] = Math.max(-127, Math.min(127, minVal));
    }
    if (typeof maxVal === 'number') {
      this.overrideMax[dimIndex] = Math.max(-127, Math.min(127, maxVal));
    }
  }

  /**
   * Apply this layer's overrides to a base diamond
   * Returns a NEW diamond with overrides applied (non-mutating)
   * @param {BoundedDiamond} baseDiamond - The diamond to apply overrides to
   * @returns {BoundedDiamond} New diamond with overrides applied
   */
  applyTo(baseDiamond) {
    if (!baseDiamond) {
      return null;
    }

    // Clone the base diamond
    const result = new BoundedDiamond(
      baseDiamond.id || this.id,
      baseDiamond.label || this.label,
      this.dimensions
    );

    // Copy base values
    for (let i = 0; i < this.dimensions; i++) {
      result.minValues[i] = baseDiamond.minValues[i];
      result.maxValues[i] = baseDiamond.maxValues[i];
      result.center[i] = baseDiamond.center[i];
    }
    result.l1Radius = baseDiamond.l1Radius;

    // Copy relevance mask
    const maskBytes = Math.ceil(this.dimensions / 8);
    for (let i = 0; i < maskBytes; i++) {
      result.relevanceMask[i] = baseDiamond.relevanceMask[i];
    }

    // Apply overrides for dimensions where this layer has opinions
    for (let i = 0; i < this.dimensions; i++) {
      if (this.covers(i)) {
        // Apply min/max overrides
        if (this.overrideMin[i] !== 0 || this.overrideMax[i] !== 0) {
          result.minValues[i] = this.overrideMin[i];
          result.maxValues[i] = this.overrideMax[i];
          result.center[i] = Math.floor((result.minValues[i] + result.maxValues[i]) / 2);
        }
      }
    }

    // Apply radius override if set
    if (this.overrideRadius !== null) {
      result.l1Radius = this.overrideRadius;
    }

    return result;
  }

  /**
   * Add a fact to this layer
   * @param {Object} fact - Fact object {subject, relation, object}
   */
  addFact(fact) {
    if (fact && fact.subject && fact.relation && fact.object) {
      this.facts.push({ ...fact });
    }
  }

  /**
   * Get all facts in this layer
   * @returns {Array} Copy of facts array
   */
  getFacts() {
    return [...this.facts];
  }

  /**
   * Serialize to JSON for audit/export (provenance-safe)
   * @returns {Object} Serializable representation
   */
  toJSON() {
    return {
      id: this.id,
      label: this.label,
      priority: this.priority,
      dimensions: this.dimensions,
      metadata: { ...this.metadata },
      definitionMask: Array.from(this.definitionMask),
      axiologyMask: this.axiologyMask ? Array.from(this.axiologyMask) : null,
      overrideMin: Array.from(this.overrideMin),
      overrideMax: Array.from(this.overrideMax),
      overrideRadius: this.overrideRadius,
      facts: this.facts.map(f => ({ ...f })),
      _coveredDimensions: this._getCoveredDimensions()
    };
  }

  /**
   * Create a TheoryLayer from JSON
   * @param {Object} json - Serialized layer
   * @returns {TheoryLayer} Restored layer
   */
  static fromJSON(json) {
    return new TheoryLayer(json.dimensions, {
      id: json.id,
      label: json.label,
      priority: json.priority,
      metadata: json.metadata,
      definitionMask: json.definitionMask ? new Uint8Array(json.definitionMask) : undefined,
      axiologyMask: json.axiologyMask ? new Uint8Array(json.axiologyMask) : undefined,
      overrideMin: json.overrideMin ? new Int8Array(json.overrideMin) : undefined,
      overrideMax: json.overrideMax ? new Int8Array(json.overrideMax) : undefined,
      overrideRadius: json.overrideRadius,
      facts: json.facts
    });
  }

  /**
   * Get list of dimension indices this layer covers
   * @returns {number[]} Array of covered dimension indices
   * @private
   */
  _getCoveredDimensions() {
    const covered = [];
    for (let i = 0; i < this.dimensions; i++) {
      if (this.covers(i)) {
        covered.push(i);
      }
    }
    return covered;
  }
}

module.exports = TheoryLayer;
