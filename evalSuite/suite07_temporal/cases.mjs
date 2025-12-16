/**
 * Suite 07 - Temporal & Causal Reasoning
 *
 * before/causes transitive chains, prevention rules, indirect causation.
 * Tests: temporal transitivity, causal chains, derived prevention.
 */

export const name = 'Temporal & Causal';
export const description = 'Temporal and causal transitive with prevention rules';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Historical timeline (6 steps) ===
  {
    action: 'learn',
    input_nl: 'Historical: WW1->Treaty->Depression->WW2->ColdWar->Collapse->EU',
    input_dsl: `
      before WW1 TreatyOfVersailles
      before TreatyOfVersailles GreatDepression
      before GreatDepression WW2
      before WW2 ColdWar
      before ColdWar SovietCollapse
      before SovietCollapse EuropeanUnion
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PROVE: 6-step temporal (WW1->EU) ===
  {
    action: 'prove',
    input_nl: 'Was WW1 before the European Union?',
    input_dsl: '@goal before WW1 EuropeanUnion',
    expected_nl: 'True: WW1 is before EuropeanUnion. Proof: WW1 is before TreatyOfVersailles. TreatyOfVersailles is before GreatDepression. GreatDepression is before WW2. WW2 is before ColdWar. ColdWar is before SovietCollapse. SovietCollapse is before EuropeanUnion.'
  },

  // === PROVE: 4-step temporal (Depression->Collapse) ===
  {
    action: 'prove',
    input_nl: 'Was the Great Depression before Soviet Collapse?',
    input_dsl: '@goal before GreatDepression SovietCollapse',
    expected_nl: 'True: GreatDepression is before SovietCollapse. Proof: GreatDepression is before WW2. WW2 is before ColdWar. ColdWar is before SovietCollapse.'
  },

  // === SETUP: Causal chain + indirect causation rule ===
  {
    action: 'learn',
    input_nl: 'Causal: Deforestation->Erosion->Flooding->Displacement. Indirect causation rule.',
    input_dsl: `
      causes Deforestation Erosion
      causes Erosion Flooding
      causes Flooding Displacement
      causes Displacement Poverty
      @causeAB causes ?a ?b
      @causeBC causes ?b ?c
      @causeAnd And $causeAB $causeBC
      @indirectConc indirectlyCauses ?a ?c
      Implies $causeAnd $indirectConc
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === PROVE: 4-step causal (Deforestation->Poverty) ===
  {
    action: 'prove',
    input_nl: 'Does Deforestation cause Poverty?',
    input_dsl: '@goal causes Deforestation Poverty',
    expected_nl: 'True: Deforestation causes Poverty. Proof: Deforestation causes Erosion. Erosion causes Flooding. Flooding causes Displacement. Displacement causes Poverty.'
  },

  // === PROVE: Indirect causation via rule ===
  {
    action: 'prove',
    input_nl: 'Does Deforestation indirectly cause Flooding?',
    input_dsl: '@goal indirectlyCauses Deforestation Flooding',
    expected_nl: 'True: Deforestation indirectly causes Flooding'
  },

  // === SETUP: Prevention rule ===
  {
    action: 'learn',
    input_nl: 'Rule: If X causes Y and Y causes Z, preventing X would prevent Z.',
    input_dsl: `
      @prevAB causes ?a ?b
      @prevBC causes ?b ?c
      @prevAnd And $prevAB $prevBC
      @prevConc wouldPrevent ?a ?c
      Implies $prevAnd $prevConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PROVE: Prevention reasoning ===
  {
    action: 'prove',
    input_nl: 'Would preventing Deforestation prevent Flooding?',
    input_dsl: '@goal wouldPrevent Deforestation Flooding',
    expected_nl: 'True: Preventing Deforestation would prevent Flooding'
  },

  // === PROVE: Deeper prevention ===
  {
    action: 'prove',
    input_nl: 'Would preventing Erosion prevent Displacement?',
    input_dsl: '@goal wouldPrevent Erosion Displacement',
    expected_nl: 'True: Preventing Erosion would prevent Displacement'
  },

  // === QUERY: What causes what ===
  {
    action: 'query',
    input_nl: 'What does Deforestation cause?',
    input_dsl: '@q causes Deforestation ?effect',
    expected_nl: 'Deforestation causes Erosion.'
  },

  // === NEGATIVE: Reverse causation fails ===
  {
    action: 'prove',
    input_nl: 'Does Poverty cause Deforestation?',
    input_dsl: '@goal causes Poverty Deforestation',
    expected_nl: 'Cannot prove: Poverty causes Deforestation'
  }
];

export default { name, description, theories, steps };
