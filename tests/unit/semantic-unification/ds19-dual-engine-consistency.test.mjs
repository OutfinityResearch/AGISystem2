import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DS19: Semantic Unification — dual-engine consistency', () => {
  test(
    'symbolicPriority vs holographicPriority produce compatible proofs',
    () => {
      const sessionSymbolic = new Session({ geometry: 2048, reasoningPriority: 'symbolicPriority' });
      const sessionHolographic = new Session({ geometry: 2048, reasoningPriority: 'holographicPriority' });

      const program = `
        isA Socrates Philosopher
        isA Philosopher Human
      `;
      sessionSymbolic.learn(program);
      sessionHolographic.learn(program);

      const r1 = sessionSymbolic.prove('@goal isA Socrates Human');
      const r2 = sessionHolographic.prove('@goal isA Socrates Human');

      assert.equal(r1.valid, true);
      assert.equal(r2.valid, true);

      // TODO(DS19):
      // - both MUST expose proof objects in the same schema
      // - holographic MUST include a `validation` step
      assert.equal(typeof r1.proofObject, 'object');
      assert.equal(typeof r2.proofObject, 'object');
      assert.ok(r2.proofObject.steps.some(s => s.kind === 'validation'));
    }
  );
});
