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
   * Load all base theories from the theories/base directory
   * Loads both fact theories and verb definition theories
   * Uses cache if available and up-to-date
   * Synchronous for use in constructors
   * @returns {{loaded: number, cached: boolean, theories: string[]}}
   */
  loadBaseTheories() {
    // Load all .sys2dsl files from theories/base directory
    // Order matters: primitives and constants first, then others
    const priorityOrder = [
      'constants',
      'primitives',
      'ontology_base',
      'axiology_base',
      'logic',
      'query',
      'reasoning',
      'theory',
      'memory',
      'control',
      'output',
      'modal',
      'search'
    ];

    // Get all available theories
    let theories = [];
    try {
      const files = fs.readdirSync(this.theoriesPath);
      const available = files
        .filter(f => f.endsWith('.sys2dsl'))
        .map(f => f.replace('.sys2dsl', ''));

      // Sort by priority order, unknowns go last
      theories = available.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a);
        const bIdx = priorityOrder.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    } catch (e) {
      // Fallback to hardcoded list
      theories = ['ontology_base', 'axiology_base'];
    }

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
          // addFact expects object {subject, relation, object} and optional options
          this.conceptStore.addFact({
            subject: fact.subject,
            relation: fact.relation,
            object: fact.object
          }, { existence: fact._existence });
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
   * Load facts and macros from DSL file and create cache
   * Supports v2 ASSERT syntax and v3 triple syntax
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
      let inMacro = false;
      let macroName = null;
      let macroLines = [];

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Handle macro definitions: @VERB BEGIN ... END
        if (trimmed.match(/^@(\w+)\s+BEGIN$/i)) {
          const match = trimmed.match(/^@(\w+)\s+BEGIN$/i);
          inMacro = true;
          macroName = match[1];
          macroLines = [];
          continue;
        }

        if (inMacro) {
          if (trimmed === 'END') {
            // Store macro definition (for parser to expand later)
            // Macros are stored as special facts with MACRO_DEF relation
            if (macroName && this.parser && this.parser.registerMacro) {
              this.parser.registerMacro(macroName, macroLines);
              loaded++;
            }
            inMacro = false;
            macroName = null;
            macroLines = [];
          } else {
            macroLines.push(trimmed);
          }
          continue;
        }

        // Parse v2 ASSERT statements: @fXXX ASSERT subject RELATION object
        const assertMatch = trimmed.match(/@\w+\s+ASSERT\s+(\S+)\s+(\S+)\s+(\S+)/);
        if (assertMatch) {
          const [, subject, relation, object] = assertMatch;
          loaded += this._addFact(subject, relation, object, facts);
          continue;
        }

        // Parse v3 statements: @varName subject RELATION object (4 tokens)
        const v3Match = trimmed.match(/^@\w+\s+(\S+)\s+(\S+)\s+(\S+)$/);
        if (v3Match) {
          const [, subject, relation, object] = v3Match;
          // Skip wildcards - they're not real facts
          if (object !== 'any' && object !== '*') {
            loaded += this._addFact(subject, relation, object, facts);
          }
          continue;
        }

        // Parse simple triple statements without @ prefix: subject RELATION object
        const simpleMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Z_]+)\s+(\S+)$/);
        if (simpleMatch) {
          const [, subject, relation, object] = simpleMatch;
          // Skip wildcards
          if (object !== 'any' && object !== '*') {
            loaded += this._addFact(subject, relation, object, facts);
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
   * Add a single fact to concept store
   * @private
   */
  _addFact(subject, relation, object, facts) {
    try {
      const existence = this.conceptStore.EXISTENCE
        ? this.conceptStore.EXISTENCE.CERTAIN
        : 127;
      this.conceptStore.addFact({ subject, relation, object }, { existence });
      facts.push({ subject, relation, object, _existence: existence });
      return 1;
    } catch (e) {
      // Skip duplicate or invalid facts
      return 0;
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
   * Get list of all available theory names
   * @private
   */
  _getAvailableTheories() {
    try {
      const files = fs.readdirSync(this.theoriesPath);
      return files
        .filter(f => f.endsWith('.sys2dsl'))
        .map(f => f.replace('.sys2dsl', ''));
    } catch (e) {
      return ['ontology_base', 'axiology_base'];
    }
  }

  /**
   * Force rebuild all caches
   * @returns {{rebuilt: string[]}}
   */
  rebuildCaches() {
    const theories = this._getAvailableTheories();
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
    const theories = this._getAvailableTheories();
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
