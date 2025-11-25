const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();
  session.run([
    '@f1 ASSERT dog IS_A Animal',
    '@f2 ASSERT Water HAS_PROPERTY boiling_point=100'
  ]);

  const env = session.run(['@q ASK "Is Dog an Animal?"']);
  const q = env.q || env.result || {};
  const ok = q.truth === 'TRUE_CERTAIN';

  return { ok };
}

module.exports = { run };
