import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

function stripSource(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  if (Array.isArray(meta)) return meta.map(stripSource);

  const { source, ...rest } = meta;
  const out = {};
  for (const [k, v] of Object.entries(rest)) out[k] = stripSource(v);
  return out;
}

describe('DS19: Semantic Unification — canonicalization', () => {
  test(
    'equivalent DSL encodings normalize to identical canonical metadata',
    () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        # Two ways to express the same negation should converge:
        @f1 Not (isA Socrates Human)
        @f2 isA Socrates Human
        @f3 Not $f2
      `);

      // TODO(DS19):
      // - session.referenceMetadata should store canonical metadata for @f1/@f3
      // - canonical metadata for f1 and f3 MUST be identical
      //
      // Example expected:
      //   { operator: 'Not', args: [{ operator: 'isA', args: ['Socrates','Human'] }] }
      const m1 = session.referenceMetadata.get('f1');
      const m3 = session.referenceMetadata.get('f3');
      assert.ok(m1, 'expected canonical metadata for @f1');
      assert.ok(m3, 'expected canonical metadata for @f3');
      // Source provenance is intentionally preserved and may differ between statements; compare semantics only.
      assert.deepEqual(stripSource(m1), stripSource(m3));
    }
  );

  test(
    'synonyms/aliases normalize (proof includes synonym step)',
    () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        synonym Car Automobile
        isA Car Vehicle
      `);

      const canonical = session.componentKB.canonicalizeName('Car');
      const nonCanonical = canonical === 'Car' ? 'Automobile' : 'Car';
      const result = session.prove(`@goal isA ${nonCanonical} Vehicle`);

      // TODO(DS19):
      // - query should canonicalize nonCanonical -> canonical
      // - proof MUST include a synonym step explaining the rewrite
      assert.equal(result.valid, true);
      assert.ok(Array.isArray(result.proofObject?.steps));
      assert.ok(result.proofObject.steps.some(s => s.kind === 'synonym'));
    }
  );

  test(
    'canonical/alias mappings normalize (proof includes canonical step)',
    () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        alias Car Automobile
        isA Car Vehicle
      `);

      const result = session.prove('@goal isA Car Vehicle');
      assert.equal(result.valid, true);
      assert.ok(Array.isArray(result.proofObject?.steps));
      assert.ok(
        result.proofObject.steps.some(s => s.kind === 'synonym' && typeof s.detail?.canonicalUsed === 'string')
      );
    }
  );
});
