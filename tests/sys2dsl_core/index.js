const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  let ok = true;

  // Topological evaluation: statement order does not matter as long as dependencies are acyclic.
  session.run(['@f ASSERT dog IS_A Animal']);
  const scriptTopo = [
    '@b BOOL_AND $a $a',
    '@a NONEMPTY $list',
    '@list FACTS_MATCHING "dog IS_A Animal"'
  ];
  const envTopo = session.run(scriptTopo);
  const b = envTopo.b || {};
  ok = ok && b.truth === 'TRUE_CERTAIN';

  // Cycle detection: a <-> b should report an error.
  let cycleDetected = false;
  const scriptCycle = [
    '@a NONEMPTY $b',
    '@b NONEMPTY $a'
  ];
  try {
    session.run(scriptCycle);
  } catch (e) {
    cycleDetected = true;
  }
  ok = ok && cycleDetected;

  // MASK_PARTITIONS + ASK_MASKED wiring.
  const maskEnv = session.run([
    '@m MASK_PARTITIONS ontology',
    '@q ASK_MASKED $m "dog IS_A Animal?"'
  ]);
  const qMasked = maskEnv.q || {};
  ok = ok && typeof qMasked.truth === 'string' && qMasked.maskSpec === 'ontology';

  return { ok };
}

module.exports = { run };

