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
      'Stella is a rompus',
      'Stella is a lorpus',
      'Applied contrapositive on rule: IF ((Stella is a yumpus) AND (Stella is a rompus) AND (Stella is a lorpus)) THEN (Stella is a tumpus)',
      'Therefore Not((isA, Stella, Yumpus))'
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
    proof_nl: [
      'Proved: Not(isA, Alex, Brimpus)',
      'Therefore Not((isA, Alex, Vumpus))'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Setup: contrapositive chain (Vumpus→Brimpus→Numpus) with explicit Not(Numpus).',
    input_dsl: `
      @cond13 isA ?x Vumpus
      @cond14 isA ?x Brimpus
      Implies $cond13 $cond14

      @cond15 isA ?x Brimpus
      @cond16 isA ?x Numpus
      Implies $cond15 $cond16

      @base17 isA Stella Numpus
      Not $base17
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Stella is not a vumpus (from Not(Numpus) and the implication chain).',
    input_dsl: '@goal:goal Not (isA Stella Vumpus)',
    expected_nl: 'True: Not((isA, Stella, Vumpus)).',
    proof_nl: [
      'Proved: Not(isA, Stella, Numpus)',
      'Therefore Not((isA, Stella, Vumpus))'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Setup: disjunctive antecedent (Lempus OR Shumpus OR Yumpus) → Impus, plus explicit Not(Impus).',
    input_dsl: `
      @cond18 isA ?x Lempus
      @cond19 isA ?x Shumpus
      @cond20 isA ?x Yumpus
      @or21 Or $cond18 $cond19 $cond20
      @conc22 isA ?x Impus
      Implies $or21 $conc22

      isA Max Lempus
      isA Max Yumpus
      Not isA Max Impus
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Max is not a shumpus (from Not(Impus) and (Lempus OR Shumpus OR Yumpus)→Impus).',
    input_dsl: '@goal:goal Not (isA Max Shumpus)',
    expected_nl: 'True: Not((isA, Max, Shumpus)).',
    proof_nl: [
      'Proved: Not(isA, Max, Impus)',
      'Therefore Not((isA, Max, Shumpus))'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Setup: chain refutation via Or antecedent: Tumpus→Brimpus (as Or branch), and Numpus→(Wumpus∧Tumpus).',
    input_dsl: `
      @s isA ?x Shumpus
      @d isA ?x Dumpus
      @t isA ?x Tumpus
      @sdtor Or $s $d $t
      @br isA ?x Brimpus
      Implies $sdtor $br

      @n isA ?x Numpus
      @w isA ?x Wumpus
      @tw And $t $w
      Implies $n $tw

      isA Wren Numpus
      Not isA Wren Brimpus
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Wren is not a numpus (from Not(Brimpus) + Or→Brimpus + Numpus→(Wumpus∧Tumpus)).',
    input_dsl: '@goal:goal Not (isA Wren Numpus)',
    expected_nl: 'True: Not((isA, Wren, Numpus)).',
    proof_nl: [
      'Proved: Not(isA, Wren, Brimpus)',
      'Therefore Not((isA, Wren, Numpus))'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Setup: multiple possible refutations (Shumpus→(Grimpus∧Zumpus∧Rompus), Zumpus→(Sterpus∧...)), with explicit Not(Sterpus).',
    input_dsl: `
      @sh isA ?x Shumpus
      @g isA ?x Grimpus
      @z isA ?x Zumpus
      @r isA ?x Rompus
      @andA And $g $z $r
      Implies $sh $andA

      @zs isA ?x Zumpus
      @st isA ?x Sterpus
      @l isA ?x Lorpus
      @sh2 isA ?x Shumpus
      @andB And $st $l $sh2
      Implies $zs $andB

      Not isA Stella Sterpus
    `,
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'prove',
    input_nl: 'Prove: Stella is not a shumpus (should find the easy refutation path via Not(Sterpus) without exhausting step budget).',
    input_dsl: '@goal:goal Not (isA Stella Shumpus)',
    expected_nl: 'True: Not((isA, Stella, Shumpus)).',
    proof_nl: [
      'Therefore Not((isA, Stella, Shumpus))'
    ]
  }
];
