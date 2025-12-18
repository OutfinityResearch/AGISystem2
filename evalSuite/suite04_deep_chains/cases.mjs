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
  // === SETUP: Geographic - Dual Modeling ===
  // Taxonomy (isA): Paris isA City isA Settlement isA Place isA Location
  // Containment (locatedIn): Paris locatedIn France locatedIn Europe locatedIn Earth...
  {
    action: 'learn',
    input_nl: 'Geographic: Taxonomy (Paris->City->Settlement->Place->Location) + Containment (Paris->France->Europe->Earth->...->Universe)',
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
    input_nl: 'Is Paris located in the Universe?',
    input_dsl: '@goal locatedIn Paris Universe',
    expected_nl: 'True: Paris is in Universe. Proof: Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem. SolarSystem is in MilkyWayArm. MilkyWayArm is in MilkyWay. MilkyWay is in LocalCluster. LocalCluster is in Supercluster. Supercluster is in Universe. Transitive chain verified (9 hops). Therefore Paris is in Universe.'
  },

  // === PROVE: 6-step containment transitive (Paris->MilkyWay) ===
  {
    action: 'prove',
    input_nl: 'Is Paris in the MilkyWay?',
    input_dsl: '@goal locatedIn Paris MilkyWay',
    expected_nl: 'True: Paris is in MilkyWay. Proof: Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem. SolarSystem is in MilkyWayArm. MilkyWayArm is in MilkyWay. Transitive chain verified (6 hops). Therefore Paris is in MilkyWay.'
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

  // === QUERY: What is Paris? (taxonomy query - returns all transitive types) ===
  {
    action: 'query',
    input_nl: 'What is Paris?',
    input_dsl: '@q isA Paris ?what',
    expected_nl: 'Paris is a city. Paris is a settlement. Proof: isA Paris City. isA City Settlement. Paris is a place. Proof: isA Paris City. isA City Settlement. isA Settlement Place. Paris is a location. Proof: isA Paris City. isA City Settlement. isA Settlement Place. isA Place Location.'
  },

  // === QUERY: Where is Paris located? (containment query - returns all transitive locations) ===
  {
    action: 'query',
    input_nl: 'Where is Paris located?',
    input_dsl: '@q locatedIn Paris ?where',
    expected_nl: 'Paris is in France. Paris is in Europe. Proof: locatedIn Paris France. locatedIn France Europe. Paris is in Earth. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. Paris is in SolarSystem. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. Paris is in MilkyWayArm. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. locatedIn SolarSystem MilkyWayArm. Paris is in MilkyWay. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. locatedIn SolarSystem MilkyWayArm. locatedIn MilkyWayArm MilkyWay. Paris is in LocalCluster. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. locatedIn SolarSystem MilkyWayArm. locatedIn MilkyWayArm MilkyWay. locatedIn MilkyWay LocalCluster. Paris is in Supercluster. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. locatedIn SolarSystem MilkyWayArm. locatedIn MilkyWayArm MilkyWay. locatedIn MilkyWay LocalCluster. locatedIn LocalCluster Supercluster. Paris is in Universe. Proof: locatedIn Paris France. locatedIn France Europe. locatedIn Europe Earth. locatedIn Earth SolarSystem. locatedIn SolarSystem MilkyWayArm. locatedIn MilkyWayArm MilkyWay. locatedIn MilkyWay LocalCluster. locatedIn LocalCluster Supercluster. locatedIn Supercluster Universe.'
  },

  // === QUERY: What causes Conflict? (causal query - returns all transitive causes) ===
  {
    action: 'query',
    input_nl: 'What causes Conflict?',
    input_dsl: '@q causes ?what Conflict',
    expected_nl: 'Migration causes Conflict. Famine causes Conflict. Proof: causes Famine Migration. causes Migration Conflict. CropFailure causes Conflict. Proof: causes CropFailure Famine. causes Famine Migration. causes Migration Conflict. Drought causes Conflict. Proof: causes Drought CropFailure. causes CropFailure Famine. causes Famine Migration. causes Migration Conflict. ClimateChange causes Conflict. Proof: causes ClimateChange Drought. causes Drought CropFailure. causes CropFailure Famine. causes Famine Migration. causes Migration Conflict. Pollution causes Conflict. Proof: causes Pollution ClimateChange. causes ClimateChange Drought. causes Drought CropFailure. causes CropFailure Famine. causes Famine Migration. causes Migration Conflict.'
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
