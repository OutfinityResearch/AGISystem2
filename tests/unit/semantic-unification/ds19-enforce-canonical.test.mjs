import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DS19: enforceCanonical (strict-by-default)', () => {
  test('rewrites persisted L2 primitives into canonical macros', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    // Declare operators used by the test under strict declarations.
    session.learn('@_mtrans:_mtrans __Relation');
    session.learn('@tell:tell __Relation');

    session.learn(`
      @CanonicalRewrite:canonicalRewrite __Relation
      canonicalRewrite _mtrans tell [0, 1, 3] [[0, 2]]
    `);

    const res = session.learn('_mtrans Alice Info Alice Bob');
    assert.equal(res.success, true);

    const fact = session.kbFacts.find(f => f.metadata?.operator === 'tell');
    assert.ok(fact, 'expected canonical tell fact');
    assert.deepEqual(fact.metadata.args, ['Alice', 'Info', 'Bob']);
  });

  test('allows non-persistent internal use of primitives', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    session.learn('@_mtrans:_mtrans __Relation');
    const baseFacts = session.kbFacts.length;
    const res = session.learn('@tmp _mtrans Alice Info Alice Bob');
    assert.equal(res.success, true);
    assert.equal(session.kbFacts.length, baseFacts, 'expected non-persistent statement to not add facts');
  });

  test('rejects non-canonical primitives when rewrite is ambiguous', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    session.learn('@_mtrans:_mtrans __Relation');
    session.learn('@tell:tell __Relation');

    session.learn(`
      @CanonicalRewrite:canonicalRewrite __Relation
      canonicalRewrite _mtrans tell [0, 1, 3] [[0, 2]]
    `);

    const res = session.learn('_mtrans Alice Info Carol Bob');
    assert.equal(res.success, false);
    assert.ok(res.errors.some(e => e.includes('Non-canonical primitive asserted as fact: _mtrans')));
  });

  test('prove() includes a canonical_rewrite step for primitive goals', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });
    session.loadCore({ includeIndex: true });

    session.learn('@_mtrans:_mtrans __Relation');
    session.learn('@tell:tell __Relation');
    session.learn(`
      @CanonicalRewrite:canonicalRewrite __Relation
      canonicalRewrite _mtrans tell [0, 1, 3] [[0, 2]]
    `);

    session.learn('tell Alice Info Bob');

    const res = session.prove('@goal _mtrans Alice Info Alice Bob');
    assert.equal(res.valid, true);
    assert.ok(res.proofObject?.steps?.some(s => s.kind === 'synonym' && s.detail?.operation === 'canonical_rewrite'));
  });

  test('normalizes Not flat form into structured innerOperator/innerArgs', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    const res = session.learn('Not can Penguin Fly');
    assert.equal(res.success, true);

    const fact = session.kbFacts.find(f => f.metadata?.operator === 'Not');
    assert.ok(fact, 'expected Not fact in KB');
    assert.equal(fact.metadata.innerOperator, 'can');
    assert.deepEqual(fact.metadata.innerArgs, ['Penguin', 'Fly']);
  });
});
