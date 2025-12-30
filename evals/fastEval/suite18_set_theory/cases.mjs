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
    input_nl: 'implies (?A subsetOf ?B) AND (?B subsetOf ?C) ?A subsetOf ?C. implies (?x elementOf ?A) AND (?A subsetOf ?B) ?x elementOf ?B. SetA subsetOf SetB. SetB subsetOf SetC. SetC subsetOf SetD. SetD subsetOf Universe. x elementOf SetA. y elementOf SetB.',
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
    input_nl: 'SetA subsetOf SetD.',
    input_dsl: '@goal subsetOf SetA SetD',
    expected_nl: 'True: SetA subsetOf SetD.',
    proof_nl: [
      'SetA subsetOf SetB',
      'SetB subsetOf SetC',
      'SetC subsetOf SetD',
      'Therefore SetA subsetOf SetD'
    ]
  },

  // === PROVE: Element propagation (x ∈ SetA -> x ∈ SetC) ===
  {
    action: 'prove',
    input_nl: 'x elementOf SetC.',
    input_dsl: '@goal elementOf x SetC',
    expected_nl: 'True: x elementOf SetC.',
    proof_nl: [
      'x elementOf SetA',
      'SetA subsetOf SetC',
      'And condition satisfied: x elementOf SetA, SetA subsetOf SetC',
      'Applied rule: IF ((x elementOf SetA) AND (SetA subsetOf SetC)) THEN (x elementOf SetC)',
      'Therefore x elementOf SetC'
    ]
  },

  // === PROVE: Element propagation to Universe ===
  {
    action: 'prove',
    input_nl: 'y elementOf Universe.',
    input_dsl: '@goal elementOf y Universe',
    expected_nl: 'True: y elementOf Universe.',
    proof_nl: [
      'y elementOf SetB',
      'SetB subsetOf Universe',
      'And condition satisfied: y elementOf SetB, SetB subsetOf Universe',
      'Applied rule: IF ((y elementOf SetB) AND (SetB subsetOf Universe)) THEN (y elementOf Universe)',
      'Therefore y elementOf Universe'
    ]
  },

  // === QUERY: What sets contain x? ===
  {
    action: 'query',
    input_nl: 'x elementOf ?set.',
    input_dsl: '@q elementOf x ?set',
    expected_nl: [
      'x elementOf SetA.',
      'x elementOf SetB.',
      'x elementOf SetC.',
      'x elementOf SetD.',
      'x elementOf Universe.'
    ],
    proof_nl: [
      'Fact in KB: x elementOf SetA',
      'Therefore x elementOf SetB',
      'Therefore x elementOf SetC',
      'Therefore x elementOf SetD',
      'Therefore x elementOf Universe'
    ]
  },

  // === NEGATIVE: Element not in unrelated set ===
  {
    action: 'prove',
    input_nl: 'x elementOf SetZ.',
    input_dsl: '@goal elementOf x SetZ',
    expected_nl: 'Cannot prove: x elementOf SetZ.',
    proof_nl: [
      'No proof found for x elementOf SetZ',
      'No proof found'
    ]
  },

  // === SETUP 2: Equality axiom and intersection ===
  {
    action: 'learn',
    input_nl: 'implies (?X subsetOf ?Y) AND (?Y subsetOf ?X) ?X equal ?Y. implies (?x elementOf SetA) AND (?x elementOf SetB) ?x elementOf IntersectAB. IntersectAB subsetOf SetA. IntersectAB subsetOf SetB. Alpha subsetOf Beta. Beta subsetOf Alpha. z elementOf Alpha.',
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
    input_nl: 'Alpha equal Beta.',
    input_dsl: '@goal equal Alpha Beta',
    expected_nl: 'True: Alpha equals Beta.',
    proof_nl: [
      'Alpha subsetOf Beta',
      'Beta subsetOf Alpha',
      'Applied rule: IF ((Alpha subsetOf Beta) AND (Beta subsetOf Alpha)) THEN (Alpha equals Beta)',
      'Therefore Alpha equals Beta'
    ]
  },

  // === PROVE: x is in intersection (x already in SetA and SetB via propagation) ===
  {
    action: 'prove',
    input_nl: 'x elementOf IntersectAB.',
    input_dsl: '@goal elementOf x IntersectAB',
    expected_nl: 'True: x elementOf IntersectAB.',
    proof_nl: [
      'x elementOf SetA',
      'x elementOf SetB',
      'Applied rule: IF ((x elementOf SetA) AND (x elementOf SetB)) THEN (x elementOf IntersectAB)',
      'Therefore x elementOf IntersectAB'
    ]
  }
];

export default { name, description, theories, steps };
