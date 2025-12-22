/**
 * Session checkDSL strictness tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Session DSL validation', () => {
  test('learn rejects unknown operator when not declared', () => {
    const session = new Session({ geometry: 1024 });
    assert.throws(() => session.learn('@f blorp A B'));
  });

  test('learn allows operators declared in the same script', () => {
    const session = new Session({ geometry: 1024 });
    const result = session.learn(`
      @rel:rel __Relation
      rel A B
    `);
    assert.equal(result.success, true);
    assert.equal(result.facts, 2);
  });
});
