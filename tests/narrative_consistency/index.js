const fs = require('fs');
const path = require('path');
const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });

  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'narrative', 'basics.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    api.ingest(line);
  }

  const baseMagic = api.checkMagicInCity('Alice', 'CityX');
  const okBaseForbidden = baseMagic.truth === 'FALSE';

  const cfFacts = ['SciFi_TechMagic PERMITS Magic_IN CityX'];
  const sciFiMagic = api.checkMagicInCity('Alice', 'CityX', cfFacts);
  const okSciFiAllowed = sciFiMagic.truth === 'TRUE_CERTAIN';

  const human = api.ask('Alice IS_A Human?');
  const okHuman = human.truth === 'TRUE_CERTAIN';

  return { ok: okBaseForbidden && okSciFiAllowed && okHuman };
}

module.exports = { run };

