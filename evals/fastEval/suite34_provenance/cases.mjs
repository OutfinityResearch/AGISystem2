/**
 * Suite 34: Provenance (URC)
 *
 * Purpose:
 * - Verify `Session.executeNL()` provenance recording.
 * - Verify derived audit-line materialization does not inject provenance into kbFacts.
 */

export const name = 'URC Provenance';
export const description = 'executeNL provenance log + derived audit-line materialization.';

export const theories = [];

export const timeouts = {
  nlToDsl: 200,
  reasoning: 2000,
  dslToNl: 200
};

export const cases = [
  {
    action: 'executeNL',
    mode: 'learn',
    input_nl: 'Anne is a Dog.',
    materializeFacts: true,
    expect_provenance_count_min: 1,
    expect_provenance_materialized: true,
    expect_kb_has_provenance_facts: false
  },
  {
    action: 'executeNL',
    mode: 'learn',
    input_nl: 'Bob is a Cat.',
    materializeFacts: false,
    expect_provenance_count_min: 1,
    expect_provenance_materialized: false,
    expect_kb_has_provenance_facts: false
  }
];

