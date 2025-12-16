/**
 * Tests for PRNG module
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PRNG } from '../../../src/util/prng.mjs';

describe('PRNG', () => {
  describe('constructor', () => {
    test('should create PRNG with default seed', () => {
      const rng = new PRNG();
      assert.ok(rng, 'should create instance');
      assert.ok(typeof rng.s0 === 'bigint', 's0 should be bigint');
      assert.ok(typeof rng.s1 === 'bigint', 's1 should be bigint');
    });

    test('should create PRNG with custom seed', () => {
      const rng = new PRNG(12345);
      assert.ok(rng, 'should create instance');
    });
  });

  describe('random', () => {
    test('should return values between 0 and 1', () => {
      const rng = new PRNG(42);
      for (let i = 0; i < 100; i++) {
        const val = rng.random();
        assert.ok(val >= 0 && val <= 1, `value ${val} should be in [0,1]`);
      }
    });

    test('should be deterministic with same seed', () => {
      const rng1 = new PRNG(12345);
      const rng2 = new PRNG(12345);

      for (let i = 0; i < 10; i++) {
        assert.equal(rng1.random(), rng2.random(), `iteration ${i} should match`);
      }
    });

    test('should produce different values for different seeds', () => {
      const rng1 = new PRNG(1);
      const rng2 = new PRNG(2);

      const seq1 = [];
      const seq2 = [];
      for (let i = 0; i < 10; i++) {
        seq1.push(rng1.random());
        seq2.push(rng2.random());
      }

      const matches = seq1.filter((v, i) => v === seq2[i]).length;
      assert.ok(matches < 5, 'different seeds should produce different sequences');
    });

    test('should have uniform distribution', () => {
      const rng = new PRNG(42);
      const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (let i = 0; i < 10000; i++) {
        const val = rng.random();
        const bucket = Math.min(9, Math.floor(val * 10));
        buckets[bucket]++;
      }

      // Each bucket should have roughly 1000 values (±300)
      for (const count of buckets) {
        assert.ok(count > 700 && count < 1300, `bucket ${count} should be near 1000`);
      }
    });
  });

  describe('randomInt', () => {
    test('should return integers in range', () => {
      const rng = new PRNG(42);
      for (let i = 0; i < 100; i++) {
        const val = rng.randomInt(5, 10);
        assert.ok(Number.isInteger(val), 'should be integer');
        assert.ok(val >= 5 && val <= 10, `value ${val} should be in [5,10]`);
      }
    });

    test('should cover entire range', () => {
      const rng = new PRNG(42);
      const seen = new Set();
      for (let i = 0; i < 1000; i++) {
        seen.add(rng.randomInt(1, 5));
      }
      assert.equal(seen.size, 5, 'should see all values 1-5');
    });
  });

  describe('randomUint32', () => {
    test('should return 32-bit unsigned integers', () => {
      const rng = new PRNG(42);
      for (let i = 0; i < 100; i++) {
        const val = rng.randomUint32();
        assert.ok(Number.isInteger(val), 'should be integer');
        assert.ok(val >= 0 && val <= 0xFFFFFFFF, 'should be in uint32 range');
      }
    });
  });

  describe('fromString', () => {
    test('should create PRNG from string', () => {
      const rng = PRNG.fromString('test');
      assert.ok(rng instanceof PRNG, 'should be PRNG instance');
    });

    test('should be deterministic for same string', () => {
      const rng1 = PRNG.fromString('hello world');
      const rng2 = PRNG.fromString('hello world');

      for (let i = 0; i < 10; i++) {
        assert.equal(rng1.random(), rng2.random());
      }
    });

    test('should differ for different strings', () => {
      const rng1 = PRNG.fromString('apple');
      const rng2 = PRNG.fromString('banana');

      const val1 = rng1.random();
      const val2 = rng2.random();
      assert.notEqual(val1, val2, 'different strings should produce different values');
    });
  });
});
