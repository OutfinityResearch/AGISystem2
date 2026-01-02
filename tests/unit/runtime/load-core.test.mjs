import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Session.loadCore', () => {
  test('loads Kernel pack without errors', () => {
    const session = new Session({ geometry: 2048 });
    const result = session.loadCore({ includeIndex: true });
    assert.equal(result.success, true, JSON.stringify(result.errors));
    assert.ok(session.kbFacts.length > 50);
  });
});
