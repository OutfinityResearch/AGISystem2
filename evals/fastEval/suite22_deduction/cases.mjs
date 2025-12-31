/**
 * Suite 22 - Deduction Operator
 *
 * Forward-chaining deduction through causal, isA, and rule chains.
 * Tests complex theories with implies rules and composite filters.
 * Requires meaningful proof chains (min 10 chars).
 */

export const name = 'Deduction';
export const description = 'Forward-chaining deduction through complex theories and rule chains';

export const theories = ['05-logic.sys2', 'Biology/01-relations.sys2'];

export const steps = [
  // === SETUP: Complex Economic Theory with Rules ===
  {
    action: 'learn',
    input_nl: 'Inflation causes HigherPrices. HigherPrices causes ReducedSpending. ReducedSpending causes Recession. Recession causes Unemployment. Inflation is an EconomicPhenomenon. Recession is an EconomicPhenomenon. Unemployment is a SocialProblem. implies (?X causes SocialProblem) AND (?X is an EconomicPhenomenon) ?X triggers PolicyResponse.',
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
    input_nl: 'deduce Inflation ?X causes ?Y ?result 4 5.',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce Inflation $filter ?result 4 5
    `,
    expected_nl: [
      'From Inflation, deduce causes HigherPrices ReducedSpending.'
    ],
    proof_nl: [
      'Inflation via causes via ReducedSpending'
    ]
  },

  // === SETUP: Climate Impact Theory ===
  {
    action: 'learn',
    input_nl: 'CO2Emission causes GlobalWarming. GlobalWarming causes IceMelt. IceMelt causes SeaLevelRise. SeaLevelRise causes CoastalFlooding. CoastalFlooding causes Displacement. Miami locatedAt Coast. Amsterdam locatedAt Coast. Denver locatedAt Inland. implies (?X causes CoastalFlooding) AND (?City locatedAt Coast) ?X threatens ?City.',
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
    input_nl: 'deduce CO2Emission ?X causes ?Y ?result 5 5.',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce CO2Emission $filter ?result 5 5
    `,
    expected_nl: [
      'From CO2Emission, deduce causes GlobalWarming IceMelt.'
    ],
    proof_nl: [
      'CO2Emission via causes via IceMelt'
    ]
  },

  // === SETUP: Biological Classification Theory ===
  {
    action: 'learn',
    input_nl: 'Dog is a Mammal. Cat is a Mammal. Whale is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is a LivingThing. Mammal has WarmBlood. Vertebrate has Spine. Animal has Metabolism. implies (?X is a Mammal) ?X has Fur.',
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
    input_nl: 'deduce Dog ?X is a ?Y ?result 4 5.',
    input_dsl: `
      @filter isA ?X ?Y
      @q deduce Dog $filter ?result 4 5
    `,
    expected_nl: [
      'From Dog, deduce isA Dog Vertebrate.'
    ],
    proof_nl: [
      'Dog via isA via Vertebrate'
    ]
  },

  // === SETUP: Disease Transmission Theory ===
  {
    action: 'learn',
    input_nl: 'Virus causes Infection. Infection causes Inflammation. Inflammation causes Symptoms. Symptoms causes Diagnosis. Diagnosis causes Treatment. Virus is a Pathogen. Bacteria is a Pathogen. Infection is a MedicalCondition. implies (?X is a Pathogen) AND (?X causes Infection) ?X requires Quarantine.',
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
    input_nl: 'deduce Virus ?X causes ?Y ?result 5 5.',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce Virus $filter ?result 5 5
    `,
    expected_nl: [
      'From Virus, deduce causes Infection Inflammation.',
      'From Virus, deduce causes Inflammation Symptoms.',
      'From Virus, deduce causes Symptoms Diagnosis.',
      'From Virus, deduce causes Diagnosis Treatment.'
    ],
    proof_nl: [
      'Virus via causes via Inflammation',
      'Virus via causes via Inflammation via causes via Symptoms',
      'Virus via causes via Inflammation via causes via Symptoms via causes via Diagnosis',
      'Virus via causes via Inflammation via causes via Symptoms via causes via Diagnosis via causes via Treatment'
    ]
  },

  // === SETUP: Supply Chain Theory ===
  {
    action: 'learn',
    input_nl: 'RawMaterial causes Production. Production causes Assembly. Assembly causes QualityCheck. QualityCheck causes Packaging. Packaging causes Shipping. Shipping causes Delivery. RawMaterial before Production. Production before Assembly. Assembly before QualityCheck.',
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
    input_nl: 'deduce RawMaterial ?X causes ?Y ?result 2 3.',
    input_dsl: `
      @filter causes ?X ?Y
      @q deduce RawMaterial $filter ?result 2 3
    `,
    expected_nl: [
      'From RawMaterial, deduce causes Production Assembly.',
      'From RawMaterial, deduce causes Assembly QualityCheck.'
    ],
    proof_nl: [
      'RawMaterial via causes via Assembly',
      'RawMaterial via causes via Assembly via causes via QualityCheck'
    ]
  }
];

export default { name, description, theories, steps };
