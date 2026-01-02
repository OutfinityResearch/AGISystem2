/**
 * Suite 30: CSP Minis (Generic CP Backend)
 *
 * Purpose:
 * - Exercise the generic CP/CSP solve block (`solve csp`) on small, diverse problems.
 * - Avoid scenario-specific solve types (wedding seating is just one modeling case).
 *
 * What this suite checks (semantics, not hacks):
 * - Correct enumeration for small graph-coloring style constraints (binary "noConflict").
 * - Correct UNSAT handling when the domain is too small.
 * - Correct extraction of bindings from stored solutions via query patterns.
 */

export const name = 'CSP Minis';
export const description = 'Small generic CP problems: graph coloring + UNSAT sanity.';

export const theories = [];

export const timeouts = {
  nlToDsl: 100,
  reasoning: 2000,
  dslToNl: 500
};

export const cases = [
  // ========================================
  // SCENARIO 1: Graph coloring (path of 3 nodes, 2 colors)
  // A-B-C with A adjacent B, B adjacent C.
  // With colors {Red, Blue}, there are 2 valid assignments:
  //   A=Red, B=Blue, C=Red
  //   A=Blue, B=Red, C=Blue
  // ========================================

  {
    action: 'learn',
    input_nl: 'A is a Node. B is a Node. C is a Node. Red is a Color. Blue is a Color. A conflictsWith B. B conflictsWith C.',
    input_dsl: `
      isA A Node
      isA B Node
      isA C Node
      isA Red Color
      isA Blue Color

      conflictsWith A B
      conflictsWith B C

      @coloring solve csp
        variables from Node
        domain from Color
        noConflict conflictsWith
        maxSolutions from 10
      end
    `,
    expected_nl: 'Found 2 coloring: 1. A is at Red, B is at Blue, C is at Red. 2. A is at Blue, B is at Red, C is at Blue.'
  },
  {
    action: 'query',
    input_nl: 'What colors can A have in coloring?',
    input_dsl: 'coloring A ?color',
    expected_nl: ['A is at Red.', 'A is at Blue.'],
    proof_nl: [
      'conflictsWith(A, B) satisfied',
      'conflictsWith(A, B) satisfied'
    ]
  },

  // ========================================
  // SCENARIO 2: UNSAT (triangle with 2 colors)
  // A-B-C all pairwise conflict, but only 2 colors exist → no solution.
  // ========================================

  {
    action: 'learn',
    input_nl: 'X is a Node2. Y is a Node2. Z is a Node2. Red is a Color2. Blue is a Color2. X conflictsWith Y. Y conflictsWith Z. X conflictsWith Z.',
    input_dsl: `
      isA X Node2
      isA Y Node2
      isA Z Node2
      isA Red Color2
      isA Blue Color2

      conflictsWith X Y
      conflictsWith Y Z
      conflictsWith X Z

      @triangle2colors solve csp
        variables from Node2
        domain from Color2
        noConflict conflictsWith
        maxSolutions from 10
      end
    `,
    expected_nl: 'No valid solutions found.'
  },
  {
    action: 'listSolutions',
    input_nl: 'List solutions for triangle2colors.',
    input_dsl: 'triangle2colors',
    expected_nl: 'No valid solutions found.'
  }
];

