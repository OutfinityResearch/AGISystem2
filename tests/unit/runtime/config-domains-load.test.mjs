import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { Session } from '../../../src/runtime/session.mjs';

function loadSys2File(session, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = session.learn(content);
  assert.equal(result.success, true, `${filePath} failed: ${JSON.stringify(result.errors)}`);
}

function loadCore(session) {
  const corePath = './config/Core';
  const files = fs
    .readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  for (const file of files) {
    loadSys2File(session, path.join(corePath, file));
  }
}

function loadDomainIndex(session, domainName) {
  const domainPath = path.join('./config', domainName);
  const indexPath = path.join(domainPath, 'index.sys2');
  const index = fs.readFileSync(indexPath, 'utf8');
  const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
  let match;
  while ((match = loadRegex.exec(index)) !== null) {
    const rel = match[1].replace('./', '');
    loadSys2File(session, path.join(domainPath, rel));
  }
}

describe('Config domain theory loading', () => {
  test('Geography/History/Law load cleanly after Core', () => {
    const session = new Session({ geometry: 2048 });
    loadCore(session);

    loadDomainIndex(session, 'Geography');
    loadDomainIndex(session, 'History');
    loadDomainIndex(session, 'Law');
  });
});

