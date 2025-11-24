const fs = require('fs');
const path = require('path');

class AuditLog {
  constructor(storageRoot) {
    this.storageRoot = storageRoot || './.logs';
    this.filePath = path.join(this.storageRoot, 'audit.log');
    this._ensureDir();
  }

  _ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  write(entry) {
    const record = {
      ts: new Date().toISOString(),
      ...entry
    };
    const line = `${JSON.stringify(record)}\n`;
    fs.appendFileSync(this.filePath, line, 'utf8');
  }
}

module.exports = AuditLog;

