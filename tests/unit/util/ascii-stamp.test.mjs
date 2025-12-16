/**
 * Tests for ASCII Stamp vector generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { asciiStamp, asciiStampBatch } from '../../../src/util/ascii-stamp.mjs';
import { Vector } from '../../../src/core/vector.mjs';
import { similarity } from '../../../src/core/operations.mjs';

describe('ASCII Stamp', () => {
  describe('asciiStamp', () => {
    test('should return a Vector', () => {
      const v = asciiStamp('test', 1024);
      assert.ok(v instanceof Vector, 'should return Vector instance');
    });

    test('should create vector with correct geometry', () => {
      const v = asciiStamp('test', 2048);
      assert.equal(v.geometry, 2048, 'geometry should match');
    });

    test('should be deterministic for same identifier', () => {
      const v1 = asciiStamp('hello', 1024);
      const v2 = asciiStamp('hello', 1024);
      assert.ok(v1.equals(v2), 'same identifier should produce identical vectors');
    });

    test('should be deterministic across calls', () => {
      const v1 = asciiStamp('John', 2048);
      const v2 = asciiStamp('John', 2048);
      const sim = similarity(v1, v2);
      assert.equal(sim, 1.0, 'same name should have identical vectors');
    });

    test('should produce different vectors for different identifiers', () => {
      const v1 = asciiStamp('apple', 1024);
      const v2 = asciiStamp('banana', 1024);
      assert.ok(!v1.equals(v2), 'different identifiers should produce different vectors');
    });

    test('should produce quasi-orthogonal vectors for random names', () => {
      const v1 = asciiStamp('Alice', 2048);
      const v2 = asciiStamp('Bob', 2048);
      const sim = similarity(v1, v2);

      // Quasi-orthogonal means similarity around 0.5
      assert.ok(sim > 0.4 && sim < 0.6, `similarity ${sim} should be around 0.5`);
    });

    test('should produce approximately 50% density', () => {
      const v = asciiStamp('test_density', 4096);
      const density = v.density();
      assert.ok(density > 0.45 && density < 0.55, `density ${density} should be ~0.5`);
    });

    test('should handle empty string', () => {
      const v = asciiStamp('', 1024);
      assert.ok(v instanceof Vector, 'should handle empty string');
    });

    test('should handle long strings', () => {
      const longStr = 'a'.repeat(1000);
      const v = asciiStamp(longStr, 1024);
      assert.ok(v instanceof Vector, 'should handle long strings');
    });

    test('should handle unicode strings', () => {
      const v = asciiStamp('日本語テスト', 1024);
      assert.ok(v instanceof Vector, 'should handle unicode');
    });

    test('should handle special characters', () => {
      const v1 = asciiStamp('test@123!#$%', 1024);
      const v2 = asciiStamp('test@123!#$%', 1024);
      assert.ok(v1.equals(v2), 'special chars should be consistent');
    });

    test('similar names should still produce different vectors', () => {
      const v1 = asciiStamp('test1', 2048);
      const v2 = asciiStamp('test2', 2048);
      const sim = similarity(v1, v2);

      // Even similar names should be quasi-orthogonal
      assert.ok(sim < 0.7, `similar names should have sim < 0.7, got ${sim}`);
    });
  });

  describe('asciiStampBatch', () => {
    test('should return array of vectors', () => {
      const vectors = asciiStampBatch('base', 5, 1024);
      assert.equal(vectors.length, 5, 'should return correct count');
      for (const v of vectors) {
        assert.ok(v instanceof Vector, 'each item should be Vector');
      }
    });

    test('should produce unique vectors', () => {
      const vectors = asciiStampBatch('unique', 10, 1024);

      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
          assert.ok(!vectors[i].equals(vectors[j]), `vectors ${i} and ${j} should differ`);
        }
      }
    });

    test('should produce quasi-orthogonal vectors', () => {
      const vectors = asciiStampBatch('orthogonal', 5, 2048);

      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
          const sim = similarity(vectors[i], vectors[j]);
          assert.ok(sim > 0.4 && sim < 0.6, `pair ${i}-${j} should be orthogonal, got ${sim}`);
        }
      }
    });

    test('should be deterministic', () => {
      const batch1 = asciiStampBatch('batch', 3, 1024);
      const batch2 = asciiStampBatch('batch', 3, 1024);

      for (let i = 0; i < 3; i++) {
        assert.ok(batch1[i].equals(batch2[i]), `vector ${i} should match`);
      }
    });

    test('should handle zero count', () => {
      const vectors = asciiStampBatch('empty', 0, 1024);
      assert.equal(vectors.length, 0, 'should return empty array');
    });
  });

  describe('collision resistance', () => {
    test('should have low collision rate for 1000 names', () => {
      const hashes = new Set();
      const geometry = 2048;

      for (let i = 0; i < 1000; i++) {
        const v = asciiStamp(`name_${i}`, geometry);
        // Use first word as simple hash
        const hash = v.data[0].toString();
        hashes.add(hash);
      }

      // Allow some collisions but expect good distribution
      assert.ok(hashes.size > 900, `expected > 900 unique hashes, got ${hashes.size}`);
    });
  });
});
