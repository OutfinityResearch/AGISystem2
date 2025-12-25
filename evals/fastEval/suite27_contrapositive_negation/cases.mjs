/**
 * Suite 27 - Contrapositive Negation
 *
 * Regression suite for proving `Not(A)` via a constrained modus-tollens:
 *   - Have a rule: (A ∧ B ∧ ...) → C
 *   - Can prove Not(C)
 *   - Can prove all other antecedents (B, ...)
 *   - Therefore infer Not(A)
 *
 * This pattern appears frequently in ProntoQA-style contradiction settings.
 */

export const name = 'Contrapositive Negation';
export const description = 'Derive Not(antecedent) from Not(conclusion) and remaining antecedents';

export const theories = [];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Setup: rules/facts that make Not(Tumpus) derivable while (Yumpus ∧ Rompus ∧ Lorpus) → Tumpus.',
    input_dsl: `
      @cond0 isA ?x Yumpus
      @cond1 isA ?x Rompus
      @cond2 isA ?x Lorpus
      @and3 And $cond0 $cond1 $cond2
      @cond4 isA ?x Tumpus
      Implies $and3 $cond4

      @cond5 isA ?x Grimpus
      @base6 isA ?x Tumpus
      @neg7 Not $base6
      Implies $cond5 $neg7

      isA Stella Yumpus
      isA Stella Rompus
      isA Stella Lorpus
      isA Stella Grimpus
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Stella is not a yumpus (via contrapositive from Not(Tumpus)).',
    input_dsl: '@goal:goal Not (isA Stella Yumpus)',
    expected_nl: 'True: Not((isA, Stella, Yumpus)).',
    proof_nl: [
      'Not (isA Stella Tumpus)',
      'Stella is a rompus',
      'Stella is a lorpus'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Setup: contrapositive where the rule conclusion is a conjunction (A → (B ∧ C)).',
    input_dsl: `
      @cond8 isA ?x Vumpus
      @cond9 isA ?x Brimpus
      @cond10 isA ?x Zumpus
      @and11 And $cond9 $cond10
      Implies $cond8 $and11

      @base12 isA Alex Brimpus
      Not $base12
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Alex is not a vumpus (from Not(Brimpus) and Vumpus→(Brimpus∧Zumpus)).',
    input_dsl: '@goal:goal Not (isA Alex Vumpus)',
    expected_nl: 'True: Not((isA, Alex, Vumpus)).',
    proof_nl: 'Not (isA Alex Brimpus)'
  }
];
