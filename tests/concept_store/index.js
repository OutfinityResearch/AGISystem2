const ConceptStore = require('../../src/knowledge/concept_store');

async function run() {
  const dims = 16;
  const store = new ConceptStore(dims);

  const c1 = store.ensureConcept('Dog');
  const c2 = store.ensureConcept('Dog');
  const okSameConcept = c1 === c2 && c1.diamonds.length === 1;

  store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Animal' });
  const facts = store.getFacts();
  const okFacts = facts.length === 1 &&
    facts[0].subject === 'Dog' &&
    facts[0].relation === 'IS_A' &&
    facts[0].object === 'Animal';

  facts[0].subject = 'Cat';
  const facts2 = store.getFacts();
  const okCopy = facts2[0].subject === 'Dog';

  return { ok: okSameConcept && okFacts && okCopy };
}

module.exports = { run };

