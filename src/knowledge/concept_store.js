const BoundedDiamond = require('../core/bounded_diamond');

/**
 * ConceptStore: Persistence of concepts, facts, and usage tracking.
 * DS(/knowledge/concept_store.js)
 *
 * Implements:
 * - Concept storage with diamonds (unions of bounded regions)
 * - Fact triple storage with indexing
 * - Usage tracking per DS(/knowledge/usage_tracking)
 * - Forgetting support per DS(/knowledge/forgetting)
 */
class ConceptStore {
  /**
   * @param {Object} deps - Dependencies
   * @param {number} deps.dimensions - Vector dimension count
   * @param {Object} [deps.config] - Configuration object
   * @param {Object} [deps.storage] - StorageAdapter for persistence
   * @param {Object} [deps.audit] - AuditLog for tracking changes
   */
  constructor(deps) {
    // Support legacy constructor(dimensions) pattern
    if (typeof deps === 'number') {
      deps = { dimensions: deps };
    }

    this.dimensions = deps.dimensions;
    this.config = deps.config || {};
    this.storage = deps.storage || null;
    this.audit = deps.audit || null;

    this._concepts = new Map();
    this._facts = [];
    this._factIndex = new Map(); // subject -> [fact indices]

    // Usage tracking
    this._usageMetrics = new Map(); // conceptLabel -> UsageMetrics
    this._factUsage = new Map(); // factId -> UsageMetrics
    this._relationUsage = new Map(); // relation -> UsageMetrics

    // Protection for forgetting
    this._protected = new Set(); // concept labels that cannot be forgotten

    // =========================================================================
    // Existence Tracking (v3.0)
    // =========================================================================
    // Index for fast existence-level queries: subject -> sorted array by existence
    this._existenceIndex = new Map(); // subject -> { entries: [{factId, existence}] }

    // Existence level constants
    this.EXISTENCE = {
      IMPOSSIBLE: -127,   // Contradicted by facts
      UNPROVEN: -64,      // Asserted but not verified
      POSSIBLE: 0,        // Consistent but not established
      DEMONSTRATED: 64,   // Derived via reasoning
      CERTAIN: 127        // From theory/axioms
    };
  }

  // =========================================================================
  // Concept Management
  // =========================================================================

  /**
   * Ensure concept exists, creating if needed
   * @param {string} label - Concept label
   * @returns {Object} Concept entry with diamonds
   */
  ensureConcept(label) {
    let entry = this._concepts.get(label);
    if (!entry) {
      const diamond = new BoundedDiamond(label, label, this.dimensions);
      const vector = new Int8Array(this.dimensions);
      diamond.initialiseFromVector(vector);
      entry = {
        label,
        diamonds: [diamond]
      };
      this._concepts.set(label, entry);

      // Initialize usage metrics
      this._initUsageMetrics(label);
    }
    return entry;
  }

  /**
   * Get concept by label
   * @param {string} label - Concept label
   * @returns {Object|null} Concept entry or null
   */
  getConcept(label) {
    const concept = this._concepts.get(label) || null;
    if (concept) {
      this._recordUsage(label, 'query');
    }
    return concept;
  }

  /**
   * Upsert concept with new diamonds
   * @param {string} id - Concept ID
   * @param {string} label - Human-readable label
   * @param {Array} diamonds - Array of BoundedDiamond instances
   * @returns {Object} Updated concept entry
   */
  upsertConcept(id, label, diamonds) {
    let entry = this._concepts.get(id);
    if (entry) {
      entry.label = label;
      entry.diamonds = diamonds;
      this._recordUsage(id, 'assert');
    } else {
      entry = { label, diamonds };
      this._concepts.set(id, entry);
      this._initUsageMetrics(id);
      this._recordUsage(id, 'assert');
    }
    return entry;
  }

