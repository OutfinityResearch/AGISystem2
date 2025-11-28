const fs = require('fs');
const path = require('path');
const os = require('os');
const Config = require('../../src/support/config');
const AuditLog = require('../../src/support/audit_log');
const StorageAdapter = require('../../src/support/storage');

async function run() {
  let ok = true;

  // Use memory-mode audit to avoid creating files
  const memConfig = new Config().load({ profile: 'auto_test', persistenceStrategy: 'memory' });
  const memAudit = new AuditLog({ mode: 'memory' });
  const memStore = new StorageAdapter({ config: memConfig, audit: memAudit });
  const payload = Buffer.from([1, 2, 3]);
  memStore.saveConcept('c1', payload);
  const loaded = memStore.loadConcept('c1');
  ok = ok && loaded && loaded.length === 3 && loaded[0] === 1 && loaded[2] === 3;
  ok = ok && memStore.listConcepts().includes('c1');

  // Use temp directory for file-based tests
  const fileRoot = path.join(os.tmpdir(), 'agisystem2-test-storage');
  const fileConfig = new Config().load({ profile: 'manual_test', storageRoot: fileRoot });
  const fileAudit = new AuditLog({ mode: 'memory' });
  const fileStore = new StorageAdapter({ config: fileConfig, audit: fileAudit });
  const theoryId = 't1';
  const theoryText = '@f ASSERT dog IS_A Animal\n';
  fileStore.saveTheoryText(theoryId, theoryText);
  const loadedText = fileStore.loadTheoryText(theoryId);
  ok = ok && typeof loadedText === 'string' && loadedText.includes('dog IS_A Animal');
  const cachePayload = Buffer.from([9, 8, 7]);
  fileStore.saveTheoryCache(theoryId, cachePayload);
  const cache = fileStore.loadTheoryCache(theoryId);
  ok = ok && cache && cache[0] === 9 && cache[2] === 7;
  ok = ok && fileStore.listTheories().includes('t1');

  // Cleanup temp directory
  if (fs.existsSync(fileRoot)) {
    fs.rmSync(fileRoot, { recursive: true, force: true });
  }

  return { ok };
}

module.exports = { run };
