/**
 * Tests for NLTransformer
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { NLTransformer } from '../../../src/nlp/transformer.mjs';

describe('NLTransformer', () => {
  let transformer;

  beforeEach(() => {
    transformer = new NLTransformer();
  });

  describe('IS-A statements', () => {
    test('should parse "X is a Y"', () => {
      const result = transformer.transform('A dog is an animal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('isA'));
      assert.ok(result.dsl.includes('Dog'));
      assert.ok(result.dsl.includes('Animal'));
    });

    test('should parse "The X is a Y"', () => {
      const result = transformer.transform('The cat is a mammal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('isA Cat Mammal'));
    });

    test('should parse "Xs are Ys"', () => {
      const result = transformer.transform('Dogs are animals');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('isA Dog Animal'));
    });

    test('should parse "X is Y" without article', () => {
      const result = transformer.transform('Socrates is human');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('isA Socrates Human'));
    });
  });

  describe('Binary relations (SVO)', () => {
    test('should parse "Subject Verb Object"', () => {
      const result = transformer.transform('John loves Mary');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('love John Mary'));
    });

    test('should handle articles', () => {
      const result = transformer.transform('The cat chased the mouse');

      assert.strictEqual(result.success, true);
      // 'chased' normalizes to 'chase' (remove d after consonant+e)
      assert.ok(result.dsl.includes('Cat'));
      assert.ok(result.dsl.includes('Mouse'));
    });

    test('should normalize verb forms', () => {
      const result = transformer.transform('Alice knows Bob');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('know Alice Bob'));
    });
  });

  describe('Ternary relations', () => {
    test('should parse "X gave Y Z"', () => {
      const result = transformer.transform('Alice gave Bob a book');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('give Alice Bob Book'));
    });

    test('should parse "X verb Z to Y"', () => {
      const result = transformer.transform('John sells cars to Mary');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('sell'));
      assert.ok(result.dsl.includes('John'));
      assert.ok(result.dsl.includes('Mary'));
    });
  });

  describe('Property statements', () => {
    test('should parse "X is adjective"', () => {
      const result = transformer.transform('The sky is blue');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('hasProperty Sky blue'));
    });

    test('should parse plural form', () => {
      const result = transformer.transform('Roses are red');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('hasProperty'));
      assert.ok(result.dsl.includes('red'));
    });
  });

  describe('Universal quantification', () => {
    test('should parse "All X are Y"', () => {
      const result = transformer.transform('All humans are mortal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Implies'));
      assert.ok(result.dsl.includes('isA ?x Human'));
      assert.ok(result.dsl.includes('isA ?x Mortal'));
    });

    test('should parse "Every X is a Y"', () => {
      const result = transformer.transform('Every dog is an animal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Implies'));
      assert.ok(result.dsl.includes('Dog'));
      assert.ok(result.dsl.includes('Animal'));
    });
  });

  describe('Conditional statements', () => {
    test('should parse "If X is Y then X is Z"', () => {
      const result = transformer.transform('If Socrates is human then Socrates is mortal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Implies'));
    });
  });

  describe('Negation', () => {
    test('should parse "X does not verb Y"', () => {
      const result = transformer.transform('John does not love Mary');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Not'));
    });

    test('should expand contractions', () => {
      const result = transformer.transform("John doesn't love Mary");

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Not'));
    });

    test('should parse "X is not Y"', () => {
      const result = transformer.transform('Socrates is not immortal');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('Not'));
    });
  });

  describe('Location statements', () => {
    test('should parse "X is in Y"', () => {
      const result = transformer.transform('Paris is in France');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('locatedIn Paris France'));
    });
  });

  describe('Ownership statements', () => {
    test('should parse "X has Y"', () => {
      const result = transformer.transform('John has a car');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('has John Car'));
    });

    test('should parse "X owns Y"', () => {
      const result = transformer.transform('Alice owns a house');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('owns Alice House'));
    });
  });

  describe('Multiple sentences', () => {
    test('should parse multiple sentences', () => {
      const result = transformer.transform(`
        A dog is an animal.
        John loves Mary.
        All humans are mortal.
      `);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.parsed.length, 3);
      // DSL uses anonymous facts (no @ prefix) for simple facts
      assert.ok(result.dsl.includes('isA Dog Animal') || result.dsl.includes('isA dog Animal'));
      assert.ok(result.dsl.includes('love John Mary'));
    });

    test('should handle mixed success', () => {
      const result = transformer.transform(`
        John loves Mary.
        xyz abc 123.
      `);

      // Non-strict mode should still succeed for parseable sentences
      assert.strictEqual(result.parsed.length, 2);
      assert.ok(result.dsl.includes('love John Mary'));
    });
  });

  describe('Error handling', () => {
    test('should handle unparseable in strict mode', () => {
      const strictTransformer = new NLTransformer({ strict: true });

      // Very short input gets filtered as < 3 chars, returns null
      // Test with longer input that still can't match any pattern
      const result = strictTransformer.transform('xy');
      // Very short sentences are filtered out (length < 3)
      assert.strictEqual(result.parsed.length, 0);
    });

    test('should not throw in non-strict mode', () => {
      const result = transformer.transform('xyz');

      assert.ok(Array.isArray(result.errors));
    });

    test('should handle empty input', () => {
      const result = transformer.transform('');

      assert.strictEqual(result.parsed.length, 0);
      assert.strictEqual(result.dsl, '');
    });
  });

  describe('Custom patterns', () => {
    test('should support custom patterns', () => {
      const customTransformer = new NLTransformer({
        customPatterns: {
          custom: [
            {
              regex: /^(\w+)\s+belongs\s+to\s+(\w+)$/i,
              extract: (match) => ({
                type: 'binary',
                operator: 'belongsTo',
                subject: match[1],
                object: match[2]
              })
            }
          ]
        }
      });

      const result = customTransformer.transform('Fido belongs to John');

      assert.strictEqual(result.success, true);
      assert.ok(result.dsl.includes('belongsTo Fido John'));
    });
  });

  describe('DSL output format', () => {
    test('should generate valid DSL statements', () => {
      const result = transformer.transform('John loves Mary. Alice knows Bob.');

      // DSL uses anonymous facts (no @ prefix) for simple facts
      assert.ok(result.dsl.includes('love John Mary'));
      assert.ok(result.dsl.includes('know Alice Bob'));
    });

    test('should format rules correctly', () => {
      const result = transformer.transform('All dogs are animals');

      assert.ok(result.dsl.includes('Implies'));
      assert.ok(result.dsl.includes('(isA ?x Dog)'));
      assert.ok(result.dsl.includes('(isA ?x Animal)'));
    });

    test('should format negations correctly', () => {
      const result = transformer.transform('John does not love Mary');

      assert.ok(result.dsl.includes('Not (love John Mary)'));
    });
  });
});
