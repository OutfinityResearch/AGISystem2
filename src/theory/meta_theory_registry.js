/**
 * DS(/theory/meta_theory_registry.js) - Meta-Theory Registry
 *
 * Maintains a registry of available theories with metadata:
 * - Theory name, description, domain, version
 * - Priority and applicability rules
 * - Dependencies on other theories
 * - Reasoning mode preferences
 * - Usage statistics (success rates)
 *
 * This is the "theory about theories" - loaded automatically and
 * updated when theories are loaded/used.
 *
 * Implements: FS-17
 *
 * @module theory/meta_theory_registry
 */

const fs = require('fs');
const path = require('path');

class MetaTheoryRegistry {
  /**
   * @param {Object} options
   * @param {string} [options.registryPath] - Path to registry JSON file
   * @param {Object} [options.storage] - Storage adapter for persistence
   */
  constructor(options = {}) {
    // Find default path relative to project root
    const projectRoot = path.resolve(__dirname, '..', '..');
    this.registryPath = options.registryPath ||
      path.join(projectRoot, 'data', 'init', 'meta_registry.json');

    this.storage = options.storage || null;

    // Registry data structure
    this.theories = new Map();  // theoryId -> TheoryMeta
    this.reasoningStats = new Map();  // method -> { success, total }
    this.lastUpdated = null;

    // Load existing registry
    this._load();
  }

  /**
   * Register a theory with its metadata
   * @param {Object} meta - Theory metadata
   * @param {string} meta.id - Unique theory identifier
   * @param {string} meta.name - Human-readable name
   * @param {string} [meta.description] - Description
   * @param {string} [meta.domain] - Domain (ontology, axiology, medical, legal, etc.)
   * @param {string} [meta.version] - Version string
   * @param {number} [meta.priority] - Priority (higher = applied later)
   * @param {string[]} [meta.dependencies] - IDs of required theories
   * @param {string[]} [meta.preferredMethods] - Preferred reasoning methods
   * @param {Object} [meta.applicability] - When this theory applies
   */
  registerTheory(meta) {
    if (!meta.id) {
      throw new Error('Theory must have an id');
    }

    const theoryMeta = {
      id: meta.id,
      name: meta.name || meta.id,
      description: meta.description || '',
      domain: meta.domain || 'general',
      version: meta.version || '1.0',
      priority: meta.priority || 0,
      dependencies: meta.dependencies || [],
      preferredMethods: meta.preferredMethods || [],
      applicability: meta.applicability || {},
      stats: {
        loadCount: 0,
        queryCount: 0,
        successCount: 0,
        lastUsed: null
      },
      registeredAt: new Date().toISOString()
    };

    // Merge with existing stats if theory was previously registered
    const existing = this.theories.get(meta.id);
    if (existing && existing.stats) {
      theoryMeta.stats = { ...existing.stats };
    }

    this.theories.set(meta.id, theoryMeta);
    this._save();

    return theoryMeta;
  }

  /**
   * Get theory metadata by ID
   * @param {string} theoryId
   * @returns {Object|null}
   */
  getTheory(theoryId) {
    return this.theories.get(theoryId) || null;
  }

  /**
   * List all registered theories
   * @param {Object} [filter] - Optional filter
   * @param {string} [filter.domain] - Filter by domain
   * @returns {Object[]}
   */
  listTheories(filter = {}) {
    let result = Array.from(this.theories.values());

    if (filter.domain) {
      result = result.filter(t => t.domain === filter.domain);
    }

    // Sort by priority (higher first)
    result.sort((a, b) => b.priority - a.priority);

    return result;
  }

  /**
   * Record that a theory was loaded
   * @param {string} theoryId
   */
  recordLoad(theoryId) {
    const theory = this.theories.get(theoryId);
    if (theory) {
      theory.stats.loadCount++;
      theory.stats.lastUsed = new Date().toISOString();
      this._save();
    }
  }

  /**
   * Record query result for a theory
   * @param {string} theoryId
   * @param {boolean} success - Whether the query succeeded
   * @param {string} [method] - Reasoning method used
   */
  recordQueryResult(theoryId, success, method = null) {
    const theory = this.theories.get(theoryId);
    if (theory) {
      theory.stats.queryCount++;
      if (success) {
        theory.stats.successCount++;
      }
      theory.stats.lastUsed = new Date().toISOString();
    }

    // Track reasoning method statistics
    if (method) {
      const methodStats = this.reasoningStats.get(method) || { success: 0, total: 0 };
      methodStats.total++;
      if (success) {
        methodStats.success++;
      }
      this.reasoningStats.set(method, methodStats);
    }

    this._save();
  }

