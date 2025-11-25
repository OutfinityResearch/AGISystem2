const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  session.run(['@f ASSERT dog IS_A Animal']);
  const env = session.run(['@q ASK "Is Dog an Animal?"']);
  const res = env.q || env.result || {};
  const ok1 = res.truth === 'TRUE_CERTAIN';

  let threw = false;
  try {
    session.run(['Tell me a story about dogs.']);
  } catch (e) {
    threw = true;
  }

  return { ok: ok1 && threw };
}

module.exports = { run };
