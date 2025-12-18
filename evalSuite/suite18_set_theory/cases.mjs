/**
 * Suite 18 - Axiomatic Set Theory (fragment)
 *
 * Encodes subset transitivity and element propagation with multi-step proofs.
 * Uses correct DS02 syntax: And conditions built with @var references, not parentheses.
 */

export const name = 'Axiomatic Set Theory';
export const description = 'Subset transitivity and element propagation with multi-step proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Axioms as rules + concrete sets ===
  {
    action: 'learn',
    input_nl: 'Define subset transitivity and element propagation axioms with concrete sets.',
    input_dsl: `
      # Axiom: subset transitivity (A ⊆ B ∧ B ⊆ C → A ⊆ C)
      @ax_sub1 subsetOf ?A ?B
      @ax_sub2 subsetOf ?B ?C
      @ax_cond And $ax_sub1 $ax_sub2
      @ax_conseq subsetOf ?A ?C
      implies $ax_cond $ax_conseq

      # Axiom: element propagation (x ∈ A ∧ A ⊆ B → x ∈ B)
      @ax_el1 elementOf ?x ?A
      @ax_el2 subsetOf ?A ?B
      @ax_cond2 And $ax_el1 $ax_el2
      @ax_conseq2 elementOf ?x ?B
      implies $ax_cond2 $ax_conseq2

      # Concrete set hierarchy
      subsetOf SetA SetB
      subsetOf SetB SetC
      subsetOf SetC SetD
      subsetOf SetD Universe

      # Elements
      elementOf x SetA
      elementOf y SetB
    `,
    expected_nl: 'Learned 16 facts'
  },

  // === PROVE: Deep subset transitivity (SetA -> SetD) ===
  {
    action: 'prove',
    input_nl: 'Is SetA a subset of SetD?',
    input_dsl: '@goal subsetOf SetA SetD',
    expected_nl: 'True: SetA subsetOf SetD. Proof: subsetOf SetA SetB. subsetOf SetB SetC. And satisfied. Rule implies subsetOf SetA SetC. subsetOf SetC SetD. And satisfied. Rule implies subsetOf SetA SetD.'
  },

  // === PROVE: Element propagation (x ∈ SetA -> x ∈ SetC) ===
  {
    action: 'prove',
    input_nl: 'Does x belong to SetC?',
    input_dsl: '@goal elementOf x SetC',
    expected_nl: 'True: x elementOf SetC. Proof: elementOf x SetA. subsetOf SetA SetB. And satisfied. Rule implies elementOf x SetB. subsetOf SetB SetC. And satisfied. Rule implies elementOf x SetC.'
  },

  // === PROVE: Element propagation to Universe ===
  {
    action: 'prove',
    input_nl: 'Is y in Universe via subset chain?',
    input_dsl: '@goal elementOf y Universe',
    expected_nl: 'True: y elementOf Universe. Proof: elementOf y SetB. subsetOf SetB SetC. And satisfied. elementOf y SetC. subsetOf SetC SetD. And satisfied. elementOf y SetD. subsetOf SetD Universe. And satisfied. elementOf y Universe.'
  },

  // === QUERY: What sets contain x? ===
  {
    action: 'query',
    input_nl: 'List all sets that contain x.',
    input_dsl: '@q elementOf x ?set',
    expected_nl: 'x elementOf SetA. x elementOf SetB. x elementOf SetC. x elementOf SetD. x elementOf Universe. Proof: Direct fact and propagation via subsetOf chain.'
  },

  // === NEGATIVE: Element not in unrelated set ===
  {
    action: 'prove',
    input_nl: 'Is x in SetZ (unrelated)?',
    input_dsl: '@goal elementOf x SetZ',
    expected_nl: 'Cannot prove: x elementOf SetZ. Search: No subsetOf path from SetA to SetZ. No propagation possible.'
  },

  // === SETUP 2: Equality axiom and intersection ===
  {
    action: 'learn',
    input_nl: 'Add equality axiom (mutual subset implies equal) and intersection rule.',
    input_dsl: `
      # Equality axiom: A ⊆ B ∧ B ⊆ A → A = B
      @eq1 subsetOf ?X ?Y
      @eq2 subsetOf ?Y ?X
      @eqCond And $eq1 $eq2
      @eqConseq equal ?X ?Y
      implies $eqCond $eqConseq

      # Intersection rule: x ∈ A ∧ x ∈ B → x ∈ A∩B
      @int1 elementOf ?x SetA
      @int2 elementOf ?x SetB
      @intCond And $int1 $int2
      @intConseq elementOf ?x IntersectAB
      implies $intCond $intConseq

      # IntersectAB is subset of both
      subsetOf IntersectAB SetA
      subsetOf IntersectAB SetB

      # Equal sets (mutual subset)
      subsetOf Alpha Beta
      subsetOf Beta Alpha

      # Elements
      elementOf z Alpha
    `,
    expected_nl: 'Learned 15 facts'
  },

  // === PROVE: Equality from mutual subset ===
  {
    action: 'prove',
    input_nl: 'Are Alpha and Beta equal sets?',
    input_dsl: '@goal equal Alpha Beta',
    expected_nl: 'True: equal Alpha Beta. Proof: subsetOf Alpha Beta. subsetOf Beta Alpha. And condition satisfied. Rule implies equal Alpha Beta.'
  },

  // === PROVE: x is in intersection (x already in SetA and SetB via propagation) ===
  {
    action: 'prove',
    input_nl: 'Is x in the intersection of SetA and SetB?',
    input_dsl: '@goal elementOf x IntersectAB',
    expected_nl: 'True: x elementOf IntersectAB. Proof: elementOf x SetA. elementOf x SetB. And condition satisfied. Rule implies elementOf x IntersectAB.'
  }
];

export default { name, description, theories, steps };
