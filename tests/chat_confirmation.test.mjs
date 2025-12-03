/**
 * Tests for chat confirmation handling
 *
 * Tests the pending action confirmation flow:
 * - Contradiction detection triggers pending action
 * - User confirmation creates theory branch
 * - User rejection cancels operation
 * - New message cancels pending and processes normally
 */

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
  console.log('Running Chat Confirmation Tests\n');
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

// Test 1: Confirmation creates theory branch
test('Confirmation "yes" creates theory branch', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  // Add contradicting facts
  const r1 = await engine.processMessage('Cats are mammals. Cats are fish.');
  assert(r1.response.includes('contradiction'), 'Should detect contradiction');
  assert(r1.response.includes('theory branch'), 'Should suggest theory branch');
  assert(engine.pendingAction !== null, 'Should have pending action');
  assert(engine.pendingAction.type === 'create_theory_branch', 'Pending type should be create_theory_branch');

  // Confirm
  const r2 = await engine.processMessage('yes');
  assert(r2.response.includes('Created new theory branch'), 'Should create theory branch');
  assert(r2.actions.some(a => a.type === 'theory_created'), 'Should have theory_created action');
  assert(r2.actions.some(a => a.type === 'fact_added'), 'Should have fact_added actions');
  assert(engine.pendingAction === null, 'Pending action should be cleared');
});

// Test 2: Confirmation "yes please" works
test('Confirmation "yes please" creates theory branch', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  await engine.processMessage('Dogs are cats.');
  const r = await engine.processMessage('yes please');
  assert(r.response.includes('Created new theory branch'), 'Should create theory branch');
});

// Test 3: Confirmation "ok" works
test('Confirmation "ok" creates theory branch', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  await engine.processMessage('Birds are mammals.');
  const r = await engine.processMessage('ok');
  assert(r.response.includes('Created new theory branch'), 'Should create theory branch');
});

// Test 4: Rejection cancels operation
test('Rejection "no" cancels theory branch creation', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  await engine.processMessage('Fish are birds.');
  assert(engine.pendingAction !== null, 'Should have pending action');

  const r = await engine.processMessage('no');
  assert(r.response.includes("won't create"), 'Should indicate cancellation');
  assert(r.actions.some(a => a.type === 'confirmation_rejected'), 'Should have rejection action');
  assert(engine.pendingAction === null, 'Pending action should be cleared');
});

// Test 5: Rejection "cancel" works
test('Rejection "cancel" cancels operation', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  // Use a fact that creates a clear contradiction with base ontology
  // (bird DISJOINT_WITH mammal) so a theory branch is suggested
  await engine.processMessage('Birds are mammals.');
  const r = await engine.processMessage('cancel');
  assert(r.response.includes("won't create"), 'Should indicate cancellation');
});

// Test 6: New message cancels pending and processes
test('New message cancels pending and processes normally', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  // Use facts that create deterministic contradiction (same subject, two IS_A)
  await engine.processMessage('Whales are mammals. Whales are fish.');
  assert(engine.pendingAction !== null, 'Should have pending action');

  // Send completely different message
  const r = await engine.processMessage('Dogs are animals.');
  // Should process as new teach, not as confirmation
  assert(!r.response.includes("won't create"), 'Should not be a rejection response');
  assert(engine.pendingAction === null, 'Pending action should be cleared');
});

// Test 7: Multiple confirmations don't stack
test('No pending action when no contradiction', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  // Add non-contradicting fact
  const r = await engine.processMessage('Lions are mammals.');
  assert(engine.pendingAction === null, 'Should not have pending action');
  assert(r.response.includes("I've learned"), 'Should add fact normally');
});

// Test 8: Theory branch actually contains facts
test('Theory branch contains the contradicting facts', async () => {
  const engine = new ChatEngine({});
  await engine.initialize();

  // Use a fact that contradicts base ontology (whale IS_A mammal,
  // mammal DISJOINT_WITH fish) so the new fact is added into a
  // separate theory branch after confirmation.
  await engine.processMessage('Whales are fish.');
  const r = await engine.processMessage('yes');

  // Check that facts were added
  const factActions = r.actions.filter(a => a.type === 'fact_added');
  assert(factActions.length > 0, 'Should have added facts');

  // Check that the response mentions the facts
  assert(r.response.includes('fact(s)'), 'Should mention facts added');

  // Verify the facts in actions
  const hasWhale = factActions.some(a =>
    a.fact.subject.toLowerCase().includes('whale') ||
    a.fact.object.toLowerCase().includes('whale')
  );
  assert(hasWhale, 'Should have Whale in added facts');
});

// Run all tests
runTests();
