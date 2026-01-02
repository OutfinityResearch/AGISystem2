/**
 * Suite 33: Policy View (URC)
 *
 * Purpose:
 * - Validate the derived policy view surface under `negates(new, old)`.
 * - Validate policy config extraction (policy id + newerWins).
 * - Validate optional derived audit-line materialization.
 */

export const name = 'URC Policy View';
export const description = 'Derived current view (negates/supersedes) + optional audit-line materialization.';

export const theories = [];

export const timeouts = {
  nlToDsl: 100,
  reasoning: 1000,
  dslToNl: 200
};

export const cases = [
  {
    action: 'policyView',
    input_dsl: 'True',
    setup_dsl: `
      @:old isA Socrates Man
      @:new isA Socrates Mortal
      @:rev negates new old
      policyNewerWins P True
    `,
    expect_policy_id: 'P',
    expect_newer_wins: true,
    expect_supersedes_count: 1,
    expect_negates_count: 1,
    expect_current_includes_names: ['new'],
    expect_current_excludes_names: ['old'],
    expect_materialized_lines_nonempty: false
  },
  {
    action: 'policyView',
    input_dsl: 'True',
    setup_dsl: `
      @_ Set urcMaterializeFacts True
      @:old isA Socrates Man
      @:new isA Socrates Mortal
      @:rev negates new old
      policyNewerWins P True
    `,
    expect_policy_id: 'P',
    expect_newer_wins: true,
    expect_materialized_lines_nonempty: true
  }
];

