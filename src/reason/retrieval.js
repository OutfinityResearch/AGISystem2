/**
 * Retriever - Efficient nearest neighbor search for geometric diamonds
 *
 * Uses Locality Sensitive Hashing (LSH) with intelligent caching:
 * - Lazy index refresh (only when store changes)
 * - Multi-probe LSH for better recall
 * - Configurable strategies (lsh, brute_force, hybrid)
 *
 * Performance improvements over naive approach:
 * - Removed refreshAll() from every query (was O(n) per query!)
 * - Added dirty tracking for invalidation-based cache
 * - Multi-probe searches neighboring buckets for better recall
 */
class Retriever {
  constructor({ config, math, store }) {
    this.config = config;
    this.math = math;
    this.store = store;

    const indexCfg = config.getIndexStrategy();
    this.strategy = indexCfg.strategy || 'lsh';
    this.params = indexCfg.params || {};
    this.dimensions = config.get('dimensions');

    // LSH configuration
    this._hashDims = this._buildHashDimensions();
    this._buckets = new Map();
    this._indexedConcepts = new Set();

    // Dirty tracking for lazy refresh
    this._dirty = true;
    this._storeVersion = 0;
    this._lastKnownStoreSize = 0;

    // Multi-probe configuration
    this._multiProbeDepth = this.params.multiProbeDepth || 2;

    // Statistics for tuning
    this._stats = {
      queries: 0,
      cacheHits: 0,
      fullRefreshes: 0,
      incrementalUpdates: 0,
      bruteForceQueries: 0
    };

    // Do initial indexing
    this._ensureIndexed();
  }

  /**
   * Set the search strategy at runtime
   * @param {Object} strategyConfig - { strategy: 'lsh'|'brute_force'|'hybrid', params: {} }
   */
  setStrategy(strategyConfig) {
    if (strategyConfig && strategyConfig.strategy) {
      this.strategy = strategyConfig.strategy;
      if (strategyConfig.params) {
        this.params = { ...this.params, ...strategyConfig.params };
        // Rebuild hash dimensions if lshHashes changed
        if (strategyConfig.params.lshHashes) {
          this._hashDims = this._buildHashDimensions();
          this._dirty = true;
        }
      }
    }
  }

  /**
   * Build hash dimension indices for LSH
   * Uses configurable number of dimensions for hashing
   */
  _buildHashDimensions() {
    const count = this.params.lshHashes && Number.isInteger(this.params.lshHashes)
      ? this.params.lshHashes
      : 16;
    const dim = this.dimensions;
    const limit = Math.min(count, dim);

    // Use evenly distributed dimensions for better coverage
    const dims = [];
    const step = dim / limit;
    for (let i = 0; i < limit; i++) {
      dims.push(Math.floor(i * step));
    }
    return dims;
  }

  /**
   * Hash a vector to an LSH bucket key
   * @param {Int8Array|Array} vector - The vector to hash
   * @returns {string} Binary hash string
   */
  _hashVector(vector) {
    const bits = [];
    const dims = this._hashDims;
    for (let i = 0; i < dims.length; i++) {
      const idx = dims[i];
      const value = vector[idx] || 0;
      bits.push(value >= 0 ? '1' : '0');
    }
    return bits.join('');
  }

  /**
   * Generate multi-probe keys (neighboring buckets)
   * Flips bits one at a time to find nearby buckets
   * @param {string} key - Original hash key
   * @param {number} depth - How many bits to flip
   * @returns {Array<string>} Array of probe keys including original
   */
  _multiProbeKeys(key, depth = this._multiProbeDepth) {
    const keys = [key];
    if (depth <= 0) return keys;

    // Generate keys with 1 bit flipped
    for (let i = 0; i < key.length && keys.length < 16; i++) {
      const flipped = key.substring(0, i) +
                      (key[i] === '1' ? '0' : '1') +
                      key.substring(i + 1);
      keys.push(flipped);
    }

    // If depth > 1, generate keys with 2 bits flipped
    if (depth > 1 && key.length > 1) {
      for (let i = 0; i < Math.min(key.length, 8); i++) {
        for (let j = i + 1; j < Math.min(key.length, 8); j++) {
          if (keys.length >= 32) break;
          let flipped = key.split('');
          flipped[i] = flipped[i] === '1' ? '0' : '1';
          flipped[j] = flipped[j] === '1' ? '0' : '1';
          keys.push(flipped.join(''));
        }
      }
    }

    return keys;
  }

  /**
   * Check if the store has changed since last indexing
   * Uses store size as a heuristic (ideally store would emit events)
   */
  _checkStoreChanged() {
    const currentSize = this.store._concepts ? this.store._concepts.size : 0;
    if (currentSize !== this._lastKnownStoreSize) {
      return true;
    }
    return false;
  }

  /**
   * Ensure index is up-to-date
   * Uses lazy refresh strategy - only rebuilds when necessary
   */
  _ensureIndexed() {
    if (this._dirty || this._checkStoreChanged()) {
      this._refreshIncremental();
    }
    this._stats.cacheHits++;
  }

