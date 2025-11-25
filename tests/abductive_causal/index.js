const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'causal', 'fire_smoke.txt');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const script = lines.map((l, idx) => `@f${idx} ASSERT ${l}`);
  session.run(script);

  const env1 = session.run(['@h ABDUCT Smoke CAUSES']);
  const res = env1.h || {};
  const okHypothesis = res.hypothesis === 'Fire';
  const okBand = res.band === 'PLAUSIBLE' || res.band === 'TRUE_CERTAIN';

  const env2 = session.run(['@h2 ABDUCT Smoke CAUSED_BY']);
  const resInverse = env2.h2 || {};
  const okInverse = resInverse.hypothesis === 'Fire';

  const env3 = session.run(['@h3 ABDUCT Smoke']);
  const resNoRel = env3.h3 || {};
  const okNoRel = resNoRel.hypothesis === 'Fire';

  return { ok: okHypothesis && okBand && okInverse && okNoRel };
}

module.exports = { run };
