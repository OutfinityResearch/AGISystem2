import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { metadataToCanonicalDsl } from '../../../src/runtime/metadata-to-dsl.mjs';

describe('DS19: structured metadata for quantifiers', () => {
  test('stores Exists variable + body metadata and can reconstruct canonical DSL', () => {
    const session = new Session({ hdcStrategy: 'dense-binary', geometry: 256, strictMode: true, enforceCanonical: true });
    const core = session.loadCore({ includeIndex: false });
    assert.equal(core.success, true);

    session.learn('@q Exists ?x (And (isA ?x Pet) (isA ?x Rabbit))');

    const meta = session.referenceMetadata.get('q');
    assert.equal(meta.operator, 'Exists');
    assert.equal(meta.variable, '?x');
    assert.equal(meta.body?.operator, 'And');
    assert.equal(Array.isArray(meta.body?.parts), true);
    assert.deepEqual(meta.body.parts[0], { operator: 'isA', args: ['?x', 'Pet'] });
    assert.deepEqual(meta.body.parts[1], { operator: 'isA', args: ['?x', 'Rabbit'] });

    assert.equal(metadataToCanonicalDsl(meta), 'Exists ?x (And (isA ?x Pet) (isA ?x Rabbit))');
  });
});

