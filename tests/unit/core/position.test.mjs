/**
 * Position Vector Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../../src/core/vector.mjs';
import { similarity } from '../../../src/core/operations.mjs';
import {
  getPositionVector,
  initPositionVectors,
  withPosition,
  removePosition,
  clearPositionCache
} from '../../../src/core/position.mjs';

describe('Position Vectors', () => {
  describe('getPositionVector', () => {
    test('should return consistent vector for same position', () => {
      clearPositionCache();
      const p1a = getPositionVector(1, 1024);
      const p1b = getPositionVector(1, 1024);
      assert.ok(p1a.equals(p1b));
    });

    test('should return different vectors for different positions', () => {
      const p1 = getPositionVector(1, 1024);
      const p2 = getPositionVector(2, 1024);
      assert.ok(!p1.equals(p2));
    });

    test('should throw on invalid position', () => {
      assert.throws(() => getPositionVector(0, 1024));
      assert.throws(() => getPositionVector(21, 1024));
      assert.throws(() => getPositionVector(-1, 1024));
    });

    test('position vectors should be quasi-orthogonal', () => {
      const p1 = getPositionVector(1, 1024);
      const p2 = getPositionVector(2, 1024);
      const sim = similarity(p1, p2);

      assert.ok(sim > 0.4, `similarity ${sim} should be > 0.4`);
      assert.ok(sim < 0.6, `similarity ${sim} should be < 0.6`);
    });
  });

  describe('initPositionVectors', () => {
    test('should return 20 position vectors', () => {
      const positions = initPositionVectors(1024);
      assert.equal(positions.length, 20);
    });

    test('all vectors should have correct geometry', () => {
      const positions = initPositionVectors(1024);
      for (const p of positions) {
        assert.equal(p.geometry, 1024);
      }
    });
  });

  describe('withPosition / removePosition', () => {
    test('should mark and unmark position', () => {
      const v = Vector.random(1024);
      const positioned = withPosition(1, v);
      const recovered = removePosition(1, positioned);

      assert.ok(v.equals(recovered), 'should recover original vector');
    });

    test('different positions should produce different results', () => {
      const v = Vector.random(1024);
      const p1 = withPosition(1, v);
      const p2 = withPosition(2, v);

      assert.ok(!p1.equals(p2));
    });

    test('removing wrong position should not recover original', () => {
      const v = Vector.random(1024);
      const positioned = withPosition(1, v);
      const wrong = removePosition(2, positioned);

      assert.ok(!v.equals(wrong));
    });
  });
});
