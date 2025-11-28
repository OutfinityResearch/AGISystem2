/**
 * DS(/theory/theory_preloader.js) - Fast Theory Preloading
 *
 * Handles loading of base theories at system initialization.
 * Supports both raw .sys2dsl files and precompiled .json caches.
 *
 * Precompiled theories load ~10x faster as they skip parsing.
 *
 * Usage:
 *   const preloader = new TheoryPreloader({ conceptStore, parser });
 *   await preloader.loadBaseTheories();
 *
 * @module theory/theory_preloader
 */

const fs = require('fs');
const path = require('path');

class TheoryPreloader {
  /**
   * @param {Object} deps
   * @param {Object} deps.conceptStore - ConceptStore instance
   * @param {Object} deps.parser - DSL parser instance
   * @param {string} [deps.theoriesPath] - Path to theories directory
   */
  constructor(deps = {}) {
    this.conceptStore = deps.conceptStore;
    this.parser = deps.parser;

    // Find theories path relative to project root
    const projectRoot = path.resolve(__dirname, '..', '..');
    this.theoriesPath = deps.theoriesPath ||
      path.join(projectRoot, 'data', 'init', 'theories', 'base');
    this.cachePath = path.join(projectRoot, 'data', 'init', 'cache');
  }

  /**
   * Load all base theories (ontology + axiology)
   * Uses cache if available and up-to-date
   * Synchronous for use in constructors
   * @returns {{loaded: number, cached: boolean, theories: string[]}}
   */
  loadBaseTheories() {
    const theories = ['ontology_base', 'axiology_base'];
    let totalLoaded = 0;
    let usedCache = false;
    const loadedTheories = [];

    for (const theoryName of theories) {
      const result = this.loadTheory(theoryName);
      if (result.loaded > 0) {
        totalLoaded += result.loaded;
        usedCache = usedCache || result.cached;
        loadedTheories.push(theoryName);
      }
    }

    return {
      loaded: totalLoaded,
      cached: usedCache,
      theories: loadedTheories
    };
  }

  /**
   * Load a single theory by name
   * Synchronous for use in constructors
   * @param {string} theoryName - Theory name without extension
   * @returns {{loaded: number, cached: boolean}}
   */
  loadTheory(theoryName) {
    const dslPath = path.join(this.theoriesPath, `${theoryName}.sys2dsl`);
    const cachePath = path.join(this.cachePath, `${theoryName}.cache.json`);

    // Check if cache exists and is up-to-date
    if (this._isCacheValid(dslPath, cachePath)) {
      return this._loadFromCache(cachePath);
    }

    // Parse DSL and optionally create cache
    return this._loadFromDSL(dslPath, cachePath);
  }

  /**
   * Check if cache is valid (exists and newer than source)
   * @private
   */
  _isCacheValid(dslPath, cachePath) {
    if (!fs.existsSync(cachePath) || !fs.existsSync(dslPath)) {
      return false;
    }

    const dslStat = fs.statSync(dslPath);
    const cacheStat = fs.statSync(cachePath);

    return cacheStat.mtimeMs > dslStat.mtimeMs;
  }

  /**
   * Load facts from cache (fast path)
   * @private
   */
  _loadFromCache(cachePath) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      if (!data.facts || !Array.isArray(data.facts)) {
        return { loaded: 0, cached: false };
      }

      let loaded = 0;
      for (const fact of data.facts) {
        try {
          this.conceptStore.addFact(fact.subject, fact.relation, fact.object);
          loaded++;
        } catch (e) {
          // Skip duplicate or invalid facts
        }
      }

      return { loaded, cached: true };
    } catch (e) {
      return { loaded: 0, cached: false };
    }
  }

  /**
   * Load facts from DSL file and create cache
   * @private
   */
  _loadFromDSL(dslPath, cachePath) {
    if (!fs.existsSync(dslPath)) {
      return { loaded: 0, cached: false };
    }

    try {
      const content = fs.readFileSync(dslPath, 'utf8');
      const lines = content.split('\n');
      const facts = [];
      let loaded = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Parse ASSERT statements: @fXXX ASSERT subject RELATION object
        const assertMatch = trimmed.match(/@\w+\s+ASSERT\s+(\S+)\s+(\S+)\s+(\S+)/);
        if (assertMatch) {
          const [, subject, relation, object] = assertMatch;

          try {
            this.conceptStore.addFact(subject, relation, object);
            facts.push({ subject, relation, object });
            loaded++;
          } catch (e) {
            // Skip duplicate or invalid facts
          }
        }
      }

      // Create cache for next time
      this._writeCache(cachePath, facts, dslPath);

      return { loaded, cached: false };
    } catch (e) {
      return { loaded: 0, cached: false };
    }
  }

  /**
   * Write cache file
   * @private
   */
  _writeCache(cachePath, facts, sourcePath) {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheData = {
        version: 1,
        source: sourcePath,
        createdAt: new Date().toISOString(),
        factCount: facts.length,
        facts
      };

      fs.writeFileSync(cachePath, JSON.stringify(cacheData));
    } catch (e) {
      // Cache write failure is not critical
    }
  }

  /**
   * Force rebuild all caches
   * @returns {{rebuilt: string[]}}
   */
  rebuildCaches() {
    const theories = ['ontology_base', 'axiology_base'];
    const rebuilt = [];

    for (const theoryName of theories) {
      const dslPath = path.join(this.theoriesPath, `${theoryName}.sys2dsl`);
      const cachePath = path.join(this.cachePath, `${theoryName}.cache.json`);

      // Delete existing cache
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }

      // Reload from DSL (will create new cache)
      const result = this._loadFromDSL(dslPath, cachePath);
      if (result.loaded > 0) {
        rebuilt.push(theoryName);
      }
    }

    return { rebuilt };
  }

  /**
   * Get preloading statistics
   * @returns {Object} Stats about available theories and caches
   */
  getStats() {
    const theories = ['ontology_base', 'axiology_base'];
    const stats = {
      theoriesPath: this.theoriesPath,
      cachePath: this.cachePath,
      theories: []
    };

    for (const name of theories) {
      const dslPath = path.join(this.theoriesPath, `${name}.sys2dsl`);
      const cachePath = path.join(this.cachePath, `${name}.cache.json`);

      const theoryStats = {
        name,
        dslExists: fs.existsSync(dslPath),
        cacheExists: fs.existsSync(cachePath),
        cacheValid: this._isCacheValid(dslPath, cachePath)
      };

      if (theoryStats.cacheExists) {
        try {
          const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          theoryStats.cachedFacts = cache.factCount;
          theoryStats.cacheCreated = cache.createdAt;
        } catch (e) {
          theoryStats.cacheCorrupt = true;
        }
      }

      stats.theories.push(theoryStats);
    }

    return stats;
  }
}

module.exports = TheoryPreloader;
