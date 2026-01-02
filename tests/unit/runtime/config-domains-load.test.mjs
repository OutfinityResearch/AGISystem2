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
  const res = session.loadPack('Kernel', { includeIndex: true, validate: false });
  assert.equal(res.success, true, `Kernel pack load failed: ${JSON.stringify(res.errors || [])}`);
  const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
  assert.equal(extras.success, true, `tests_and_evals pack load failed: ${JSON.stringify(extras.errors || [])}`);
}

function loadDomainIndex(session, domainName) {
  const domainPath = path.join('./evals/domains', domainName);
  const indexPath = path.join(domainPath, 'index.sys2');
  const index = fs.readFileSync(indexPath, 'utf8');
  const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
  let match;
  while ((match = loadRegex.exec(index)) !== null) {
    const raw = match[1];
    const rel = raw.startsWith('./') ? raw.slice(2) : raw;
    const resolved = rel.startsWith('evals/') || rel.startsWith('config/')
      ? path.join('.', rel)
      : path.join(domainPath, rel);
    loadSys2File(session, resolved);
  }
}

describe('Domain theory loading', () => {
  test('All evals/domains load cleanly after Core', () => {
    const domains = fs.readdirSync('./evals/domains')
      .filter(d => fs.statSync(path.join('./evals/domains', d)).isDirectory())
      .filter(d => fs.existsSync(path.join('./evals/domains', d, 'index.sys2')))
      .sort();

    for (const domain of domains) {
      const session = new Session({ geometry: 2048 });
      loadCore(session);
      loadDomainIndex(session, domain);
    }
  });
});
