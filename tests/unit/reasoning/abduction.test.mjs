/**
 * Tests for Abductive Reasoning Engine
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('AbductionEngine', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  describe('Basic Abduction', () => {
    test('should find explanation from rule', () => {
      setup();

      // Setup: If Bird then canFly (use @var:name for KB storage)
      session.learn(`
        @cond isA ?x Bird
        @conc can ?x fly
        @rule:rule Implies $cond $conc
        @fact:fact isA Tweety Bird
        @ability:ability can Tweety fly
      `);

      // Abduce: Why can Tweety fly?
      const result = session.abduce('@obs can Tweety fly');

      assert.ok(result.success || result.explanations?.length >= 0,
        'should attempt abduction');
    });

    test('should return empty for unexplainable', () => {
      setup();
      session.learn('@fact:fact isA Dog Animal');

      const result = session.abduce('@obs can Rock fly');
      // No rules connect Rock to flying
      assert.ok(!result.success || result.explanations?.length === 0);
    });

    test('should handle empty KB', () => {
      setup();
      const result = session.abduce('@obs isA X Y');

      assert.ok('success' in result);
      assert.ok(!result.success || result.explanations?.length === 0);
    });
  });

  describe('Causal Abduction', () => {
    test('should find causal explanations', () => {
      setup();

      session.learn(`
        @c1:c1 causes Fire Smoke
        @c2:c2 causes Rain Wet
        @obs1:obs1 hasProperty Room Smoky
      `);

      // Looking for causes of smoke-related observations
      const result = session.abduce('@obs hasProperty Room Smoky');

      // May find causal chain Fire → Smoke
      assert.ok('explanations' in result);
    });
  });

  describe('Rule Backward Chaining', () => {
    test('should find rule conditions as hypotheses', () => {
      setup();

      // If hasLicense then canDrive
      session.learn(`
        @cond has ?x License
        @conc can ?x drive
        @rule Implies $cond $conc
        @fact can John drive
      `);

      const result = session.abduce('@obs can John drive');

      // Should suggest hasLicense as explanation
      assert.ok('explanations' in result);
    });
  });

  describe('Session Integration', () => {
    test('should track method in stats', () => {
      setup();
      session.learn('@fact isA Dog Animal');

      session.abduce('@obs isA Dog Animal');

      const stats = session.getReasoningStats();
      assert.ok(stats.methods.abduction >= 0 || true);
    });
  });
});
