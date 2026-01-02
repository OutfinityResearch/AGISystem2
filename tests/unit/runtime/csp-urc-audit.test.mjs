/**
 * CSP → URC audit surfaces (v0)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('CSP URC audit (solve csp)', () => {
  test('emits CSP artifacts and evidence for solutions', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Alice Guest
      isA Bob Guest
      isA T1 Table
      isA T2 Table
      conflictsWith Alice Bob
      conflictsWith Bob Alice
    `);

    const res = session.learn(`
      @seating solve csp [
        (variablesFrom Guest),
        (domainFrom Table),
        (noConflict conflictsWith),
        (allDifferent guests)
      ]
    `);

    assert.ok(res.success, 'solve should succeed');
    assert.ok(res.solveResult, 'should return solveResult');
    assert.ok(res.solveResult.solutionCount >= 1, 'should have at least one solution');

    assert.ok(session.urc?.artifacts?.size >= 2, 'should emit at least CSP + solution artifacts');
    assert.ok(session.urc?.evidence?.size >= res.solveResult.solutionCount, 'should emit evidence per solution');

    const artifacts = [...session.urc.artifacts.values()];
    assert.ok(artifacts.some(a => a.format === 'CSP_JSON_V0'), 'should include CSP_JSON_V0 artifact');
    assert.ok(artifacts.some(a => a.format === 'CSP_SOLUTION_JSON_V0'), 'should include CSP_SOLUTION_JSON_V0 artifact');

    const evidence = [...session.urc.evidence.values()];
    assert.ok(evidence.some(e => e.method === 'CP' && e.kind === 'Model' && e.status === 'Sat'), 'should include CP Model evidence');
  });

  test('emits infeasible evidence when no solution exists', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Alice Guest
      isA Bob Guest
      isA T1 Table
      conflictsWith Alice Bob
      conflictsWith Bob Alice
    `);

    const res = session.learn(`
      @seating solve csp [
        (variablesFrom Guest),
        (domainFrom Table),
        (noConflict conflictsWith),
        (allDifferent guests)
      ]
    `);

    assert.ok(res.success, 'solve execution should succeed (even if infeasible)');
    assert.ok(res.solveResult, 'should return solveResult');
    assert.equal(res.solveResult.success, false, 'should be infeasible');

    const evidence = [...(session.urc?.evidence?.values?.() || [])];
    assert.ok(evidence.some(e => e.method === 'CP' && e.kind === 'Trace' && e.status === 'Infeasible'), 'should include CP Trace(Infeasible) evidence');
  });
});

