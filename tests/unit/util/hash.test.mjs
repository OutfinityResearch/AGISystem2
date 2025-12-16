/**
 * Tests for Hash utilities
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { djb2, fnv1a, stringHash } from '../../../src/util/hash.mjs';

describe('Hash Functions', () => {
  describe('djb2', () => {
    test('should return consistent hash for same string', () => {
      const h1 = djb2('hello');
      const h2 = djb2('hello');
      assert.equal(h1, h2, 'same string should produce same hash');
    });

    test('should return different hashes for different strings', () => {
      const h1 = djb2('hello');
      const h2 = djb2('world');
      assert.notEqual(h1, h2, 'different strings should produce different hashes');
    });

    test('should return 32-bit unsigned integer', () => {
      const h = djb2('test string with many characters');
      assert.ok(h >= 0, 'hash should be non-negative');
      assert.ok(h <= 0xFFFFFFFF, 'hash should fit in 32 bits');
    });

    test('should handle empty string', () => {
      const h = djb2('');
      assert.equal(typeof h, 'number', 'should return number');
      assert.equal(h, 5381, 'empty string should return initial hash value');
    });

    test('should handle unicode strings', () => {
      const h = djb2('hello 世界 🌍');
      assert.ok(h >= 0 && h <= 0xFFFFFFFF, 'unicode hash should be valid');
    });

    test('should produce good distribution', () => {
      const hashes = new Set();
      for (let i = 0; i < 1000; i++) {
        hashes.add(djb2(`test${i}`));
      }
      // Expect very few collisions
      assert.ok(hashes.size > 990, `should have few collisions, got ${hashes.size}`);
    });
  });

  describe('fnv1a', () => {
    test('should return consistent hash for same string', () => {
      const h1 = fnv1a('hello');
      const h2 = fnv1a('hello');
      assert.equal(h1, h2, 'same string should produce same hash');
    });

    test('should return different hashes for different strings', () => {
      const h1 = fnv1a('hello');
      const h2 = fnv1a('world');
      assert.notEqual(h1, h2);
    });

    test('should differ from djb2 for same input', () => {
      const djb = djb2('test');
      const fnv = fnv1a('test');
      assert.notEqual(djb, fnv, 'different algorithms should produce different hashes');
    });

    test('should handle empty string', () => {
      const h = fnv1a('');
      assert.equal(typeof h, 'number', 'should return number');
      assert.equal(h, 2166136261, 'empty string should return FNV offset basis');
    });

    test('should produce good distribution', () => {
      const hashes = new Set();
      for (let i = 0; i < 1000; i++) {
        hashes.add(fnv1a(`item_${i}`));
      }
      assert.ok(hashes.size > 990, 'should have few collisions');
    });
  });

  describe('stringHash', () => {
    test('should combine djb2 and fnv1a', () => {
      const h = stringHash('test');
      const expected = djb2('test') ^ fnv1a('test');
      assert.equal(h, expected, 'should XOR both hashes');
    });

    test('should be consistent', () => {
      const h1 = stringHash('consistent');
      const h2 = stringHash('consistent');
      assert.equal(h1, h2);
    });

    test('should produce different hash than either algorithm alone', () => {
      const str = 'example';
      const combined = stringHash(str);
      const d = djb2(str);
      const f = fnv1a(str);

      assert.notEqual(combined, d, 'combined should differ from djb2');
      assert.notEqual(combined, f, 'combined should differ from fnv1a');
    });
  });

  describe('avalanche effect', () => {
    test('character change should produce different hash', () => {
      const h1 = djb2('aaa');
      const h2 = djb2('aab');

      // DJB2 is a simple hash - not designed for cryptographic avalanche
      // Just verify hashes are different
      assert.notEqual(h1, h2, 'different strings should produce different hashes');

      // Count differing bits (informational, not strict requirement)
      const xor = h1 ^ h2;
      const diffBits = xor.toString(2).replace(/0/g, '').length;
      assert.ok(diffBits >= 1, `should change at least 1 bit, got ${diffBits}`);
    });
  });
});
