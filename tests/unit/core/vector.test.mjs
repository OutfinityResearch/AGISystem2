/**
 * Vector Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../../src/core/vector.mjs';

describe('Vector', () => {
  describe('constructor', () => {
    test('should create vector with specified geometry', () => {
      const v = new Vector(1024);
      assert.equal(v.geometry, 1024);
      assert.equal(v.words, 32);
    });

    test('should throw on invalid geometry', () => {
      assert.throws(() => new Vector(100));
      assert.throws(() => new Vector(-32));
      assert.throws(() => new Vector(0));
    });
  });

  describe('bit operations', () => {
    test('should get and set bits', () => {
      const v = new Vector(1024);
      assert.equal(v.getBit(0), 0);
      v.setBit(0, 1);
      assert.equal(v.getBit(0), 1);
      v.setBit(0, 0);
      assert.equal(v.getBit(0), 0);
    });

    test('should handle bit at various positions', () => {
      const v = new Vector(1024);
      v.setBit(31, 1);
      v.setBit(32, 1);
      v.setBit(100, 1);
      assert.equal(v.getBit(31), 1);
      assert.equal(v.getBit(32), 1);
      assert.equal(v.getBit(100), 1);
      assert.equal(v.getBit(50), 0);
    });

    test('should throw on out of range index', () => {
      const v = new Vector(1024);
      assert.throws(() => v.getBit(-1));
      assert.throws(() => v.getBit(1024));
      assert.throws(() => v.setBit(-1, 1));
    });
  });

  describe('popcount', () => {
    test('should count zero bits in empty vector', () => {
      const v = new Vector(1024);
      assert.equal(v.popcount(), 0);
    });

    test('should count set bits', () => {
      const v = new Vector(1024);
      v.setBit(0, 1);
      v.setBit(10, 1);
      v.setBit(100, 1);
      assert.equal(v.popcount(), 3);
    });
  });

  describe('density', () => {
    test('should return 0 for empty vector', () => {
      const v = new Vector(1024);
      assert.equal(v.density(), 0);
    });

    test('should return correct density', () => {
      const v = new Vector(1024);
      for (let i = 0; i < 512; i++) {
        v.setBit(i, 1);
      }
      assert.equal(v.density(), 0.5);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const v1 = new Vector(1024);
      v1.setBit(0, 1);
      const v2 = v1.clone();
      assert.equal(v2.getBit(0), 1);
      v2.setBit(0, 0);
      assert.equal(v1.getBit(0), 1);
      assert.equal(v2.getBit(0), 0);
    });
  });

  describe('extend', () => {
    test('should extend vector to larger geometry', () => {
      const v1 = new Vector(1024);
      v1.setBit(100, 1);
      const v2 = v1.extend(2048);
      assert.equal(v2.geometry, 2048);
      assert.equal(v2.getBit(100), 1);
    });

    test('should throw on shrinking', () => {
      const v = new Vector(1024);
      assert.throws(() => v.extend(512));
    });
  });

  describe('in-place operations', () => {
    test('should XOR in place', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      v2.setBit(0, 1);
      v2.setBit(1, 1);
      v1.xorInPlace(v2);
      assert.equal(v1.getBit(0), 0);
      assert.equal(v1.getBit(1), 1);
    });

    test('should AND in place', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      v1.setBit(1, 1);
      v2.setBit(0, 1);
      v1.andInPlace(v2);
      assert.equal(v1.getBit(0), 1);
      assert.equal(v1.getBit(1), 0);
    });

    test('should OR in place', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      v2.setBit(1, 1);
      v1.orInPlace(v2);
      assert.equal(v1.getBit(0), 1);
      assert.equal(v1.getBit(1), 1);
    });
  });

  describe('serialization', () => {
    test('should serialize and deserialize', () => {
      const v1 = new Vector(1024);
      v1.setBit(100, 1);
      v1.setBit(500, 1);
      const json = v1.serialize();
      const v2 = Vector.deserialize(json);
      assert.equal(v2.geometry, 1024);
      assert.equal(v2.getBit(100), 1);
      assert.equal(v2.getBit(500), 1);
    });
  });

  describe('static methods', () => {
    test('should create random vector with ~50% density', () => {
      const v = Vector.random(1024);
      const density = v.density();
      assert.ok(density > 0.4, `density ${density} should be > 0.4`);
      assert.ok(density < 0.6, `density ${density} should be < 0.6`);
    });

    test('should create zeros vector', () => {
      const v = Vector.zeros(1024);
      assert.equal(v.popcount(), 0);
    });

    test('should create ones vector', () => {
      const v = Vector.ones(1024);
      assert.equal(v.popcount(), 1024);
    });
  });

  describe('equals', () => {
    test('should compare equal vectors', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      v2.setBit(0, 1);
      assert.ok(v1.equals(v2));
    });

    test('should compare unequal vectors', () => {
      const v1 = new Vector(1024);
      const v2 = new Vector(1024);
      v1.setBit(0, 1);
      assert.ok(!v1.equals(v2));
    });
  });
});
