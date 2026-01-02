import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('URC orchestrator preferences', () => {
  test('uses PreferBackend to select Compile_SMTLIB2 for SMT fragments', () => {
    const session = new Session({ geometry: 2048 });
    const loaded = session.loadPack('URC', { includeIndex: true, validate: false });
    assert.equal(loaded.success, true, `URC pack load failed: ${JSON.stringify(loaded.errors || [])}`);
    const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
    assert.equal(extras.success, true, `tests_and_evals pack load failed: ${JSON.stringify(extras.errors || [])}`);

    const res = session.orchestrate({ goalKind: 'Find', dsl: 'leq 1 2' }, { materializeFacts: false });
    assert.equal(res.success, true);
    assert.equal(res.plan.fragment, 'Frag_SMT_LRA');
    assert.equal(res.plan.selectedBackend, 'Compile_SMTLIB2');
    assert.ok(res.artifact?.id, 'expected compiled artifact');
    assert.equal(res.plan.steps?.[0]?.backend, 'Compile_SMTLIB2');
  });

  test('can override PreferBackend to force Internal planning step for SMT fragments', () => {
    const session = new Session({ geometry: 2048 });
    const loaded = session.loadPack('URC', { includeIndex: true, validate: false });
    assert.equal(loaded.success, true, `URC pack load failed: ${JSON.stringify(loaded.errors || [])}`);
    const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
    assert.equal(extras.success, true, `tests_and_evals pack load failed: ${JSON.stringify(extras.errors || [])}`);

    // Override: choose Internal backend instead of compile.
    const override = session.learn('PreferBackend Find Frag_SMT_LRA Internal');
    assert.equal(override.success, true);

    const res = session.orchestrate({ goalKind: 'Find', dsl: 'leq 1 2' }, { materializeFacts: false });
    assert.equal(res.success, true);
    assert.equal(res.plan.fragment, 'Frag_SMT_LRA');
    assert.equal(res.plan.selectedBackend, 'Internal');
    assert.equal(res.plan.steps?.[0]?.backend, 'Internal');
    assert.equal(res.plan.steps?.[0]?.status, 'Planned');
    assert.ok(!res.artifact, 'should not compile when backend is Internal');
  });
});
