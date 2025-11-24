const fs = require('fs');
const path = require('path');
const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });

  const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'causal', 'fire_smoke.txt');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    api.ingest(line);
  }

  const res = api.abduct('Smoke', 'CAUSES');
  const okHypothesis = res.hypothesis === 'Fire';
  const okBand = res.band === 'PLAUSIBLE' || res.band === 'TRUE_CERTAIN';

  return { ok: okHypothesis && okBand };
}

module.exports = { run };