  /**
   * Add observation to concept (for learning/clustering)
   * @param {string} conceptId - Concept ID
   * @param {Int8Array} vector - Observation vector
   */
  addObservation(conceptId, vector) {
    const entry = this.ensureConcept(conceptId);
    // For now, expand the first diamond to include the observation
    // TODO: Implement proper clustering via ClusterManager
    if (entry.diamonds.length > 0) {
      entry.diamonds[0].expand(vector);
    }
    this._recordUsage(conceptId, 'inference');
  }

  /**
   * List all concept IDs
   * @returns {Array<string>} Concept IDs
   */
  listConcepts() {
    return Array.from(this._concepts.keys());
  }

  /**
   * Create snapshot of concept state
   * @param {string} conceptId - Concept ID
   * @returns {Object|null} Snapshot or null if not found
   */
  snapshot(conceptId) {
    const entry = this._concepts.get(conceptId);
    if (!entry) return null;

    return {
      id: conceptId,
      label: entry.label,
      diamonds: entry.diamonds.map(d => ({
        center: d.center ? Array.from(d.center) : [],
        l1Radius: d.l1Radius || 0,
        minValues: d.minValues ? Array.from(d.minValues) : [],
        maxValues: d.maxValues ? Array.from(d.maxValues) : []
      })),
      usage: this.getUsageStats(conceptId),
      timestamp: new Date().toISOString()
    };
  }

  // =========================================================================
  // Fact Management
  // =========================================================================

  /**
   * Add fact triple with optional existence level
   * @param {Object} triple - {subject, relation, object}
   * @param {Object} [options] - Options including existence level
   * @param {number} [options.existence=127] - Existence level (-127 to 127)
   * @returns {number} Fact ID (index)
   */
  addFact(triple, options = {}) {
    const existence = typeof options.existence === 'number'
      ? options.existence
      : this.EXISTENCE.CERTAIN;

    // Version unification: check for existing fact with same triple
    const existingBest = this.getBestExistenceFact(triple.subject, triple.relation, triple.object);
    if (existingBest) {
      if (existingBest._existence >= existence) {
        // Don't create duplicate - higher or equal certainty already exists
        // Just record usage for the existing fact
        this._recordUsage(triple.subject, 'assert');
        if (triple.object) {
          this._recordUsage(triple.object, 'assert');
        }
        return existingBest._id;
      } else {
        // Upgrade existing fact to higher existence level
        this.upgradeExistence(existingBest._id, existence);
        this._recordUsage(triple.subject, 'assert');
        if (triple.object) {
          this._recordUsage(triple.object, 'assert');
        }
        return existingBest._id;
      }
    }

    const factId = this._facts.length;
    const fact = { ...triple, _id: factId, _existence: existence };
    this._facts.push(fact);

    // Index by subject
    if (!this._factIndex.has(triple.subject)) {
      this._factIndex.set(triple.subject, []);
    }
    this._factIndex.get(triple.subject).push(factId);

    // Update existence index (sorted by existence descending)
    this._updateExistenceIndex(triple.subject, factId, existence);

    // Track usage for subject and object concepts
    this._recordUsage(triple.subject, 'assert');
    if (triple.object) {
      this._recordUsage(triple.object, 'assert');
    }

    // Track relation usage
    this._recordRelationUsage(triple.relation);

    // Initialize fact usage
    this._factUsage.set(factId, this._createUsageMetrics());

    // Audit log
    if (this.audit) {
      this.audit.log('fact_added', { factId, triple, existence });
    }

    return factId;
  }

  /**
   * Remove fact by ID
   * @param {number} factId - Fact ID
   * @returns {boolean} True if removed
   */
  removeFact(factId) {
    if (factId < 0 || factId >= this._facts.length) return false;

    const fact = this._facts[factId];
    if (!fact || fact._deleted) return false;

    // Mark as deleted (soft delete for audit trail)
    fact._deleted = true;

    // Remove from subject index
    const subjectFacts = this._factIndex.get(fact.subject);
    if (subjectFacts) {
      const idx = subjectFacts.indexOf(factId);
      if (idx !== -1) subjectFacts.splice(idx, 1);
    }

    // Remove from existence index
    const existenceList = this._existenceIndex.get(fact.subject);
    if (existenceList) {
      const existIdx = existenceList.entries.findIndex(e => e.factId === factId);
      if (existIdx !== -1) existenceList.entries.splice(existIdx, 1);
    }

    // Audit log
    if (this.audit) {
      this.audit.log('fact_removed', { factId, triple: fact });
    }

    return true;
  }

