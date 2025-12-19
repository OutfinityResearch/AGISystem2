import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DS19: Semantic Unification — canonicalization', () => {
  test.skip(
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
      assert.deepEqual(m1, m3);
    }
  );

  test.skip(
    'synonyms/aliases normalize (proof includes synonym step)',
    () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        synonym Car Automobile
        isA Car Vehicle
      `);

      const result = session.prove('@goal isA Automobile Vehicle');

      // TODO(DS19):
      // - query should canonicalize Automobile -> Car (or the chosen canonical representative)
      // - proof MUST include a synonym step explaining the rewrite
      assert.equal(result.valid, true);
      assert.ok(Array.isArray(result.proof?.steps));
      assert.ok(result.proof.steps.some(s => s.kind === 'synonym'));
    }
  );
});
