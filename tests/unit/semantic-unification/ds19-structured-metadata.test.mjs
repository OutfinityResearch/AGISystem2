import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { metadataToCanonicalDsl } from '../../../src/runtime/metadata-to-dsl.mjs';

function stripSource(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  if (Array.isArray(meta)) return meta.map(stripSource);

  const { source, ...rest } = meta;
  const out = {};
  for (const [k, v] of Object.entries(rest)) out[k] = stripSource(v);
  return out;
}

describe('DS19: structured metadata for compound + rules', () => {
  test('stores And parts metadata for proof-real reconstruction', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    session.learn(`
      @a:a isA Socrates Human
      @b:b isA Socrates Mortal
      @c:c And $a $b
    `);

    const meta = session.referenceMetadata.get('c');
    assert.equal(meta.operator, 'And');
    assert.ok(Array.isArray(meta.parts));
    assert.equal(meta.parts.length, 2);
    assert.deepEqual(stripSource(meta.parts[0]), { operator: 'isA', args: ['Socrates', 'Human'] });
    assert.deepEqual(stripSource(meta.parts[1]), { operator: 'isA', args: ['Socrates', 'Mortal'] });

    assert.equal(metadataToCanonicalDsl(meta), 'And (isA Socrates Human) (isA Socrates Mortal)');
  });

  test('stores Implies condition/conclusion metadata for proof-real reconstruction', () => {
    const session = new Session({ geometry: 2048, strictMode: true, enforceCanonical: true });

    session.learn(`
      @c:c isA Socrates Human
      @d:d isA Socrates Mortal
      @r Implies $c $d
    `);

    const meta = session.referenceMetadata.get('r');
    assert.equal(meta.operator, 'Implies');
    assert.deepEqual(stripSource(meta.condition), { operator: 'isA', args: ['Socrates', 'Human'] });
    assert.deepEqual(stripSource(meta.conclusion), { operator: 'isA', args: ['Socrates', 'Mortal'] });

    assert.equal(metadataToCanonicalDsl(meta), 'Implies (isA Socrates Human) (isA Socrates Mortal)');
  });
});
