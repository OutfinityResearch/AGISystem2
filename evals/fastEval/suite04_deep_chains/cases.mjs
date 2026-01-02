/**
 * Suite 04 - Deep Transitive Chains
 *
 * Stress test with 6-10 step transitive chains across relations.
 * Tests: isA, locatedIn, partOf, before, causes - all deep.
 */

export const name = 'Deep Transitive Chains';
export const description = 'Stress test 6-10 step transitive reasoning';

export const theories = [];

export const steps = [
  // === SETUP: Geographic - Dual Modeling ===
  // Taxonomy (isA): Paris isA City isA Settlement isA Place isA Location
  // Containment (locatedIn): Paris locatedIn France locatedIn Europe locatedIn Earth...
  {
    action: 'learn',
    input_nl: 'Paris is a City. City is a Settlement. Settlement is a Place. Place is a Location. Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem. SolarSystem is in MilkyWayArm. MilkyWayArm is in MilkyWay. MilkyWay is in LocalCluster. LocalCluster is in Supercluster. Supercluster is in Universe.',
    input_dsl: `
      isA Paris City
      isA City Settlement
      isA Settlement Place
      isA Place Location

      locatedIn Paris France
      locatedIn France Europe
      locatedIn Europe Earth
      locatedIn Earth SolarSystem
      locatedIn SolarSystem MilkyWayArm
      locatedIn MilkyWayArm MilkyWay
      locatedIn MilkyWay LocalCluster
      locatedIn LocalCluster Supercluster
      locatedIn Supercluster Universe
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PROVE: 9-step containment transitive (Paris->Universe) ===
  {
    action: 'prove',
    input_nl: 'Paris is in Universe.',
    input_dsl: '@goal locatedIn Paris Universe',
    expected_nl: 'True: Paris is in Universe.',
    proof_nl: 'Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem. SolarSystem is in MilkyWayArm. MilkyWayArm is in MilkyWay. MilkyWay is in LocalCluster. LocalCluster is in Supercluster. Supercluster is in Universe. Transitive chain verified (9 hops). Therefore Paris is in Universe.'
  },

  // === PROVE: 6-step containment transitive (Paris->MilkyWay) ===
  {
    action: 'prove',
    input_nl: 'Paris is in MilkyWay.',
    input_dsl: '@goal locatedIn Paris MilkyWay',
    expected_nl: 'True: Paris is in MilkyWay.',
    proof_nl: 'Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem. SolarSystem is in MilkyWayArm. MilkyWayArm is in MilkyWay. Transitive chain verified (6 hops). Therefore Paris is in MilkyWay.'
  },

  // === SETUP: Knowledge chain (10 steps) ===
  {
    action: 'learn',
    input_nl: 'DataPoint is a Detail. Detail is a Fact. Fact is a Subtopic. Subtopic is a Topic. Topic is a Specialty. Specialty is a Discipline. Discipline is a Field. Field is a Domain. Domain is a Concept. Concept is an Idea. Measurement42 is a DataPoint.',
    input_dsl: `
      isA DataPoint Detail
      isA Detail Fact
      isA Fact Subtopic
      isA Subtopic Topic
      isA Topic Specialty
      isA Specialty Discipline
      isA Discipline Field
      isA Field Domain
      isA Domain Concept
      isA Concept Idea
      isA Measurement42 DataPoint
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: 10-step (Measurement42->Idea) ===
  {
    action: 'prove',
    input_nl: 'Measurement42 is an Idea.',
    input_dsl: '@goal isA Measurement42 Idea',
    expected_nl: 'True: Measurement42 is an idea.',
    proof_nl: 'Measurement42 is a datapoint. DataPoint is a detail. Detail is a fact. Fact is a subtopic. Subtopic is a topic. Topic is a specialty. Specialty is a discipline. Discipline is a field. Field is a domain. Domain is a concept. Concept is an idea.'
  },

  // === SETUP: Causal chain (6 steps) ===
  {
    action: 'learn',
    input_nl: 'Pollution causes ClimateChange. ClimateChange causes Drought. Drought causes CropFailure. CropFailure causes Famine. Famine causes Migration. Migration causes Conflict.',
    input_dsl: `
      causes Pollution ClimateChange
      causes ClimateChange Drought
      causes Drought CropFailure
      causes CropFailure Famine
      causes Famine Migration
      causes Migration Conflict
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PROVE: 6-step causal (Pollution->Conflict) ===
  {
    action: 'prove',
    input_nl: 'Pollution causes Conflict.',
    input_dsl: '@goal causes Pollution Conflict',
    expected_nl: 'True: Pollution causes Conflict.',
    proof_nl: 'Pollution causes ClimateChange. ClimateChange causes Drought. Drought causes CropFailure. CropFailure causes Famine. Famine causes Migration. Migration causes Conflict.'
  },

  // === SETUP: Temporal chain (6 steps) ===
  {
    action: 'learn',
    input_nl: 'Antiquity before Medieval. Medieval before Renaissance. Renaissance before Industrial. Industrial before Modern. Modern before Digital. Digital before AI.',
    input_dsl: `
      before Antiquity Medieval
      before Medieval Renaissance
      before Renaissance Industrial
      before Industrial Modern
      before Modern Digital
      before Digital AI
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PROVE: 6-step temporal (Antiquity->AI) ===
  {
    action: 'prove',
    input_nl: 'Antiquity before AI.',
    input_dsl: '@goal before Antiquity AI',
    expected_nl: 'True: Antiquity is before AI.',
    proof_nl: 'Antiquity is before Medieval. Medieval is before Renaissance. Renaissance is before Industrial. Industrial is before Modern. Modern is before Digital. Digital is before AI. Transitive chain verified (6 hops). Therefore Antiquity is before AI.'
  },

  // === QUERY: What is Paris? (taxonomy query - returns all transitive types) ===
  {
    action: 'query',
    input_nl: 'Paris is a ?what.',
    input_dsl: '@q isA Paris ?what',
    expected_nl: [
      'Paris is a city.',
      'Paris is a settlement.',
      'Paris is a place.',
      'Paris is a location.'
    ],
    proof_nl: [
      'Fact in KB: Paris is a city',
      'Therefore Paris is a settlement',
      'Therefore Paris is a place',
      'Therefore Paris is a location'
    ]
  },

  // === QUERY: Where is Paris located? (containment query - returns all transitive locations) ===
  {
    action: 'query',
    input_nl: 'Paris is in ?where.',
    input_dsl: '@q locatedIn Paris ?where',
    expected_nl: [
      'Paris is in France.',
      'Paris is in Europe.',
      'Paris is in Earth.',
      'Paris is in SolarSystem.',
      'Paris is in MilkyWayArm.',
      'Paris is in MilkyWay.',
      'Paris is in LocalCluster.',
      'Paris is in Supercluster.',
      'Paris is in Universe.'
    ],
    proof_nl: [
      'Fact in KB: Paris is in France',
      'Therefore Paris is in Europe',
      'Therefore Paris is in Earth',
      'Therefore Paris is in SolarSystem',
      'Therefore Paris is in MilkyWayArm',
      'Therefore Paris is in MilkyWay',
      'Therefore Paris is in LocalCluster',
      'Therefore Paris is in Supercluster',
      'Therefore Paris is in Universe'
    ]
  },

  // === QUERY: What causes Conflict? (causal query - returns all transitive causes) ===
  {
    action: 'query',
    input_nl: '?what causes Conflict.',
    input_dsl: '@q causes ?what Conflict',
    expected_nl: [
      'Migration causes Conflict.',
      'Famine causes Conflict.',
      'CropFailure causes Conflict.',
      'Drought causes Conflict.',
      'ClimateChange causes Conflict.',
      'Pollution causes Conflict.'
    ],
    proof_nl: [
      'Fact in KB: Migration causes Conflict',
      'Therefore Famine causes Conflict',
      'Therefore CropFailure causes Conflict',
      'Therefore Drought causes Conflict',
      'Therefore ClimateChange causes Conflict',
      'Therefore Pollution causes Conflict'
    ]
  },

  // === NEGATIVE: Reverse temporal order ===
  {
    action: 'prove',
    input_nl: 'AI before Antiquity.',
    input_dsl: '@goal before AI Antiquity',
    expected_nl: 'Cannot prove: AI is before Antiquity.',
    proof_nl: 'No before facts for AI exist in KB'
  }
];

export default { name, description, theories, steps };
