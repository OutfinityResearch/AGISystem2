/**
 * Cross-Domain Semantic Query Evaluation Suite
 *
 * Advanced semantic reasoning queries testing:
 * - Hierarchical transitive inference across deep taxonomies
 * - Cross-domain analogical reasoning
 * - Abductive/inductive/deductive reasoning
 * - Semantic similarity and conceptual clustering
 * - Multi-result pattern matching with complex constraints
 * - Property inheritance through deep class hierarchies
 */

export const name = 'Cross-Domain Advanced Semantic Queries';
export const description = 'Testing advanced semantic reasoning capabilities across loaded theories';

// Load ALL theories
export const theories = [
  // Core reasoning theories
  'Core/00-relations.sys2',
  'Core/00-types.sys2',
  'Core/01-positions.sys2',
  'Core/02-constructors.sys2',
  'Core/03-structural.sys2',
  'Core/04-semantic-primitives.sys2',
  'Core/04a-numeric.sys2',
  'Core/05-logic.sys2',
  'Core/06-temporal.sys2',
  'Core/07-modal.sys2',
  'Core/08-defaults.sys2',
  'Core/09-roles.sys2',
  'Core/10-properties.sys2',
  'Core/11-bootstrap-verbs.sys2',
  'Core/12-reasoning.sys2',
  'Core/13-canonicalization.sys2',
  'Core/14-constraints.sys2',

  // Domain knowledge
  '../evals/stress/anthropology.sys2',
  '../evals/stress/biology.sys2',
  '../evals/stress/geography.sys2',
  '../evals/stress/history.sys2',
  '../evals/stress/law.sys2',
  '../evals/stress/literature.sys2',
  '../evals/stress/logic.sys2',
  '../evals/stress/math.sys2',
  '../evals/stress/medicine.sys2',
  '../evals/stress/psychics.sys2',
  '../evals/stress/psychology.sys2',
  '../evals/stress/sociology.sys2'
];

