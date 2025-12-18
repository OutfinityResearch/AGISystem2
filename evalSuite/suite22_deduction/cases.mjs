/**
 * Suite 22 - Deduction Operator
 *
 * Forward-chaining deduction through causal, isA, and rule chains.
 * Tests complex theories with implies rules and composite filters.
 * Requires meaningful proof chains (min 10 chars).
 */

export const name = 'Deduction';
export const description = 'Forward-chaining deduction through complex theories and rule chains';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Complex Economic Theory with Rules ===
  {
    action: 'learn',
    input_nl: 'Economic theory with causal chains and inference rules',
    input_dsl: `
      # Causal chain
      causes Inflation HigherPrices
      causes HigherPrices ReducedSpending
      causes ReducedSpending Recession
      causes Recession Unemployment

      # Type hierarchy
      isA Inflation EconomicPhenomenon
      isA Recession EconomicPhenomenon
      isA Unemployment SocialProblem

      # Rule: economic phenomenon leading to social problem triggers policy
      @c1 causes ?X SocialProblem
      @c2 isA ?X EconomicPhenomenon
      @conj And $c1 $c2
      @conseq triggers ?X PolicyResponse
      implies $conj $conseq
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === DEDUCE: Follow causal chain from Inflation ===
  {
    action: 'query',
    input_nl: 'What effects follow from Inflation through the causal chain?',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce Inflation $filter ?result 4 5
    `,
    expected_nl: 'From Inflation, deduce causes HigherPrices ReducedSpending. Proof: Inflation via causes via ReducedSpending'
  },

  // === SETUP: Climate Impact Theory ===
  {
    action: 'learn',
    input_nl: 'Climate theory with cascading effects and location impacts',
    input_dsl: `
      # Emission chain
      causes CO2Emission GlobalWarming
      causes GlobalWarming IceMelt
      causes IceMelt SeaLevelRise
      causes SeaLevelRise CoastalFlooding
      causes CoastalFlooding Displacement

      # Location facts
      locatedAt Miami Coast
      locatedAt Amsterdam Coast
      locatedAt Denver Inland

      # Rule: flooding at coast threatens coastal cities
      @fc1 causes ?X CoastalFlooding
      @fc2 locatedAt ?City Coast
      @fcConj And $fc1 $fc2
      @fcConseq threatens ?X ?City
      implies $fcConj $fcConseq
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === DEDUCE: Follow emission impact chain ===
  {
    action: 'query',
    input_nl: 'What does CO2 emission cause through the climate chain?',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce CO2Emission $filter ?result 5 5
    `,
    expected_nl: 'From CO2Emission, deduce causes GlobalWarming IceMelt. Proof: CO2Emission via causes via IceMelt'
  },

  // === SETUP: Biological Classification Theory ===
  {
    action: 'learn',
    input_nl: 'Biology taxonomy with inheritance rules',
    input_dsl: `
      # Taxonomy
      isA Dog Mammal
      isA Cat Mammal
      isA Whale Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing

      # Properties
      has Mammal WarmBlood
      has Vertebrate Spine
      has Animal Metabolism

      # Rule: mammals have fur by default
      @mam isA ?X Mammal
      @fur has ?X Fur
      implies $mam $fur
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === DEDUCE: Follow isA hierarchy from Dog ===
  {
    action: 'query',
    input_nl: 'What type categories include Dog transitively?',
    input_dsl: `
      @filter isA ?X ?Y
      @q deduce Dog $filter ?result 4 5
    `,
    expected_nl: 'From Dog, deduce isA Dog Vertebrate. Proof: Dog via isA via Vertebrate'
  },

  // === SETUP: Disease Transmission Theory ===
  {
    action: 'learn',
    input_nl: 'Medical theory with disease progression and treatment',
    input_dsl: `
      # Disease chain
      causes Virus Infection
      causes Infection Inflammation
      causes Inflammation Symptoms
      causes Symptoms Diagnosis
      causes Diagnosis Treatment

      # Types
      isA Virus Pathogen
      isA Bacteria Pathogen
      isA Infection MedicalCondition

      # Rule: pathogen causing infection requires quarantine
      @path isA ?X Pathogen
      @inf causes ?X Infection
      @pathConj And $path $inf
      @quar requires ?X Quarantine
      implies $pathConj $quar
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === DEDUCE: Follow disease progression ===
  {
    action: 'query',
    input_nl: 'What does a Virus cause through the medical chain?',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce Virus $filter ?result 5 5
    `,
    expected_nl: 'From Virus, deduce causes Infection Inflammation. Proof: Virus via causes via Infection via causes via Inflammation'
  },

  // === SETUP: Supply Chain Theory ===
  {
    action: 'learn',
    input_nl: 'Supply chain with production and delivery stages',
    input_dsl: `
      # Production chain
      causes RawMaterial Production
      causes Production Assembly
      causes Assembly QualityCheck
      causes QualityCheck Packaging
      causes Packaging Shipping
      causes Shipping Delivery

      # Temporal ordering
      before RawMaterial Production
      before Production Assembly
      before Assembly QualityCheck
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === DEDUCE: Limited depth test ===
  {
    action: 'query',
    input_nl: 'What follows from RawMaterial with limited depth?',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce RawMaterial $filter ?result 2 3
    `,
    expected_nl: 'From RawMaterial, deduce causes Production Assembly. Proof: RawMaterial via causes via Production via causes via Assembly'
  }
];

export default { name, description, theories, steps };
