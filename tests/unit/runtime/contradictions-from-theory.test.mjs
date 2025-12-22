import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { validateProof } from '../../../src/reasoning/proof-validator.mjs';

describe('Contradictions (theory-driven via SemanticIndex)', () => {
  test('warns on mutuallyExclusive pairs defined in config/Core/14-constraints.sys2', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    const r1 = session.learn('hasState Door Open');
    assert.equal(r1.success, true);
    assert.equal(r1.warnings.length, 0);

    const r2 = session.learn('hasState Door Closed');
    assert.equal(r2.success, false);
    assert.ok(r2.warnings.some(w => w.includes('contradiction')), JSON.stringify(r2.warnings));
    assert.ok(typeof r2.proof_nl === 'string' && r2.proof_nl.length > 0);
    assert.ok(r2.proof_nl.includes('mutuallyExclusive hasState Open Closed'), r2.proof_nl);
    assert.ok(r2.proof_nl.includes('config/Core/14-constraints.sys2'), r2.proof_nl);
    assert.ok(r2.proofObject && typeof r2.proofObject === 'object');
    assert.equal(r2.proofObject.valid, false);
    assert.deepEqual(r2.proofObject.goal, { operator: 'hasState', args: ['Door', 'Closed'] });
    assert.ok(Array.isArray(r2.proofObject.steps) && r2.proofObject.steps.length >= 1);
    assert.ok(r2.proofObject.steps.some(s => s.kind === 'validation'));
    assert.equal(validateProof(r2.proofObject, session), true);
    assert.equal(session.kbFacts.length, 1);
  });

  test('warns on contradictsSameArgs pairs defined in config/Core/14-constraints.sys2', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    const r1 = session.learn('before A B');
    assert.equal(r1.success, true);
    assert.equal(r1.warnings.length, 0);

    const r2 = session.learn('after A B');
    assert.equal(r2.success, false);
    assert.ok(r2.warnings.some(w => w.includes('before') && w.includes('after')), JSON.stringify(r2.warnings));
    assert.ok(typeof r2.proof_nl === 'string' && r2.proof_nl.length > 0);
    assert.ok(r2.proof_nl.includes('contradictsSameArgs before after'), r2.proof_nl);
    assert.ok(r2.proof_nl.includes('config/Core/14-constraints.sys2'), r2.proof_nl);
    assert.ok(r2.proofObject && typeof r2.proofObject === 'object');
    assert.equal(r2.proofObject.valid, false);
    assert.deepEqual(r2.proofObject.goal, { operator: 'after', args: ['A', 'B'] });
    assert.ok(Array.isArray(r2.proofObject.steps) && r2.proofObject.steps.length >= 1);
    assert.ok(r2.proofObject.steps.some(s => s.kind === 'validation'));
    assert.equal(validateProof(r2.proofObject, session), true);
    assert.equal(session.kbFacts.length, 1);
  });

  test('explicit negation does not reject learning', () => {
    const session = new Session({
      geometry: 2048,
      reasoningProfile: 'theoryDriven',
      rejectContradictions: true
    });

    const result = session.learn(`
      can Opus Fly
      @neg can Opus Fly
      Not $neg
    `);

    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
    assert.equal(session.kbFacts.length, 2);
  });

  test('rejects derived contradictsSameArgs via transitive chain (atomic rollback)', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    session.learn(`
      before Start Middle
      before Middle End
    `);
    assert.equal(session.kbFacts.length, 2);

    const beforeCount = session.kbFacts.length;
    const result = session.learn(`
      causes Foo Bar
      after Start End
    `);

    assert.equal(result.success, false);
    assert.ok(result.warnings.some(w => w.includes('contradiction')), JSON.stringify(result.warnings));
    assert.ok(typeof result.proof_nl === 'string' && result.proof_nl.length > 0);
    assert.ok(result.proof_nl.includes('before Start Middle'), result.proof_nl);
    assert.ok(result.proof_nl.includes('before Middle End'), result.proof_nl);
    assert.ok(result.proof_nl.includes('Transitive chain verified'), result.proof_nl);
    assert.ok(result.proof_nl.includes('contradictsSameArgs before after'), result.proof_nl);
    assert.ok(result.proof_nl.includes('Therefore reject after Start End'), result.proof_nl);

    // Atomic rollback: the intermediate "causes" fact is not kept.
    assert.equal(session.kbFacts.length, beforeCount);
    assert.equal(
      session.kbFacts.some(f =>
        f?.metadata?.operator === 'causes' &&
        f?.metadata?.args?.[0] === 'Foo' &&
        f?.metadata?.args?.[1] === 'Bar'
      ),
      false
    );
  });

  test('rejects derived mutuallyExclusive via property inheritance (atomic rollback)', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    session.learn(`
      isA Tea Beverage
      isA Beverage Liquid
      hasProperty Liquid Cold
    `);
    assert.equal(session.kbFacts.length, 3);

    const beforeCount = session.kbFacts.length;
    const result = session.learn(`
      locatedIn Tea Cupboard
      hasProperty Tea Hot
    `);

    assert.equal(result.success, false);
    assert.ok(result.warnings.some(w => w.includes('contradiction')), JSON.stringify(result.warnings));
    assert.ok(typeof result.proof_nl === 'string' && result.proof_nl.length > 0);
    assert.ok(result.proof_nl.includes('isA Tea Beverage'), result.proof_nl);
    assert.ok(result.proof_nl.includes('isA Beverage Liquid'), result.proof_nl);
    assert.ok(result.proof_nl.includes('hasProperty Liquid Cold'), result.proof_nl);
    assert.ok(result.proof_nl.includes('Therefore hasProperty Tea Cold'), result.proof_nl);
    assert.ok(result.proof_nl.includes('mutuallyExclusive hasProperty Hot Cold'), result.proof_nl);
    assert.ok(result.proof_nl.includes('Therefore reject hasProperty Tea Hot'), result.proof_nl);

    // Atomic rollback: the intermediate "locatedIn" fact is not kept.
    assert.equal(session.kbFacts.length, beforeCount);
    assert.equal(
      session.kbFacts.some(f =>
        f?.metadata?.operator === 'locatedIn' &&
        f?.metadata?.args?.[0] === 'Tea' &&
        f?.metadata?.args?.[1] === 'Cupboard'
      ),
      false
    );
  });
});