  /**
   * Get all facts (excluding deleted)
   * @returns {Array} Facts
   */
  getFacts() {
    return this._facts
      .filter(f => !f._deleted)
      .map(f => ({ subject: f.subject, relation: f.relation, object: f.object }));
  }

  /**
   * Find facts by subject
   * @param {string} subject - Subject to search
   * @returns {Array} Matching facts
   */
  getFactsBySubject(subject) {
    const indices = this._factIndex.get(subject) || [];
    return indices
      .map(i => this._facts[i])
      .filter(f => f && !f._deleted);
  }

  // =========================================================================
  // Existence Tracking Methods (v3.0)
  // =========================================================================

  /**
   * Update the existence index for a subject (sorted descending by existence)
   * @private
   * @param {string} subject - Subject label
   * @param {number} factId - Fact ID
   * @param {number} existence - Existence level (-127 to 127)
   */
  _updateExistenceIndex(subject, factId, existence) {
    if (!this._existenceIndex.has(subject)) {
      this._existenceIndex.set(subject, { entries: [] });
    }

    const list = this._existenceIndex.get(subject);
    const entry = { factId, existence };

    // Binary search insert to maintain descending order by existence
    let left = 0;
    let right = list.entries.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (list.entries[mid].existence > existence) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    list.entries.splice(left, 0, entry);
  }

  /**
   * Get the fact with highest existence for a given subject/relation/object triple
   * Used for version unification (higher existence wins)
   * @param {string} subject - Subject label
   * @param {string} relation - Relation type
   * @param {string} [object] - Object label (optional)
   * @returns {Object|null} Fact with highest existence or null
   */
  getBestExistenceFact(subject, relation, object) {
    const facts = this.getFactsBySubject(subject);

    // Filter by relation and object, keeping track of highest existence
    let best = null;
    let bestExistence = -128; // Lower than IMPOSSIBLE

    for (const fact of facts) {
      if (fact.relation !== relation) continue;
      if (object !== undefined && fact.object !== object) continue;

      const factExistence = fact._existence !== undefined
        ? fact._existence
        : this.EXISTENCE.CERTAIN;

      if (factExistence > bestExistence) {
        best = fact;
        bestExistence = factExistence;
      }
    }

    return best;
  }

  /**
   * Get all facts with existence level at or above threshold
   * @param {number} minExistence - Minimum existence level (inclusive)
   * @returns {Array} Facts meeting threshold
   */
  getFactsByExistence(minExistence) {
    return this._facts
      .filter(f => {
        if (f._deleted) return false;
        const existence = f._existence !== undefined ? f._existence : this.EXISTENCE.CERTAIN;
        return existence >= minExistence;
      });
  }

  /**
   * Get facts for a subject with their existence levels
   * Returns sorted by existence (highest first)
   * @param {string} subject - Subject label
   * @returns {Array} Facts with _existence field, sorted descending
   */
  getFactsWithExistence(subject) {
    const list = this._existenceIndex.get(subject);
    if (!list) return [];

    return list.entries
      .map(e => this._facts[e.factId])
      .filter(f => f && !f._deleted);
  }

  /**
   * Get facts for a subject filtered by relation and existence level
   * @param {string} subject - Subject label
   * @param {string} relation - Relation type
   * @param {number} [minExistence] - Minimum existence level
   * @returns {Array} Matching facts
   */
  getFactsBySubjectAndRelation(subject, relation, minExistence) {
    const facts = this.getFactsBySubject(subject);

    return facts.filter(f => {
      if (f.relation !== relation) return false;
      if (minExistence !== undefined) {
        const existence = f._existence !== undefined ? f._existence : this.EXISTENCE.CERTAIN;
        if (existence < minExistence) return false;
      }
      return true;
    });
  }

