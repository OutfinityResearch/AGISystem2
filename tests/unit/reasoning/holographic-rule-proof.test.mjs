import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('HolographicProofEngine: HDC-first rule path (smoke)', () => {
  test('can prove a rule-derived goal in holographic/theoryDriven mode', () => {
    const session = new Session({
      geometry: 2048,
      reasoningPriority: 'holographicPriority',
      reasoningProfile: 'theoryDriven'
    });

    session.learn(`
      @cond:cond isA Socrates Human
      @conc isA Socrates Mortal
      @r Implies $cond $conc
    `);

    const result = session.prove('@g isA Socrates Mortal');
    assert.equal(result.valid, true);

    // Implementation may still fall back, but it MUST produce a rule step in the proof object.
    assert.ok(result.proofObject?.steps?.some(s => s.kind === 'rule'), 'expected a rule step in proofObject');
  });
});

