import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { translateFact, translateRule } from '../../../evals/ruletaker/lib/translator.mjs';

describe('RuleTaker translator', () => {
  test('drops generic class noun constraints for adjective+noun ("cold people")', () => {
    const dsl = translateRule('All cold people are green.');
    assert.ok(dsl, 'expected translation');
    assert.ok(!dsl.includes('isA ?x People'), 'should not add People type constraint');
    assert.ok(dsl.includes('hasProperty ?x cold'), 'should keep adjective condition');
    assert.ok(dsl.includes('hasProperty ?x green'), 'should produce property consequent');
  });

  test('keeps type constraint for simple class ("dogs") and produces isA consequent for nouns', () => {
    const dsl = translateRule('All dogs are animals.');
    assert.ok(dsl, 'expected translation');
    assert.ok(dsl.includes('isA ?x Dog'), 'should treat dogs as type Dog');
    assert.ok(dsl.includes('isA ?x Animal'), 'should treat animals as type Animal');
  });

  test('drops generic class noun constraints for comma-adjectives ("white, rough people")', () => {
    const dsl = translateRule('White, rough people are round.');
    assert.ok(dsl, 'expected translation');
    assert.ok(!dsl.includes('isA ?x People'), 'should not add People type constraint');
    assert.ok(dsl.includes('hasProperty ?x white'), 'should keep property condition');
    assert.ok(dsl.includes('hasProperty ?x rough'), 'should keep property condition');
    assert.ok(dsl.includes('hasProperty ?x round'), 'should produce property consequent');
  });

  test('uses Core operator name for likes', () => {
    const dsl = translateFact('Anne likes Bob.');
    assert.equal(dsl, 'likes Anne Bob');
  });
});
