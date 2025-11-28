const fs = require('fs');
const path = require('path');
const os = require('os');

class AuditLog {
  /**
   * @param {string|Object} storageRootOrOptions - Storage root path or options object
   * @param {string} [storageRootOrOptions.storageRoot] - Storage root path
   * @param {string} [storageRootOrOptions.mode='file'] - 'file', 'memory', or 'noop'
   */
  constructor(storageRootOrOptions) {
    let storageRoot = './.logs';
    let mode = 'file';

    if (typeof storageRootOrOptions === 'string') {
      storageRoot = storageRootOrOptions;
    } else if (storageRootOrOptions && typeof storageRootOrOptions === 'object') {
      storageRoot = storageRootOrOptions.storageRoot || './.logs';
      mode = storageRootOrOptions.mode || 'file';
    }

    this.mode = mode;
    this.storageRoot = storageRoot;
    this._memoryLog = [];

    if (this.mode === 'file') {
      // For tests, use OS temp directory to avoid polluting workspace
      if (storageRoot.startsWith('./.')) {
        const tmpBase = path.join(os.tmpdir(), 'agisystem2-logs');
        this.storageRoot = tmpBase;
      }
      this.filePath = path.join(this.storageRoot, 'audit.log');
      this._ensureDir();
    }
  }

  _ensureDir() {
    if (this.mode !== 'file') return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  write(entry) {
    if (this.mode === 'noop') return;

    const record = {
      ts: new Date().toISOString(),
      ...entry
    };

    if (this.mode === 'memory') {
      this._memoryLog.push(record);
      return;
    }

    const line = `${JSON.stringify(record)}\n`;
    fs.appendFileSync(this.filePath, line, 'utf8');
  }

  /**
   * Alias for write() - logs an event with type and data
   * @param {string} eventType - Type of event being logged
   * @param {Object} data - Event data to log
   */
  log(eventType, data) {
    this.write({ event: eventType, ...data });
  }

  /**
   * Get in-memory log entries (only for mode='memory')
   */
  getEntries() {
    return this._memoryLog.slice();
  }
}

module.exports = AuditLog;

