const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  // Ingest a canonical property fact via Sys2DSL.
  session.run(['@f ASSERT Water HAS_PROPERTY boiling_point=100']);

  // Inspect the resulting concept diamond for Water.
  const concept = session.engine.conceptStore.getConcept('Water');
  if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
    return { ok: false };
  }
  const diamond = concept.diamonds[0];

  const tempAxis = 4; // Temperature axis in ontology (see DS[/knowledge/dimensions]).
  const center = diamond.center[tempAxis];
  const min = diamond.minValues[tempAxis];
  const max = diamond.maxValues[tempAxis];

  // With a single observation boiling_point=100, the temperature axis should
  // reflect that value consistently across min/max/center.
  const okCenter = center === 100;
  const okRange = min === 100 && max === 100;

  return { ok: okCenter && okRange };
}

module.exports = { run };

