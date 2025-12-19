import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('HolographicProofEngine (DS19 incremental)', () => {
  test('adds a validation step when symbolic validation is used', () => {
    const session = new Session({ geometry: 2048, reasoningPriority: 'holographicPriority' });
    session.learn('isA Socrates Human');

    const result = session.prove('@goal isA Socrates Human');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);
    assert.ok(result.proofObject.steps.some(s => s.kind === 'validation'));
  });
});

