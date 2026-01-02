import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('URC provenance materialization', () => {
  test('executeNL records provenance and can materialize derived audit DSL lines', () => {
    const session = new Session({ geometry: 2048 });
    const loaded = session.loadPack('URC', { includeIndex: true, validate: false });
    assert.equal(loaded.success, true);
    const extras = session.loadPack('tests_and_evals', { includeIndex: true, validate: false });
    assert.equal(extras.success, true, JSON.stringify(extras.errors));

    const res = session.executeNL(
      { mode: 'learn', text: 'Anne is a Dog.' },
      { materializeFacts: true }
    );
    assert.equal(res.success, true);
    assert.ok(Array.isArray(session.provenanceLog));
    assert.ok(session.provenanceLog.length >= 1);

    const entry = session.provenanceLog[session.provenanceLog.length - 1];
    assert.equal(entry.materialized, true);
    assert.ok(Array.isArray(entry.materializedFactLines));
    assert.ok(entry.materializedFactLines.length > 0);
    assert.ok(entry.materializedFactLines.some(l => String(l).startsWith('sourceText ')));
    assert.ok(entry.materializedFactLines.some(l => String(l).startsWith('interprets ')));
    assert.ok(entry.materializedFactLines.some(l => String(l).startsWith('decisionKind ')));

    // DS73: provenance materialization must not be injected into the KB truth store.
    const hasSourceText = session.kbFacts.some(f => f?.metadata?.operator === 'sourceText');
    const hasInterprets = session.kbFacts.some(f => f?.metadata?.operator === 'interprets');
    const hasDecisionKind = session.kbFacts.some(f => f?.metadata?.operator === 'decisionKind');
    assert.equal(hasSourceText, false);
    assert.equal(hasInterprets, false);
    assert.equal(hasDecisionKind, false);
  });
});
