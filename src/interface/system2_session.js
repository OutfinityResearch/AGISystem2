const TheoryDSLEngine = require('../theory/dsl_engine');
const TheoryPreloader = require('../theory/theory_preloader');

class System2Session {
  /**
   * @param {Object} options
   * @param {string} [options.id] - Session ID
   * @param {Object} options.engine - EngineAPI instance
   * @param {string} [options.baseTheoryFile] - Custom theory file to load
   * @param {boolean} [options.loadBaseTheories=true] - Load ontology_base and axiology_base
   * @param {boolean} [options.skipPreload=false] - Skip all preloading (for tests)
   */
  constructor({ id, engine, baseTheoryFile, loadBaseTheories = true, skipPreload = false } = {}) {
    this.id = id || `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.engine = engine;
    this.dsl = new TheoryDSLEngine({
      api: engine,
      conceptStore: engine.conceptStore,
      config: engine.config
    });
    this.env = {};
    this.activeTheoryLines = [];
    this._baseTheoriesLoaded = false;
    this._preloadStats = null;

    // Load base theories (ontology + axiology) unless skipped
    if (loadBaseTheories && !skipPreload) {
      this._loadBaseTheories();
    }

    // Load custom theory file if specified
    if (baseTheoryFile) {
      if (this.engine.storage && typeof this.engine.storage.loadTheoryText === 'function') {
        const text = this.engine.storage.loadTheoryText(baseTheoryFile);
        if (text) {
          this.appendTheory(text);
        }
      }
    }
  }

  /**
   * Load base ontology and axiology theories
   * Uses cached versions for speed when available
   * @private
   */
  _loadBaseTheories() {
    try {
      const preloader = new TheoryPreloader({
        conceptStore: this.engine.conceptStore
      });

      // Synchronous load (preloader handles async internally but we call sync methods)
      const result = preloader.loadBaseTheories();

      this._baseTheoriesLoaded = true;
      this._preloadStats = result;
    } catch (e) {
      // Base theory loading failure is not fatal - system works without them
      console.warn(`TheoryPreloader: Failed to load base theories: ${e.message}`);
    }
  }

  /**
   * Get statistics about preloaded theories
   * @returns {Object|null} Preload stats or null if not loaded
   */
  getPreloadStats() {
    return this._preloadStats;
  }

  run(textOrLines) {
    const lines = Array.isArray(textOrLines)
      ? textOrLines
      : String(textOrLines)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
    this.env = this.dsl.runScript(lines, { initialEnv: this.env });
    return this.env;
  }

  appendTheory(textOrLines) {
    const lines = Array.isArray(textOrLines)
      ? textOrLines
      : String(textOrLines)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
    this.activeTheoryLines.push(...lines);
    this.env = this.dsl.runScript(lines, { initialEnv: this.env });
  }

  saveTheory({ name, path } = {}) {
    if (!this.engine.storage || typeof this.engine.storage.saveTheoryText !== 'function') {
      throw new Error('Storage adapter does not support saveTheoryText');
    }
    const id = path || name;
    if (!id) {
      throw new Error('saveTheory requires a theory id or path');
    }
    const text = this.activeTheoryLines.join('\n');
    this.engine.storage.saveTheoryText(id, text);
  }

  mergeIntoTheory({ sourcePath, targetPath, strategy } = {}) {
    if (!this.engine.storage || typeof this.engine.storage.loadTheoryText !== 'function') {
      throw new Error('Storage adapter does not support loadTheoryText');
    }
    const target = targetPath || sourcePath;
    if (!target) {
      throw new Error('mergeIntoTheory requires a targetPath or sourcePath');
    }
    const existing = this.engine.storage.loadTheoryText(target) || '';
    let merged;
    // For now, use a simple deterministic merge: existing text followed by session lines, separated by a marker.
    if (strategy === 'prepend') {
      merged = `${this.activeTheoryLines.join('\n')}\n${existing}`.trim();
    } else {
      merged = `${existing}\n${this.activeTheoryLines.join('\n')}`.trim();
    }
    this.engine.storage.saveTheoryText(target, `${merged}\n`);
  }

  getVar(name) {
    const key = name.startsWith('$') ? name.slice(1) : name;
    return Object.prototype.hasOwnProperty.call(this.env, key) ? this.env[key] : undefined;
  }

  reset() {
    this.env = {};
    this.activeTheoryLines = [];
  }
}

module.exports = System2Session;

