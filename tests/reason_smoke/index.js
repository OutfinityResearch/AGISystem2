const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();
  // v3 syntax: @varName Subject VERB Object - unique names for tracking
  session.run([
    '@f0 dog IS_A Animal',
    '@f1 Water BOILS_AT Celsius100'
  ]);

  // v3 query syntax: @variable Subject VERB Object (ASK is implicit via variable binding)
  const env = session.run(['@q Dog IS_A Animal']);
  const q = env.q || env.result || {};
  const ok = q.truth === 'TRUE_CERTAIN';

  return { ok };
}

module.exports = { run };
