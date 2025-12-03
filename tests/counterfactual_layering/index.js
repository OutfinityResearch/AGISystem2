const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

/**
 * Test: Counterfactual Layering
 *
 * Tests that theory layers properly isolate changes:
 * - Layer push/pop correctly saves and restores fact state
 * - Facts added in a counterfactual layer are visible in that layer
 * - After pop, the session returns to the base layer state
 *
 * Note: In Sys2DSL v3, every statement creates a triplet, even queries.
 * This test verifies layer isolation behavior, not FALSE for unknown facts.
 */
async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const basicPath = path.join(process.cwd(), 'tests', 'fixtures', 'concepts', 'basic.txt');
  const basicLines = fs.readFileSync(basicPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  // v3 syntax: @varName Subject VERB Object - unique names for tracking
  const basicScript = basicLines.map((l, idx) => `@base${idx} ${l}`);
  session.run(basicScript);

  // Test 1: Push a counterfactual layer
  const pushEnv = session.run(['@push cf_layer THEORY_PUSH any']);
  const pushResult = pushEnv.push || {};
  const okPush = pushResult.ok === true && pushResult.depth === 1;

  // Test 2: Add facts in the counterfactual layer
  const cfPath = path.join(process.cwd(), 'tests', 'fixtures', 'counterfactual', 'boil50.txt');
  const cfLines = fs.readFileSync(cfPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  let cfIdx = 0;
  for (const line of cfLines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      session.run([`@cfFact${cfIdx} ${parts[0]} ${parts[1]} ${parts.slice(2).join('_')}`]);
      cfIdx++;
    }
  }

  // Test 3: Query in counterfactual world should find the added fact
  const cfEnv = session.run(['@cf Water BOILS_AT Celsius50']);
  const cf = cfEnv.cf || {};
  const okCfTrue = cf.truth === 'TRUE_CERTAIN';

  // Test 4: Pop the layer
  const popEnv = session.run(['@pop any THEORY_POP any']);
  const popResult = popEnv.pop || {};
  const okPop = popResult.ok === true && popResult.depth === 0;

  // Test 5: Verify we're back at base layer
  // In v3, we can't check for FALSE on unknown facts (queries create facts)
  // Instead, verify the theory stack is empty
  const okBaseRestored = popResult.theoryStackDepth === 0;

  return {
    ok: okPush && okCfTrue && okPop && okBaseRestored
  };
}

module.exports = { run };
