/**
 * Suite 18 - Axiomatic Set Theory (fragment)
 *
 * Encodes subset transitivity and element propagation with multi-step proofs.
 * Uses correct DS02 syntax: And conditions built with @var references, not parentheses.
 */

export const name = 'Axiomatic Set Theory';
export const description = 'Subset transitivity and element propagation with multi-step proofs';

export const theories = ['05-logic.sys2', 'Math/01-relations.sys2'];

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
    expected_nl: 'True: SetA subsetOf SetD.',
    proof_nl: 'Applied rule: implies @ax_cond @ax_conseq. Applied rule: rule implies subsetOf SetB SetD. SetB subsetOf SetC. SetC subsetOf SetD. And condition satisfied: subsetOf SetB SetC, subsetOf SetC SetD. SetA subsetOf SetB. SetB subsetOf SetD. And condition satisfied: subsetOf SetA SetB, subsetOf SetB SetD. Therefore SetA subsetOf SetD.'
  },

  // === PROVE: Element propagation (x ∈ SetA -> x ∈ SetC) ===
  {
    action: 'prove',
    input_nl: 'Does x belong to SetC?',
    input_dsl: '@goal elementOf x SetC',
    expected_nl: 'True: x elementOf SetC.',
    proof_nl: 'Applied rule: implies @ax_cond2 @ax_conseq2. Applied rule: rule implies subsetOf SetA SetC. SetA subsetOf SetB. SetB subsetOf SetC. And condition satisfied: subsetOf SetA SetB, subsetOf SetB SetC. x elementOf SetA. SetA subsetOf SetC. And condition satisfied: elementOf x SetA, subsetOf SetA SetC. Therefore x elementOf SetC.'
  },

  // === PROVE: Element propagation to Universe ===
  {
    action: 'prove',
    input_nl: 'Is y in Universe via subset chain?',
    input_dsl: '@goal elementOf y Universe',
    expected_nl: 'True: y elementOf Universe.',
    proof_nl: 'Applied rule: implies @ax_cond2 @ax_conseq2. Applied rule: rule implies subsetOf SetB Universe. Applied rule: rule implies subsetOf SetC Universe. SetC subsetOf SetD. SetD subsetOf Universe. And condition satisfied: subsetOf SetC SetD, subsetOf SetD Universe. SetB subsetOf SetC. SetC subsetOf Universe. And condition satisfied: subsetOf SetB SetC, subsetOf SetC Universe. y elementOf SetB. SetB subsetOf Universe. And condition satisfied: elementOf y SetB, subsetOf SetB Universe. Therefore y elementOf Universe.'
  },

  // === QUERY: What sets contain x? ===
  {
    action: 'query',
    input_nl: 'List all sets that contain x.',
    input_dsl: '@q elementOf x ?set',
    expected_nl: [
      'x elementOf SetA.',
      'x elementOf SetB.',
      'x elementOf SetC.',
      'x elementOf SetD.',
      'x elementOf Universe.'
    ],
    proof_nl: [
      'elementOf x SetA',
      'elementOf x SetA. subsetOf SetA SetB. Applied rule: implies @ax_cond2 @ax_conseq2',
      'elementOf x SetA. subsetOf SetA SetB. subsetOf SetB SetC',
      'elementOf x SetA. subsetOf SetA SetB. subsetOf SetB SetC. subsetOf SetC SetD',
      'elementOf x SetA. subsetOf SetA SetB. subsetOf SetB SetC. subsetOf SetC SetD. subsetOf SetD Universe'
    ]
  },

  // === NEGATIVE: Element not in unrelated set ===
  {
    action: 'prove',
    input_nl: 'Is x in SetZ (unrelated)?',
    input_dsl: '@goal elementOf x SetZ',
    expected_nl: 'Cannot prove: x elementOf SetZ.',
    proof_nl: 'Search: Checked rule: implies @ax_cond2 @ax_conseq2. Missing: elementOf x ?A, subsetOf ?A ?B.'
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
    expected_nl: 'True: Alpha equals Beta.',
    proof_nl: 'Applied rule: implies @eqCond @eqConseq. Alpha subsetOf Beta. Beta subsetOf Alpha. And condition satisfied: subsetOf Alpha Beta, subsetOf Beta Alpha. Therefore Alpha equals Beta.'
  },

  // === PROVE: x is in intersection (x already in SetA and SetB via propagation) ===
  {
    action: 'prove',
    input_nl: 'Is x in the intersection of SetA and SetB?',
    input_dsl: '@goal elementOf x IntersectAB',
    expected_nl: 'True: x elementOf IntersectAB.',
    proof_nl: 'Applied rule: implies @intCond @intConseq. Applied rule: rule implies elementOf x SetB. x elementOf SetA. SetA subsetOf SetB. And condition satisfied: elementOf x SetA, subsetOf SetA SetB. x elementOf SetB. And condition satisfied: elementOf x SetA, elementOf x SetB. Therefore x elementOf IntersectAB.'
  }
];

export default { name, description, theories, steps };
