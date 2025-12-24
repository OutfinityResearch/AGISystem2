/**
 * Regression: `Not ( ... )` should treat inner Compound as a quoted statement.
 *
 * Core defines some common DSL operators (e.g. `isA`) as graphs/macros.
 * When `isA` appears as a Compound inside `Not`, we still need a stable vector
 * identity that depends on the inner statement args, otherwise:
 * - distinct Not-goals can collapse to identical vectors
 * - cycle detection can incorrectly prune valid proofs (contrapositive, etc.)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';

test('Not(statement) vector depends on inner compound args (even when inner operator is a graph)', () => {
  const session = new Session({ geometry: 256, hdcStrategy: 'dense-binary' });
  const core = session.loadCore({ includeIndex: false });
  assert.equal(core.success, true);

  const stmtY = parse('@goal:goal Not (isA Stella Yumpus)').statements[0];
  const stmtT = parse('@goal:goal Not (isA Stella Tumpus)').statements[0];

  const vecY = session.executor.buildStatementVector(stmtY);
  const vecT = session.executor.buildStatementVector(stmtT);

  assert.equal(vecY.geometry, vecT.geometry);
  assert.notDeepEqual(Array.from(vecY.data), Array.from(vecT.data));
});

