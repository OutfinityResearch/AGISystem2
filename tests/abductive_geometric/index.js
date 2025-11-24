const Config = require('../../src/support/config');
const ConceptStore = require('../../src/knowledge/concept_store');
const BoundedDiamond = require('../../src/core/bounded_diamond');
const RelationPermuter = require('../../src/core/relation_permuter');
const Retriever = require('../../src/reason/retrieval');
const Reasoner = require('../../src/reason/reasoner');
const MathEngine = require('../../src/core/math_engine');

async function run() {
  const config = new Config().load({ profile: 'manual_test' });
  const dims = config.get('dimensions');
  const store = new ConceptStore(dims);

  function makeVector(value) {
    const vec = new Int8Array(dims);
    vec[0] = value;
    return vec;
  }

  const fireVec = makeVector(50);
  const fireDiamond = new BoundedDiamond('Fire', 'Fire', dims);
  fireDiamond.updateFromExamples([fireVec]);
  store._concepts.set('Fire', { label: 'Fire', diamonds: [fireDiamond] });

  const permuter = new RelationPermuter(config);
  permuter.bootstrapDefaults();

  const causesPerm = permuter.get('CAUSES');
  const smokeObservation = MathEngine.permute(fireDiamond.center, causesPerm);

  const retriever = new Retriever({ config, math: MathEngine, store });
  const reasoner = new Reasoner({
    store,
    math: MathEngine,
    retriever,
    permuter,
    config
  });

  const result = reasoner.abductive(smokeObservation, 'CAUSES');

  const okConcept = result && result.concept === 'Fire';
  const okBand = result && (result.band === 'PLAUSIBLE' || result.band === 'TRUE_CERTAIN');

  return { ok: okConcept && okBand };
}

module.exports = { run };

