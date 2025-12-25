/**
 * Suite 26 - Compound Conclusions (Regression)
 *
 * Regression for rules whose conclusion is a compound And/Or structure.
 * The prover must match a goal against a *leaf* inside the compound conclusion.
 */

export const name = 'Compound Conclusions';
export const description = 'Prove/query against leaf conclusions inside And/Or consequents';

export const theories = ['05-logic.sys2'];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Setup: Sally is wumpus+sterpus+gorpus. Rule: (w∧s∧g) -> (z∧i).',
    input_dsl: `
      isA Sally Wumpus
      isA Sally Sterpus
      isA Sally Gorpus

      @cW isA ?x Wumpus
      @cS isA ?x Sterpus
      @cG isA ?x Gorpus
      @ant And $cW $cS $cG

      @z isA ?x Zumpus
      @i isA ?x Impus
      @cons And $z $i
      Implies $ant $cons
    `,
    expected_nl: 'Learned'
  },

  {
    action: 'prove',
    input_nl: 'BUG001 regression: prove leaf (Zumpus) from And consequent.',
    input_dsl: '@goal isA Sally Zumpus',
    expected_nl: 'True: Sally is a zumpus.',
    proof_nl: [
      'Applied rule: Implies @ant @cons',
      'Rule meaning: IF',
      'Sally is a wumpus',
      'Sally is a sterpus',
      'Sally is a gorpus',
      'And condition satisfied',
      'Therefore Sally is a zumpus'
    ]
  },

  {
    action: 'prove',
    input_nl: 'Also prove the other leaf (Impus) from the same And consequent.',
    input_dsl: '@goal isA Sally Impus',
    expected_nl: 'True: Sally is a impus.',
    proof_nl: [
      'Applied rule: Implies @ant @cons',
      'Rule meaning: IF',
      'Sally is a wumpus',
      'Sally is a sterpus',
      'Sally is a gorpus',
      'And condition satisfied',
      'Therefore Sally is an impus'
    ]
  },

  {
    action: 'query',
    input_nl: 'Query: who is a zumpus?',
    input_dsl: '@q isA ?who Zumpus',
    expected_nl: ['Sally is a zumpus.'],
    proof_nl: [
      'Applied rule: Implies @ant @cons. Rule meaning: IF. Sally is a wumpus. Sally is a sterpus. Sally is a gorpus. And condition satisfied'
    ]
  }
];
