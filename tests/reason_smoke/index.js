const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });
  api.ingest('Dog IS_A Animal');
  api.ingest('Water HAS_PROPERTY boiling_point=100');

  const q = api.ask('Is Dog an Animal?');
  const ok = q.truth === 'TRUE_CERTAIN';

  return { ok };
}

module.exports = { run };
