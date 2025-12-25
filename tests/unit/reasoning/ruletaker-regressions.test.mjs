import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('RuleTaker regressions (translator + reasoning)', () => {
  test('proves Not(P) via explicit negation fact', () => {
    const session = new Session({
      geometry: 1024,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven'
    });

    const coreLoaded = session.loadCore({ includeIndex: false });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn(`
      @chase:chase __Relation
      @neg chase Rabbit Squirrel
      Not $neg
    `);

    const result = session.prove('@goal Not (chase Rabbit Squirrel)');
    assert.equal(result.valid, true);
    assert.equal(result.method, 'explicit_negation');
  });

  test('proves Not(P) via closed-world assumption when P is unprovable', () => {
    const session = new Session({
      geometry: 1024,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven',
      closedWorldAssumption: true
    });

    const coreLoaded = session.loadCore({ includeIndex: false });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn('hasProperty Bob big');

    const result = session.prove('@goal Not (hasProperty Zed big)');
    assert.equal(result.valid, true);
    assert.equal(result.method, 'closed_world_assumption');
  });

  test('does not satisfy a ground And condition via fuzzy similarity', () => {
    const session = new Session({
      geometry: 1024,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven'
    });

    const coreLoaded = session.loadCore({ includeIndex: false });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn(`
      hasProperty Anne cold
      hasProperty Fiona furry
      @c1 hasProperty Fiona furry
      @c2 hasProperty Fiona cold
      @and And $c1 $c2
      @cons hasProperty Fiona blue
      Implies $and $cons
    `);

    const result = session.prove('@goal hasProperty Fiona blue');
    assert.equal(result.valid, false);
  });

  test('supports existential Not(?x ...) in rule conditions under CWA (RuleTaker-style "something does not")', () => {
    const session = new Session({
      geometry: 1024,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven',
      closedWorldAssumption: true
    });

    const coreLoaded = session.loadCore({ includeIndex: false });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn(`
      @chase:chase __Relation
      chase Bear Cow
      hasProperty Cow kind
      @c1 hasProperty Cow kind
      @base chase ?x Cow
      @c2 Not $base
      @and And $c1 $c2
      @cons hasProperty Cow rough
      Implies $and $cons
    `);

    const result = session.prove('@goal hasProperty Cow rough');
    assert.equal(result.valid, true);
  });

  test('detects variables inside referenced And conditions (unification needed)', () => {
    const session = new Session({
      geometry: 1024,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven'
    });

    const coreLoaded = session.loadCore({ includeIndex: false });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn(`
      hasProperty Tiger cold
      see Tiger Dog
      @c1 hasProperty ?x cold
      @c2 see ?x Dog
      @and And $c1 $c2
      @cons hasProperty Dog big
      Implies $and $cons
    `);

    const result = session.prove('@goal hasProperty Dog big');
    assert.equal(result.valid, true);
    assert.equal(result.method, 'backward_chain_unified');
    assert.ok(
      Array.isArray(result.steps) && result.steps.some(s => s.operation === 'unification_match'),
      'expected an unification_match step'
    );
    assert.equal(result.proofObject?.validatorOk, true, 'expected proof to validate');
  });
});
