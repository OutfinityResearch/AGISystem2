import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Reasoning: Exists / Not(Exists) quantifiers', () => {
  test('proves Not(Exists x (Plant(x) AND Mushroom(x))) via type disjointness', () => {
    const session = new Session({
      hdcStrategy: 'dense-binary',
      geometry: 256,
      reasoningProfile: 'theoryDriven',
      closedWorldAssumption: false,
      rejectContradictions: false
    });
    const core = session.loadCore({ includeIndex: true });
    assert.equal(core.success, true);

    session.learn(`
      @p isA ?x Plant
      @f isA ?x Fungus
      @nf Not $f
      Implies $p $nf

      @m isA ?x Mushroom
      @f2 isA ?x Fungus
      Implies $m $f2
    `);

    const res = session.prove('@goal Not (Exists ?x (And (isA ?x Plant) (isA ?x Mushroom)))');
    assert.equal(res.valid, true);
    assert.equal(res.method, 'quantifier_type_disjointness');
  });

  test('proves Exists x (Pet(x) AND Rabbit(x)) with a witness', () => {
    const session = new Session({
      hdcStrategy: 'dense-binary',
      geometry: 256,
      reasoningProfile: 'theoryDriven',
      closedWorldAssumption: false,
      rejectContradictions: false
    });
    const core = session.loadCore({ includeIndex: true });
    assert.equal(core.success, true);

    session.learn(`
      isA Alice Pet
      isA Alice Rabbit
    `);

    const res = session.prove('@goal Exists ?x (And (isA ?x Pet) (isA ?x Rabbit))');
    assert.equal(res.valid, true);
    assert.equal(res.method, 'exists_witness');
  });
});