  /**
   * Get success rate for a theory
   * @param {string} theoryId
   * @returns {number} Success rate (0-1)
   */
  getSuccessRate(theoryId) {
    const theory = this.theories.get(theoryId);
    if (!theory || theory.stats.queryCount === 0) {
      return 0;
    }
    return theory.stats.successCount / theory.stats.queryCount;
  }

  /**
   * Get preferred reasoning methods based on success rates
   * @returns {string[]} Methods sorted by success rate (best first)
   */
  getPreferredReasoningMethods() {
    const methods = Array.from(this.reasoningStats.entries())
      .map(([method, stats]) => ({
        method,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        total: stats.total
      }))
      .filter(m => m.total >= 5)  // Need at least 5 uses
      .sort((a, b) => b.successRate - a.successRate);

    return methods.map(m => m.method);
  }

  /**
   * Get reasoning method statistics
   * @returns {Object} Map of method -> { success, total, rate }
   */
  getReasoningStats() {
    const result = {};
    for (const [method, stats] of this.reasoningStats) {
      result[method] = {
        ...stats,
        rate: stats.total > 0 ? (stats.success / stats.total).toFixed(3) : 0
      };
    }
    return result;
  }

  /**
   * Suggest theories for a given domain/context
   * @param {Object} context
   * @param {string} [context.domain]
   * @param {string[]} [context.concepts] - Concepts being queried
   * @returns {Object[]} Suggested theories with scores
   */
  suggestTheories(context = {}) {
    const suggestions = [];

    for (const theory of this.theories.values()) {
      let score = theory.priority;

      // Boost if domain matches
      if (context.domain && theory.domain === context.domain) {
        score += 10;
      }

      // Boost based on success rate
      const successRate = this.getSuccessRate(theory.id);
      score += successRate * 5;

      // Boost if frequently used
      if (theory.stats.queryCount > 10) {
        score += 2;
      }

      suggestions.push({
        theory,
        score,
        successRate
      });
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Remove a theory from the registry
   * @param {string} theoryId
   * @returns {boolean}
   */
  unregisterTheory(theoryId) {
    const deleted = this.theories.delete(theoryId);
    if (deleted) {
      this._save();
    }
    return deleted;
  }

  /**
   * Clear all statistics (keep theory registrations)
   */
  clearStats() {
    for (const theory of this.theories.values()) {
      theory.stats = {
        loadCount: 0,
        queryCount: 0,
        successCount: 0,
        lastUsed: null
      };
    }
    this.reasoningStats.clear();
    this._save();
  }

  /**
   * Load registry from file
   * @private
   */
  _load() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));

        if (data.theories) {
          for (const theory of data.theories) {
            this.theories.set(theory.id, theory);
          }
        }

        if (data.reasoningStats) {
          for (const [method, stats] of Object.entries(data.reasoningStats)) {
            this.reasoningStats.set(method, stats);
          }
        }

        this.lastUpdated = data.lastUpdated;
      }
    } catch (e) {
      // Registry load failure is not fatal
      console.warn(`MetaTheoryRegistry: Failed to load: ${e.message}`);
    }
  }

  /**
   * Save registry to file
   * @private
   */
  _save() {
    try {
      const data = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        theories: Array.from(this.theories.values()),
        reasoningStats: Object.fromEntries(this.reasoningStats)
      };

      // Ensure directory exists
      const dir = path.dirname(this.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
      this.lastUpdated = data.lastUpdated;
    } catch (e) {
      // Save failure is not fatal
      console.warn(`MetaTheoryRegistry: Failed to save: ${e.message}`);
    }
  }

  /**
   * Export registry as JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      theories: Array.from(this.theories.values()),
      reasoningStats: Object.fromEntries(this.reasoningStats),
      lastUpdated: this.lastUpdated
    };
  }
}

// Singleton instance
let sharedInstance = null;

/**
 * Get shared registry instance
 * @param {Object} [options] - Options for initialization
 * @returns {MetaTheoryRegistry}
 */
MetaTheoryRegistry.getShared = function(options = {}) {
  if (!sharedInstance) {
    sharedInstance = new MetaTheoryRegistry(options);
  }
  return sharedInstance;
};

/**
 * Reset shared instance (for testing)
 */
MetaTheoryRegistry.resetShared = function() {
  sharedInstance = null;
};

module.exports = MetaTheoryRegistry;
