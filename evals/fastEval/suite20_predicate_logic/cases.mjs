/**
 * Suite 20 - Predicate Logic Patterns
 *
 * Encodes modus ponens, transitive implication, conjunction rules.
 * Uses correct DS02 syntax with @var references for conditions.
 */

export const name = 'Predicate Logic';
export const description = 'Logical implication chains and conjunction rules with proofs';

export const theories = ['05-logic.sys2', 'History/01-relations.sys2'];

export const steps = [
  // === SETUP: Logical facts and rules ===
  {
    action: 'learn',
    input_nl: 'Define propositional implications and conjunction rule.',
    input_dsl: `
      # Propositional chain: P -> Q -> R -> S
      implies P Q
      implies Q R
      implies R S

      # Conjunction rule: P AND S together imply T
      @c1 holds P
      @c2 holds S
      @cond And $c1 $c2
      @conseq holds T
      implies $cond $conseq

      # Bridge rule for transitive implication
      @br1 implies ?X ?Y
      @br2 implies ?Y ?Z
      @brCond And $br1 $br2
      @brConseq implies ?X ?Z
      implies $brCond $brConseq

      # Facts
      holds P
    `,
    expected_nl: 'Learned 14 facts'
  },

  // === PROVE: Transitive implication P -> S ===
  {
    action: 'prove',
    input_nl: 'Does P imply S via chain?',
    input_dsl: '@goal implies P S',
    expected_nl: 'True: P implies S.',
    proof_nl: 'Applied rule: implies @brCond @brConseq. Applied rule: rule implies implies Q S. Q implies R. R implies S. And condition satisfied: implies Q R, implies R S. P implies Q. Q implies S. And condition satisfied: implies P Q, implies Q S.'
  },

  // === PROVE: Modus ponens chain ===
  {
    action: 'prove',
    input_nl: 'Does R hold given P holds?',
    input_dsl: '@goal holds R',
    expected_nl: 'True: R is holds.',
    proof_nl: 'P holds. P implies Q. Q holds. Q implies R. R holds.'
  },

  // === PROVE: S holds via chain ===
  {
    action: 'prove',
    input_nl: 'Does S hold?',
    input_dsl: '@goal holds S',
    expected_nl: 'True: S is holds.',
    proof_nl: 'P holds. P implies Q. Q holds. Q implies R. R holds. R implies S. S holds.'
  },

  // === PROVE: Conjunction rule T ===
  {
    action: 'prove',
    input_nl: 'Does T hold given P and S both hold?',
    input_dsl: '@goal holds T',
    expected_nl: 'True: T is holds.',
    proof_nl: 'P holds. P implies Q. Q holds. Q implies R. R holds. R implies S. S holds. And condition satisfied: holds P, holds S. T holds.'
  },

  // === QUERY: What does P imply? ===
  {
    action: 'query',
    input_nl: 'What does P imply?',
    input_dsl: '@q implies P ?x',
    expected_nl: [
      'P implies Q.',
      'P implies R.',
      'P implies S.'
    ],
    proof_nl: [
      'implies P Q',
      'implies P Q. implies Q R',
      'implies Q R. implies R S'
    ]
  },

  // === NEGATIVE: Unknown proposition ===
  {
    action: 'prove',
    input_nl: 'Does W hold?',
    input_dsl: '@goal holds W',
    expected_nl: 'Cannot prove: W is holds.',
    proof_nl: 'Searched isA W ?type in KB. Not found. Entity unknown. No applicable inheritance paths.'
  },

  // === SETUP 2: Classic syllogism ===
  {
    action: 'learn',
    input_nl: 'Add Socrates syllogism: Human -> Mortal -> mustDie -> Buried.',
    input_dsl: `
      # Rule: Human implies Mortal
      @h2m1 isA ?x Human
      @h2m2 isA ?x Mortal
      implies $h2m1 $h2m2

      # Rule: Mortal implies must Die
      @m2d1 isA ?x Mortal
      @m2d2 must ?x Die
      implies $m2d1 $m2d2

      # Rule: must Die implies Buried
      @d2b1 must ?x Die
      @d2b2 Buried ?x
      implies $d2b1 $d2b2

      # Facts
      isA Socrates Human
      isA Plato Human

      # Negation: Zeus is not mortal
      @negZeus isA Zeus Mortal
      Not $negZeus
      isA Zeus Deity
    `,
    expected_nl: 'Learned 14 facts'
  },

  // === PROVE: Socrates is mortal ===
  {
    action: 'prove',
    input_nl: 'Is Socrates mortal?',
    input_dsl: '@goal isA Socrates Mortal',
    expected_nl: 'True: Socrates is a mortal.',
    proof_nl: 'Applied rule: implies @h2m1 @h2m2.'
  },

  // === PROVE: Plato must die ===
  {
    action: 'prove',
    input_nl: 'Must Plato die?',
    input_dsl: '@goal must Plato Die',
    expected_nl: 'True: Plato must Die.',
    proof_nl: 'Applied rule: implies @m2d1 @m2d2. Applied rule: rule implies isA Plato Mortal.'
  },

  // === PROVE: Socrates is buried ===
  {
    action: 'prove',
    input_nl: 'Is Socrates buried?',
    input_dsl: '@goal Buried Socrates',
    expected_nl: 'True: Socrates is Buried.',
    proof_nl: 'Applied rule: implies @d2b1 @d2b2. Applied rule: rule implies must Socrates Die. Applied rule: rule implies isA Socrates Mortal.'
  },

  // === NEGATIVE: Zeus not mortal (blocked by negation) ===
  {
    action: 'prove',
    input_nl: 'Is Zeus mortal?',
    input_dsl: '@goal isA Zeus Mortal',
    expected_nl: 'Cannot prove: Zeus is a mortal.',
    proof_nl: 'Zeus isA Deity. Found explicit negation: Not(isA Zeus Mortal). Negation blocks inference.'
  },

  // === QUANTIFIERS: Not(Exists...) via type disjointness ===
  {
    action: 'learn',
    input_nl: 'Add type constraints: Plant -> Not(Fungus), Mushroom -> Fungus.',
    input_dsl: `
      @p isA ?x Plant
      @f isA ?x Fungus
      @nf Not $f
      Implies $p $nf

      @m isA ?x Mushroom
      @f2 isA ?x Fungus
      Implies $m $f2
    `,
    expected_nl: 'Learned'
  },
  {
    action: 'prove',
    input_nl: 'Is it impossible for something to be both a plant and a mushroom?',
    input_dsl: '@goal Not (Exists ?x (And (isA ?x Plant) (isA ?x Mushroom)))',
    expected_nl: 'True:',
    proof_nl: 'No Plant can also be Mushroom'
  },

  // === QUANTIFIERS: Exists witness ===
  {
    action: 'learn',
    input_nl: 'Add a concrete witness for Pet(x) AND Rabbit(x).',
    input_dsl: `
      isA Alice Pet
      isA Alice Rabbit
    `,
    expected_nl: 'Learned'
  },
  {
    action: 'prove',
    input_nl: 'Does there exist a pet that is also a rabbit?',
    input_dsl: '@goal Exists ?x (And (isA ?x Pet) (isA ?x Rabbit))',
    expected_nl: 'True:',
    proof_nl: 'Witness Alice satisfies the existential'
  }
];

export default { name, description, theories, steps };
