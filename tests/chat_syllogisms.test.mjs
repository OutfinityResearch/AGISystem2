/**
 * Simple chat-level reasoning tests for classic logic examples.
 *
 * Focus:
 * - Categorical syllogism (Socrates is mortal)
 * - Negative inference via disjointness (whale not fish)
 *
 * These tests run in offline mode using AGISYSTEM2_FAKE_LLM so that
 * only deterministic reasoning is exercised (no external LLM calls).
 */

// Enable fake LLM mode for deterministic, offline tests
process.env.AGISYSTEM2_FAKE_LLM = '1';

import { ChatEngine } from '../chat/chat_engine.mjs';

const TESTS = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  TESTS.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Running Chat Syllogism Tests\n');
  console.log('='.repeat(50));

  for (const t of TESTS) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${t.name}`);
      console.log(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

function getYesNoTruth(actions) {
  const query = actions.find((a) => a.type === 'query');
  if (!query || !query.result) return null;
  return query.result.truth;
}

// Test 1: Classic syllogism using base ontology mortality fact
test('Socrates is mortal (via human IS_A mortal)', async () => {
  const engine = new ChatEngine({});
  const init = await engine.initialize();
  assert(init.success, 'Engine should initialize');

  // Teach: Socrates is a human. Humans are mortal.
  const r1 = await engine.processMessage('Socrates is a human. Humans are mortal.');
  assert(r1.response, 'Teach response should exist');

  // Ask: Is Socrates mortal?
  const r2 = await engine.processMessage('Is Socrates mortal?');
  const truth = getYesNoTruth(r2.actions);
  assert(truth === 'TRUE_CERTAIN' || truth === 'TRUE_DEFAULT' || truth === true,
    `Expected TRUE for "Is Socrates mortal?", got ${truth}`);
});

// Test 2: Negative inference via disjointness (whale is not fish)
test('Whale is not a fish (disjointness inference)', async () => {
  const engine = new ChatEngine({});
  const init = await engine.initialize();
  assert(init.success, 'Engine should initialize');

  // Base ontology already has:
  //  - whale IS_A mammal
  //  - mammal DISJOINT_WITH fish
  // We still send a simple teaching sentence to exercise NL→facts.
  const r1 = await engine.processMessage('Whale is a mammal.');
  assert(r1.response, 'Teach response should exist');

  // Ask: Is whale a fish?
  const r2 = await engine.processMessage('Is whale a fish?');
  const truth = getYesNoTruth(r2.actions);
  assert(truth === 'FALSE' || truth === false,
    `Expected FALSE for "Is whale a fish?", got ${truth}`);
});

// Test 3: Causal reasoning using CAUSES relation from base ontology
test('Causal reasoning: heat causes expansion', async () => {
  const engine = new ChatEngine({});
  const init = await engine.initialize();
  assert(init.success, 'Engine should initialize');

  // Base ontology includes: heat CAUSES expansion
  const r = await engine.processMessage('What does heat cause?');
  const causesAction = r.actions.find((a) => a.type === 'causes_query');
  assert(causesAction && causesAction.result, 'Should produce a causes_query result');

  const causes = causesAction.result.causes || [];
  assert(Array.isArray(causes) && causes.includes('expansion'),
    `Expected 'expansion' among causes of heat, got ${JSON.stringify(causes)}`);
});

runTests();