  /**
   * Update existence level for an existing fact
   * Only upgrades (higher existence replaces lower)
   * @param {number} factId - Fact ID
   * @param {number} newExistence - New existence level
   * @returns {boolean} True if upgraded
   */
  upgradeExistence(factId, newExistence) {
    const fact = this._facts[factId];
    if (!fact || fact._deleted) return false;

    const currentExistence = fact._existence !== undefined ? fact._existence : this.EXISTENCE.CERTAIN;
    if (newExistence <= currentExistence) return false;

    // Update the fact
    fact._existence = newExistence;

    // Update existence index (remove and re-insert to maintain sort)
    const list = this._existenceIndex.get(fact.subject);
    if (list) {
      const idx = list.entries.findIndex(e => e.factId === factId);
      if (idx !== -1) {
        list.entries.splice(idx, 1);
        this._updateExistenceIndex(fact.subject, factId, newExistence);
      }
    }

    if (this.audit) {
      this.audit.log('existence_upgraded', {
        factId,
        from: currentExistence,
        to: newExistence,
        triple: { subject: fact.subject, relation: fact.relation, object: fact.object }
      });
    }

    return true;
  }

  /**
   * Create a snapshot of all facts for later restoration
   * Used by theory layers for counterfactual reasoning
   * @returns {Array} Deep copy of facts array with existence levels
   */
  snapshotFacts() {
    return this._facts
      .filter(f => !f._deleted)
      .map(f => ({
        subject: f.subject,
        relation: f.relation,
        object: f.object,
        _existence: f._existence !== undefined ? f._existence : this.EXISTENCE.CERTAIN
      }));
  }

  /**
   * Restore facts from a snapshot, replacing current facts
   * Used by THEORY_POP to revert to previous state
   * @param {Array} snapshot - Facts array from snapshotFacts()
   */
  restoreFacts(snapshot) {
    // Clear current facts and indices
    this._facts = [];
    this._factIndex.clear();
    this._existenceIndex.clear();

    // Re-add each fact from snapshot
    for (const fact of snapshot) {
      const factId = this._facts.length;
      const existence = fact._existence !== undefined ? fact._existence : this.EXISTENCE.CERTAIN;

      this._facts.push({
        subject: fact.subject,
        relation: fact.relation,
        object: fact.object,
        _id: factId,
        _existence: existence
      });

      // Rebuild subject index
      if (!this._factIndex.has(fact.subject)) {
        this._factIndex.set(fact.subject, []);
      }
      this._factIndex.get(fact.subject).push(factId);

      // Rebuild existence index
      this._updateExistenceIndex(fact.subject, factId, existence);
    }

    if (this.audit) {
      this.audit.log('facts_restored', { count: snapshot.length });
    }
  }

  // =========================================================================
  // Usage Tracking (DS:/knowledge/usage_tracking)
  // =========================================================================

  _createUsageMetrics() {
    return {
      usageCount: 0,
      assertCount: 0,
      queryCount: 0,
      inferenceCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };
  }

  _initUsageMetrics(label) {
    if (!this._usageMetrics.has(label)) {
      this._usageMetrics.set(label, this._createUsageMetrics());
    }
  }

  _recordUsage(label, type) {
    if (!this._usageMetrics.has(label)) {
      this._initUsageMetrics(label);
    }

    const metrics = this._usageMetrics.get(label);
    metrics.usageCount++;
    metrics.lastUsedAt = new Date().toISOString();

    switch (type) {
      case 'assert':
        metrics.assertCount++;
        break;
      case 'query':
        metrics.queryCount++;
        break;
      case 'inference':
        metrics.inferenceCount++;
        break;
    }
  }

  _recordRelationUsage(relation) {
    if (!this._relationUsage.has(relation)) {
      this._relationUsage.set(relation, this._createUsageMetrics());
    }
    const metrics = this._relationUsage.get(relation);
    metrics.usageCount++;
    metrics.lastUsedAt = new Date().toISOString();
  }

