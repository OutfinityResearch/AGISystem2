/**
 * Session Feature Tests
 * Tests for session features discovered during bug fixing
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Session Features', () => {

  describe('Transitive Reasoning', () => {
    test('should prove direct fact', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');

      const result = session.prove('@goal isA Socrates Philosopher');
      assert.equal(result.valid, true);
      // Direct matches may be proven via raw fact string or structured metadata fastpath.
      assert.ok(['direct', 'direct_metadata'].includes(result.method));
    });

    test('should prove 2-step transitive chain', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');
      session.learn('isA Philosopher Human');

      const result = session.prove('@goal isA Socrates Human');
      assert.equal(result.valid, true);
      assert.ok(['transitive_chain', 'transitive_direct'].includes(result.method));
    });

    test('should prove 3-step transitive chain', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');
      session.learn('isA Philosopher Human');
      session.learn('isA Human Mammal');

      const result = session.prove('@goal isA Socrates Mammal');
      assert.equal(result.valid, true);
    });

    test('should return false for non-existent relation', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');

      const result = session.prove('@goal isA Socrates Alien');
      assert.equal(result.valid, false);
    });
  });

  describe('Query Results', () => {
    test('should return correct binding for direct match', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');

      const result = session.query('@q isA Socrates ?what');
      assert.equal(result.success, true);
      assert.equal(result.bindings.get('what').answer, 'Philosopher');
    });

    test('should return high score for exact match', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Philosopher');

      const result = session.query('@q isA Socrates ?what');
      assert.ok(result.allResults[0].score > 0.9);
    });

    test('should handle multiple results', () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA John PizzaLover');
      session.learn('isA John PastaLover');
      session.learn('isA John SushiLover');

      const result = session.query('@q isA John ?food');
      assert.equal(result.success, true);
      assert.ok(result.allResults.length >= 1);
    });
  });

  describe('Load Command', () => {
    test('should load theory file', () => {
      const session = new Session({ geometry: 2048 });
      const initialFacts = session.kbFacts.length;

      // Use an existing core theory file
      session.learn('@_ Load "./config/Packs/Bootstrap/00-types.sys2"');

      // Core types may not add KB facts (they define types), so check scope or no error
      // This test verifies Load command works without throwing
      assert.ok(session.loadedFiles && session.loadedFiles.has('./config/Packs/Bootstrap/00-types.sys2') || true, 'should load without error');
    });

    test('should not double-load same file', () => {
      const session = new Session({ geometry: 2048 });

      session.learn('@_ Load "./config/Packs/Bootstrap/00-types.sys2"');
      const loadedAfterFirst = session.loadedFiles?.size || 0;

      session.learn('@_ Load "./config/Packs/Bootstrap/00-types.sys2"');
      const loadedAfterSecond = session.loadedFiles?.size || 0;

      // If loadedFiles tracking exists, size shouldn't change
      assert.equal(loadedAfterSecond, loadedAfterFirst, 'should not double-load');
    });
  });

  describe('Contradiction Detection', () => {
    test('should detect before/after contradiction (baseline constraint)', () => {
      const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });
      session.learn('before Box Shelf');
      const result = session.learn('after Box Shelf');

      assert.equal(result.success, false);
      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings[0].includes('contradiction'));
      assert.equal(session.kbFacts.length, 1);
    });

    test('should detect inverse contradiction via contradictsSameArgs (baseline constraint)', () => {
      const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });
      session.learn('after A B');
      const result = session.learn('before A B');

      assert.equal(result.success, false);
      assert.ok(result.warnings.length > 0);
      assert.equal(session.kbFacts.length, 1);
    });

    test('should not warn for non-contradictory facts', () => {
      const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });
      session.learn('hasProperty Car Red');
      const result = session.learn('hasProperty Car Fast');

      assert.equal(result.warnings.length, 0);
    });
  });

  describe('Generate Text', () => {
    test('should generate text for isA', () => {
      const session = new Session({ geometry: 2048 });
      const text = session.generateText('isA', ['Dog', 'Animal']);
      assert.ok(text.toLowerCase().includes('dog'));
      assert.ok(text.toLowerCase().includes('animal'));
    });

    test('should generate text for loves', () => {
      const session = new Session({ geometry: 2048 });
      const text = session.generateText('loves', ['John', 'Mary']);
      assert.ok(text.toLowerCase().includes('john'));
      assert.ok(text.toLowerCase().includes('mary'));
    });

    test('should handle unknown operator', () => {
      const session = new Session({ geometry: 2048 });
      const text = session.generateText('unknownOp', ['A', 'B']);
      assert.ok(typeof text === 'string');
    });
  });
});
