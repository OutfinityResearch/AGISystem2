/**
 * Tests for EnglishTokenizer
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { EnglishTokenizer } from '../../../src/nlp/tokenizer.mjs';

describe('EnglishTokenizer', () => {
  describe('tokenize', () => {
    test('should tokenize simple sentence', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('John loves Mary');

      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0].text, 'John');
      assert.strictEqual(tokens[1].text, 'loves');
      assert.strictEqual(tokens[2].text, 'Mary');
    });

    test('should assign positions', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('The cat sat');

      assert.strictEqual(tokens[0].position, 0);
      assert.strictEqual(tokens[1].position, 1);
      assert.strictEqual(tokens[2].position, 2);
    });

    test('should provide lowercase version', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('HELLO World');

      assert.strictEqual(tokens[0].lower, 'hello');
      assert.strictEqual(tokens[1].lower, 'world');
    });

    test('should handle empty input', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('');

      assert.strictEqual(tokens.length, 0);
    });

    test('should handle null input', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize(null);

      assert.strictEqual(tokens.length, 0);
    });
  });

  describe('normalize', () => {
    test('should remove trailing punctuation', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.normalize('Hello.'), 'Hello');
      assert.strictEqual(tokenizer.normalize('Hello!'), 'Hello');
      assert.strictEqual(tokenizer.normalize('Hello?'), 'Hello');
    });

    test('should remove quotes', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.normalize('"Hello"'), 'Hello');
      assert.strictEqual(tokenizer.normalize("'Hello'"), 'Hello');
    });

    test('should normalize whitespace', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.normalize('Hello   world'), 'Hello world');
      assert.strictEqual(tokenizer.normalize('  Hello  '), 'Hello');
    });
  });

  describe('classifyWord', () => {
    test('should classify articles', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('a'), 'article');
      assert.strictEqual(tokenizer.classifyWord('an'), 'article');
      assert.strictEqual(tokenizer.classifyWord('the'), 'article');
      assert.strictEqual(tokenizer.classifyWord('The'), 'article');
    });

    test('should classify linking verbs', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('is'), 'linking-verb');
      assert.strictEqual(tokenizer.classifyWord('are'), 'linking-verb');
      assert.strictEqual(tokenizer.classifyWord('was'), 'linking-verb');
    });

    test('should classify prepositions', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('to'), 'preposition');
      assert.strictEqual(tokenizer.classifyWord('from'), 'preposition');
      assert.strictEqual(tokenizer.classifyWord('in'), 'preposition');
    });

    test('should classify negations', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('not'), 'negation');
      assert.strictEqual(tokenizer.classifyWord('never'), 'negation');
    });

    test('should classify proper nouns', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('John'), 'proper-noun');
      assert.strictEqual(tokenizer.classifyWord('Paris'), 'proper-noun');
    });

    test('should classify verb candidates', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('loves'), 'verb-candidate');
      assert.strictEqual(tokenizer.classifyWord('running'), 'verb-candidate');
      assert.strictEqual(tokenizer.classifyWord('chased'), 'verb-candidate');
    });

    test('should classify conditionals', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('if'), 'conditional');
      assert.strictEqual(tokenizer.classifyWord('when'), 'conditional');
    });

    test('should classify quantifiers', () => {
      const tokenizer = new EnglishTokenizer();

      assert.strictEqual(tokenizer.classifyWord('all'), 'quantifier');
      assert.strictEqual(tokenizer.classifyWord('every'), 'quantifier');
    });
  });

  describe('getContentTokens', () => {
    test('should filter out articles', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('The cat chased the mouse');
      const content = tokenizer.getContentTokens(tokens);

      assert.strictEqual(content.length, 3);
      assert.strictEqual(content[0].text, 'cat');
      assert.strictEqual(content[1].text, 'chased');
      assert.strictEqual(content[2].text, 'mouse');
    });

    test('should filter out prepositions', () => {
      const tokenizer = new EnglishTokenizer();
      const tokens = tokenizer.tokenize('went to Paris');
      const content = tokenizer.getContentTokens(tokens);

      assert.strictEqual(content.length, 2);
      assert.strictEqual(content[0].text, 'went');
      assert.strictEqual(content[1].text, 'Paris');
    });
  });
});
