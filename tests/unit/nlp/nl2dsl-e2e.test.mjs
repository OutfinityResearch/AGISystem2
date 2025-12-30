import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { translateNL2DSL } from '../../../src/nlp/nl2dsl.mjs';

function translateContext(text, source = 'generic') {
  const result = translateNL2DSL(text, { source, isQuestion: false });
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return result.dsl;
}

function translateGoal(text, source = 'generic') {
  const result = translateNL2DSL(text, { source, isQuestion: true });
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return result.dsl;
}

describe('translateNL2DSL + Session.learn/prove (smoke)', () => {
  test('proves a simple isA entailment from an all-quantified rule', () => {
    const session = new Session({ geometry: 1024, reasoningProfile: 'theoryDriven', reasoningPriority: 'symbolicPriority' });
    const coreLoaded = session.loadCore({ includeIndex: true });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    const contextDsl = translateContext('All dogs are animals. Anne is a dog.', 'ruletaker');
    session.learn(contextDsl);

    const goalDsl = translateGoal('Is Anne an animal?', 'ruletaker');
    const proof = session.prove(goalDsl);
    assert.equal(proof.valid, true);
  });

  test('proves explicit Not(P) from a negated natural-language fact', () => {
    const session = new Session({ geometry: 1024, reasoningProfile: 'theoryDriven', reasoningPriority: 'symbolicPriority' });
    const coreLoaded = session.loadCore({ includeIndex: true });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    const contextDsl = translateContext('Anne does not like Bob.', 'ruletaker');
    session.learn(contextDsl);

    const goalDsl = translateGoal('Does Anne not like Bob?', 'ruletaker');
    const proof = session.prove(goalDsl);
    assert.equal(proof.valid, true);
    assert.equal(proof.method, 'explicit_negation');
  });

  test('rejects unknown verbs/operators (does not invent fake relations)', () => {
    const session = new Session({ geometry: 1024, reasoningProfile: 'theoryDriven', reasoningPriority: 'symbolicPriority' });
    const coreLoaded = session.loadCore({ includeIndex: true });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    const result = translateNL2DSL('Anne frobnicates Bob.', { source: 'generic', isQuestion: false });
    assert.equal(result.success, false);
    assert.ok(result.errors.length >= 1);
    assert.match(result.errors[0].error, /Unknown operator 'frobnicat/i);
  });

  test('can auto-declare unknown operators for autoDiscovery-style testing', () => {
    const session = new Session({ geometry: 1024, reasoningProfile: 'theoryDriven', reasoningPriority: 'symbolicPriority' });
    const coreLoaded = session.loadCore({ includeIndex: true });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    const contextResult = translateNL2DSL('Anne blicks Bob.', {
      source: 'generic',
      isQuestion: false,
      autoDeclareUnknownOperators: true
    });
    assert.equal(contextResult.success, true, JSON.stringify(contextResult.errors));
    assert.match(contextResult.dsl, /@blick:blick\s+__Relation/);
    assert.match(contextResult.dsl, /\bblick\s+Anne\s+Bob\b/);
    session.learn(contextResult.dsl);

    const goalResult = translateNL2DSL('Does Anne blick Bob?', {
      source: 'generic',
      isQuestion: true,
      autoDeclareUnknownOperators: true
    });
    assert.equal(goalResult.success, true, JSON.stringify(goalResult.errors));
    const proof = session.prove(goalResult.dsl);
    assert.equal(proof.valid, true);
  });
});
