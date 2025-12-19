import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../src/runtime/session.mjs';

test('HDC strategies smoke: sessions can learn/prove with each strategy', async (t) => {
  const strategies = ['dense-binary', 'sparse-polynomial', 'metric-affine'];

  for (const strategy of strategies) {
    await t.test(strategy, () => {
      const session = new Session({
        geometry: 2048,
        hdcStrategy: strategy,
        reasoningPriority: 'symbolicPriority',
        reasoningProfile: 'legacy'
      });

      session.learn('isA Socrates Human');
      const result = session.prove('@g isA Socrates Human');
      assert.equal(result.valid, true);
    });
  }
});

