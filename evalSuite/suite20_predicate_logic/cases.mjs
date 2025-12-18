/**
 * Suite 20 - Predicate Logic Patterns
 *
 * Encodes modus ponens, transitive implication, conjunction rules, and
 * negative proof attempts. Uses compound And conditions to model rules.
 */

export const name = 'Predicate Logic';
export const description = 'Logical implication chains and conjunction rules with proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Logical facts and rules ===
  {
    action: 'learn',
    input_nl: 'Define implications P->Q, Q->R, and conjunction rule (P and S) -> T.',
    input_dsl: `
      implies P Q
      implies Q R
      implies R S

      # Conjunction rule: if P AND S then T
      @c1 P Holds
      @c2 S Holds
      @cond And $c1 $c2
      @rule1 implies $cond (T Holds)

      # Bridge rule: if implies X Y and implies Y Z then implies X Z
      @r1 implies ?X ?Y
      @r2 implies ?Y ?Z
      @cond2 And $r1 $r2
      @rule2 implies $cond2 (implies ?X ?Z)

      # Fact: P Holds (for conjunction)
      P Holds
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: Transitive implication P -> S ===
  {
    action: 'prove',
    input_nl: 'Does P imply S via Q and R?',
    input_dsl: '@goal implies P S',
    expected_nl: 'True: implies P S. Proof: Applied rule: implies ?X ?Y AND implies ?Y ?Z implies implies ?X ?Z. P implies Q. Q implies R. R implies S. Transitive chain verified (2 hops). Therefore P implies S.'
  },

  // === PROVE: Modus ponens chain P => Q => R ===
  {
    action: 'prove',
    input_nl: 'If P holds, does R hold?',
    input_dsl: '@goal R Holds',
    expected_nl: 'True: R Holds. Proof: P Holds. P implies Q. Therefore Q Holds. Q implies R. Therefore R Holds.'
  },

  // === PROVE: Conjunction-derived T ===
  {
    action: 'prove',
    input_nl: 'Do P and S together imply T?',
    input_dsl: '@goal T Holds',
    expected_nl: 'True: T Holds. Proof: P Holds. S Holds. And condition satisfied: P Holds, S Holds. Rule: And(P,S) implies T Holds. Therefore T Holds.'
  },

  // === QUERY: What does P imply transitively? ===
  {
    action: 'query',
    input_nl: 'List what P implies along the chain.',
    input_dsl: '@q implies P ?x',
    expected_nl: 'Answer: Q. S. Proof: P implies Q directly. Transitive rule yields implies P S.'
  },

  // === NEGATIVE: Without P, T cannot be proved ===
  {
    action: 'prove',
    input_nl: 'If P is absent, can we prove T? (expect fail)',
    input_dsl: '@goal T Missing',
    expected_nl: 'Cannot prove: T Missing. Search: Requires And of P Holds and S Holds to reach T; P Missing not linked. No rule produces T Missing.'
  },

  // === SETUP 2: Classic syllogism (Humans mortal) and deeper chain ===
  {
    action: 'learn',
    input_nl: 'Add human→mortal rule and mortality chain to mustDie and Buried.',
    input_dsl: `
      implies (isA ?x Human) (isA ?x Mortal)
      implies (isA ?x Mortal) (must ?x Die)
      implies (must ?x Die) (Buried ?x)
      isA Socrates Human
      isA Plato Human
      @negImm isA Zeus Mortal
      Not $negImm
      isA Zeus Deity
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PROVE: Socrates buried via syllogism chain ===
  {
    action: 'prove',
    input_nl: 'Is Socrates buried via human→mortal→die chain?',
    input_dsl: '@goal Buried Socrates',
    expected_nl: 'True: Buried Socrates. Proof: Socrates isA Human. Rule: Human -> Mortal implies Socrates isA Mortal. Rule: Mortal -> must Die implies must Socrates Die. Rule: must Die -> Buried implies Buried Socrates.'
  },

  // === PROVE: Plato must die ===
  {
    action: 'prove',
    input_nl: 'Does Plato have the obligation to die (mortal chain)?',
    input_dsl: '@goal must Plato Die',
    expected_nl: 'True: must Plato Die. Proof: Plato isA Human. Human -> Mortal. Mortal -> must Die. Therefore must Plato Die.'
  },

  // === NEGATIVE: Zeus is not mortal (explicit negation) ===
  {
    action: 'prove',
    input_nl: 'Is Zeus mortal?',
    input_dsl: '@goal isA Zeus Mortal',
    expected_nl: 'Cannot prove: Zeus isA Mortal. Search: Not(isA Zeus Mortal) present; negation blocks inference.'
  }
];

export default { name, description, theories, steps };
