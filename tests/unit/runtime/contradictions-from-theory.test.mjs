import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

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
});
