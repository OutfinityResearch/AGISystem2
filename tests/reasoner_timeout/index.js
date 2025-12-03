const Config = require('../../src/support/config');
const ConceptStore = require('../../src/knowledge/concept_store');
const Reasoner = require('../../src/reason/reasoner');

async function run({ profile }) {
  const configLoose = new Config().load({ profile });
  const store = new ConceptStore(16);

  store.addFact({ subject: 'A', relation: 'IS_A', object: 'B' });
  store.addFact({ subject: 'B', relation: 'IS_A', object: 'C' });

  const rLoose = new Reasoner(store);
  rLoose.config = configLoose;
  const resLoose = rLoose.deduceIsA('A', 'C');
  const okLoose = resLoose.truth === 'TRUE_CERTAIN';

  const configTight = new Config().load({
    profile,
    maxReasonerIterations: 1
  });
  const rTight = new Reasoner(store);
  rTight.config = configTight;
  const resTight = rTight.deduceIsA('A', 'C');
  // Reasoner returns UNKNOWN with method='timeout' when iteration limit reached
  const okTight = (resTight.truth === 'UNKNOWN_TIMEOUT' || resTight.truth === 'UNKNOWN') &&
                  resTight.method === 'timeout';

  return { ok: okLoose && okTight };
}

module.exports = { run };
