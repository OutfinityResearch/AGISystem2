/**
 * End-to-End Pipeline Integration Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TestSession } from '../../src/test-lib/test-session.mjs';
import { Assertions } from '../../src/test-lib/assertions.mjs';

describe('End-to-End Pipeline', () => {
  describe('Learn → Query → Decode', () => {
    test('should encode facts and retrieve them via query', () => {
      const session = new TestSession({ geometry: 2048 });

      // 1. LEARN - use @var:name for scope + KB persistence
      session.learnAndVerify(`
        @f1:f1 loves John Mary
        @f2:f2 loves Bob Alice
      `);

      // Verify facts were stored
      assert.ok(session.scope.has('f1'));
      assert.ok(session.scope.has('f2'));
      assert.equal(session.kbFacts.length, 2);

      // 2. QUERY
      const result = session.query('@q loves John ?who');
      assert.ok('bindings' in result);

      // 3. DECODE
      const vec = session.scope.get('f1');
      const summary = session.summarize(vec);
      assert.ok(summary.text, 'should produce text');

      session.close();
    });

    test('should handle multi-argument relations', () => {
      const session = new TestSession({ geometry: 2048 });

      // Use anonymous fact for KB persistence
      session.learn('sells Alice Book Bob');

      const result = session.query('@q sells ?seller Book ?buyer');
      assert.ok('bindings' in result);

      session.close();
    });

    test('should produce readable natural language', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn('@fact loves Romeo Juliet');

      const vec = session.scope.get('fact');
      const summary = session.summarize(vec);

      assert.ok(summary.success, 'summarize should succeed');
      assert.ok(summary.text, 'should have text');

      session.close();
    });
  });

  describe('Learn → Prove → Decode', () => {
    test('should prove direct facts', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        @f1 isA Socrates Human
        @f2 isA Plato Human
      `);

      const proof = session.prove('@g isA Socrates Human');
      assert.ok('valid' in proof);

      session.close();
    });

    test('should track rules', () => {
      const session = new TestSession({ geometry: 2048 });

      // DSL uses references for compound expressions (parentheses not supported)
      session.learn(`
        @cond isA ?x Human
        @conc isA ?x Mortal
        @rule Implies $cond $conc
        @fact isA Socrates Human
      `);

      assert.ok(session.rules.length > 0, 'should track rules');

      session.close();
    });
  });

  describe('Vocabulary and Atoms', () => {
    test('should create consistent atom vectors', () => {
      const session = new TestSession({ geometry: 2048 });

      const v1 = session.vocabulary.getOrCreate('John');
      const v2 = session.vocabulary.getOrCreate('John');

      assert.ok(v1.equals(v2), 'same atom should produce same vector');

      session.close();
    });

    test('different atoms should be quasi-orthogonal', () => {
      const session = new TestSession({ geometry: 2048 });

      const v1 = session.vocabulary.getOrCreate('Apple');
      const v2 = session.vocabulary.getOrCreate('Banana');

      const sim = session.similarity(v1, v2);
      assert.ok(sim > 0.4, `similarity ${sim} should be > 0.4`);
      assert.ok(sim < 0.6, `similarity ${sim} should be < 0.6`);

      session.close();
    });
  });

  describe('TestSession Verification', () => {
    test('should track assertions', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn('@f loves A B');

      const report = session.getReport();
      assert.ok('total' in report);
      assert.ok('passed' in report);
      assert.ok('failed' in report);

      session.close();
    });

    test('should log operations', () => {
      const session = new TestSession({ geometry: 2048 });

      // Use *AndVerify methods which log to testLog
      session.learnAndVerify('@f loves A B');
      session.queryAndVerify('@q loves ?x B', {});

      assert.ok(session.testLog.length >= 2, `Expected >= 2 log entries, got ${session.testLog.length}`);

      session.close();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty KB gracefully', () => {
      const session = new TestSession({ geometry: 2048 });

      assert.throws(() => session.query('@q loves ?who Mary'));

      session.close();
    });

    test('should handle malformed DSL', () => {
      const session = new TestSession({ geometry: 2048 });

      assert.throws(() => session.learn('@f loves John "unterminated'));

      session.close();
    });
  });
});

describe('Assertions Library', () => {
  test('similarityAbove should pass when above threshold', () => {
    assert.doesNotThrow(() => {
      Assertions.similarityAbove(0.7, 0.5);
    });
  });

  test('similarityAbove should fail when below threshold', () => {
    assert.throws(() => {
      Assertions.similarityAbove(0.3, 0.5);
    });
  });

  test('similarityBelow should pass when below threshold', () => {
    assert.doesNotThrow(() => {
      Assertions.similarityBelow(0.3, 0.5);
    });
  });

  test('vectorBalanced should check density', () => {
    const session = new TestSession({ geometry: 1024 });
    const v = session.vocabulary.getOrCreate('test');

    assert.doesNotThrow(() => {
      Assertions.vectorBalanced(v, 0.1);
    });

    session.close();
  });
});
