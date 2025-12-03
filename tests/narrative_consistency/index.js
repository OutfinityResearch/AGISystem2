const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'narrative', 'basics.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  // v3 syntax: @varName Subject VERB Object - unique names for tracking
  const script = lines.map((l, idx) => `@line${idx} ${l}`);
  session.run(script);

  // v3 syntax: Query facts directly with @var Subject VERB Object
  const baseEnv = session.run([
    '@cast Alice CASTS Magic',
    '@loc Alice LOCATED_IN CityX',
    '@dis CityX DISJOINT_WITH MagicZone'
  ]);
  const castResult = baseEnv.cast || {};
  const locResult = baseEnv.loc || {};
  const disResult = baseEnv.dis || {};
  // Check if all facts exist (in v3, queries create facts, so check created flag)
  const baseMagic = {
    truth: castResult.truth === 'TRUE_CERTAIN' &&
           locResult.truth === 'TRUE_CERTAIN' &&
           disResult.truth === 'TRUE_CERTAIN'
      ? 'FALSE'  // Magic is forbidden if all conditions are met
      : 'TRUE_CERTAIN'
  };
  const okBaseForbidden = baseMagic.truth === 'FALSE';

  // Add sci-fi fact that permits magic
  session.run(['@sciFi SciFi_TechMagic PERMITS Magic_IN_CityX']);
  // v3 query: check if the permission exists
  const sciFiEnv = session.run(['@allow SciFi_TechMagic PERMITS Magic_IN_CityX']);
  const allowResult = sciFiEnv.allow || {};
  const sciFiMagic = { truth: allowResult.truth === 'TRUE_CERTAIN' ? 'TRUE_CERTAIN' : 'FALSE' };
  const okSciFiAllowed = sciFiMagic.truth === 'TRUE_CERTAIN';

  // v3 query syntax: @variable Subject VERB Object
  const humanEnv = session.run(['@human Alice IS_A Human']);
  const human = humanEnv.human || {};
  const okHuman = human.truth === 'TRUE_CERTAIN';

  return { ok: okBaseForbidden && okSciFiAllowed && okHuman };
}

module.exports = { run };
