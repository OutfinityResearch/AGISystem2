/**
 * Suite 25 - RuleTaker Bugs (Confirmed)
 *
 * Regression tests for CONFIRMED bugs discovered during RuleTaker benchmark evaluation.
 * These bugs caused 49.5% accuracy (essentially random) on the benchmark.
 *
 * Reference: evals/ruletaker/ANALYSIS_REPORT.md
 *
 * CONFIRMED BUGS:
 *   - BUG #1: Not operator ignored - engine proves P instead of evaluating Not(P)
 *   - BUG #2: Modus ponens not applied for ground-term rules
 */

export const name = 'RuleTaker Bugs';
export const description = 'Confirmed critical reasoning bugs from RuleTaker benchmark';

export const theories = ['05-logic.sys2'];

// RuleTaker benchmark labels require closed-world reasoning for "X is not Y" questions.
export const sessionOptions = { closedWorldAssumption: true };

export const steps = [
  // ============================================================
  // BUG #1: NOT OPERATOR IGNORED
  // Engine proves P when asked to prove Not(P)
  // Instead of evaluating Not(hasProperty Harry big), it proves hasProperty Harry big
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Harry is big (single fact)',
    input_dsl: `
      hasProperty Harry big
    `,
    expected_nl: 'Learned 1 facts'
  },

  {
    action: 'prove',
    input_nl: 'Verify: Harry is big (positive fact exists)',
    input_dsl: '@goal hasProperty Harry big',
    expected_nl: 'True: Harry has big.',
    proof_nl: 'Fact in KB: Harry has big'
  },

  // This is the bug: when we ask to prove Not(hasProperty Harry big),
  // the engine should return FALSE or CANNOT PROVE because Harry IS big.
  // But instead it proves "hasProperty Harry big" ignoring the Not wrapper.
  {
    action: 'prove',
    input_nl: 'BUG #1: Not(Harry big) should be UNPROVABLE (Harry IS big!)',
    // NOTE: prove() uses only the first statement as the goal (see src/runtime/session-prove.mjs),
    // so this must be a single goal statement (no intermediate @neg bindings).
    input_dsl: '@goal Not (hasProperty Harry big)',
    expected_nl: 'Cannot prove: Not',
    proof_nl: 'No Not facts'
  },

  // CWA behavior: Not(P) is TRUE when P is absent from KB.
  {
    action: 'prove',
    input_nl: 'CWA: Not(Zed big) should be PROVABLE (Zed big is absent)',
    input_dsl: '@goal Not (hasProperty Zed big)',
    expected_nl: 'True: Not',
    proof_nl: 'Closed world assumption'
  },

  // ============================================================
  // BUG #2: MODUS PONENS NOT APPLIED (Ground Terms)
  // Given: A and A->B
  // Should prove: B
  // But engine says "Cannot prove" even though rule exists!
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Charlie is quiet, quiet->round rule',
    input_dsl: `
      hasProperty Charlie quiet
      @ant hasProperty Charlie quiet
      @cons hasProperty Charlie round
      Implies $ant $cons
    `,
    expected_nl: 'Learned 4 facts'
  },

  {
    action: 'prove',
    input_nl: 'Verify: Charlie is quiet (antecedent is TRUE)',
    input_dsl: '@goal hasProperty Charlie quiet',
    expected_nl: 'True: Charlie has quiet.',
    proof_nl: 'Fact in KB: Charlie has quiet'
  },

  // This is the bug: A->B exists, A is true, but B cannot be proved!
  // Classic modus ponens failure.
  {
    action: 'prove',
    input_nl: 'BUG #2: Charlie round via modus ponens (quiet->round, quiet=TRUE)',
    input_dsl: '@goal hasProperty Charlie round',
    expected_nl: 'True: Charlie has round.',
    proof_nl: 'Applied rule: IF (Charlie has quiet) THEN (Charlie has round). Therefore Charlie has round.'
  },

  // ============================================================
  // WORKING CASES (Sanity checks that DO pass)
  // These prove that variable-based rules work (unlike ground terms)
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Bob is big, big->green rule with variable',
    input_dsl: `
      hasProperty Bob big
      @cond hasProperty ?x big
      @cons hasProperty ?x green
      Implies $cond $cons
    `,
    expected_nl: 'Learned 4 facts'
  },

  {
    action: 'prove',
    input_nl: 'Sanity: Bob green via variable rule (THIS WORKS)',
    input_dsl: '@goal hasProperty Bob green',
    expected_nl: 'True: Bob has green.',
    proof_nl: 'Applied rule: IF (Bob has big) THEN (Bob has green). Therefore Bob has green.'
  },

  // ============================================================
  // BUG #3: MODUS PONENS WITH VARIABLE (vs ground) - Comparison
  // This shows inconsistency: variable rules work, ground rules don't
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Dave is cold, cold->frozen (GROUND TERMS)',
    input_dsl: `
      hasProperty Dave cold
      @a hasProperty Dave cold
      @c hasProperty Dave frozen
      Implies $a $c
    `,
    expected_nl: 'Learned 4 facts'
  },

  {
    action: 'prove',
    input_nl: 'BUG #3: Dave frozen via ground modus ponens (should work but fails)',
    input_dsl: '@goal hasProperty Dave frozen',
    expected_nl: 'True: Dave has frozen.',
    proof_nl: 'Applied rule: IF (Dave has cold) THEN (Dave has frozen). Therefore Dave has frozen.'
  },

  // ============================================================
  // SANITY: NOT IS UNARY (Parenthesized)
  // Verifies that Not(P) is unprovable when P is a fact (and that Not is applied to a single proposition).
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Tom is smart (positive fact)',
    input_dsl: `
      hasProperty Tom smart
      @p hasProperty Tom smart
      @notP Not $p
    `,
    expected_nl: 'Learned 3 facts'
  },

  // Tom IS smart (hasProperty Tom smart is in KB)
  {
    action: 'prove',
    input_nl: 'Verify: Tom is smart (positive)',
    input_dsl: '@goal hasProperty Tom smart',
    expected_nl: 'True: Tom has smart.',
    proof_nl: 'Fact in KB: Tom has smart'
  },

  // This test verifies that Not(P) is correctly unprovable when P is true
  // This one WORKS correctly - engine returns "Cannot prove" which is expected
  {
    action: 'prove',
    input_nl: 'Sanity: Not(Tom smart) correctly unprovable (Tom IS smart)',
    input_dsl: '@goal Not (hasProperty Tom smart)',
    expected_nl: 'Cannot prove: Not',
    proof_nl: 'Not'
  },

  // ============================================================
  // BUG #4: Ground Rule Leakage (Cross-Entity Matching)
  // A ground rule for Ice must not satisfy a Water antecedent via similarity.
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Setup: Ice cold->frozen, Water cold->frozen (but Water is NOT cold)',
    input_dsl: `
      hasProperty Ice cold
      @anti hasProperty Ice cold
      @consi hasProperty Ice frozen
      Implies $anti $consi

      hasProperty Water liquid
      @antw hasProperty Water cold
      @consw hasProperty Water frozen
      Implies $antw $consw
    `,
    expected_nl: 'Learned'
  },

  {
    action: 'prove',
    input_nl: 'BUG #4: Water frozen should be UNPROVABLE (Water is not cold)',
    input_dsl: '@goal hasProperty Water frozen',
    expected_nl: 'Cannot prove',
    proof_nl: [
      'Checked rule: IF (Water has cold) THEN (Water has frozen)',
      'Missing: Water has cold',
      'Therefore the rule antecedent is not satisfied'
    ]
  }
];

export default { name, description, theories, steps };