  /**
   * Get usage statistics for a concept
   * @param {string} label - Concept label
   * @returns {Object|null} Usage metrics or null
   */
  getUsageStats(label) {
    const metrics = this._usageMetrics.get(label);
    if (!metrics) return null;

    // Calculate derived metrics
    const now = Date.now();
    const lastUsed = new Date(metrics.lastUsedAt).getTime();
    const created = new Date(metrics.createdAt).getTime();
    const age = now - created;
    const recencyMs = now - lastUsed;

    // Normalize to 0-1 (recency decays over 30 days)
    const recencyDays = recencyMs / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - (recencyDays / 30));

    // Frequency: log scale normalized (max at ~1000 uses)
    const frequency = Math.min(1, Math.log10(metrics.usageCount + 1) / 3);

    // Priority combines both
    const priority = (recency * 0.4) + (frequency * 0.6);

    return {
      ...metrics,
      recency: Math.round(recency * 100) / 100,
      frequency: Math.round(frequency * 100) / 100,
      priority: Math.round(priority * 100) / 100
    };
  }

  /**
   * Get concepts ordered by usage
   * @param {Object} options
   * @param {number} [options.limit=10] - Max results
   * @param {string} [options.order='priority'] - Sort by: priority, frequency, recency, usageCount
   * @returns {Array} Sorted concept labels with usage stats
   */
  getConceptsByUsage(options = {}) {
    const { limit = 10, order = 'priority' } = options;

    const results = [];
    for (const label of this._concepts.keys()) {
      const stats = this.getUsageStats(label);
      if (stats) {
        results.push({ label, ...stats });
      }
    }

    // Sort by specified field
    results.sort((a, b) => b[order] - a[order]);

    return results.slice(0, limit);
  }

  /**
   * Boost usage count for concept (manual prioritization)
   * @param {string} label - Concept label
   * @param {number} [amount=10] - Boost amount
   */
  boostUsage(label, amount = 10) {
    this._initUsageMetrics(label);
    const metrics = this._usageMetrics.get(label);
    metrics.usageCount += amount;
    metrics.lastUsedAt = new Date().toISOString();

    if (this.audit) {
      this.audit.log('usage_boosted', { label, amount });
    }
  }

  // =========================================================================
  // Forgetting (DS:/knowledge/forgetting)
  // =========================================================================

  /**
   * Protect concept from forgetting
   * @param {string} label - Concept label
   */
  protect(label) {
    this._protected.add(label);
    if (this.audit) {
      this.audit.log('concept_protected', { label });
    }
  }

  /**
   * Remove protection from concept
   * @param {string} label - Concept label
   */
  unprotect(label) {
    this._protected.delete(label);
    if (this.audit) {
      this.audit.log('concept_unprotected', { label });
    }
  }

  /**
   * Check if concept is protected
   * @param {string} label - Concept label
   * @returns {boolean}
   */
  isProtected(label) {
    return this._protected.has(label);
  }

  /**
   * Get list of protected concepts
   * @returns {Array<string>}
   */
  listProtected() {
    return Array.from(this._protected);
  }

  /**
   * Forget concepts based on criteria
   * @param {Object} criteria
   * @param {number} [criteria.threshold] - Forget if usageCount < threshold
   * @param {string} [criteria.olderThan] - Forget if not used within period (e.g., "7d", "30d")
   * @param {string} [criteria.concept] - Forget specific concept
   * @param {string} [criteria.pattern] - Forget matching pattern (e.g., "temp_*")
   * @param {boolean} [criteria.dryRun=false] - Preview only, don't delete
   * @returns {Object} {removed: [], count, protected: [], skipped}
   */
  forget(criteria = {}) {
    const { threshold, olderThan, concept, pattern, dryRun = false } = criteria;

    const toRemove = [];
    const protectedList = [];

    // Single concept
    if (concept) {
      if (this._protected.has(concept)) {
        protectedList.push(concept);
      } else if (this._concepts.has(concept)) {
        toRemove.push(concept);
      }
    }
    // Pattern matching
    else if (pattern) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const label of this._concepts.keys()) {
        if (regex.test(label)) {
          if (this._protected.has(label)) {
            protectedList.push(label);
          } else {
            toRemove.push(label);
          }
        }
      }
    }
    // Threshold-based
    else {
      const now = Date.now();
      let olderThanMs = 0;

      if (olderThan) {
        const match = olderThan.match(/^(\d+)([dhm])$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          const multipliers = { d: 86400000, h: 3600000, m: 60000 };
          olderThanMs = value * multipliers[unit];
        }
      }

      for (const label of this._concepts.keys()) {
        if (this._protected.has(label)) {
          continue; // Skip protected
        }

        const metrics = this._usageMetrics.get(label);
        if (!metrics) continue;

        let shouldForget = true;

        // Check usage threshold
        if (threshold !== undefined && metrics.usageCount >= threshold) {
          shouldForget = false;
        }

        // Check time threshold
        if (olderThanMs > 0) {
          const lastUsed = new Date(metrics.lastUsedAt).getTime();
          if ((now - lastUsed) < olderThanMs) {
            shouldForget = false;
          }
        }

        // Need at least one criterion
        if (threshold === undefined && !olderThanMs) {
          shouldForget = false;
        }

        if (shouldForget) {
          toRemove.push(label);
        }
      }
    }

    // Execute removal (unless dry run)
    if (!dryRun) {
      for (const label of toRemove) {
        // Remove concept
        this._concepts.delete(label);
        this._usageMetrics.delete(label);

        // Remove associated facts
        const factIndices = this._factIndex.get(label) || [];
        for (const idx of factIndices) {
          if (this._facts[idx]) {
            this._facts[idx]._deleted = true;
          }
        }
        this._factIndex.delete(label);
      }

      if (this.audit && toRemove.length > 0) {
        this.audit.log('concepts_forgotten', {
          labels: toRemove,
          count: toRemove.length,
          criteria
        });
      }
    }

    return {
      removed: dryRun ? [] : toRemove,
      wouldRemove: dryRun ? toRemove : undefined,
      count: toRemove.length,
      protected: protectedList,
      skipped: protectedList.length
    };
  }

  // =========================================================================
  // FS-10/NFS-007: Persistence via StorageAdapter
  // =========================================================================

  /**
   * Save current store state to storage
   * Persists facts, concepts, and usage metrics
   * @returns {boolean} Success status
   */
  saveToStorage() {
    if (!this.storage) {
      return false;
    }

    try {
      const snapshot = this.createFullSnapshot();
      const result = this.storage.saveStoreSnapshot(snapshot);

      if (this.audit) {
        this.audit.log('store_saved', {
          facts: snapshot.facts.length,
          concepts: snapshot.concepts.length,
          timestamp: snapshot.timestamp
        });
      }

      return result;
    } catch (e) {
      if (this.audit) {
        this.audit.log('store_save_error', { error: e.message });
      }
      return false;
    }
  }

  /**
   * Load store state from storage
   * Restores facts, concepts, and usage metrics
   * @returns {boolean} Success status
   */
  loadFromStorage() {
    if (!this.storage) {
      return false;
    }

    try {
      const snapshot = this.storage.loadStoreSnapshot();
      if (!snapshot) {
        return false;
      }

      this.restoreFromSnapshot(snapshot);

      if (this.audit) {
        this.audit.log('store_loaded', {
          facts: this._facts.length,
          concepts: this._concepts.size,
          timestamp: snapshot.timestamp
        });
      }

      return true;
    } catch (e) {
      if (this.audit) {
        this.audit.log('store_load_error', { error: e.message });
      }
      return false;
    }
  }

  /**
   * Create a full snapshot of the store state
   * @returns {Object} Full snapshot including facts, concepts, and usage
   */
  createFullSnapshot() {
    // Snapshot facts with existence
    const facts = this._facts
      .filter(f => !f._deleted)
      .map(f => ({
        subject: f.subject,
        relation: f.relation,
        object: f.object,
        _existence: f._existence !== undefined ? f._existence : this.EXISTENCE.CERTAIN
      }));

    // Snapshot concepts (serialize diamonds)
    const concepts = [];
    for (const [label, entry] of this._concepts.entries()) {
      concepts.push({
        label,
        diamonds: entry.diamonds.map(d => ({
          id: d.id,
          label: d.label,
          center: d.center ? Array.from(d.center) : [],
          l1Radius: d.l1Radius,
          minValues: d.minValues ? Array.from(d.minValues) : [],
          maxValues: d.maxValues ? Array.from(d.maxValues) : []
        }))
      });
    }

    // Snapshot usage metrics
    const usageMetrics = {};
    for (const [label, metrics] of this._usageMetrics.entries()) {
      usageMetrics[label] = { ...metrics };
    }

    // Snapshot protected concepts
    const protectedConcepts = Array.from(this._protected);

    return {
      version: '3.0',
      timestamp: new Date().toISOString(),
      dimensions: this.dimensions,
      facts,
      concepts,
      usageMetrics,
      protectedConcepts
    };
  }

  /**
   * Restore store state from a snapshot
   * @param {Object} snapshot - Full snapshot
   */
  restoreFromSnapshot(snapshot) {
    // Clear current state
    this._facts = [];
    this._factIndex.clear();
    this._existenceIndex.clear();
    this._concepts.clear();
    this._usageMetrics.clear();
    this._protected.clear();

    // Restore facts
    if (Array.isArray(snapshot.facts)) {
      for (const fact of snapshot.facts) {
        const factId = this._facts.length;
        const existence = fact._existence !== undefined ? fact._existence : this.EXISTENCE.CERTAIN;

        this._facts.push({
          subject: fact.subject,
          relation: fact.relation,
          object: fact.object,
          _id: factId,
          _existence: existence
        });

        // Rebuild indices
        if (!this._factIndex.has(fact.subject)) {
          this._factIndex.set(fact.subject, []);
        }
        this._factIndex.get(fact.subject).push(factId);
        this._updateExistenceIndex(fact.subject, factId, existence);
      }
    }

    // Restore concepts (requires BoundedDiamond)
    if (Array.isArray(snapshot.concepts)) {
      for (const conceptData of snapshot.concepts) {
        const diamonds = conceptData.diamonds.map(d => {
          const diamond = new BoundedDiamond(d.id, d.label, this.dimensions);
          if (d.center) {
            for (let i = 0; i < d.center.length; i++) {
              diamond.center[i] = d.center[i];
            }
          }
          if (d.minValues) {
            for (let i = 0; i < d.minValues.length; i++) {
              diamond.minValues[i] = d.minValues[i];
            }
          }
          if (d.maxValues) {
            for (let i = 0; i < d.maxValues.length; i++) {
              diamond.maxValues[i] = d.maxValues[i];
            }
          }
          diamond.l1Radius = d.l1Radius || 0;
          return diamond;
        });

        this._concepts.set(conceptData.label, {
          label: conceptData.label,
          diamonds
        });
      }
    }

    // Restore usage metrics
    if (snapshot.usageMetrics && typeof snapshot.usageMetrics === 'object') {
      for (const [label, metrics] of Object.entries(snapshot.usageMetrics)) {
        this._usageMetrics.set(label, { ...metrics });
      }
    }

    // Restore protected concepts
    if (Array.isArray(snapshot.protectedConcepts)) {
      for (const label of snapshot.protectedConcepts) {
        this._protected.add(label);
      }
    }
  }

  /**
   * Check if storage is configured
   * @returns {boolean}
   */
  hasStorage() {
    return this.storage !== null;
  }

  /**
   * Set storage adapter
   * @param {StorageAdapter} storage
   */
  setStorage(storage) {
    this.storage = storage;
  }
}

module.exports = ConceptStore;
