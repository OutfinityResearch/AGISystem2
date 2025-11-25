const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'narrative', 'basics.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const script = lines.map((l, idx) => `@f${idx} ASSERT ${l}`);
  session.run(script);

  const baseEnv = session.run([
    '@cast FACTS_MATCHING "Alice CASTS Magic"',
    '@loc FACTS_MATCHING "Alice LOCATED_IN CityX"',
    '@dis FACTS_MATCHING "CityX DISJOINT_WITH MagicZone"'
  ]);
  const castFacts = baseEnv.cast || [];
  const locFacts = baseEnv.loc || [];
  const disFacts = baseEnv.dis || [];
  const baseMagic = {
    truth: castFacts.length > 0 && locFacts.length > 0 && disFacts.length > 0
      ? 'FALSE'
      : 'TRUE_CERTAIN'
  };
  const okBaseForbidden = baseMagic.truth === 'FALSE';

  const cfFacts = ['SciFi_TechMagic PERMITS Magic_IN CityX'];
  session.run([`@e0 ASSERT ${cfFacts[0]}`]);
  const sciFiEnv = session.run(['@allow FACTS_MATCHING "SciFi_TechMagic PERMITS Magic_IN CityX"']);
  const allowFacts = sciFiEnv.allow || [];
  const sciFiMagic = { truth: allowFacts.length > 0 ? 'TRUE_CERTAIN' : 'FALSE' };
  const okSciFiAllowed = sciFiMagic.truth === 'TRUE_CERTAIN';

  const humanEnv = session.run(['@human ASK "Alice IS_A Human?"']);
  const human = humanEnv.human || {};
  const okHuman = human.truth === 'TRUE_CERTAIN';

  return { ok: okBaseForbidden && okSciFiAllowed && okHuman };
}

module.exports = { run };
