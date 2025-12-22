import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { initHDC } from '../../../src/hdc/facade.mjs';

test('Session uses strategy default geometry when SYS2_GEOMETRY is unset', () => {
  const prevEnv = process.env.SYS2_GEOMETRY;
  try {
    process.env.SYS2_GEOMETRY = '';

    const sparse = new Session({ hdcStrategy: 'sparse-polynomial', reasoningPriority: 'symbolicPriority' });
    const metric = new Session({ hdcStrategy: 'metric-affine', reasoningPriority: 'symbolicPriority' });

    assert.equal(sparse.geometry, 4);
    assert.equal(metric.geometry, 32);
  } finally {
    if (prevEnv === undefined) delete process.env.SYS2_GEOMETRY;
    else process.env.SYS2_GEOMETRY = prevEnv;
    initHDC('dense-binary');
  }
});

test('Session geometry option overrides strategy default', () => {
  const prevEnv = process.env.SYS2_GEOMETRY;
  try {
    process.env.SYS2_GEOMETRY = '';

    const session = new Session({
      hdcStrategy: 'sparse-polynomial',
      geometry: 8,
      reasoningPriority: 'symbolicPriority'
    });
    assert.equal(session.geometry, 8);
  } finally {
    if (prevEnv === undefined) delete process.env.SYS2_GEOMETRY;
    else process.env.SYS2_GEOMETRY = prevEnv;
    initHDC('dense-binary');
  }
});
