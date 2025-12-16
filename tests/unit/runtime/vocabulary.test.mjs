/**
 * Tests for Vocabulary management
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vocabulary } from '../../../src/runtime/vocabulary.mjs';
import { Vector } from '../../../src/core/vector.mjs';
import { similarity } from '../../../src/core/operations.mjs';

describe('Vocabulary', () => {
  describe('constructor', () => {
    test('should create vocabulary with geometry', () => {
      const vocab = new Vocabulary(2048);
      assert.equal(vocab.geometry, 2048);
      assert.equal(vocab.size, 0);
    });
  });

  describe('getOrCreate', () => {
    test('should create new atom on first access', () => {
      const vocab = new Vocabulary(1024);
      const vec = vocab.getOrCreate('John');

      assert.ok(vec instanceof Vector, 'should return Vector');
      assert.equal(vec.geometry, 1024, 'should have correct geometry');
    });

    test('should return same vector on subsequent access', () => {
      const vocab = new Vocabulary(1024);
      const v1 = vocab.getOrCreate('Mary');
      const v2 = vocab.getOrCreate('Mary');

      assert.ok(v1 === v2, 'should return same instance');
    });

    test('should create different vectors for different names', () => {
      const vocab = new Vocabulary(2048);
      const v1 = vocab.getOrCreate('Alice');
      const v2 = vocab.getOrCreate('Bob');

      assert.ok(!v1.equals(v2), 'different names should have different vectors');
    });

    test('should create quasi-orthogonal vectors', () => {
      const vocab = new Vocabulary(2048);
      const v1 = vocab.getOrCreate('cat');
      const v2 = vocab.getOrCreate('dog');
      const sim = similarity(v1, v2);

      assert.ok(sim > 0.4 && sim < 0.6, `similarity ${sim} should be around 0.5`);
    });

    test('should increment size', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('a');
      vocab.getOrCreate('b');
      vocab.getOrCreate('c');

      assert.equal(vocab.size, 3);
    });

    test('should handle special characters in names', () => {
      const vocab = new Vocabulary(1024);
      const v = vocab.getOrCreate('test_name_with_special!@#');
      assert.ok(v instanceof Vector);
    });
  });

  describe('get', () => {
    test('should return undefined for unknown name', () => {
      const vocab = new Vocabulary(1024);
      assert.equal(vocab.get('unknown'), undefined);
    });

    test('should return vector for known name', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('known');
      const vec = vocab.get('known');
      assert.ok(vec instanceof Vector);
    });
  });

  describe('has', () => {
    test('should return false for unknown', () => {
      const vocab = new Vocabulary(1024);
      assert.equal(vocab.has('unknown'), false);
    });

    test('should return true for known', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('known');
      assert.equal(vocab.has('known'), true);
    });
  });

  describe('reverseLookup', () => {
    test('should find name from vector', () => {
      const vocab = new Vocabulary(1024);
      const vec = vocab.getOrCreate('target');
      const name = vocab.reverseLookup(vec);
      assert.equal(name, 'target');
    });

    test('should return null for unknown vector', () => {
      const vocab = new Vocabulary(1024);
      const unknownVec = new Vector(1024);
      const name = vocab.reverseLookup(unknownVec);
      assert.equal(name, null);
    });
  });

  describe('names', () => {
    test('should return empty array initially', () => {
      const vocab = new Vocabulary(1024);
      assert.deepEqual(vocab.names(), []);
    });

    test('should return all atom names', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('apple');
      vocab.getOrCreate('banana');
      vocab.getOrCreate('cherry');

      const names = vocab.names().sort();
      assert.deepEqual(names, ['apple', 'banana', 'cherry']);
    });
  });

  describe('entries', () => {
    test('should iterate over all atoms', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('x');
      vocab.getOrCreate('y');

      const entries = [...vocab.entries()];
      assert.equal(entries.length, 2);

      const names = entries.map(([name]) => name).sort();
      assert.deepEqual(names, ['x', 'y']);
    });
  });

  describe('serialize/deserialize', () => {
    test('should serialize vocabulary', () => {
      const vocab = new Vocabulary(1024);
      vocab.getOrCreate('foo');
      vocab.getOrCreate('bar');

      const data = vocab.serialize();

      assert.equal(data.geometry, 1024);
      assert.ok('foo' in data.atoms);
      assert.ok('bar' in data.atoms);
    });

    test('should deserialize vocabulary', () => {
      const original = new Vocabulary(1024);
      original.getOrCreate('test1');
      original.getOrCreate('test2');

      const data = original.serialize();
      const restored = Vocabulary.deserialize(data);

      assert.equal(restored.geometry, 1024);
      assert.equal(restored.size, 2);
      assert.ok(restored.has('test1'));
      assert.ok(restored.has('test2'));
    });

    test('should preserve vector equality after round-trip', () => {
      const original = new Vocabulary(2048);
      const origVec = original.getOrCreate('persistent');

      const data = original.serialize();
      const restored = Vocabulary.deserialize(data);
      const restoredVec = restored.get('persistent');

      assert.ok(origVec.equals(restoredVec), 'vectors should be equal after deserialize');
    });
  });

  describe('hashVector', () => {
    test('should produce consistent hash', () => {
      const vocab = new Vocabulary(1024);
      const vec = vocab.getOrCreate('hashtest');

      const h1 = vocab.hashVector(vec);
      const h2 = vocab.hashVector(vec);

      assert.equal(h1, h2);
    });

    test('should produce different hashes for different vectors', () => {
      const vocab = new Vocabulary(1024);
      const v1 = vocab.getOrCreate('alpha');
      const v2 = vocab.getOrCreate('beta');

      const h1 = vocab.hashVector(v1);
      const h2 = vocab.hashVector(v2);

      assert.notEqual(h1, h2);
    });
  });

  describe('determinism', () => {
    test('should produce same vectors across vocabulary instances', () => {
      const vocab1 = new Vocabulary(2048);
      const vocab2 = new Vocabulary(2048);

      const v1 = vocab1.getOrCreate('deterministic');
      const v2 = vocab2.getOrCreate('deterministic');

      const sim = similarity(v1, v2);
      assert.equal(sim, 1.0, 'same name should produce identical vectors');
    });
  });
});
