/**
 * Suite 18 - Axiomatic Set Theory (fragment)
 *
 * Encodes subset transitivity and element propagation, with multi-step proofs.
 * Uses compound And conditions to model axioms.
 */

export const name = 'Axiomatic Set Theory';
export const description = 'Subset transitivity and element propagation with multi-step proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Axioms as rules + concrete sets ===
  {
    action: 'learn',
    input_nl: 'Define subset transitivity and element propagation axioms; instantiate concrete sets.',
    input_dsl: `
      # Axiom: subset transitivity
      @ax_sub1 subsetOf ?A ?B
      @ax_sub2 subsetOf ?B ?C
      @ax_cond And $ax_sub1 $ax_sub2
      @ax_trans implies $ax_cond (subsetOf ?A ?C)

      # Axiom: element propagation through subset
      @ax_el1 elementOf ?x ?A
      @ax_el2 subsetOf ?A ?B
      @ax_cond2 And $ax_el1 $ax_el2
      @ax_elprop implies $ax_cond2 (elementOf ?x ?B)

      # Concrete set hierarchy
      subsetOf SetA SetB
      subsetOf SetB SetC
      subsetOf SetC SetD
      subsetOf SetD Universe

      # Elements
      elementOf x SetA
      elementOf y SetB
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: Deep subset transitivity (SetA -> SetD) ===
  {
    action: 'prove',
    input_nl: 'Is SetA a subset of SetD?',
    input_dsl: '@goal subsetOf SetA SetD',
    expected_nl: 'True: SetA is a subsetOf SetD. Proof: Applied rule: subset transitivity. SetA subsetOf SetB. SetB subsetOf SetC. SetC subsetOf SetD. Transitive chain verified (3 hops). Therefore SetA subsetOf SetD.'
  },

  // === PROVE: Element propagation (x ∈ SetA -> x ∈ SetC) ===
  {
    action: 'prove',
    input_nl: 'Does x belong to SetC?',
    input_dsl: '@goal elementOf x SetC',
    expected_nl: 'True: x elementOf SetC. Proof: Applied rule: element propagation. x elementOf SetA. SetA subsetOf SetB. SetB subsetOf SetC. Transitive chain verified (2 hops). Therefore x elementOf SetC.'
  },

  // === PROVE: Element propagation to Universe ===
  {
    action: 'prove',
    input_nl: 'Is y in Universe via subset chain?',
    input_dsl: '@goal elementOf y Universe',
    expected_nl: 'True: y elementOf Universe. Proof: Applied rule: element propagation. y elementOf SetB. SetB subsetOf SetC. SetC subsetOf SetD. SetD subsetOf Universe. Transitive chain verified (3 hops). Therefore y elementOf Universe.'
  },

  // === QUERY: What sets contain x (via propagation)? ===
  {
    action: 'query',
    input_nl: 'List all sets that contain x.',
    input_dsl: '@q elementOf x ?set',
    expected_nl: 'Answer: SetA. SetB. SetC. SetD. Universe. Proof: x elementOf SetA; subset transitivity propagates membership through SetB, SetC, SetD, Universe.'
  },

  // === NEGATIVE: Element not in unrelated set (blocked) ===
  {
    action: 'prove',
    input_nl: 'Is x in SetZ (unrelated)?',
    input_dsl: '@goal elementOf x SetZ',
    expected_nl: 'Cannot prove: x elementOf SetZ. Search: x elementOf SetA. Propagation requires subsetOf SetA SetZ; no such chain found. No path to SetZ.'
  },

  // === SETUP 2: Equality via mutual subset and intersection construction ===
  {
    action: 'learn',
    input_nl: 'Add equality axiom (mutual subset → equal) and intersection helper.',
    input_dsl: `
      @eq1 subsetOf ?X ?Y
      @eq2 subsetOf ?Y ?X
      @eqCond And $eq1 $eq2
      @eqRule implies $eqCond (equal ?X ?Y)

      @int1 elementOf ?x SetA
      @int2 elementOf ?x SetB
      @intCond And $int1 $int2
      @intRule implies $intCond (elementOf ?x IntersectAB)
      subsetOf IntersectAB SetA
      subsetOf IntersectAB SetB

      subsetOf Alpha Beta
      subsetOf Beta Alpha
      elementOf z Alpha
      elementOf x SetB
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: Equality from mutual subset ===
  {
    action: 'prove',
    input_nl: 'Are Alpha and Beta equal sets?',
    input_dsl: '@goal equal Alpha Beta',
    expected_nl: 'True: equal Alpha Beta. Proof: Alpha subsetOf Beta. Beta subsetOf Alpha. And condition satisfied; rule implies equal Alpha Beta.'
  },

  // === PROVE: Element propagation through intersection ===
  {
    action: 'prove',
    input_nl: 'Is x in the intersection of SetA and SetB?',
    input_dsl: '@goal elementOf x IntersectAB',
    expected_nl: 'True: x elementOf IntersectAB. Proof: x elementOf SetA. x elementOf SetB. And condition satisfied; rule implies x elementOf IntersectAB.'
  }
];

export default { name, description, theories, steps };
