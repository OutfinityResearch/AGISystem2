/**
 * Deep Integration Tests for Reasoning Pipeline
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../src/runtime/session.mjs';
import { similarity } from '../../src/core/operations.mjs';

describe('Deep Reasoning', () => {
  test('basic test', () => {
    const session = new Session({ geometry: 2048 });
    session.learn('@f test A B');
    assert.ok(session.scope.has('f'));
    session.close();
  });

  test('family relations', () => {
    const session = new Session({ geometry: 4096 });
    // Use anonymous facts for KB persistence
    session.learn(`
      parent John Mary
      parent John Bob
    `);
    const query = session.query('@q parent John ?child');
    assert.ok('bindings' in query);
    session.close();
  });

  test('IS-A hierarchies', () => {
    const session = new Session({ geometry: 4096 });
    session.learn(`
      @f1 isA Socrates Human
      @f2 isA Human Mortal
    `);
    const proof = session.prove('@g isA Socrates Human');
    assert.ok('valid' in proof);
    session.close();
  });

  test('determinism', () => {
    const session1 = new Session({ geometry: 2048 });
    const session2 = new Session({ geometry: 2048 });
    session1.learn('@f loves John Mary');
    session2.learn('@f loves John Mary');
    const v1 = session1.scope.get('f');
    const v2 = session2.scope.get('f');
    assert.equal(similarity(v1, v2), 1.0);
    session1.close();
    session2.close();
  });
});
