/**
 * Session transaction tests
 * Ensure learn is all-or-nothing on failure.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from '../../../src/runtime/session.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, '..', '..', 'fixtures', 'load-failure.sys2');

describe('Session Transactions', () => {
  test('rolls back learn when contradictions are rejected', () => {
    const session = new Session({
      reasoningProfile: 'theoryDriven',
      rejectContradictions: true
    });

    // Use a baseline contradiction declared in `config/Packs/Consistency/14-constraints.sys2`.
    const result = session.learn('before Box Shelf\nafter Box Shelf');
    assert.equal(result.success, false);
    assert.ok(result.errors.some(err => err.includes('Contradiction rejected')));

    assert.equal(session.kbFacts.length, 0);
    assert.equal(session.vocabulary.has('before'), false);
    assert.equal(session.declaredOperators.has('before'), false);

    // After rollback, the session must not retain stale contradiction state.
    const ok = session.learn('before Box Shelf');
    assert.equal(ok.success, true);
    assert.equal(session.kbFacts.length, 1);
  });

  test('rollback does not leak canonicalized tokens into vocabulary when canonical target is scope-bound', () => {
    const session = new Session({
      reasoningProfile: 'theoryDriven',
      rejectContradictions: true
    });

    // Bind canonical tokens in scope (declarations typically come from theories).
    const decl = session.learn('@X:X ___NewVector');
    assert.equal(decl.success, true);
    assert.equal(session.scope.has('X'), true);
    assert.equal(session.vocabulary.has('X'), false);

    // Establish canonicalization mapping: Z -> X.
    const alias = session.learn('alias Z X');
    assert.equal(alias.success, true);

    // Learn a non-contradictory baseline fact (uses scope-bound X).
    const base = session.learn('before Door X');
    assert.equal(base.success, true);

    // Rejected learn must not leave `X` created in vocabulary via canonicalization.
    const beforeSize = session.vocabulary.size;
    const beforeHasX = session.vocabulary.has('X');

    // Canonicalization maps Z -> X, yielding `after Door X`, which contradicts `before Door X`.
    const rejected = session.learn('after Door Z');
    assert.equal(rejected.success, false);
    assert.ok(rejected.errors.some(err => err.includes('Contradiction rejected')));

    assert.equal(session.vocabulary.size, beforeSize);
    assert.equal(session.vocabulary.has('X'), beforeHasX);
  });

  test('rolls back learn when Load fails inside program', () => {
    const session = new Session();
    const dsl = `isA John Human\n@_ Load "${FIXTURE_PATH}"\nisA Bob Human`;

    const result = session.learn(dsl);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(err => err.includes('Load failed')));

    assert.equal(session.kbFacts.length, 0);
    assert.equal(session.vocabulary.has('John'), false);
    assert.equal(session.vocabulary.has('Bob'), false);
  });
});
