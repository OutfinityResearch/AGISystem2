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

    const result = session.learn('hasState Box Closed\nhasState Box Open');
    assert.equal(result.success, false);
    assert.ok(result.errors.some(err => err.includes('Contradiction rejected')));

    assert.equal(session.kbFacts.length, 0);
    assert.equal(session.vocabulary.has('hasState'), false);
    assert.equal(session.declaredOperators.has('hasState'), false);

    // After rollback, the session must not retain stale contradiction state.
    const ok = session.learn('hasState Box Closed');
    assert.equal(ok.success, true);
    assert.equal(session.kbFacts.length, 1);
  });

  test('rolls back learn when Load fails inside program', () => {
    const session = new Session();
    const dsl = `loves John Mary\n@_ Load "${FIXTURE_PATH}"\nlikes Bob Pizza`;

    const result = session.learn(dsl);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(err => err.includes('Load failed')));

    assert.equal(session.kbFacts.length, 0);
    assert.equal(session.vocabulary.has('loves'), false);
    assert.equal(session.vocabulary.has('likes'), false);
  });
});
