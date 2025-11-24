const fs = require('fs');
const path = require('path');

class StorageAdapter {
  constructor({ config, audit }) {
    this.config = config;
    this.audit = audit;
    const persistence = config.getPersistenceStrategy();
    this.strategy = persistence.strategy;
    this.storageRoot = persistence.params.storageRoot;
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

  _theoryPath(id) {
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

  saveTheory(id, payloadBuffer) {
      if (this.strategy === 'memory') {
        this._memoryTheories.set(id, Buffer.from(payloadBuffer));
      } else if (this.strategy === 'file_binary') {
        const filePath = this._theoryPath(id);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, payloadBuffer);
      }
      if (this.audit) {
        this.audit.write({ kind: 'saveTheory', id });
      }
  }

  loadTheory(id) {
    if (this.strategy === 'memory') {
      const buf = this._memoryTheories.get(id);
      return buf ? Buffer.from(buf) : null;
    }
    if (this.strategy === 'file_binary') {
      const filePath = this._theoryPath(id);
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
      return Array.from(this._memoryTheories.keys());
    }
    if (this.strategy === 'file_binary') {
      const dir = path.join(this.storageRoot, 'theories');
      if (!fs.existsSync(dir)) {
        return [];
      }
      return fs.readdirSync(dir)
        .filter((name) => name.endsWith('.bin'))
        .map((name) => name.replace(/\.bin$/, ''));
    }
    return [];
  }

  flush() {
  }
}

module.exports = StorageAdapter;

