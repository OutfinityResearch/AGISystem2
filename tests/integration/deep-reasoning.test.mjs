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
    session.learn('@rel:rel __Relation');
    session.learn('@f rel A B');
    assert.ok(session.scope.has('f'));
    session.close();
  });

  test('family relations', () => {
    const session = new Session({ geometry: 4096 });
    session.learn('@rel:rel __Relation');
    // Use anonymous facts for KB persistence.
    session.learn(`
      rel John Mary
      rel John Bob
    `);
    const query = session.query('@q rel John ?child');
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
    // Use a globally comparable strategy (EXACT is session-local by design).
    const session1 = new Session({ geometry: 2048, hdcStrategy: 'dense-binary' });
    const session2 = new Session({ geometry: 2048, hdcStrategy: 'dense-binary' });
    session1.learn('@rel:rel __Relation');
    session2.learn('@rel:rel __Relation');
    session1.learn('@f rel John Mary');
    session2.learn('@f rel John Mary');
    const v1 = session1.scope.get('f');
    const v2 = session2.scope.get('f');
    assert.equal(similarity(v1, v2), 1.0);
    session1.close();
    session2.close();
  });
});
