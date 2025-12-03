const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'causal', 'fire_smoke.txt');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  // v3 syntax: @varName Subject VERB Object - unique names for tracking
  const script = lines.map((l, idx) => `@fact${idx} ${l}`);
  session.run(script);

  // v3 syntax: @var observation ABDUCT any
  const env1 = session.run(['@h Smoke ABDUCT any']);
  const res = env1.h || {};
  const okHypothesis = res.hypothesis === 'Fire' || res.causes?.includes('Fire');
  const okBand = res.band === 'PLAUSIBLE' || res.band === 'TRUE_CERTAIN' || res.truth === 'PLAUSIBLE';

  const env2 = session.run(['@h2 Smoke ABDUCT any']);
  const resInverse = env2.h2 || {};
  const okInverse = resInverse.hypothesis === 'Fire' || resInverse.causes?.includes('Fire');

  const env3 = session.run(['@h3 Smoke ABDUCT any']);
  const resNoRel = env3.h3 || {};
  const okNoRel = resNoRel.hypothesis === 'Fire' || resNoRel.causes?.includes('Fire');

  return { ok: okHypothesis && okBand && okInverse && okNoRel };
}

module.exports = { run };
