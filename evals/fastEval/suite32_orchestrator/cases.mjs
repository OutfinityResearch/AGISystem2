/**
 * Suite 32: URC Orchestrator (Backend Selection + Compilation)
 *
 * Purpose:
 * - Validate orchestration surfaces (Plan/Step) and preference-driven backend selection.
 * - Validate deterministic compilation artifact production when compilation backend is selected.
 */

export const name = 'URC Orchestrator';
export const description = 'Preference-driven backend selection + SMT-LIB2 compilation artifact.';

export const theories = [];

export const timeouts = {
  nlToDsl: 100,
  reasoning: 2000,
  dslToNl: 200
};

export const cases = [
  {
    action: 'orchestrate',
    input_dsl: 'leq 1 2',
    expect_fragment: 'Frag_SMT_LRA',
    expect_backend: 'Compile_SMTLIB2',
    expect_has_artifact: true,
    expect_artifact_format: 'SMTLIB2',
    expect_step_status: 'Done'
  },
  {
    action: 'orchestrate',
    setup_dsl: 'PreferBackend Find Frag_SMT_LRA Internal',
    input_dsl: 'leq 1 2',
    expect_fragment: 'Frag_SMT_LRA',
    expect_backend: 'Internal',
    expect_has_artifact: false,
    expect_step_status: 'Planned'
  }
];

