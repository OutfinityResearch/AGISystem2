/**
 * Suite 04 - Deep Transitive Chains
 *
 * Stress test with 6-10 step transitive chains across relations.
 * Tests: isA, locatedIn, partOf, before, causes - all deep.
 */

export const name = 'Deep Transitive Chains';
export const description = 'Stress test 6-10 step transitive reasoning';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Geographic chain (9 steps) ===
  {
    action: 'learn',
    input_nl: 'Geographic: Paris->City->Country->Continent->Planet->SolarSystem->Arm->Galaxy->Cluster->Supercluster->Universe',
    input_dsl: `
      isA Paris City
      isA City Country
      isA Country Continent
      isA Continent Planet
      isA Planet SolarSystem
      isA SolarSystem Arm
      isA Arm Galaxy
      isA Galaxy Cluster
      isA Cluster Supercluster
      isA Supercluster Universe
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === PROVE: 10-step transitive (Paris->Universe) ===
  {
    action: 'prove',
    input_nl: 'Is Paris in the Universe?',
    input_dsl: '@goal isA Paris Universe',
    expected_nl: 'True: Paris is an universe. Proof: Paris is a city. City is a country. Country is a continent. Continent is a planet. Planet is a solarsystem. SolarSystem is an arm. Arm is a galaxy. Galaxy is a cluster. Cluster is a supercluster. Supercluster is an universe.'
  },

  // === PROVE: 8-step transitive (Paris->Cluster) ===
  {
    action: 'prove',
    input_nl: 'Is Paris in a Cluster?',
    input_dsl: '@goal isA Paris Cluster',
    expected_nl: 'True: Paris is a cluster. Proof: Paris is a city. City is a country. Country is a continent. Continent is a planet. Planet is a solarsystem. SolarSystem is an arm. Arm is a galaxy. Galaxy is a cluster.'
  },

  // === SETUP: Knowledge chain (10 steps) ===
  {
    action: 'learn',
    input_nl: 'Knowledge: DataPoint->Detail->Fact->Subtopic->Topic->Specialty->Discipline->Field->Domain->Concept->Idea',
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
    input_nl: 'Is Measurement42 an Idea?',
    input_dsl: '@goal isA Measurement42 Idea',
    expected_nl: 'True: Measurement42 is an idea. Proof: Measurement42 is a datapoint. DataPoint is a detail. Detail is a fact. Fact is a subtopic. Subtopic is a topic. Topic is a specialty. Specialty is a discipline. Discipline is a field. Field is a domain. Domain is a concept. Concept is an idea.'
  },

  // === SETUP: Causal chain (6 steps) ===
  {
    action: 'learn',
    input_nl: 'Causal: Pollution->ClimateChange->Drought->CropFailure->Famine->Migration->Conflict',
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
    input_nl: 'Does Pollution cause Conflict?',
    input_dsl: '@goal causes Pollution Conflict',
    expected_nl: 'True: Pollution causes Conflict. Proof: Pollution causes ClimateChange. ClimateChange causes Drought. Drought causes CropFailure. CropFailure causes Famine. Famine causes Migration. Migration causes Conflict.'
  },

  // === SETUP: Temporal chain (6 steps) ===
  {
    action: 'learn',
    input_nl: 'Historical: Antiquity->Medieval->Renaissance->Industrial->Modern->Digital->AI',
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
    input_nl: 'Is Antiquity before AI?',
    input_dsl: '@goal before Antiquity AI',
    expected_nl: 'True: Antiquity is before AI. Proof: Antiquity is before Medieval. Medieval is before Renaissance. Renaissance is before Industrial. Industrial is before Modern. Modern is before Digital. Digital is before AI. Transitive chain verified (6 hops). Therefore Antiquity is before AI.'
  },

  // === QUERY: What is Paris ===
  {
    action: 'query',
    input_nl: 'What is Paris?',
    input_dsl: '@q isA Paris ?what',
    expected_nl: 'Answer: City. Proof: Paris isA City. City isA Country. Country isA Continent. Continent isA Planet. Planet isA SolarSystem. SolarSystem isA Arm. Arm isA Galaxy. Galaxy isA Cluster. Cluster isA Supercluster. Supercluster isA Universe.'
  },

  // === QUERY: What galaxy-level container holds Paris? (deep proof expected) ===
  {
    action: 'query',
    input_nl: 'Where is Paris along the chain up to Galaxy?',
    input_dsl: '@q isA Paris Galaxy',
    expected_nl: 'Answer: Galaxy. Proof: Paris isA City. City isA Country. Country isA Continent. Continent isA Planet. Planet isA SolarSystem. SolarSystem isA Arm. Arm isA Galaxy.'
  },

  // === QUERY: What causes Conflict in this chain? (causal proof) ===
  {
    action: 'query',
    input_nl: 'List the causal path from Pollution to Conflict.',
    input_dsl: '@q causes Pollution Conflict',
    expected_nl: 'Answer: Pollution causes Conflict. Proof: Pollution causes ClimateChange. ClimateChange causes Drought. Drought causes CropFailure. CropFailure causes Famine. Famine causes Migration. Migration causes Conflict.'
  },

  // === NEGATIVE: Reverse temporal order ===
  {
    action: 'prove',
    input_nl: 'Is AI before Antiquity? (reverse order - should fail)',
    input_dsl: '@goal before AI Antiquity',
    expected_nl: 'Cannot prove: AI is before Antiquity. Search: Searched before AI ?next in KB. Not found. AI has no outgoing before relations. Reverse path: Antiquity -> Medieval -> Renaissance -> Industrial -> Modern -> Digital -> AI. Path exists in opposite direction only. Temporal order violated.'
  }
];

export default { name, description, theories, steps };
