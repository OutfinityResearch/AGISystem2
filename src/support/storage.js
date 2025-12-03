const fs = require('fs');
const path = require('path');
const os = require('os');

class StorageAdapter {
  constructor({ config, audit }) {
    this.config = config;
    this.audit = audit;
    const persistence = config.getPersistenceStrategy();
    this.strategy = persistence.strategy;
    this.storageRoot = persistence.params.storageRoot;

    // Redirect relative paths (like ./.data_dev) to temp directory to avoid polluting workspace
    if (this.strategy === 'file_binary' && this.storageRoot.startsWith('./.')) {
      this.storageRoot = path.join(os.tmpdir(), 'agisystem2-data');
    }

    this._memoryConcepts = new Map();
    this._memoryTheories = new Map();
    if (this.strategy === 'file_binary') {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
    }
  }

  setStrategy(strategyConfig) {
    this.strategy = strategyConfig.strategy || this.strategy;
    if (strategyConfig.storageRoot) {
      this.storageRoot = strategyConfig.storageRoot;
    }
  }

  _conceptPath(id) {
    return path.join(this.storageRoot, 'concepts', `${id}.bin`);
  }

  _theoryTextPath(id) {
    return path.join(this.storageRoot, 'theories', `${id}.sys2dsl`);
  }

  _theoryCachePath(id) {
    return path.join(this.storageRoot, 'theories', `${id}.bin`);
  }

