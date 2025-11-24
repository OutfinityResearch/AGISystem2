const fs = require('fs');
const path = require('path');

class Config {
  constructor(defaults = {}) {
    this._defaults = Object.freeze({
      profile: 'manual_test',
      dimensions: 1024,
      recursionHorizon: 3,
      dtype: 'int8',
      blockSize: 8,
      ontologyPartition: { start: 0, end: 255 },
      axiologyPartition: { start: 256, end: 383 },
      indexStrategy: 'lsh_pstable',
      lshHashes: 32,
      lshBands: 8,
      lshBucketWidth: 8,
      persistenceStrategy: 'file_binary',
      storageRoot: './.data_dev',
      rotationSeed: 12345,
      relationSeed: 67890,
      lshSeed: 54321,
      auditEnabled: true,
      ...defaults
    });
    this._config = null;
  }

  load(rawConfig = null) {
    const baseFromFile = this._loadProfileFile();
    const merged = {
      ...this._defaults,
      ...baseFromFile,
      ...rawConfig
    };

    this._applyProfileDefaults(merged);
    this._validate(merged, rawConfig || {});

    this._config = Object.freeze({ ...merged });
    return this;
  }

  get(key) {
    if (!this._config) {
      throw new Error('Config not loaded');
    }
    return this._config[key];
  }

  getPartition(name) {
    if (!this._config) {
      throw new Error('Config not loaded');
    }
    if (name === 'ontology') {
      return { ...this._config.ontologyPartition };
    }
    if (name === 'axiology') {
      return { ...this._config.axiologyPartition };
    }
    throw new Error(`Unknown partition '${name}'`);
  }

  getIndexStrategy() {
    if (!this._config) {
      throw new Error('Config not loaded');
    }
    const {
      indexStrategy,
      lshHashes,
      lshBands,
      lshBucketWidth
    } = this._config;
    return {
      strategy: indexStrategy,
      params: { lshHashes, lshBands, lshBucketWidth }
    };
  }

  getPersistenceStrategy() {
    if (!this._config) {
      throw new Error('Config not loaded');
    }
    const { persistenceStrategy, storageRoot } = this._config;
    return {
      strategy: persistenceStrategy,
      params: { storageRoot }
    };
  }

  snapshot() {
    if (!this._config) {
      throw new Error('Config not loaded');
    }
    return JSON.parse(JSON.stringify(this._config));
  }

  _loadProfileFile() {
    const filePath = path.join(process.cwd(), 'data', 'init', 'config_profile.json');
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  _applyProfileDefaults(config) {
    const profile = config.profile || 'manual_test';
    if (profile === 'auto_test') {
      config.dimensions = 512;
      config.recursionHorizon = 2;
      config.indexStrategy = 'simhash';
      config.persistenceStrategy = 'memory';
    } else if (profile === 'manual_test') {
      config.dimensions = 1024;
      config.recursionHorizon = 3;
      config.indexStrategy = 'lsh_pstable';
      config.lshHashes = 32;
      config.lshBands = 8;
      config.lshBucketWidth = 8;
      config.persistenceStrategy = 'file_binary';
      config.storageRoot = './.data_dev';
    } else if (profile === 'prod') {
      config.dimensions = 2048;
      config.recursionHorizon = 3;
      config.indexStrategy = 'lsh_pstable';
      config.lshHashes = 64;
      config.lshBands = 16;
      config.lshBucketWidth = 6;
      config.persistenceStrategy = 'file_binary';
      config.storageRoot = './data';
    }
    config.ontologyPartition = { start: 0, end: 255 };
    config.axiologyPartition = { start: 256, end: 383 };
  }

  _validate(config, rawInput) {
    const allowedDims = [512, 1024, 2048, 4096];
    if (rawInput && Object.prototype.hasOwnProperty.call(rawInput, 'dimensions')) {
      if (!allowedDims.includes(rawInput.dimensions)) {
        throw new Error(`Invalid dimensions ${rawInput.dimensions}; expected one of ${allowedDims.join(', ')}`);
      }
    }
    if (!allowedDims.includes(config.dimensions)) {
      throw new Error(`Invalid dimensions ${config.dimensions}; expected one of ${allowedDims.join(', ')}`);
    }
    if (!Number.isInteger(config.recursionHorizon) || config.recursionHorizon < 1 || config.recursionHorizon > 5) {
      throw new Error(`Invalid recursionHorizon ${config.recursionHorizon}; expected integer between 1 and 5`);
    }
    const { ontologyPartition, axiologyPartition } = config;
    if (ontologyPartition.start !== 0 || ontologyPartition.end !== 255) {
      throw new Error('Ontology partition must be fixed at 0–255');
    }
    if (axiologyPartition.start !== 256 || axiologyPartition.end !== 383) {
      throw new Error('Axiology partition must be fixed at 256–383');
    }
    const indexStrategies = ['lsh_pstable', 'simhash', 'grid'];
    if (!indexStrategies.includes(config.indexStrategy)) {
      throw new Error(`Invalid indexStrategy '${config.indexStrategy}'`);
    }
    const persistenceStrategies = ['file_binary', 'memory', 'custom'];
    if (!persistenceStrategies.includes(config.persistenceStrategy)) {
      throw new Error(`Invalid persistenceStrategy '${config.persistenceStrategy}'`);
    }
    if (config.persistenceStrategy === 'file_binary') {
      if (typeof config.storageRoot !== 'string' || config.storageRoot.length === 0) {
        throw new Error('storageRoot must be a non-empty string when persistenceStrategy is file_binary');
      }
    }
  }
}

module.exports = Config;
