import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetRefCounter } from '../../../src/nlp/nl2dsl/utils.mjs';
import { translateContextWithGrammar, translateQuestionWithGrammar } from '../../../src/nlp/nl2dsl/grammar.mjs';

describe('NL→DSL grammar translator (low-hardcoding)', () => {
  beforeEach(() => resetRefCounter());

  test('normalizes inverted copula questions ("Is X a Y?") into @goal:goal', () => {
    const goal = translateQuestionWithGrammar('Is Anne an animal?');
    assert.equal(goal, '@goal:goal isA Anne Animal');
  });

  test('normalizes inverted auxiliary questions ("Does X verb Y?") into @goal:goal', () => {
    const goal = translateQuestionWithGrammar('Does Anne like Bob?');
    assert.equal(goal, '@goal:goal likes Anne Bob');
  });

  test('emits persistent negation facts as anonymous Not $ref', () => {
    const { dsl, errors } = translateContextWithGrammar('Anne does not like Bob.');
    assert.deepEqual(errors, []);
    const lines = dsl.split('\n').map(l => l.trim()).filter(Boolean);
    assert.equal(lines.length, 2);
    assert.ok(lines[0].startsWith('@base'), 'first line should bind base reference');
    assert.ok(/^Not\s+\$base\d+$/.test(lines[1]), 'second line should be anonymous Not $baseN');
    assert.ok(!lines[1].startsWith('@'), 'negation fact must be persistent (no @dest)');
  });

  test('rejects unknown verbs/operators (must exist in Core operator catalog)', () => {
    const { dsl, errors } = translateContextWithGrammar('Anne frobnicates Bob.');
    assert.equal(dsl.trim(), '');
    assert.equal(errors.length, 1);
    assert.match(errors[0].error, /Unknown operator 'frobnicat/i);
  });

  test('strips dataset annotations like [BG], [FOL] from input', () => {
    const { dsl, errors } = translateContextWithGrammar('[BG] All cats are animals.');
    assert.deepEqual(errors, []);
    assert.ok(dsl.includes('isA'), 'should parse after stripping [BG]');
    assert.ok(!dsl.includes('[BG]'), 'should not contain annotation');
  });

  test('handles multi-word proper names (Robert Lewandowski → RobertLewandowski)', () => {
    const goal = translateQuestionWithGrammar('Robert Lewandowski is a striker.');
    assert.ok(goal, 'should produce a goal');
    assert.ok(goal.includes('RobertLewandowski'), 'should collapse proper name');
    assert.ok(goal.includes('Striker'), 'should have type');
  });

  test('parses multi-word proper names in copula facts', () => {
    const { dsl, errors } = translateContextWithGrammar('Robert Lewandowski is a striker.');
    assert.deepEqual(errors, []);
    assert.ok(dsl.includes('RobertLewandowski'), 'should collapse proper name');
    assert.ok(dsl.includes('isA'), 'should use isA');
  });

  test('expands copula disjunction questions into multiple goals when enabled', () => {
    const goal = translateQuestionWithGrammar(
      'Stella is a gorpus, a zumpus, or an impus.',
      { expandCompoundQuestions: true }
    );
    assert.ok(goal);
    assert.match(goal, /\/\/ goal_logic:Or/);
    assert.match(goal, /@goal:goal isA Stella Gorpus/);
    assert.match(goal, /@goal1:goal isA Stella Zumpus/);
    assert.match(goal, /@goal2:goal isA Stella Impus/);
  });
});
