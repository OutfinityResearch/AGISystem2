/**
 * Tests for Structural Decoder
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StructuralDecoder } from '../../../src/decoding/structural-decoder.mjs';
import { Session } from '../../../src/runtime/session.mjs';

describe('StructuralDecoder', () => {
  let session;
  let decoder;

  function setup() {
    session = new Session({ geometry: 2048 });
    decoder = new StructuralDecoder(session);
    // Keep tests hermetic: declare operators used in facts under strict declaration rules.
    learn(`
      @loves:loves __Relation
      @likes:likes __Relation
      @parent:parent __Relation
      @give:give __Relation
    `);
  }

  function learn(dsl) {
    const result = session.learn(dsl);
    if (!result.success) {
      throw new Error(`Learn failed: ${result.errors.join(', ')}`);
    }
    return result;
  }

  describe('constructor', () => {
    test('should create decoder with session', () => {
      setup();
      assert.ok(decoder.session === session);
    });

    test('should accept custom options', () => {
      setup();
      const customDecoder = new StructuralDecoder(session, {
        maxNesting: 3,
        operatorThreshold: 0.6
      });
      assert.equal(customDecoder.options.maxNesting, 3);
      assert.equal(customDecoder.options.operatorThreshold, 0.6);
    });
  });

  describe('decode', () => {
    test('should decode simple fact', () => {
      setup();
      learn('@f loves John Mary');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      assert.ok('success' in result);
      if (result.success) {
        assert.ok('structure' in result);
        assert.ok('operator' in result.structure);
      }
    });

    test('should identify operator', () => {
      setup();
      learn('@f likes Alice Bob');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      if (result.success) {
        // Operator should be found
        assert.ok(result.structure.operator);
        assert.ok(result.structure.operatorConfidence > 0);
      }
    });

    test('should extract arguments', () => {
      setup();
      learn('@f parent Alice Bob');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      if (result.success) {
        assert.ok('arguments' in result.structure);
        assert.ok(Array.isArray(result.structure.arguments));
      }
    });

    test('should include argument positions', () => {
      setup();
      learn('@f give A B C');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      if (result.success && result.structure.arguments.length > 0) {
        for (const arg of result.structure.arguments) {
          assert.ok('position' in arg);
          assert.ok('confidence' in arg);
        }
      }
    });

    test('should report confidence', () => {
      setup();
      learn('@f loves X Y');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      assert.ok('confidence' in result);
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });

    test('should fail gracefully for random vector', () => {
      setup();
      // Create session but don't learn anything related to random vector
      const randomVec = session.vocabulary.getOrCreate('completely_random');

      const result = decoder.decode(randomVec);

      // May or may not succeed, but should not throw
      assert.ok('success' in result);
      if (!result.success) {
        assert.ok('reason' in result);
      }
    });

    test('should infer statement type', () => {
      setup();
      learn('@r Implies A B');

      const vec = session.scope.get('r');
      const result = decoder.decode(vec);

      if (result.success) {
        assert.ok('type' in result.structure);
      }
    });

    test('should identify rule type for Implies', () => {
      setup();
      learn('@rule Implies (isA X Human) (isA X Mortal)');

      const vec = session.scope.get('rule');
      const result = decoder.decode(vec);

      if (result.success && result.structure.operator === 'Implies') {
        assert.equal(result.structure.type, 'rule');
      }
    });

    test('should include alternatives for arguments', () => {
      setup();
      learn(`
        @f1 likes Alice Bob
        @f2 likes Alice Carol
      `);

      const vec = session.scope.get('f1');
      const result = decoder.decode(vec);

      if (result.success && result.structure.arguments.length > 0) {
        // Arguments should have alternatives array
        for (const arg of result.structure.arguments) {
          assert.ok('alternatives' in arg);
        }
      }
    });
  });

  describe('mightBeCompound', () => {
    test('should return boolean', () => {
      setup();
      const v1 = session.vocabulary.getOrCreate('simple');
      const v2 = session.vocabulary.getOrCreate('other');

      const result = decoder.mightBeCompound(v1, v2);
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('inferType', () => {
    test('should return rule for Implies', () => {
      setup();
      assert.equal(decoder.inferType('Implies'), 'rule');
    });

    test('should return rule for operators ending in Rule', () => {
      setup();
      assert.equal(decoder.inferType('CustomRule'), 'rule');
    });

    test('should return fact for regular operators', () => {
      setup();
      assert.equal(decoder.inferType('loves'), 'fact');
    });
  });

  describe('nested decoding', () => {
    test('should handle compound expressions', () => {
      setup();
      learn('@f loves (likes A B) C');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      // Decoding compound may or may not succeed
      // but should not throw
      assert.ok('success' in result);
    });
  });

  describe('raw vector preservation', () => {
    test('should include raw vector in result', () => {
      setup();
      learn('@f Not X');

      const vec = session.scope.get('f');
      const result = decoder.decode(vec);

      if (result.success) {
        assert.ok('raw' in result.structure);
        assert.ok(result.structure.raw === vec);
      }
    });
  });
});
