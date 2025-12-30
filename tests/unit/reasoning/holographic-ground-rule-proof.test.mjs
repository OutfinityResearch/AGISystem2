import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('HolographicProofEngine: ground-term modus ponens with Core macros', () => {
  test('applies ground Implies when operator is a Core graph (hasProperty)', () => {
    const session = new Session({
      geometry: 2048,
      reasoningPriority: 'holographicPriority',
      reasoningProfile: 'theoryDriven'
    });

    const coreLoaded = session.loadCore({ includeIndex: true });
    assert.equal(coreLoaded.success, true, JSON.stringify(coreLoaded.errors));

    session.learn(`
      hasProperty Charlie quiet
      @ant hasProperty Charlie quiet
      @cons hasProperty Charlie round
      Implies $ant $cons
    `);

    const result = session.prove('@goal hasProperty Charlie round');
    assert.equal(result.valid, true);
    assert.ok(
      result.proofObject?.steps?.some(s => s.kind === 'rule'),
      'expected a rule step in proofObject'
    );
  });
});
