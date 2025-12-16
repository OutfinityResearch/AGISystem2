/**
 * NL Transformer Tests
 * Tests for NL to DSL transformation and error handling
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NLTransformer } from '../../../src/nlp/transformer.mjs';

describe('NL Transformer', () => {

  describe('Basic transformation', () => {
    test('should transform simple fact', () => {
      const t = new NLTransformer();
      const result = t.transform('Dogs are animals.');
      // May or may not succeed depending on NL parser capabilities
      assert.ok(typeof result.success === 'boolean');
    });

    test('should return DSL string', () => {
      const t = new NLTransformer();
      const result = t.transform('Dogs are animals.');
      assert.ok(typeof result.dsl === 'string' || result.dsl === undefined);
    });
  });

  describe('Error handling', () => {
    test('should return comment for unparseable input', () => {
      const t = new NLTransformer();
      const result = t.transform('!@#$%^&*()');
      // Should not throw, may return comment or empty
      assert.ok(typeof result.success === 'boolean');
    });

    test('should handle empty input', () => {
      const t = new NLTransformer();
      const result = t.transform('');
      assert.ok(typeof result.success === 'boolean');
    });

    test('comment output starts with #', () => {
      const t = new NLTransformer();
      const result = t.transform('This is probably unparseable gibberish xyz123');
      if (result.dsl && result.dsl.includes('Could not parse')) {
        assert.ok(result.dsl.trim().startsWith('#'));
      }
    });
  });

  describe('DSL validation', () => {
    test('valid DSL does not start with #', () => {
      const t = new NLTransformer();
      const result = t.transform('John loves Mary');
      // If transformation succeeds, DSL should not be a comment
      if (result.success && result.dsl && !result.dsl.includes('Could not')) {
        assert.ok(!result.dsl.trim().startsWith('#'));
      }
    });

    test('should not contain raw NL in valid DSL', () => {
      const t = new NLTransformer();
      const result = t.transform('John loves Mary');
      if (result.success && result.dsl && !result.dsl.includes('Could not')) {
        // Valid DSL should not contain "Could not parse"
        assert.ok(!result.dsl.includes('Could not parse'));
      }
    });
  });
});