  /**
   * Index a single concept into LSH buckets
   * @param {Object} concept - Concept with diamonds array
   */
  indexConcept(concept) {
    if (!concept || !concept.diamonds) {
      return;
    }

    // Skip if already indexed
    if (this._indexedConcepts.has(concept.label)) {
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

    this._indexedConcepts.add(concept.label);
  }

  /**
   * Remove a concept from the index
   * @param {string} label - Concept label to remove
   */
  removeConcept(label) {
    if (!this._indexedConcepts.has(label)) {
      return;
    }

    // Remove from all buckets
    for (const [key, bucket] of this._buckets.entries()) {
      const filtered = bucket.filter(entry => entry.label !== label);
      if (filtered.length === 0) {
        this._buckets.delete(key);
      } else if (filtered.length !== bucket.length) {
        this._buckets.set(key, filtered);
      }
    }

    this._indexedConcepts.delete(label);
  }

  /**
   * Find k nearest neighbors to a query vector
   * @param {Int8Array|Array} vector - Query vector
   * @param {Object} options - { k: number }
   * @returns {Array<{label, diamond, distance}>} Sorted by distance
   */
  nearest(vector, { k = 1 } = {}) {
    this._stats.queries++;

    // Ensure index is current WITHOUT full refresh every time
    this._ensureIndexed();

    // Route to appropriate strategy
    switch (this.strategy) {
      case 'brute_force':
        return this._bruteForceSearch(vector, k);
      case 'hybrid':
        return this._hybridSearch(vector, k);
      case 'lsh':
      default:
        return this._lshSearch(vector, k);
    }
  }

  /**
   * LSH-based search with multi-probe
   */
  _lshSearch(vector, k) {
    const results = [];
    const seen = new Set();

    // Get multi-probe keys
    const primaryKey = this._hashVector(vector);
    const probeKeys = this._multiProbeKeys(primaryKey);

    // Search all probe buckets
    for (const key of probeKeys) {
      const bucket = this._buckets.get(key);
      if (!bucket) continue;

      for (const entry of bucket) {
        // Avoid duplicates across buckets
        const entryKey = `${entry.label}:${entry.diamond.center.slice(0, 3).join(',')}`;
        if (seen.has(entryKey)) continue;
        seen.add(entryKey);

        const dist = this.math.distanceMaskedL1(vector, entry.diamond);
        if (Number.isFinite(dist)) {
          results.push({ label: entry.label, diamond: entry.diamond, distance: dist });
        }
      }
    }

    // If LSH found nothing, fallback to brute force
    if (results.length === 0) {
      return this._bruteForceSearch(vector, k);
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  /**
   * Brute force search through all concepts
   * Used as fallback or for small stores
   */
  _bruteForceSearch(vector, k) {
    this._stats.bruteForceQueries++;
    const results = [];

    if (!this.store._concepts) return results;

    for (const [label, concept] of this.store._concepts.entries()) {
      if (!concept.diamonds) continue;

      for (const d of concept.diamonds) {
        const dist = this.math.distanceMaskedL1(vector, d);
        if (Number.isFinite(dist)) {
          results.push({ label, diamond: d, distance: dist });
        }
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  /**
   * Hybrid search: LSH first, brute force if insufficient results
   */
  _hybridSearch(vector, k) {
    const lshResults = this._lshSearch(vector, Math.min(k * 2, 10));

    // If LSH gave enough high-quality results, use them
    if (lshResults.length >= k) {
      return lshResults.slice(0, k);
    }

    // Otherwise fall back to brute force
    return this._bruteForceSearch(vector, k);
  }

  /**
   * Probe for single nearest neighbor (convenience method)
   * @param {Int8Array|Array} vector - Query vector
   * @returns {Array} Single-element array with nearest neighbor
   */
  probe(vector) {
    return this.nearest(vector, { k: 1 });
  }

  /**
   * Incremental refresh - only index new concepts
   * Much faster than full refresh for incremental updates
   */
  _refreshIncremental() {
    if (!this.store._concepts) {
      this._dirty = false;
      return;
    }

    const currentLabels = new Set(this.store._concepts.keys());

    // Remove concepts that no longer exist
    for (const label of this._indexedConcepts) {
      if (!currentLabels.has(label)) {
        this.removeConcept(label);
      }
    }

    // Index new concepts
    for (const concept of this.store._concepts.values()) {
      if (!this._indexedConcepts.has(concept.label)) {
        this.indexConcept(concept);
      }
    }

    this._lastKnownStoreSize = this.store._concepts.size;
    this._dirty = false;
    this._stats.incrementalUpdates++;
  }

  /**
   * Full refresh - rebuild entire index
   * Call this when store has been bulk-modified
   */
  refreshAll() {
    this._buckets = new Map();
    this._indexedConcepts = new Set();

    if (this.store._concepts) {
      for (const concept of this.store._concepts.values()) {
        this.indexConcept(concept);
      }
      this._lastKnownStoreSize = this.store._concepts.size;
    }

    this._dirty = false;
    this._stats.fullRefreshes++;
  }

  /**
   * Mark index as dirty (needs refresh)
   * Call this after bulk modifications to store
   */
  markDirty() {
    this._dirty = true;
  }

  /**
   * Get retrieval statistics for performance tuning
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this._stats,
      bucketCount: this._buckets.size,
      indexedConceptCount: this._indexedConcepts.size,
      avgBucketSize: this._buckets.size > 0
        ? [...this._buckets.values()].reduce((sum, b) => sum + b.length, 0) / this._buckets.size
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this._stats = {
      queries: 0,
      cacheHits: 0,
      fullRefreshes: 0,
      incrementalUpdates: 0,
      bruteForceQueries: 0
    };
  }
}

module.exports = Retriever;
