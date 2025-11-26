const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const basicPath = path.join(process.cwd(), 'tests', 'fixtures', 'concepts', 'basic.txt');
  const basicLines = fs.readFileSync(basicPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const basicScript = basicLines.map((l, idx) => `@b${idx} ASSERT ${l}`);
  session.run(basicScript);

  const baseEnv = session.run(['@q1 ASK "Water BOILS_AT Celsius50?"']);
  const base = baseEnv.q1 || {};
  const okBaseFalse = base.truth === 'FALSE';

  const cfPath = path.join(process.cwd(), 'tests', 'fixtures', 'counterfactual', 'boil50.txt');
  const cfLines = fs.readFileSync(cfPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cfFacts = cfLines.join(' ; ');

  const cfEnv = session.run([
    `@cf CF "Water BOILS_AT Celsius50?" | ${cfFacts}`
  ]);
  const cf = cfEnv.cf || {};
  const okCfTrue = cf.truth === 'TRUE_CERTAIN';

  const baseAfterEnv = session.run(['@q2 ASK "Water BOILS_AT Celsius50?"']);
  const baseAfter = baseAfterEnv.q2 || {};
  const okBaseStillFalse = baseAfter.truth === 'FALSE';

  return { ok: okBaseFalse && okCfTrue && okBaseStillFalse };
}

module.exports = { run };
