/**
 * Operations Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../../src/core/vector.mjs';
import {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind
} from '../../../src/core/operations.mjs';

describe('HDC Operations', () => {
  describe('bind', () => {
    test('should XOR two vectors', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      v2.setBit(0, 1);
      v2.setBit(1, 1);

      const result = bind(v1, v2);
      assert.equal(result.getBit(0), 0); // 1 XOR 1 = 0
      assert.equal(result.getBit(1), 1); // 0 XOR 1 = 1
    });

    test('should be self-inverse', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);

      const bound = bind(v1, v2);
      const unbound = bind(bound, v2);

      assert.ok(v1.equals(unbound), 'bind should be self-inverse');
    });

    test('should be commutative', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);

      const r1 = bind(v1, v2);
      const r2 = bind(v2, v1);

      assert.ok(r1.equals(r2), 'bind should be commutative');
    });

    test('should throw on geometry mismatch', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(2048);
      assert.throws(() => bind(v1, v2));
    });
  });

  describe('bindAll', () => {
    test('should bind multiple vectors', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);
      const v3 = Vector.random(1024);

      const result = bindAll(v1, v2, v3);
      const expected = bind(bind(v1, v2), v3);

      assert.ok(result.equals(expected));
    });

    test('should return clone for single vector', () => {
      const v = Vector.random(1024);
      const result = bindAll(v);
      assert.ok(v.equals(result));
      assert.notEqual(v, result); // Should be a clone
    });

    test('should throw on empty input', () => {
      assert.throws(() => bindAll());
    });
  });

  describe('bundle', () => {
    test('should compute majority vote', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      const v3 = new Vector(1024);

      // Set bit 0 in 2 of 3 vectors
      v1.setBit(0, 1);
      v2.setBit(0, 1);
      // v3 has bit 0 = 0

      const result = bundle([v1, v2, v3]);
      assert.equal(result.getBit(0), 1, 'majority should win');
    });

    test('should return clone for single vector', () => {
      const v = Vector.random(1024);
      const result = bundle([v]);
      assert.ok(v.equals(result));
    });

    test('should throw on empty input', () => {
      assert.throws(() => bundle([]));
    });

    test('bundled vectors remain similar to originals', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);
      const bundled = bundle([v1, v2]);

      // Bundled result should be somewhat similar to both
      const sim1 = similarity(bundled, v1);
      const sim2 = similarity(bundled, v2);

      assert.ok(sim1 > 0.5, `similarity to v1: ${sim1}`);
      assert.ok(sim2 > 0.5, `similarity to v2: ${sim2}`);
    });
  });

  describe('similarity', () => {
    test('should return 1.0 for identical vectors', () => {
      const v = Vector.random(1024);
      assert.equal(similarity(v, v), 1.0);
    });

    test('should return ~0.5 for random vectors', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);
      const sim = similarity(v1, v2);

      assert.ok(sim > 0.4, `similarity ${sim} should be > 0.4`);
      assert.ok(sim < 0.6, `similarity ${sim} should be < 0.6`);
    });

    test('should return 0.0 for inverse vectors', () => {
      const v1 = Vector.random(1024);
      const v2 = v1.clone();
      v2.notInPlace();

      assert.equal(similarity(v1, v2), 0.0);
    });
  });

  describe('distance', () => {
    test('should be complement of similarity', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);

      const sim = similarity(v1, v2);
      const dist = distance(v1, v2);

      assert.ok(Math.abs(sim + dist - 1.0) < 0.0001);
    });
  });

  describe('topKSimilar', () => {
    test('should find most similar vectors', () => {
      const query = Vector.random(1024);
      const vocab = new Map();
      vocab.set('random1', Vector.random(1024));
      vocab.set('random2', Vector.random(1024));
      vocab.set('same', query.clone());

      const results = topKSimilar(query, vocab, 3);

      assert.equal(results.length, 3);
      assert.equal(results[0].name, 'same');
      assert.equal(results[0].similarity, 1.0);
    });

    test('should work with object vocabulary', () => {
      const query = Vector.random(1024);
      const vocab = {
        a: Vector.random(1024),
        b: query.clone()
      };

      const results = topKSimilar(query, vocab, 2);
      assert.equal(results[0].name, 'b');
    });
  });

  describe('isOrthogonal', () => {
    test('should return true for random vectors', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);
      assert.ok(isOrthogonal(v1, v2));
    });

    test('should return false for identical vectors', () => {
      const v = Vector.random(1024);
      assert.ok(!isOrthogonal(v, v));
    });
  });

  describe('unbind', () => {
    test('should be same as bind (self-inverse)', () => {
      const v1 = Vector.random(1024);
      const v2 = Vector.random(1024);

      const bound = bind(v1, v2);
      const unbound = unbind(bound, v2);

      assert.ok(v1.equals(unbound));
    });
  });
});
