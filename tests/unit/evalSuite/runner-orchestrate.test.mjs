import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { runCase } from '../../../evals/fastEval/lib/runner.mjs';

describe('fastEval runner - orchestrate action', () => {
  test('orchestrate case can validate backend selection and artifact output', async () => {
    const testCase = {
      action: 'orchestrate',
      input_dsl: 'leq 1 2',
      expect_fragment: 'Frag_SMT_LRA',
      expect_backend: 'Compile_SMTLIB2',
      expect_has_artifact: true,
      expect_artifact_format: 'SMTLIB2',
      expect_step_status: 'Done'
    };

    const res = await runCase(testCase, null, { reasoning: 2000 });
    assert.equal(res.passed, true, JSON.stringify(res, null, 2));
  });
});

