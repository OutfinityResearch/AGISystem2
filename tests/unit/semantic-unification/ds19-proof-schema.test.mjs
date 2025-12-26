import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DS19: Semantic Unification — proof schema + validator', () => {
  test(
    'Session.prove returns a machine-checkable proof object (unified schema)',
    () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Human');

      const result = session.prove('@goal isA Socrates Human');

      // TODO(DS19): result MUST expose a stable proof object.
      assert.equal(typeof result, 'object');
      assert.equal(typeof result.valid, 'boolean');

      assert.equal(typeof result.proofObject, 'object');
      assert.equal(typeof result.proofObject.valid, 'boolean');
      assert.deepEqual(result.proofObject.goal, { operator: 'isA', args: ['Socrates', 'Human'] });
      assert.ok(Array.isArray(result.proofObject.steps));
    }
  );

  test(
    'ProofValidator can re-validate proof without re-running search',
    async () => {
      const session = new Session({ geometry: 2048 });
      session.learn('isA Socrates Human');

      const result = session.prove('@goal isA Socrates Human');

      // Planned API:
      //   import { validateProof } from '../../../src/reasoning/proof-validator.mjs'
      //   const ok = validateProof(result.proof, session.snapshot())
      const { validateProof } = await import('../../../src/reasoning/proof-validator.mjs');
      const ok = validateProof(result.proofObject, session);
      assert.equal(ok, true);
    }
  );
});
