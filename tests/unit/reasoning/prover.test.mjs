/**
 * Tests for Proof Engine
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProofEngine } from '../../../src/reasoning/prove.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';

test('ProofEngine: constructor and basic operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // Default options
  assert.ok(prover.session === session);
  assert.ok(prover.options.maxDepth > 0);
  assert.ok(prover.options.timeout > 0);

  // Custom options
  const prover2 = new ProofEngine(session, { maxDepth: 5, timeout: 1000 });
  assert.equal(prover2.options.maxDepth, 5);
  assert.equal(prover2.options.timeout, 1000);

  // combineConfidences
  assert.equal(prover.combineConfidences([]), 1.0);
  const results = [{ confidence: 0.9 }, { confidence: 0.7 }, { confidence: 0.8 }];
  const combined = prover.combineConfidences(results);
  assert.ok(combined <= 0.7 && combined > 0.6);
});

test('ProofEngine: prove operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // Test direct fact proof - use anonymous fact for KB persistence
  session.learn('isA Socrates Human');
  const goal = parse('@g isA Socrates Human').statements[0];
  const result = prover.prove(goal);

  assert.ok('valid' in result);
  assert.ok('proof' in result);
  assert.ok('confidence' in result);
  assert.ok('steps' in result);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
  assert.ok(Array.isArray(result.steps));
});

test('ProofEngine: tryDirectMatch operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // With fact - use anonymous fact for KB persistence
  session.learn('exact Match');
  const goal1 = parse('@g exact Match').statements[0];
  const goalVector1 = session.executor.buildStatementVector(goal1);
  const result1 = prover.tryDirectMatch(goalVector1, 'exact Match');
  assert.ok('success' in result1);
  assert.ok('confidence' in result1);

  // Without fact (new session)
  const session2 = new Session({ geometry: 2048 });
  const prover2 = new ProofEngine(session2);
  const goal2 = parse('@g missing Fact').statements[0];
  const goalVector2 = session2.executor.buildStatementVector(goal2);
  const result2 = prover2.tryDirectMatch(goalVector2, 'missing Fact');
  assert.equal(result2.success, false);
  assert.equal(result2.confidence, 0);
});

// ================================================================
// TRANSITIVE REASONING TESTS
// ================================================================

test('Session.prove: transitive isA - 2-step chain', () => {
  const session = new Session({ geometry: 2048 });

  // Learn: Socrates -> Philosopher -> Human
  session.learn('isA Socrates Philosopher');
  session.learn('isA Philosopher Human');

  // Direct fact should prove
  const direct = session.prove('@goal isA Socrates Philosopher');
  assert.equal(direct.valid, true, 'Direct fact should be provable');

  // Transitive: Socrates -> Human (via Philosopher)
  const transitive = session.prove('@goal isA Socrates Human');
  assert.equal(transitive.valid, true, 'Transitive isA should be provable (2-step)');
  assert.ok(transitive.confidence > 0.5, 'Transitive proof should have reasonable confidence');
});

test('Session.prove: transitive isA - 3-step chain', () => {
  const session = new Session({ geometry: 2048 });

  // Learn: Socrates -> Philosopher -> Human -> Primate
  session.learn('isA Socrates Philosopher');
  session.learn('isA Philosopher Human');
  session.learn('isA Human Primate');

  // 3-step: Socrates -> Primate
  const result = session.prove('@goal isA Socrates Primate');
  assert.equal(result.valid, true, 'Transitive isA should be provable (3-step)');
});

test('Session.prove: transitive locatedIn - 2-step chain', () => {
  const session = new Session({ geometry: 2048 });

  // Learn: SacreCoeur -> Montmartre -> Paris
  session.learn('locatedIn SacreCoeur Montmartre');
  session.learn('locatedIn Montmartre Paris');

  // Direct fact should prove
  const direct = session.prove('@goal locatedIn SacreCoeur Montmartre');
  assert.equal(direct.valid, true, 'Direct locatedIn should be provable');

  // Transitive: SacreCoeur -> Paris
  const transitive = session.prove('@goal locatedIn SacreCoeur Paris');
  assert.equal(transitive.valid, true, 'Transitive locatedIn should be provable');
});

test('Session.prove: transitive - negative case (no chain exists)', () => {
  const session = new Session({ geometry: 2048 });

  // Learn disconnected facts
  session.learn('isA Rex Dog');
  session.learn('isA Cat Animal');  // Rex is not connected to Animal

  // Should NOT prove (no transitive path)
  const result = session.prove('@goal isA Rex Animal');
  assert.equal(result.valid, false, 'Should not prove without valid chain');
});

test('Session.prove: transitive isA - 5-step chain', () => {
  const session = new Session({ geometry: 2048 });

  // Long chain: A -> B -> C -> D -> E -> F
  session.learn('isA Socrates Philosopher');
  session.learn('isA Philosopher Human');
  session.learn('isA Human Primate');
  session.learn('isA Primate Mammal');
  session.learn('isA Mammal Animal');

  // 5-step: Socrates -> Animal
  const result = session.prove('@goal isA Socrates Animal');
  assert.equal(result.valid, true, 'Transitive isA should work for 5-step chain');
});
