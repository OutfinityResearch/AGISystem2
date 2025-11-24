const fs = require('fs');
const path = require('path');
const Config = require('../../src/support/config');
const AuditLog = require('../../src/support/audit_log');
const StorageAdapter = require('../../src/support/storage');

async function run() {
  let ok = true;

  const memConfig = new Config().load({ profile: 'auto_test', persistenceStrategy: 'memory' });
  const memAudit = new AuditLog('./.logs_test');
  const memStore = new StorageAdapter({ config: memConfig, audit: memAudit });
  const payload = Buffer.from([1, 2, 3]);
  memStore.saveConcept('c1', payload);
  const loaded = memStore.loadConcept('c1');
  ok = ok && loaded && loaded.length === 3 && loaded[0] === 1 && loaded[2] === 3;
  ok = ok && memStore.listConcepts().includes('c1');

  const fileRoot = './.data_test_storage';
  const fileConfig = new Config().load({ profile: 'manual_test', storageRoot: fileRoot });
  const fileAudit = new AuditLog('./.logs_test');
  const fileStore = new StorageAdapter({ config: fileConfig, audit: fileAudit });
  fileStore.saveTheory('t1', Buffer.from([9, 8, 7]));
  const theory = fileStore.loadTheory('t1');
  ok = ok && theory && theory[0] === 9 && theory[2] === 7;
  ok = ok && fileStore.listTheories().includes('t1');

  if (fs.existsSync(fileRoot)) {
    fs.rmSync(fileRoot, { recursive: true, force: true });
  }

  return { ok };
}

module.exports = { run };

