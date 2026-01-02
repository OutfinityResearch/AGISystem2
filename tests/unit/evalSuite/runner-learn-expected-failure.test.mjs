import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';
import { runCase } from '../../../evals/fastEval/lib/runner.mjs';

describe('EvalSuite runner: expected learn failures', () => {
  test('learn contradiction can be marked as expected failure and remains atomic', async () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven', rejectContradictions: true });

    const base = session.learn('before Door Kitchen');
    assert.equal(base.success, true);
    assert.equal(session.kbFacts.length, 1);

    const testCase = {
      action: 'learn',
      input_nl: '',
      input_dsl: `
        locatedIn Door Kitchen
        after Door Kitchen
      `,
      expect_success: false,
      assert_state_unchanged: true,
      expect_error_includes: 'Contradiction rejected',
      expected_nl: 'Warning: contradiction',
      proof_nl: [
        'contradictsSameArgs before after',
        'Therefore reject after Door Kitchen'
      ]
    };

    const result = await runCase(testCase, session, { reasoning: 200 });
    assert.equal(result.passed, true, JSON.stringify(result, null, 2));
    assert.equal(result.phases.reasoning.actual.success, false);
    assert.equal(session.kbFacts.length, 1);
    assert.equal(session.kbFacts.some(f => f.metadata?.operator === 'locatedIn'), false);
  });
});
