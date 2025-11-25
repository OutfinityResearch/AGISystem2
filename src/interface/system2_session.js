const TheoryDSLEngine = require('../theory/dsl_engine');

class System2Session {
  constructor({ id, engine, baseTheoryFile } = {}) {
    this.id = id || `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.engine = engine;
    this.dsl = new TheoryDSLEngine({
      api: engine,
      conceptStore: engine.conceptStore,
      config: engine.config
    });
    this.env = {};
    this.activeTheoryLines = [];
    if (baseTheoryFile) {
      // The engine/storage decide how to resolve and load theory text; session just applies it.
      if (this.engine.storage && typeof this.engine.storage.loadTheoryText === 'function') {
        const text = this.engine.storage.loadTheoryText(baseTheoryFile);
        if (text) {
          this.appendTheory(text);
        }
      }
    }
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

