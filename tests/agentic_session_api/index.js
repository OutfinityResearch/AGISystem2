const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  // v3 syntax: @varName Subject VERB Object - unique names for tracking
  session.run(['@f0 dog IS_A Animal']);
  // v3 query syntax: @variable Subject VERB Object (ASK is implicit via variable binding)
  const env = session.run(['@q Dog IS_A Animal']);
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