export const steps = [
  // ========================================================================
  // Query 1: Deep Hierarchical Transitive Chains (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find all organisms X and their taxonomic ancestors Y where X isA Y through 5+ transitive steps in biological classification',
    input_dsl: `
      @step1 isA X A
      @step2 isA A B
      @step3 isA B C
      @step4 isA C D
      @step5 isA D Y
    `,
    expected_nl: 'Found deep taxonomic hierarchies: Mammals→Vertebrata→Chordata→Animalia→Kingdom→Domain with organisms inheriting properties through 5+ levels',
    proof_nl: [
      'Transitive isA chains verified through biological taxonomy',
      'Each step represents valid taxonomic classification',
      'Property inheritance flows from Domain down to Species level',
      'Validates HDC hierarchical encoding preserves transitivity',
      'Multiple organisms share common ancestors at higher taxonomic ranks'
    ]
  },

  // ========================================================================
  // Query 2: Semantic Similarity - Find Related Concepts (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find all concepts semantically similar to "organism" across biology, medicine, and sociology domains using HDC similarity',
    input_dsl: `
      @query similar Organism BiologyVocabulary
      @related $query
    `,
    expected_nl: 'Found semantically similar: Cell, Tissue, Organ, Patient, Population, Species sharing structural/functional similarity with Organism',
    proof_nl: [
      'HDC vector similarity detects semantic relationships',
      'Cross-domain concepts cluster by shared features',
      'Organism relates to Cell (component), Patient (instance), Population (collection)',
      'Similarity threshold reflects genuine conceptual overlap',
      'Results span multiple domains demonstrating unified semantic space'
    ]
  },

  // ========================================================================
  // Query 3: Analogy - Cross-Domain Structural Mapping (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find analogous relationships: if Cell:Tissue :: X:Y, what are valid X:Y pairs from sociology/anthropology domains?',
    input_dsl: `
      @bio_part partOf Cell Tissue
      @analog analogy Cell Tissue X
      @result partOf X Y
    `,
    expected_nl: 'Found analogies: Individual:Society, Person:Community, Member:Group - same part-whole compositional structure across biology and social sciences',
    proof_nl: [
      'Analogical reasoning maps structural relationships across domains',
      'Cell:Tissue exhibits part-whole composition',
      'Individual:Society mirrors this compositional structure',
      'Person:Community and Member:Group are valid structural analogs',
      'HDC preserves relational patterns enabling cross-domain mapping',
      'Multiple valid mappings demonstrate flexibility of analogical inference'
    ]
  },

  // ========================================================================
  // Query 4: Abductive Reasoning - Explain Observations (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Given observation: Patient has fever, what are the best abductive explanations (possible diseases) from medical knowledge?',
    input_dsl: `
      @observation hasSymptom Patient Fever
      @hypothesis abduce $observation
      @disease $hypothesis
    `,
    expected_nl: 'Abduced explanations: Infection, Inflammation, ImmuneResponse - each is plausible cause of fever based on medical knowledge',
    proof_nl: [
      'Abductive reasoning generates plausible hypotheses',
      'Fever symptom triggered by multiple pathophysiological processes',
      'Infection explanation: pathogens cause inflammatory response',
      'Inflammation explanation: immune activation raises body temperature',
      'ImmuneResponse explanation: cytokine cascade induces fever',
      'Multiple explanations ranked by medical knowledge base evidence'
    ]
  },

  // ========================================================================
  // Query 5: Inductive Generalization - Pattern Recognition (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'From examples of mammals (Dog, Cat, Elephant, Whale) that breathe air and have hearts, induce general pattern',
    input_dsl: `
      @ex1 isA Dog Mammal
      @ex2 isA Cat Mammal
      @ex3 isA Elephant Mammal
      @ex4 isA Whale Mammal
      @pattern induce $ex1 $ex2 $ex3 $ex4
      @generalization $pattern
    `,
    expected_nl: 'Induced pattern: All Mammals share respiratory and circulatory system characteristics - generalizes from examples to class-level property',
    proof_nl: [
      'Inductive reasoning extracts common features from examples',
      'All provided examples are mammals with shared physiology',
      'Breathing air is common despite Dog (terrestrial) and Whale (aquatic)',
      'Heart presence is universal across mammalian class',
      'Generalization: Mammals inherit respiratory and circulatory traits',
      'Validates property inheritance from taxonomic class to instances'
    ]
  },

  // ========================================================================
  // Query 6: Deductive Proof - Transitive Property Inheritance (Proof)
  // ========================================================================
  {
    action: 'prove',
    input_nl: 'Prove: If mammals can regulate body temperature, and dogs are mammals, then dogs can regulate body temperature',
    input_dsl: `
      @premise1 isA Mammal Animal
      @premise2 can Mammal RegulateBodyTemperature
      @premise3 isA Dog Mammal
      @conclusion can Dog RegulateBodyTemperature
      @goal Implies (And (And $premise1 $premise2) $premise3) $conclusion
    `,
    expected_nl: 'Proven: Dogs inherit thermoregulation ability from Mammal class',
    proof_nl: 'Deductive proof: (1) Mammals can regulate body temperature [given]. (2) Dogs are mammals [isA transitivity]. (3) Properties of class inherited by instances [inheritance axiom]. (4) Therefore, dogs can regulate body temperature [modus ponens]. Proof validates property inheritance through taxonomic hierarchy using sound deductive reasoning.'
  },

  // ========================================================================
  // Query 7: Property Inheritance - Multi-Level Propagation (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find all properties P inherited by organisms at Species level from Kingdom, Phylum, Class, Order, Family ancestors',
    input_dsl: `
      @species isA Species Genus
      @genus isA Genus Family
      @family isA Family Order
      @order isA Order Class
      @class isA Class Phylum
      @phylum isA Phylum Kingdom
      @property hasProperty Kingdom P
      @inherited hasProperty Species P
    `,
    expected_nl: 'Found inherited properties: Cellular, EukaryoticCells, Metabolism, Respiration propagate from Kingdom→Phylum→...→Species across 6+ taxonomic levels',
    proof_nl: [
      'Property inheritance flows down taxonomic hierarchy',
      'Kingdom-level properties (e.g., Cellular) inherited by all descendants',
      'Each taxonomic rank adds specialized properties',
      'Species inherits accumulated properties from all ancestor ranks',
      'Validates transitive property inheritance through isA chains',
      'Multiple properties demonstrate systematic inheritance mechanism',
      'HDC hierarchical encoding preserves inherited feature vectors'
    ]
  },

  // ========================================================================
  // Query 8: Cross-Domain Causal Chains (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find causal chains: X causes Y causes Z spanning at least 2 domains (biology, medicine, sociology)',
    input_dsl: `
      @cause1 causes X Y
      @cause2 causes Y Z
      @transitive causes X Z
    `,
    expected_nl: 'Found causal chains: Virus→Infection→EpidemicSpread (biology→medicine→sociology), GeneticMutation→Disease→Disability (biology→medicine→social)',
    proof_nl: [
      'Causal transitivity validated across domain boundaries',
      'Virus causes Infection [biological causation]',
      'Infection causes EpidemicSpread [medical-social causation]',
      'Therefore Virus causes EpidemicSpread [transitive closure]',
      'Cross-domain causal reasoning requires unified semantic representation',
      'Multiple causal chains demonstrate systematic causal propagation',
      'HDC encodes causal relationships preserving transitivity'
    ]
  },

  // ========================================================================
  // Query 9: Temporal Reasoning - Event Ordering (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find temporal event sequences: E1 before E2 before E3 in historical, biological, or physical processes',
    input_dsl: `
      @time1 before Event1 Event2
      @time2 before Event2 Event3
      @ordering before Event1 Event3
    `,
    expected_nl: 'Found temporal sequences: CellFormation→TissueFormation→OrganFormation (biological development), IndustrialRevolution→Urbanization→ModernSociety (historical)',
    proof_nl: [
      'Temporal transitivity: before relation composes',
      'Biological development: cells form first, aggregate into tissues, organize into organs',
      'Historical progression: industrial revolution enables urbanization, leads to modern society',
      'Temporal ordering preserved through transitive before relation',
      'Multiple sequences across domains validate temporal reasoning',
      'HDC temporal encoding maintains chronological relationships'
    ]
  },

  // ========================================================================
  // Query 10: Explain - Causal Explanation Generation (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Explain: Why do birds have wings? Generate causal explanation from evolutionary, biological, and functional knowledge',
    input_dsl: `
      @fact hasProperty Bird Wings
      @explanation explain $fact
      @cause $explanation
    `,
    expected_nl: 'Explanations: (1) Evolution: Flight adaptation for survival, (2) Biology: Locomotion mechanism, (3) Function: Enables aerial navigation, predator evasion, migration',
    proof_nl: [
      'Causal explanation integrates multiple knowledge domains',
      'Evolutionary explanation: Wings evolved for flight advantage',
      'Biological explanation: Wings are modified forelimbs for lift generation',
      'Functional explanation: Wings enable 3D movement, escape, foraging',
      'Multiple explanatory levels demonstrate rich causal model',
      'Explanation generation requires reasoning over evolutionary, anatomical, and functional knowledge',
      'HDC representation unifies evolutionary history, biological structure, and behavioral function'
    ]
  },

  // ========================================================================
  // Query 11: Counterfactual Reasoning - What-If Scenarios (Proof)
  // ========================================================================
  {
    action: 'prove',
    input_nl: 'Prove: In a counterfactual world where mammals do not have hair, would dogs still be mammals?',
    input_dsl: `
      @normal can Mammal HaveHair
      @counterfactual whatif CounterfactualWorld (Not $normal)
      @identity isA Dog Mammal
      @goal Implies $counterfactual $identity
    `,
    expected_nl: 'Proven: Dogs remain mammals in counterfactual world - taxonomic identity does not depend on contingent properties like hair',
    proof_nl: 'Counterfactual proof: (1) Mammals typically have hair [default property]. (2) Consider world W where mammals lack hair [counterfactual assumption]. (3) Dog identity as mammal based on essential properties: endothermic, viviparous, mammary glands [taxonomic definition]. (4) Hair is contingent, not essential property [modal distinction]. (5) Therefore, in W, dogs are still mammals despite lacking hair [essential vs. contingent property distinction]. Proof demonstrates modal reasoning over counterfactual scenarios.'
  },

  // ========================================================================
  // Query 12: Multi-Domain Concept Clustering (Multi-Result)
  // ========================================================================
  {
    action: 'query',
    input_nl: 'Find all concepts across domains that cluster together based on structural similarity: have hierarchical composition, emergent properties, and regulatory mechanisms',
    input_dsl: `
      @struct1 partOf Component System
      @emergent hasProperty System EmergentBehavior
      @regulation has System RegulatoryMechanism
      @similar similar System AllDomains
      @cluster $similar
    `,
    expected_nl: 'Clustered concepts: BiologicalOrganism, EcosystemBiology, SocialSystem, EconomicSystem, NervousSystem - all exhibit hierarchical composition + emergence + regulation',
    proof_nl: [
      'Semantic clustering identifies cross-domain structural patterns',
      'BiologicalOrganism: cells→tissues→organs (composition), homeostasis (regulation), consciousness (emergence)',
      'Ecosystem: organisms→populations→communities (composition), food webs (regulation), climate effects (emergence)',
      'SocialSystem: individuals→groups→society (composition), norms (regulation), culture (emergence)',
      'EconomicSystem: agents→firms→markets (composition), monetary policy (regulation), market dynamics (emergence)',
      'All share: hierarchical composition, emergent system-level properties, regulatory feedback',
      'HDC similarity metric clusters based on shared structural features',
      'Demonstrates unified representation enabling cross-domain pattern recognition'
    ]
  }
];
