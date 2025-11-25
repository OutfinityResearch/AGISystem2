const Config = require('../support/config');
const AuditLog = require('../support/audit_log');
const StorageAdapter = require('../support/storage');
const TranslatorBridge = require('./translator_bridge');
const EngineAPI = require('./api');
const System2Session = require('./system2_session');

class AgentSystem2 {
  constructor({ profile, configPath, overrides } = {}) {
    const baseConfig = {};
    if (profile) {
      baseConfig.profile = profile;
    }
    if (configPath) {
      baseConfig.configPath = configPath;
    }
    this.config = new Config().load({ ...baseConfig, ...(overrides || {}) });
    this.audit = new AuditLog(this.config.get('storageRoot'));
    this.storage = new StorageAdapter({ config: this.config, audit: this.audit });
    this.translator = new TranslatorBridge();
  }

  createSession({ baseTheoryFile, id } = {}) {
    const engine = new EngineAPI({
      config: this.config,
      audit: this.audit,
      storage: this.storage,
      translator: this.translator,
      baseTheoryFile
    });
    const session = new System2Session({ id, engine, baseTheoryFile });
    return session;
  }
}

module.exports = AgentSystem2;

