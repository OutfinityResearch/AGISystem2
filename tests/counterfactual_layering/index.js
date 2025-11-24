const fs = require('fs');
const path = require('path');
const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });

  const basicPath = path.join(process.cwd(), 'tests', 'fixtures', 'concepts', 'basic.txt');
  const basicLines = fs.readFileSync(basicPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of basicLines) {
    api.ingest(line);
  }

  const base = api.ask('Water HAS_PROPERTY boiling_point=50?');
  const okBaseFalse = base.truth === 'FALSE';

  const cfPath = path.join(process.cwd(), 'tests', 'fixtures', 'counterfactual', 'boil50.txt');
  const cfLines = fs.readFileSync(cfPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);

  const cf = api.counterfactualAsk('Water HAS_PROPERTY boiling_point=50?', cfLines);
  const okCfTrue = cf.truth === 'TRUE_CERTAIN';

  const baseAfter = api.ask('Water HAS_PROPERTY boiling_point=50?');
  const okBaseStillFalse = baseAfter.truth === 'FALSE';

  return { ok: okBaseFalse && okCfTrue && okBaseStillFalse };
}

module.exports = { run };

