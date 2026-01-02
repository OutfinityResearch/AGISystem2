/**
 * Suite 31: CSP allDifferent (Generic CP Backend)
 *
 * Purpose:
 * - Exercise the generic CP/CSP solve block (`solve csp`) using `allDifferent`.
 * - Validate binding extraction via query patterns over stored solutions.
 *
 * What this suite checks (semantics, not hacks):
 * - Correct enumeration for a small permutation problem (3 variables, 3 values).
 * - Correct UNSAT handling when the domain is too small for allDifferent.
 */

export const name = 'CSP allDifferent';
export const description = 'Generic CP problems using the allDifferent constraint.';

export const theories = [];

export const timeouts = {
  nlToDsl: 100,
  reasoning: 2000,
  dslToNl: 500
};

export const cases = [
  // ========================================
  // SCENARIO 1: Permutations (3 vars, 3 values)
  // A,B,C must take distinct seats {S1,S2,S3} → 3! = 6 solutions.
  // ========================================

  {
    action: 'learn',
    input_nl: 'A is a Person. B is a Person. C is a Person. S1 is a Seat. S2 is a Seat. S3 is a Seat.',
    input_dsl: `
      isA A Person
      isA B Person
      isA C Person
      isA S1 Seat
      isA S2 Seat
      isA S3 Seat

      @perm3 solve csp
        variables from Person
        domain from Seat
        allDifferent variables
        maxSolutions from 10
      end
    `,
    expect_solve_urc: true,
    expect_solve_urc_csp_artifact: true,
    expect_solve_urc_solution_evidence_eq_solution_count: true,
    expected_nl: 'Found 6 perm3: 1. A is at S1, B is at S2, C is at S3. ...'
  },
  {
    action: 'query',
    input_nl: 'Where can A sit in perm3?',
    input_dsl: 'perm3 A ?seat',
    expected_nl: ['A is at S1.', 'A is at S2.', 'A is at S3.']
  },
  {
    action: 'query',
    input_nl: 'Who can be at S1 in perm3?',
    input_dsl: 'perm3 ?person S1',
    expected_nl: ['A is at S1.', 'B is at S1.', 'C is at S1.']
  },

  // ========================================
  // SCENARIO 2: UNSAT (3 vars, 2 values)
  // allDifferent requires distinct values but only {T1,T2} exist → no solution.
  // ========================================

  {
    action: 'learn',
    input_nl: 'P is a Person2. Q is a Person2. R is a Person2. T1 is a Seat2. T2 is a Seat2.',
    input_dsl: `
      isA P Person2
      isA Q Person2
      isA R Person2
      isA T1 Seat2
      isA T2 Seat2

      @perm3unsat solve csp
        variables from Person2
        domain from Seat2
        allDifferent variables
        maxSolutions from 10
      end
    `,
    expect_solve_urc: true,
    expect_solve_urc_csp_artifact: true,
    expect_solve_urc_infeasible_evidence: true,
    expected_nl: 'No valid solutions found.'
  },
  {
    action: 'listSolutions',
    input_nl: 'List solutions for perm3unsat.',
    input_dsl: 'perm3unsat',
    expected_nl: 'No valid solutions found.'
  }
];
