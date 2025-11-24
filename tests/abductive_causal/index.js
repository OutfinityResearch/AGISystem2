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

  const resInverse = api.abduct('Smoke', 'CAUSED_BY');
  const okInverse = resInverse.hypothesis === 'Fire';

  const resNoRel = api.abduct('Smoke', null);
  const okNoRel = resNoRel.hypothesis === 'Fire';

  return { ok: okHypothesis && okBand && okInverse && okNoRel };
}

module.exports = { run };
