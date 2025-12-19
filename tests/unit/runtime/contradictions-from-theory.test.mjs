import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Contradictions (theory-driven via SemanticIndex)', () => {
  test('warns on mutuallyExclusive pairs defined in config/Core/14-constraints.sys2', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    const r1 = session.learn('hasState Door Open');
    assert.equal(r1.success, true);
    assert.equal(r1.warnings.length, 0);

    const r2 = session.learn('hasState Door Closed');
    assert.equal(r2.success, true);
    assert.ok(r2.warnings.some(w => w.includes('contradiction')), JSON.stringify(r2.warnings));
  });

  test('warns on contradictsSameArgs pairs defined in config/Core/14-constraints.sys2', () => {
    const session = new Session({ geometry: 2048, reasoningProfile: 'theoryDriven' });

    const r1 = session.learn('before A B');
    assert.equal(r1.success, true);
    assert.equal(r1.warnings.length, 0);

    const r2 = session.learn('after A B');
    assert.equal(r2.success, true);
    assert.ok(r2.warnings.some(w => w.includes('before') && w.includes('after')), JSON.stringify(r2.warnings));
  });
});