  saveConcept(id, payloadBuffer) {
    if (this.strategy === 'memory') {
      this._memoryConcepts.set(id, Buffer.from(payloadBuffer));
    } else if (this.strategy === 'file_binary') {
      const filePath = this._conceptPath(id);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, payloadBuffer);
    }
    if (this.audit) {
      this.audit.write({ kind: 'saveConcept', id });
    }
  }

  loadConcept(id) {
    if (this.strategy === 'memory') {
      const buf = this._memoryConcepts.get(id);
      return buf ? Buffer.from(buf) : null;
    }
    if (this.strategy === 'file_binary') {
      const filePath = this._conceptPath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.readFileSync(filePath);
    }
    return null;
  }

  saveTheoryText(id, sys2dslText) {
    if (this.strategy === 'memory') {
      this._memoryTheories.set(id, sys2dslText);
    } else if (this.strategy === 'file_binary') {
      const filePath = this._theoryTextPath(id);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, sys2dslText, 'utf8');
    }
    if (this.audit) {
      this.audit.write({ kind: 'saveTheoryText', id });
    }
  }

  loadTheoryText(id) {
    if (this.strategy === 'memory') {
      const buf = this._memoryTheories.get(id);
      return typeof buf === 'string' ? buf : null;
    }
    if (this.strategy === 'file_binary') {
      const filePath = this._theoryTextPath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }

  saveTheoryCache(id, payloadBuffer) {
    if (this.strategy === 'memory') {
      this._memoryTheories.set(`cache:${id}`, Buffer.from(payloadBuffer));
    } else if (this.strategy === 'file_binary') {
      const filePath = this._theoryCachePath(id);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, payloadBuffer);
    }
    if (this.audit) {
      this.audit.write({ kind: 'saveTheoryCache', id });
    }
  }

  loadTheoryCache(id) {
    if (this.strategy === 'memory') {
      const buf = this._memoryTheories.get(`cache:${id}`);
      return buf ? Buffer.from(buf) : null;
    }
    if (this.strategy === 'file_binary') {
      const filePath = this._theoryCachePath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.readFileSync(filePath);
    }
    return null;
  }

  listConcepts() {
    if (this.strategy === 'memory') {
      return Array.from(this._memoryConcepts.keys());
    }
    if (this.strategy === 'file_binary') {
      const dir = path.join(this.storageRoot, 'concepts');
      if (!fs.existsSync(dir)) {
        return [];
      }
      return fs.readdirSync(dir)
        .filter((name) => name.endsWith('.bin'))
        .map((name) => name.replace(/\.bin$/, ''));
    }
    return [];
  }

  listTheories() {
    if (this.strategy === 'memory') {
      return Array.from(this._memoryTheories.keys()).map((key) => key.replace(/^cache:/, ''));
    }
    if (this.strategy === 'file_binary') {
      const dir = path.join(this.storageRoot, 'theories');
      if (!fs.existsSync(dir)) {
        return [];
      }
      const names = fs.readdirSync(dir);
      const ids = new Set();
      for (const name of names) {
        if (name.endsWith('.sys2dsl')) {
          ids.add(name.replace(/\.sys2dsl$/, ''));
        } else if (name.endsWith('.bin')) {
          ids.add(name.replace(/\.bin$/, ''));
        }
      }
      return Array.from(ids);
    }
    return [];
  }

  flush() {
  }

  // =========================================================================
  // FS-10/NFS-007: Facts Persistence for ConceptStore
  // =========================================================================

  /**
   * Path for facts snapshot file
   * @private
   */
  _factsPath() {
    return path.join(this.storageRoot, 'facts.json');
  }

  /**
   * Save all facts to storage
   * @param {Array} facts - Array of fact objects
   * @returns {boolean} Success status
   */
  saveFacts(facts) {
    try {
      if (this.strategy === 'memory') {
        this._memoryFacts = JSON.parse(JSON.stringify(facts));
      } else if (this.strategy === 'file_binary') {
        const filePath = this._factsPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(facts, null, 2), 'utf8');
      }
      if (this.audit) {
        this.audit.write({ kind: 'saveFacts', count: facts.length });
      }
      return true;
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'saveFactsError', error: e.message });
      }
      return false;
    }
  }

  /**
   * Load all facts from storage
   * @returns {Array|null} Array of facts or null if not found
   */
  loadFacts() {
    try {
      if (this.strategy === 'memory') {
        return this._memoryFacts ? JSON.parse(JSON.stringify(this._memoryFacts)) : null;
      }
      if (this.strategy === 'file_binary') {
        const filePath = this._factsPath();
        if (!fs.existsSync(filePath)) {
          return null;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'loadFactsError', error: e.message });
      }
      return null;
    }
  }

  /**
   * Path for full store snapshot (concepts + facts + usage)
   * @private
   */
  _storeSnapshotPath() {
    return path.join(this.storageRoot, 'store_snapshot.json');
  }

  /**
   * Save full store state (concepts, facts, usage metrics)
   * @param {Object} snapshot - Store snapshot
   * @param {Array} snapshot.facts - Facts array
   * @param {Array} snapshot.concepts - Concepts array
   * @param {Object} snapshot.usageMetrics - Usage metrics map
   * @param {string} snapshot.timestamp - ISO timestamp
   * @returns {boolean} Success status
   */
  saveStoreSnapshot(snapshot) {
    try {
      if (this.strategy === 'memory') {
        this._memoryStoreSnapshot = JSON.parse(JSON.stringify(snapshot));
      } else if (this.strategy === 'file_binary') {
        const filePath = this._storeSnapshotPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
      }
      if (this.audit) {
        this.audit.write({
          kind: 'saveStoreSnapshot',
          factsCount: snapshot.facts?.length || 0,
          conceptsCount: snapshot.concepts?.length || 0
        });
      }
      return true;
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'saveStoreSnapshotError', error: e.message });
      }
      return false;
    }
  }

  /**
   * Load full store state
   * @returns {Object|null} Store snapshot or null
   */
  loadStoreSnapshot() {
    try {
      if (this.strategy === 'memory') {
        return this._memoryStoreSnapshot
          ? JSON.parse(JSON.stringify(this._memoryStoreSnapshot))
          : null;
      }
      if (this.strategy === 'file_binary') {
        const filePath = this._storeSnapshotPath();
        if (!fs.existsSync(filePath)) {
          return null;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'loadStoreSnapshotError', error: e.message });
      }
      return null;
    }
  }
}

module.exports = StorageAdapter;
