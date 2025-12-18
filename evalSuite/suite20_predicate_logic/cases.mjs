/**
 * Suite 20 - Predicate Logic Patterns
 *
 * Encodes modus ponens, transitive implication, conjunction rules.
 * Uses correct DS02 syntax with @var references for conditions.
 */

export const name = 'Predicate Logic';
export const description = 'Logical implication chains and conjunction rules with proofs';

export const theories = ['05-logic.sys2'];

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
    expected_nl: 'True: implies P S. Proof: implies P Q. implies Q R. And satisfied. Rule implies implies P R. implies P R. implies R S. And satisfied. Rule implies implies P S.'
  },

  // === PROVE: Modus ponens chain ===
  {
    action: 'prove',
    input_nl: 'Does R hold given P holds?',
    input_dsl: '@goal holds R',
    expected_nl: 'True: holds R. Proof: holds P. implies P Q. Modus ponens: holds Q. implies Q R. Modus ponens: holds R.'
  },

  // === PROVE: S holds via chain ===
  {
    action: 'prove',
    input_nl: 'Does S hold?',
    input_dsl: '@goal holds S',
    expected_nl: 'True: holds S. Proof: holds P. implies P Q. holds Q. implies Q R. holds R. implies R S. holds S. Chain of modus ponens (3 steps).'
  },

  // === PROVE: Conjunction rule T ===
  {
    action: 'prove',
    input_nl: 'Does T hold given P and S both hold?',
    input_dsl: '@goal holds T',
    expected_nl: 'True: holds T. Proof: holds P. holds S. And condition satisfied. Rule implies holds T.'
  },

  // === QUERY: What does P imply? ===
  {
    action: 'query',
    input_nl: 'What does P imply?',
    input_dsl: '@q implies P ?x',
    expected_nl: 'P implies Q. P implies R. P implies S. Proof: Direct fact and transitive via bridge rule.'
  },

  // === NEGATIVE: Unknown proposition ===
  {
    action: 'prove',
    input_nl: 'Does W hold?',
    input_dsl: '@goal holds W',
    expected_nl: 'Cannot prove: holds W. Search: No holds W fact. No implies chain to W. No applicable rules.'
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
    expected_nl: 'True: Socrates isA Mortal. Proof: isA Socrates Human. Rule: isA ?x Human implies isA ?x Mortal. Therefore isA Socrates Mortal.'
  },

  // === PROVE: Plato must die ===
  {
    action: 'prove',
    input_nl: 'Must Plato die?',
    input_dsl: '@goal must Plato Die',
    expected_nl: 'True: must Plato Die. Proof: isA Plato Human. Rule implies isA Plato Mortal. Rule implies must Plato Die.'
  },

  // === PROVE: Socrates is buried ===
  {
    action: 'prove',
    input_nl: 'Is Socrates buried?',
    input_dsl: '@goal Buried Socrates',
    expected_nl: 'True: Buried Socrates. Proof: isA Socrates Human. isA Socrates Mortal. must Socrates Die. Buried Socrates. Chain of 3 rules.'
  },

  // === NEGATIVE: Zeus not mortal (blocked by negation) ===
  {
    action: 'prove',
    input_nl: 'Is Zeus mortal?',
    input_dsl: '@goal isA Zeus Mortal',
    expected_nl: 'Cannot prove: isA Zeus Mortal. Search: Found Not(isA Zeus Mortal). Negation blocks inference.'
  }
];

export default { name, description, theories, steps };
