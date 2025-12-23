import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bind } from '../../../src/core/operations.mjs';
import { withPosition } from '../../../src/core/position.mjs';
import { Session } from '../../../src/runtime/session.mjs';

test('Multiple sessions can use different HDC strategies in the same process', () => {
  const dense = new Session({ hdcStrategy: 'dense-binary', geometry: 2048, reasoningPriority: 'symbolicPriority' });
  const metric = new Session({ hdcStrategy: 'metric-affine', geometry: 32, reasoningPriority: 'symbolicPriority' });

  const a = dense.vocabulary.getOrCreate('Alice');
  const b = metric.vocabulary.getOrCreate('Bob');

  assert.equal(a.strategyId, 'dense-binary');
  assert.equal(b.strategyId, 'metric-affine');

  const aPos = withPosition(1, a);
  const bPos = withPosition(1, b);

  assert.equal(aPos.strategyId, 'dense-binary');
  assert.equal(bPos.strategyId, 'metric-affine');

  assert.throws(() => bind(a, b), /Mixed HDC strategies/);

  dense.close();
  metric.close();
});

