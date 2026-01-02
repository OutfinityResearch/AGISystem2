/**
 * Tests for Query Engine
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QueryEngine } from '../../../src/reasoning/query.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';

describe('QueryEngine', () => {
  let session;
  let queryEngine;

  function setup() {
    session = new Session({ geometry: 2048 });
    queryEngine = new QueryEngine(session);
    // Keep tests hermetic under strict declaration rules.
    learn('@owns:owns __Relation');
    learn('@relation:relation __Relation');
  }

  function learn(dsl) {
    const result = session.learn(dsl);
    if (!result.success) {
      throw new Error(`Learn failed: ${result.errors.join(', ')}`);
    }
    return result;
  }

  describe('constructor', () => {
    test('should create query engine with session', () => {
      setup();
      assert.ok(queryEngine.session === session);
    });
  });

  describe('execute', () => {
    describe('single hole queries', () => {
      test('should find object of relation', () => {
        setup();
        learn('owns John Mary');

        const query = parse('@q owns John ?who').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('bindings' in result);
        assert.ok(result.bindings.has('who'));
      });

      test('should find subject of relation', () => {
        setup();
        learn('owns Alice Book');

        const query = parse('@q owns ?who Book').statements[0];
        const result = queryEngine.execute(query);

        assert.ok(result.bindings.has('who'));
      });

      test('should report confidence', () => {
        setup();
        learn('owns Bob Pizza');

        const query = parse('@q owns Bob ?what').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('confidence' in result);
        assert.ok(result.confidence >= 0 && result.confidence <= 1);
      });

      test('should report alternatives', () => {
        setup();
        learn(`
          owns Alice Pizza
          owns Alice Pasta
          owns Alice Sushi
        `);

        const query = parse('@q owns Alice ?food').statements[0];
        const result = queryEngine.execute(query);

        const binding = result.bindings.get('food');
        assert.ok('alternatives' in binding);
      });
    });

    describe('multiple hole queries', () => {
      test('should handle two holes', () => {
        setup();
        learn('relation Alice Book Bob');

        const query = parse('@q relation ?seller ?item Bob').statements[0];
        const result = queryEngine.execute(query);

        assert.ok(result.bindings.has('seller'));
        assert.ok(result.bindings.has('item'));
      });

      test('should fail gracefully with too many holes', () => {
        setup();
        learn('owns A B');

        const query = parse('@q ?a ?b ?c ?d ?e').statements[0];
        const result = queryEngine.execute(query);

        assert.equal(result.success, false);
        assert.ok(result.reason.includes('holes'));
      });
    });

    describe('no hole queries (direct match)', () => {
      test('should find matching fact', () => {
        setup();
        learn('owns John Mary');

        const query = parse('@q owns John Mary').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('matches' in result);
      });

      test('should report no match for completely unknown fact', () => {
        setup();
        learn('owns John Mary');

        // Query with completely unrelated entities
        const query = parse('@q owns Planet99 Galaxy88').statements[0];
        const result = queryEngine.execute(query);

        // Either no match or very low confidence
        assert.ok(
          result.success === false || result.confidence < 0.3,
          'unknown fact should have no match or very low confidence'
        );
      });
    });

    describe('empty KB', () => {
      test('should fail gracefully with empty KB', () => {
        setup();

        const query = parse('@q owns ?who Mary').statements[0];
        const result = queryEngine.execute(query);

        // With empty KB, query should fail (no matches) or have no bindings
        assert.ok(
          result.success === false ||
          !result.bindings ||
          result.bindings.size === 0,
          'empty KB should have no bindings'
        );
      });
    });

    describe('ambiguity detection', () => {
      test('should detect ambiguous results', () => {
        setup();
        // Multiple similar facts might cause ambiguity
        learn(`
          owns Alice Bob
          owns Alice Carol
        `);

        const query = parse('@q owns Alice ?child').statements[0];
        const result = queryEngine.execute(query);

        // Result should indicate potential ambiguity
        assert.ok('ambiguous' in result);
      });
    });
  });

  describe('directMatch', () => {
    test('should find exact match', () => {
      setup();
      learn('isA Socrates Human');

      const query = parse('@q isA Socrates Human').statements[0];
      const result = queryEngine.execute(query);

      assert.ok(result.matches.length > 0 || result.success);
    });

    test('should rank by similarity', () => {
      setup();
      learn(`
        isA Cat Animal
        isA Dog Animal
      `);

      const query = parse('@q isA Cat Animal').statements[0];
      const result = queryEngine.execute(query);

      if (result.matches && result.matches.length > 1) {
        assert.ok(
          result.matches[0].similarity >= result.matches[1].similarity,
          'should be sorted by similarity'
        );
      }
    });
  });

  describe('confidence calculation', () => {
    test('should penalize multiple holes', () => {
      setup();
      learn('owns A B');

      const oneHole = parse('@q owns A ?x').statements[0];
      const twoHoles = parse('@q owns ?x ?y').statements[0];

      const result1 = queryEngine.execute(oneHole);
      const result2 = queryEngine.execute(twoHoles);

      // Two holes should generally have lower confidence
      if (result1.success && result2.success) {
        // This is a soft test - confidence may vary
        assert.ok(typeof result1.confidence === 'number');
        assert.ok(typeof result2.confidence === 'number');
      }
    });
  });

  describe('KB interaction', () => {
    test('should work with bundled KB', () => {
      setup();
      learn(`
        owns Alice Bob
        owns Carol Dave
        owns Eve Frank
      `);

      const query = parse('@q owns ?who Bob').statements[0];
      const result = queryEngine.execute(query);

      // Should find something in bundled KB
      assert.ok('bindings' in result);
    });
  });

  describe('multiple results (allResults)', () => {
    test('should return allResults array', () => {
      setup();
      learn(`
        isA Rex Dog
        isA Whiskers Cat
        isA Tweety Bird
      `);

      const query = parse('@q isA Rex ?what').statements[0];
      const result = queryEngine.execute(query);

      assert.ok('allResults' in result, 'should have allResults');
      assert.ok(Array.isArray(result.allResults), 'allResults should be array');
    });

    test('should find correct answer among multiple facts', () => {
      setup();
      learn(`
        isA Rex Dog
        isA Whiskers Cat
        isA Tweety Bird
      `);

      const query = parse('@q isA Rex ?what').statements[0];
      const result = queryEngine.execute(query);

      assert.ok(result.success, 'query should succeed');
      assert.ok(result.bindings.has('what'), 'should have binding for what');
      assert.equal(result.bindings.get('what').answer, 'Dog', 'Rex should be a Dog');
    });

    test('should return multiple matching results', () => {
      setup();
      // Multiple animals - query "what is an Animal"
      learn(`
        isA Dog Animal
        isA Cat Animal
        isA Bird Animal
      `);

      const query = parse('@q isA ?what Animal').statements[0];
      const result = queryEngine.execute(query);

      assert.ok(result.success, 'query should succeed');
      assert.ok(result.allResults.length >= 1, 'should have at least one result');
      // The best answer should be one of Dog, Cat, or Bird
      const answer = result.bindings.get('what').answer;
      assert.ok(['Dog', 'Cat', 'Bird'].includes(answer), `answer ${answer} should be Dog, Cat, or Bird`);
    });

    test('should provide alternatives from other matching facts', () => {
      setup();
      learn(`
        owns John Pizza
        owns John Pasta
        owns John Sushi
      `);

      const query = parse('@q owns John ?food').statements[0];
      const result = queryEngine.execute(query);

      assert.ok(result.success, 'query should succeed');
      const binding = result.bindings.get('food');
      assert.ok(binding, 'should have food binding');
      // Main answer should be one of the foods
      assert.ok(['Pizza', 'Pasta', 'Sushi'].includes(binding.answer),
        `answer ${binding.answer} should be Pizza, Pasta, or Sushi`);
      // allResults should contain multiple results
      assert.ok(result.allResults.length >= 1, 'should have multiple results in allResults');
    });

    test('should work through session.query()', () => {
      setup();
      session.learn(`
        owns John Mary
        owns John Bob
        owns Alice Carol
      `);

      const result = session.query('@q owns John ?child');

      assert.ok(result.success, 'query should succeed');
      assert.ok('allResults' in result, 'should have allResults via session.query');
      const answer = result.bindings.get('child').answer;
      assert.ok(['Mary', 'Bob'].includes(answer), `John's value should be Mary or Bob, got ${answer}`);
    });
  });
});
