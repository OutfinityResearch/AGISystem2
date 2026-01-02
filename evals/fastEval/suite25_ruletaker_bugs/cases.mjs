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

export const theories = [];

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
    input_nl: 'Harry hasProperty big.',
    input_dsl: `
      hasProperty Harry big
    `,
    expected_nl: 'Learned 1 facts'
  },

  {
    action: 'prove',
    input_nl: 'Harry hasProperty big.',
    input_dsl: '@goal hasProperty Harry big',
    expected_nl: 'True: Harry has big.',
    proof_nl: 'Fact in KB: Harry has big'
  },

  // This is the bug: when we ask to prove Not(hasProperty Harry big),
  // the engine should return FALSE or CANNOT PROVE because Harry IS big.
  // But instead it proves "hasProperty Harry big" ignoring the Not wrapper.
  {
    action: 'prove',
    input_nl: 'Harry does not hasProperty big.',
    // NOTE: prove() uses only the first statement as the goal (see src/runtime/session-prove.mjs),
    // so this must be a single goal statement (no intermediate @neg bindings).
    input_dsl: '@goal Not (hasProperty Harry big)',
    expected_nl: 'Cannot prove: Not',
    proof_nl: 'No Not facts'
  },

  // CWA behavior: Not(P) is TRUE when P is absent from KB.
  {
    action: 'prove',
    input_nl: 'Zed does not hasProperty big.',
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
    input_nl: 'Charlie hasProperty quiet. IF (Charlie hasProperty quiet) THEN (Charlie hasProperty round).',
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
    input_nl: 'Charlie hasProperty quiet.',
    input_dsl: '@goal hasProperty Charlie quiet',
    expected_nl: 'True: Charlie has quiet.',
    proof_nl: 'Fact in KB: Charlie has quiet'
  },

  // This is the bug: A->B exists, A is true, but B cannot be proved!
  // Classic modus ponens failure.
  {
    action: 'prove',
    input_nl: 'Charlie hasProperty round.',
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
    input_nl: 'Bob hasProperty big. IF (?x hasProperty big) THEN (?x hasProperty green).',
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
    input_nl: 'Bob hasProperty green.',
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
    input_nl: 'Dave hasProperty cold. IF (Dave hasProperty cold) THEN (Dave hasProperty frozen).',
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
    input_nl: 'Dave hasProperty frozen.',
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
    input_nl: 'Tom hasProperty smart.',
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
    input_nl: 'Tom hasProperty smart.',
    input_dsl: '@goal hasProperty Tom smart',
    expected_nl: 'True: Tom has smart.',
    proof_nl: 'Fact in KB: Tom has smart'
  },

  // This test verifies that Not(P) is correctly unprovable when P is true
  // This one WORKS correctly - engine returns "Cannot prove" which is expected
  {
    action: 'prove',
    input_nl: 'Tom does not hasProperty smart.',
    input_dsl: '@goal Not (hasProperty Tom smart)',
    expected_nl: 'Cannot prove: Not',
    proof_nl: [
      'Found in KB: Tom has smart',
      'Therefore NOT (Tom has smart) cannot be proved'
    ],
    alternative_proof_nl: 'Not'
  },

  // ============================================================
  // BUG #4: Ground Rule Leakage (Cross-Entity Matching)
  // A ground rule for Ice must not satisfy a Water antecedent via similarity.
  // ============================================================

  {
    action: 'learn',
    input_nl: 'Ice hasProperty cold. IF (Ice hasProperty cold) THEN (Ice hasProperty frozen). Water hasProperty liquid. IF (Water hasProperty cold) THEN (Water hasProperty frozen).',
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
    input_nl: 'Water hasProperty frozen.',
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
