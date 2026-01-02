import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

describe('CommonJS entrypoint (index.cjs)', () => {
  test('require() returns a Promise resolving to ESM exports', async () => {
    const require = createRequire(import.meta.url);
    const modPromise = require('../../index.cjs');

    assert.ok(modPromise && typeof modPromise.then === 'function');

    const mod = await modPromise;
    assert.equal(typeof mod.Session, 'function');
    assert.equal(mod.default, mod.Session);
  });
});

