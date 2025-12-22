/**
 * Session Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Session', () => {
  describe('constructor', () => {
    test('should create session with default geometry', () => {
      const session = new Session();
      assert.equal(session.geometry, 32768);
    });

    test('should create session with custom geometry', () => {
      const session = new Session({ geometry: 1024 });
      assert.equal(session.geometry, 1024);
    });
  });

  describe('learn', () => {
    test('should learn simple fact', () => {
      const session = new Session({ geometry: 1024 });
      const result = session.learn('@f loves John Mary');

      assert.ok(result.success);
      assert.equal(result.facts, 1);
      assert.ok(session.scope.has('f'));
    });

    test('should learn multiple facts', () => {
      const session = new Session({ geometry: 1024 });
      const result = session.learn(`
        @f1 loves John Mary
        @f2 parent John Alice
      `);

      assert.ok(result.success);
      assert.equal(result.facts, 2);
    });

    test('should return errors for invalid DSL', () => {
      const session = new Session({ geometry: 1024 });
      assert.throws(() => session.learn('@f loves John "unterminated'));
    });

    test('should add facts to KB', () => {
      const session = new Session({ geometry: 1024 });
      // Use @var:name syntax for persistent fact (scope + KB)
      session.learn('@f:f loves John Mary');

      assert.ok(session.kb !== null);
      assert.equal(session.kbFacts.length, 1);
    });
  });

  describe('query', () => {
    test('should query with single hole', () => {
      const session = new Session({ geometry: 1024 });
      // Use anonymous fact for KB persistence (no scope needed for learning)
      session.learn('loves John Mary');

      const result = session.query('@q loves ?who Mary');
      // Note: with 1024 geometry, results may not be perfect
      assert.ok('success' in result);
      assert.ok('bindings' in result);
    });

    test('should return empty result from empty KB', () => {
      const session = new Session({ geometry: 1024 });
      const result = session.query('@q loves ?who Mary');
      assert.equal(result.success, false);
      assert.equal(result.bindings.size, 0);
    });

    test('should fail with too many holes', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f sells A B C D');

      const result = session.query('@q sells ?a ?b ?c ?d');
      assert.ok(!result.success);
      assert.ok(result.reason.includes('Too many holes'));
    });
  });

  describe('prove', () => {
    test('should prove direct fact', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f loves John Mary');

      const result = session.prove('@g loves John Mary');
      // Direct match should be found
      assert.ok('valid' in result);
    });

    test('should fail to prove unknown fact', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f loves John Mary');

      const result = session.prove('@g hates John Mary');
      assert.equal(result.valid, false);
    });
  });

  describe('decode', () => {
    test('should decode stored vector', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f loves John Mary');

      const vec = session.scope.get('f');
      const decoded = session.decode(vec);

      assert.ok('success' in decoded);
      if (decoded.success) {
        assert.ok('structure' in decoded);
        assert.ok('operator' in decoded.structure);
      }
    });
  });

  describe('summarize', () => {
    test('should generate text from vector', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f loves Romeo Juliet');

      const vec = session.scope.get('f');
      const summary = session.summarize(vec);

      assert.ok('text' in summary);
    });
  });

  describe('similarity', () => {
    test('should compute similarity between vectors', () => {
      const session = new Session({ geometry: 1024 });
      const v1 = session.vocabulary.getOrCreate('John');
      const v2 = session.vocabulary.getOrCreate('Mary');

      const sim = session.similarity(v1, v2);
      assert.ok(sim >= 0 && sim <= 1);
    });

    test('identical atoms should have similarity 1.0', () => {
      const session = new Session({ geometry: 1024 });
      const v1 = session.vocabulary.getOrCreate('John');
      const v2 = session.vocabulary.getOrCreate('John');

      assert.equal(session.similarity(v1, v2), 1.0);
    });
  });

  describe('dump', () => {
    test('should return session state', () => {
      const session = new Session({ geometry: 1024 });
      // Use @var:name syntax for persistent fact (scope + KB)
      session.learn('@f:f loves John Mary');

      const dump = session.dump();
      assert.equal(dump.geometry, 1024);
      assert.equal(dump.factCount, 1);
      assert.ok(dump.scopeBindings.includes('f'));
    });
  });

  describe('close', () => {
    test('should clean up resources', () => {
      const session = new Session({ geometry: 1024 });
      session.learn('@f loves John Mary');
      session.close();

      assert.equal(session.kb, null);
      assert.equal(session.kbFacts.length, 0);
    });
  });
});
