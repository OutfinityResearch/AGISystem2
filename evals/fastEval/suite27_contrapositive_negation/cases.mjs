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
    input_nl: 'IF ((?x is a Yumpus) AND (?x is a Rompus) AND (?x is a Lorpus)) THEN (?x is a Tumpus). IF (?x is a Grimpus) THEN (?x is not a Tumpus). Stella is a Yumpus. Stella is a Rompus. Stella is a Lorpus. Stella is a Grimpus.',
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
    input_nl: 'Stella is not a Yumpus.',
    input_dsl: '@goal:goal Not (isA Stella Yumpus)',
    expected_nl: 'True: NOT (Stella is a yumpus).',
    proof_nl: [
      'Stella is a rompus',
      'Stella is a lorpus',
      'Derived: NOT (Stella is a tumpus)',
      'Using contrapositive on rule: IF ((Stella is a yumpus) AND (Stella is a rompus) AND (Stella is a lorpus)) THEN',
      'Therefore NOT (Stella is a yumpus)'
    ]
  },
  {
    action: 'learn',
    input_nl: 'IF (?x is a Vumpus) THEN ((?x is a Brimpus) AND (?x is a Zumpus)). Alex is not a Brimpus.',
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
    input_nl: 'Alex is not a Vumpus.',
    input_dsl: '@goal:goal Not (isA Alex Vumpus)',
    expected_nl: 'True: NOT (Alex is a vumpus).',
    proof_nl: [
      'Found in KB: NOT (Alex is a brimpus)',
      'Using contrapositive on rule: IF (Alex is a vumpus) THEN',
      'Therefore NOT (Alex is a vumpus)'
    ]
  },
  {
    action: 'learn',
    input_nl: 'IF (?x is a Vumpus) THEN (?x is a Brimpus). IF (?x is a Brimpus) THEN (?x is a Numpus). Stella is not a Numpus.',
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
    input_nl: 'Stella is not a Vumpus.',
    input_dsl: '@goal:goal Not (isA Stella Vumpus)',
    expected_nl: 'True: NOT (Stella is a vumpus).',
    proof_nl: [
      'Found in KB: NOT (Stella is a numpus)',
      'infer NOT (Stella is a brimpus)',
      'Therefore NOT (Stella is a vumpus)'
    ]
  },
  {
    action: 'learn',
    input_nl: 'IF ((?x is a Lempus) OR (?x is a Shumpus) OR (?x is a Yumpus)) THEN (?x is an Impus). Max is a Lempus. Max is a Yumpus. Max is not a Impus.',
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
    input_nl: 'Max is not a Shumpus.',
    input_dsl: '@goal:goal Not (isA Max Shumpus)',
    expected_nl: 'True: NOT (Max is a shumpus).',
    proof_nl: [
      'Found in KB: NOT (Max is an impus)',
      'Using contrapositive on rule: IF ((',
      'Therefore NOT (Max is a shumpus)'
    ]
  },
  {
    action: 'learn',
    input_nl: 'IF ((?x is a Shumpus) OR (?x is a Dumpus) OR (?x is a Tumpus)) THEN (?x is a Brimpus). IF (?x is a Numpus) THEN ((?x is a Tumpus) AND (?x is a Wumpus)). Wren is a Numpus. Wren is not a Brimpus.',
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
    input_nl: 'Wren is not a Numpus.',
    input_dsl: '@goal:goal Not (isA Wren Numpus)',
    expected_nl: 'True: NOT (Wren is a numpus).',
    proof_nl: [
      'Found in KB: NOT (Wren is a brimpus)',
      'infer NOT (Wren is a tumpus)',
      'Therefore NOT (Wren is a numpus)'
    ]
  },
  {
    action: 'learn',
    input_nl: 'IF (?x is a Shumpus) THEN ((?x is a Grimpus) AND (?x is a Zumpus) AND (?x is a Rompus)). IF (?x is a Zumpus) THEN ((?x is a Sterpus) AND (?x is a Lorpus) AND (?x is a Shumpus)). Stella is not a Sterpus.',
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
    input_nl: 'Stella is not a Shumpus.',
    input_dsl: '@goal:goal Not (isA Stella Shumpus)',
    expected_nl: 'True: NOT (Stella is a shumpus).',
    proof_nl: [
      'Therefore NOT (Stella is a shumpus)'
    ]
  }
];
