const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  // Ingest canonical facts via Sys2DSL using proper geometric model syntax.
  // In the geometric model, values are separate concepts - no property=value allowed.
  session.run(['@f ASSERT Water BOILS_AT Celsius100']);

  // Inspect the resulting concepts.
  const conceptStore = session.engine.conceptStore;
  const waterConcept = conceptStore.getConcept('Water');
  const tempConcept = conceptStore.getConcept('Celsius100');

  if (!waterConcept || !tempConcept) {
    return { ok: false };
  }

  // Check that the relation was stored correctly in conceptStore._facts
  const facts = conceptStore._facts || [];
  const boilFact = facts.find(f =>
    f.subject === 'Water' && f.relation === 'BOILS_AT' && f.object === 'Celsius100'
  );

  return { ok: !!boilFact };
}

module.exports = { run };

