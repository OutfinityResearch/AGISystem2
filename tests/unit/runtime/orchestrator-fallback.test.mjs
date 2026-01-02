import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('URC orchestrator fallback chain', () => {
  test('uses FallbackTo when PreferBackend selects an unknown backend', () => {
    const session = new Session({ geometry: 2048 });
    const loaded = session.loadPack('URC', { includeIndex: true, validate: false });
    assert.equal(loaded.success, true, `URC pack load failed: ${JSON.stringify(loaded.errors || [])}`);
    const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
    assert.equal(extras.success, true, `tests_and_evals pack load failed: ${JSON.stringify(extras.errors || [])}`);

    session.learn([
      'PreferBackend Find Frag_SMT_LRA WeirdBackend',
      'FallbackTo WeirdBackend Compile_SMTLIB2'
    ].join('\n'));

    const res = session.orchestrate({ goalKind: 'Find', dsl: 'leq 1 2' }, { materializeFacts: false });
    assert.equal(res.success, true);
    assert.equal(res.plan.fragment, 'Frag_SMT_LRA');
    assert.deepEqual(res.plan.fallbackChain, ['WeirdBackend', 'Compile_SMTLIB2', 'Internal']);
    assert.equal(res.plan.selectedBackend, 'Compile_SMTLIB2');
    assert.ok(res.artifact?.id, 'expected compiled artifact');

    const lastProv = Array.isArray(session.provenanceLog) ? session.provenanceLog[session.provenanceLog.length - 1] : null;
    assert.equal(lastProv?.kind, 'orchestrator');
    assert.equal(lastProv?.decision?.selectedBackend, 'Compile_SMTLIB2');
  });

  test('falls back to Internal when all candidates are unknown', () => {
    const session = new Session({ geometry: 2048 });
    const loaded = session.loadPack('URC', { includeIndex: true, validate: false });
    assert.equal(loaded.success, true, `URC pack load failed: ${JSON.stringify(loaded.errors || [])}`);
    const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
    assert.equal(extras.success, true, `tests_and_evals pack load failed: ${JSON.stringify(extras.errors || [])}`);

    session.learn([
      'PreferBackend Find Frag_SMT_LRA WeirdBackend',
      'FallbackTo WeirdBackend AnotherBackend'
    ].join('\n'));

    const res = session.orchestrate({ goalKind: 'Find', dsl: 'leq 1 2' }, { materializeFacts: false });
    assert.equal(res.success, true);
    assert.equal(res.plan.fragment, 'Frag_SMT_LRA');
    assert.deepEqual(res.plan.fallbackChain, ['WeirdBackend', 'AnotherBackend']);
    assert.equal(res.plan.selectedBackend, 'Internal');
    assert.ok(!res.artifact, 'should not compile when falling back to Internal');
  });
});
