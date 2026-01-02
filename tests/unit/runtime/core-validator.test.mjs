import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Session } from '../../../src/runtime/session.mjs';
import { validateCore } from '../../../src/runtime/core-validator.mjs';

describe('Core validation (strict mode)', () => {
  test('passes after loading type markers', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn('@_ Load "./config/Packs/Bootstrap/00-types.sys2"');

    const report = validateCore(session);
    assert.equal(report.ok, true);
    assert.deepEqual(report.errors, []);
  });

  test('fails deterministically when type markers are missing', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    const report = validateCore(session);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some(e => e.includes('Missing type marker in scope: PersonType')));
  });

  test('Session.loadCore reports CoreValidation errors when strict', () => {
    const session = new Session({ geometry: 2048, strictMode: true });
    const emptyCoreDir = mkdtempSync(join(tmpdir(), 'sys2-core-empty-'));

    const res = session.loadCore({ corePath: emptyCoreDir, includeIndex: false, validate: true });
    assert.equal(res.success, false);
    assert.ok(res.errors.some(e => e.file === 'CoreValidation'));
  });
});
