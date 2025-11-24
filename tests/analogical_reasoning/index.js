const Config = require('../../src/support/config');
const ConceptStore = require('../../src/knowledge/concept_store');
const BoundedDiamond = require('../../src/core/bounded_diamond');
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

  function addConcept(label, value) {
    const vec = makeVector(value);
    const d = new BoundedDiamond(label, label, dims);
    d.updateFromExamples([vec]);
    store._concepts.set(label, { label, diamonds: [d] });
  }

  addConcept('Theft', 10);
  addConcept('Jail', 30);
  addConcept('Fraud', 40);
  addConcept('Fine', 60);

  const retriever = new Retriever({ config, math: MathEngine, store });
  const reasoner = new Reasoner({ store, math: MathEngine, retriever, config });

  const theft = store.getConcept('Theft').diamonds[0].center;
  const jail = store.getConcept('Jail').diamonds[0].center;
  const fraud = store.getConcept('Fraud').diamonds[0].center;

  const result = reasoner.analogical(theft, jail, fraud);

  const okConcept = result && result.concept === 'Fine';
  const okDistance = result && result.distance === 0;

  return { ok: okConcept && okDistance };
}

module.exports = { run };

