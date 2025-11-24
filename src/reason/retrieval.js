class Retriever {
  constructor({ config, math, store }) {
    this.config = config;
    this.math = math;
    this.store = store;
    const indexCfg = config.getIndexStrategy();
    this.strategy = indexCfg.strategy;
    this.params = indexCfg.params || {};
    this.dimensions = config.get('dimensions');
    this._hashDims = this._buildHashDimensions();
    this._buckets = new Map();
    this.refreshAll();
  }

  setStrategy(strategyConfig) {
    if (strategyConfig && strategyConfig.strategy) {
      this.strategy = strategyConfig.strategy;
    }
  }

  _buildHashDimensions() {
    const count = this.params.lshHashes && Number.isInteger(this.params.lshHashes)
      ? this.params.lshHashes
      : 16;
    const dim = this.dimensions;
    const limit = Math.min(count, dim);
    const dims = [];
    for (let i = 0; i < limit; i += 1) {
      dims.push(i);
    }
    return dims;
  }

  _hashVector(vector) {
    const bits = [];
    const dims = this._hashDims;
    for (let i = 0; i < dims.length; i += 1) {
      const idx = dims[i];
      const value = vector[idx] || 0;
      bits.push(value >= 0 ? '1' : '0');
    }
    return bits.join('');
  }

  indexConcept(concept) {
    if (!concept || !concept.diamonds) {
      return;
    }
    for (const d of concept.diamonds) {
      const key = this._hashVector(d.center);
      let bucket = this._buckets.get(key);
      if (!bucket) {
        bucket = [];
        this._buckets.set(key, bucket);
      }
      bucket.push({ label: concept.label, diamond: d });
    }
  }

  nearest(vector, { k = 1 } = {}) {
    this.refreshAll();
    const results = [];
    const key = this._hashVector(vector);
    const bucket = this._buckets.get(key) || [];
    for (const entry of bucket) {
      const dist = this.math.distanceMaskedL1(vector, entry.diamond);
      if (Number.isFinite(dist)) {
        results.push({ label: entry.label, diamond: entry.diamond, distance: dist });
      }
    }
    if (results.length === 0) {
      for (const [label, concept] of this.store._concepts.entries()) {
        for (const d of concept.diamonds) {
          const dist = this.math.distanceMaskedL1(vector, d);
          if (Number.isFinite(dist)) {
            results.push({ label, diamond: d, distance: dist });
          }
        }
      }
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  probe(vector) {
    return this.nearest(vector, { k: 1 });
  }

  refreshAll() {
    this._buckets = new Map();
    for (const concept of this.store._concepts.values()) {
      this.indexConcept(concept);
    }
  }
}

module.exports = Retriever;
