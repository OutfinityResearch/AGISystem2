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
    input_nl: 'Sally is a Wumpus. Sally is a Sterpus. Sally is a Gorpus. IF ((?x is a Wumpus) AND (?x is a Sterpus) AND (?x is a Gorpus)) THEN ((?x is a Zumpus) AND (?x is an Impus)).',
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
    input_nl: 'Sally is a Zumpus.',
    input_dsl: '@goal isA Sally Zumpus',
    expected_nl: 'True: Sally is a zumpus.',
    proof_nl: [
      'Sally is a wumpus',
      'Sally is a sterpus',
      'Sally is a gorpus',
      'And condition satisfied: Sally is a wumpus, Sally is a sterpus, Sally is a gorpus',
      'Applied rule: IF ((Sally is a wumpus) AND (Sally is a sterpus) AND (Sally is a gorpus)) THEN (Sally is a zumpus)',
      'Therefore Sally is a zumpus'
    ]
  },

  {
    action: 'prove',
    input_nl: 'Sally is an Impus.',
    input_dsl: '@goal isA Sally Impus',
    expected_nl: 'True: Sally is an impus.',
    proof_nl: [
      'Sally is a wumpus',
      'Sally is a sterpus',
      'Sally is a gorpus',
      'And condition satisfied: Sally is a wumpus, Sally is a sterpus, Sally is a gorpus',
      'Applied rule: IF ((Sally is a wumpus) AND (Sally is a sterpus) AND (Sally is a gorpus)) THEN (Sally is an impus)',
      'Therefore Sally is an impus'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is a Zumpus?',
    input_dsl: '@q isA ?who Zumpus',
    expected_nl: ['Sally is a zumpus.'],
    proof_nl: [
      'Therefore Sally is a zumpus'
    ]
  }
];
