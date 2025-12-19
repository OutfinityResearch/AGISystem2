import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { validateProof } from '../../../src/reasoning/proof-validator.mjs';

describe('ProofValidator: rule steps (DS19 incremental)', () => {
  test('validates backward-chaining proof with stable rule id', () => {
    const session = new Session({ geometry: 2048 });
    session.learn(`
      @cond:cond isA Socrates Human
      @conc isA Socrates Mortal
      @r Implies $cond $conc
    `);

    const result = session.prove('@goal isA Socrates Mortal');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);

    const ruleStep = result.proofObject.steps.find(s => s.kind === 'rule');
    assert.ok(ruleStep, 'expected a rule step');
    assert.ok(ruleStep.usesRules?.[0]?.id, 'expected a stable rule id');
    assert.equal(validateProof(result.proofObject, session), true);
  });
});

