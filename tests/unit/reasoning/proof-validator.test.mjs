import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { validateProof } from '../../../src/reasoning/proof-validator.mjs';

describe('ProofValidator (DS19 incremental)', () => {
  test('validates direct fact proofs', () => {
    const session = new Session({ geometry: 2048 });
    session.learn('isA Socrates Human');

    const result = session.prove('@goal isA Socrates Human');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);
    const factStep = result.proofObject.steps.find(s => s.kind === 'fact');
    assert.ok(factStep?.usesFacts?.[0]?.id, 'expected proofObject to reference a KB fact id');
    assert.equal(validateProof(result.proofObject, session), true);
  });

  test('validates transitive proofs (edges must exist)', () => {
    const session = new Session({ geometry: 2048 });
    session.learn(`
      isA Socrates Philosopher
      isA Philosopher Human
    `);

    const result = session.prove('@goal isA Socrates Human');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);
    assert.equal(validateProof(result.proofObject, session), true);
  });

  test('validates symmetric flip proofs (reverse fact exists)', () => {
    const session = new Session({ geometry: 2048 });
    session.learn('marriedTo John Michael');

    const result = session.prove('@goal marriedTo Michael John');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);
    assert.equal(validateProof(result.proofObject, session), true);
  });
});
