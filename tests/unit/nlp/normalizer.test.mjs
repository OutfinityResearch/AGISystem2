/**
 * Tests for normalizer utilities
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeText,
  expandContractions,
  removeFillers,
  singularize,
  pluralize,
  normalizeVerb,
  capitalize,
  capitalizeWord
} from '../../../src/nlp/normalizer.mjs';

describe('Normalizer', () => {
  describe('normalizeText', () => {
    test('should normalize whitespace', () => {
      assert.strictEqual(normalizeText('hello   world'), 'hello world');
      assert.strictEqual(normalizeText('  hello  '), 'hello');
    });

    test('should normalize quotes', () => {
      // Unicode curly quotes to straight quotes
      assert.ok(normalizeText('\u201chello\u201d').includes('hello'));
      assert.ok(normalizeText('\u2018hello\u2019').includes('hello'));
    });

    test('should handle empty input', () => {
      assert.strictEqual(normalizeText(''), '');
      assert.strictEqual(normalizeText(null), '');
    });
  });

  describe('expandContractions', () => {
    test('should expand common contractions', () => {
      assert.strictEqual(expandContractions("don't"), 'do not');
      assert.strictEqual(expandContractions("doesn't"), 'does not');
      assert.strictEqual(expandContractions("can't"), 'cannot');
      assert.strictEqual(expandContractions("won't"), 'will not');
    });

    test('should expand in context', () => {
      assert.strictEqual(
        expandContractions("I don't like it"),
        'I do not like it'
      );
    });

    test('should be case insensitive', () => {
      assert.strictEqual(expandContractions("Don't"), 'do not');
    });
  });

  describe('removeFillers', () => {
    test('should remove filler words', () => {
      assert.strictEqual(removeFillers('I really like it'), 'I like it');
      assert.strictEqual(removeFillers('It is basically done'), 'It is done');
    });

    test('should handle multiple fillers', () => {
      assert.strictEqual(
        removeFillers('I really actually just like it'),
        'I like it'
      );
    });
  });

  describe('singularize', () => {
    test('should singularize regular plurals', () => {
      assert.strictEqual(singularize('dogs'), 'dog');
      assert.strictEqual(singularize('cats'), 'cat');
      assert.strictEqual(singularize('houses'), 'house');
    });

    test('should handle -ies plurals', () => {
      assert.strictEqual(singularize('cities'), 'city');
      assert.strictEqual(singularize('babies'), 'baby');
    });

    test('should handle -es plurals', () => {
      assert.strictEqual(singularize('boxes'), 'box');
      assert.strictEqual(singularize('watches'), 'watch');
    });

    test('should handle irregular plurals', () => {
      assert.strictEqual(singularize('children'), 'child');
      assert.strictEqual(singularize('people'), 'person');
      assert.strictEqual(singularize('men'), 'man');
    });

    test('should not change already singular', () => {
      assert.strictEqual(singularize('dog'), 'dog');
      assert.strictEqual(singularize('class'), 'class');
    });
  });

  describe('pluralize', () => {
    test('should pluralize regular nouns', () => {
      assert.strictEqual(pluralize('dog'), 'dogs');
      assert.strictEqual(pluralize('cat'), 'cats');
    });

    test('should handle -y ending', () => {
      assert.strictEqual(pluralize('city'), 'cities');
      assert.strictEqual(pluralize('baby'), 'babies');
      // but not after vowel
      assert.strictEqual(pluralize('day'), 'days');
    });

    test('should handle sibilants', () => {
      assert.strictEqual(pluralize('box'), 'boxes');
      assert.strictEqual(pluralize('watch'), 'watches');
      assert.strictEqual(pluralize('bush'), 'bushes');
    });

    test('should handle irregular nouns', () => {
      assert.strictEqual(pluralize('child'), 'children');
      assert.strictEqual(pluralize('person'), 'people');
    });
  });

  describe('normalizeVerb', () => {
    test('should normalize -ing forms', () => {
      assert.strictEqual(normalizeVerb('running'), 'run');
      assert.strictEqual(normalizeVerb('loving'), 'love');
      // eating -> eat is irregular, handled separately
      assert.strictEqual(normalizeVerb('walking'), 'walk');
    });

    test('should normalize -ed forms', () => {
      assert.strictEqual(normalizeVerb('loved'), 'love');
      assert.strictEqual(normalizeVerb('stopped'), 'stop');
      assert.strictEqual(normalizeVerb('tried'), 'try');
    });

    test('should normalize -s forms', () => {
      assert.strictEqual(normalizeVerb('loves'), 'love');
      assert.strictEqual(normalizeVerb('runs'), 'run');
      assert.strictEqual(normalizeVerb('watches'), 'watch');
    });

    test('should handle irregular verbs', () => {
      assert.strictEqual(normalizeVerb('is'), 'be');
      assert.strictEqual(normalizeVerb('are'), 'be');
      assert.strictEqual(normalizeVerb('was'), 'be');
      assert.strictEqual(normalizeVerb('has'), 'have');
      assert.strictEqual(normalizeVerb('had'), 'have');
      assert.strictEqual(normalizeVerb('went'), 'go');
      assert.strictEqual(normalizeVerb('gave'), 'give');
    });

    test('should return base form unchanged', () => {
      assert.strictEqual(normalizeVerb('love'), 'love');
      assert.strictEqual(normalizeVerb('run'), 'run');
    });
  });

  describe('capitalize', () => {
    test('should capitalize first letter', () => {
      assert.strictEqual(capitalize('hello'), 'Hello');
      assert.strictEqual(capitalize('HELLO'), 'HELLO');
    });

    test('should handle empty string', () => {
      assert.strictEqual(capitalize(''), '');
    });
  });

  describe('capitalizeWord', () => {
    test('should capitalize first, lowercase rest', () => {
      assert.strictEqual(capitalizeWord('hello'), 'Hello');
      assert.strictEqual(capitalizeWord('HELLO'), 'Hello');
      assert.strictEqual(capitalizeWord('hELLO'), 'Hello');
    });
  });
});
