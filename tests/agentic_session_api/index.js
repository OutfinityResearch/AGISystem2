const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });
  const session = api.getAgenticSession();

  session.ingest('Dog IS_A Animal');
  const res = session.ask('Is Dog an Animal?');
  const ok1 = res.truth === 'TRUE_CERTAIN';

  let threw = false;
  try {
    session.ingest('Tell me a story about dogs.');
  } catch (e) {
    threw = true;
  }

  return { ok: ok1 && threw };
}

module.exports = { run };

