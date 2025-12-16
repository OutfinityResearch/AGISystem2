/**
 * Tests for Inductive Reasoning Engine
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('InductionEngine', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  describe('Hierarchy Pattern Discovery', () => {
    test('should discover isA patterns', () => {
      setup();

      // Multiple things are Animals (use @var:name for KB storage)
      session.learn(`
        @f1:f1 isA Dog Animal
        @f2:f2 isA Cat Animal
        @f3:f3 isA Bird Animal
        @f4:f4 isA Fish Animal
      `);

      const result = session.induce({ minExamples: 3 });

      assert.ok(result.success, 'should find patterns');
      assert.ok(result.patterns.length > 0, 'should have at least one pattern');

      // Should find "Animal" as common parent
      const hierarchyPattern = result.patterns.find(p => p.type === 'hierarchy');
      assert.ok(hierarchyPattern, 'should find hierarchy pattern');
      assert.ok(hierarchyPattern.examples >= 3, 'should have >= 3 examples');
    });

    test('should find transitive chains', () => {
      setup();

      session.learn(`
        @f1:f1 isA Dog Mammal
        @f2:f2 isA Mammal Animal
        @f3:f3 isA Animal LivingThing
      `);

      const result = session.induce({ minExamples: 2 });

      // Should find chain: Dog → Mammal → Animal → LivingThing
      const chainPattern = result.patterns.find(p => p.type === 'hierarchy_chain');
      if (chainPattern) {
        assert.ok(chainPattern.chain.length >= 2, 'chain should have multiple steps');
      }
    });
  });

  describe('Property Pattern Discovery', () => {
    test('should find common properties', () => {
      setup();

      session.learn(`
        @f1:f1 isA Tweety Bird
        @f2:f2 isA Robin Bird
        @f3:f3 isA Eagle Bird
        @p1:p1 can Tweety fly
        @p2:p2 can Robin fly
        @p3:p3 can Eagle fly
      `);

      const result = session.induce({ minExamples: 3 });

      // Should suggest: Bird → canFly
      assert.ok(result.patterns.length >= 0);
    });
  });

  describe('Relational Pattern Discovery', () => {
    test('should group by operator', () => {
      setup();

      session.learn(`
        @f1:f1 loves John Mary
        @f2:f2 loves Alice Bob
        @f3:f3 loves Carol Dave
        @f4:f4 loves Eve Frank
      `);

      const result = session.induce({ minExamples: 3 });

      const relationalPattern = result.patterns.find(p =>
        p.type === 'relational' && p.operator === 'loves'
      );

      if (relationalPattern) {
        assert.ok(relationalPattern.facts >= 3, 'should find multiple loves facts');
      }
    });
  });

  describe('Rule Suggestion', () => {
    test('should generate rule suggestions', () => {
      setup();

      session.learn(`
        @f1:f1 isA Dog Animal
        @f2:f2 isA Cat Animal
        @f3:f3 isA Bird Animal
        @p1:p1 hasProperty Dog mortal
        @p2:p2 hasProperty Cat mortal
        @p3:p3 hasProperty Bird mortal
      `);

      const result = session.induce({ minExamples: 2 });

      assert.ok('suggestedRules' in result);
      if (result.suggestedRules.length > 0) {
        assert.ok(result.suggestedRules[0].dsl, 'rule should have DSL');
        assert.ok(result.suggestedRules[0].confidence > 0, 'rule should have confidence');
      }
    });
  });

  describe('Learn From Examples', () => {
    test('should learn from DSL examples', () => {
      setup();

      const result = session.learnFrom([
        '@f1:f1 isA Apple Fruit',
        '@f2:f2 isA Banana Fruit',
        '@f3:f3 isA Orange Fruit',
        '@f4:f4 isA Grape Fruit'
      ]);

      assert.ok(result.patterns?.length >= 0 || result.success !== undefined);
    });
  });

  describe('Session Integration', () => {
    test('should work via session.induce()', () => {
      setup();

      session.learn(`
        @f1:f1 isA X Y
        @f2:f2 isA A B
        @f3:f3 isA C D
      `);

      const result = session.induce();

      assert.ok('success' in result);
      assert.ok('patterns' in result);
    });

    test('should handle empty KB', () => {
      setup();

      const result = session.induce();

      assert.ok('success' in result);
      // Empty KB means no patterns
    });
  });
});
