/**
 * Suite 12 - Fuzzy Matching & Anonymous Concepts
 *
 * Tests approximate matching capabilities:
 * - Typo tolerance: "Dogg" should match "Dog"
 * - Synonym handling: "Canine" relates to "Dog"
 * - Anonymous concepts: vectors without string names
 * - Induced concepts: concepts discovered through reasoning
 *
 * This suite explores HDC's potential for approximate/fuzzy matching,
 * which is particularly relevant for:
 * - Natural language processing with typos
 * - Concept discovery and induction
 * - Working with embeddings that lack symbolic names
 */

export const name = 'Fuzzy Matching';
export const description = 'Approximate matching, synonyms, and anonymous concepts';

export const theories = ['05-logic.sys2'];

// Custom flag to indicate this suite tests experimental features
export const experimental = true;

export const steps = [
  // ============================================================
  // PART 1: SYNONYM HANDLING
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Define synonyms and basic facts',
    input_dsl: `
      isA Rex Dog
      isA Dog Animal
      isA Fido Dog
      synonym Dog Canine
      synonym Cat Feline
      isA Mittens Cat
    `,
    expected_nl: 'Learned'
  },

  // Test: Query using synonym
  {
    action: 'prove',
    input_nl: 'Is Rex a Canine? (using synonym Dog=Canine)',
    input_dsl: '@goal isA Rex Canine',
    expected_nl: 'True: Rex is a Canine',
    tags: ['synonym', 'fuzzy']
  },

  // Test: Transitive through synonym
  {
    action: 'prove',
    input_nl: 'Is Fido an Animal? (Dog->Animal, should work normally)',
    input_dsl: '@goal isA Fido Animal',
    expected_nl: 'True: Fido is an Animal'
  },

  // ============================================================
  // PART 2: APPROXIMATE MATCHING (Component Similarity)
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Facts with similar but not identical concepts',
    input_dsl: `
      likes Alice Bob
      likes Bob Carol
      likes Carol Dave
      trusts Alice Bob
    `,
    expected_nl: 'Learned 4 facts'
  },

  // Test: Find similar relationships
  {
    action: 'query',
    input_nl: 'Who does Alice have a relationship with? (likes or trusts)',
    input_dsl: '@q1 likes Alice ?X',
    expected_nl: 'Alice likes Bob',
    tags: ['component-match']
  },

  // ============================================================
  // PART 3: ANONYMOUS CONCEPTS (No String Names)
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Create an anonymous concept via bundling',
    input_dsl: `
      isA Sparrow Bird
      isA Robin Bird
      isA Eagle Bird
      can Sparrow Fly
      can Robin Fly
      can Eagle Fly
      @birdPattern bundle [Sparrow, Robin, Eagle]
    `,
    expected_nl: 'Learned',
    tags: ['anonymous', 'bundle']
  },

  // Test: Query using anonymous pattern (bundle of birds)
  {
    action: 'query',
    input_nl: 'What can the bird pattern do? (should find Fly)',
    input_dsl: '@q2 can $birdPattern ?ability',
    expected_nl: 'can',
    tags: ['anonymous', 'approximate']
  },

  // ============================================================
  // PART 4: INDUCED CONCEPTS
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Setup for induction: multiple examples',
    input_dsl: `
      has Mammal1 Fur
      has Mammal1 WarmBlood
      feeds Mammal1 Milk
      has Mammal2 Fur
      has Mammal2 WarmBlood
      feeds Mammal2 Milk
      has Mammal3 Fur
      has Mammal3 WarmBlood
      feeds Mammal3 Milk
    `,
    expected_nl: 'Learned'
  },

  // Test: Induce common pattern - finds shared properties
  {
    action: 'query',
    input_nl: 'What do all mammals have in common?',
    input_dsl: `
      @mammalPattern induce [Mammal1, Mammal2, Mammal3]
      @q3 has $mammalPattern ?property
    `,
    expected_nl: 'has',
    tags: ['induction', 'anonymous']
  },

  // ============================================================
  // PART 5: HDC SIMILARITY RANKING
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Similar concepts for ranking test',
    input_dsl: `
      isA Vehicle Transport
      isA Car Vehicle
      isA Truck Vehicle
      isA Bicycle Vehicle
      has Car Wheels
      has Car Engine
      has Truck Wheels
      has Truck Engine
      has Bicycle Wheels
    `,
    expected_nl: 'Learned'
  },

  // Test: Find most similar to Car based on shared properties
  {
    action: 'query',
    input_nl: 'What is most similar to Car? (should rank Truck > Bicycle)',
    input_dsl: '@q4 similar Car ?X',
    expected_nl: 'Car similars Truck',
    tags: ['similarity-ranking', 'hdc']
  },

  // ============================================================
  // PART 6: COMPONENT-BASED TRANSITIVE (HDC-native)
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Chain for component-based search',
    input_dsl: `
      locatedIn Paris France
      locatedIn France Europe
      locatedIn Europe Earth
      locatedIn Berlin Germany
      locatedIn Germany Europe
    `,
    expected_nl: 'Learned 5 facts'
  },

  // Test: Should find via component matching, not just metadata
  {
    action: 'prove',
    input_nl: 'Is Paris on Earth? (3-step chain via component HDC)',
    input_dsl: '@goal locatedIn Paris Earth',
    expected_nl: 'True: Paris is in Earth',
    tags: ['component-hdc', 'transitive']
  },

  // Test: Multiple paths
  {
    action: 'query',
    input_nl: 'What is in Europe? (should find France, Germany via component index)',
    input_dsl: '@q5 locatedIn ?X Europe',
    expected_nl: 'France is in Europe',
    tags: ['component-index', 'multi-result']
  }
];
