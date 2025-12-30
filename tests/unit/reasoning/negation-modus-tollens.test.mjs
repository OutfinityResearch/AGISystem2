import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Negation: modus tollens / contrapositive', () => {
  test('proves Not(A) from (A → B) and Not(B) in open-world mode', () => {
    const session = new Session({ geometry: 2048, closedWorldAssumption: false });

    session.learn(`
      @a isA ?x Lorpus
      @b isA ?x Impus
      Implies $a $b

      Not isA Max Impus
    `);

    const proof = session.prove('@g Not isA Max Lorpus');
    assert.equal(proof.valid, true);

    session.close();
  });

  test('chains modus tollens across implications', () => {
    const session = new Session({ geometry: 2048, closedWorldAssumption: false });

    session.learn(`
      @a isA ?x Vumpus
      @b isA ?x Brimpus
      @c isA ?x Numpus
      Implies $a $b
      Implies $b $c

      Not isA Stella Numpus
    `);

    const proof = session.prove('@g Not isA Stella Vumpus');
    assert.equal(proof.valid, true);

    session.close();
  });

  test('supports conjunction conclusions: A → (B ∧ C), Not(B) ⇒ Not(A)', () => {
    const session = new Session({ geometry: 2048, closedWorldAssumption: false });

    session.learn(`
      @a isA ?x Vumpus
      @b isA ?x Brimpus
      @c isA ?x Zumpus
      @bc And $b $c
      Implies $a $bc

      Not isA Alex Brimpus
    `);

    const proof = session.prove('@g Not isA Alex Vumpus');
    assert.equal(proof.valid, true);

    session.close();
  });
});
