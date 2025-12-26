import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { getStrategy } from '../../../src/hdc/strategies/index.mjs';

describe('metric-affine-elastic strategy', () => {
  const strategy = getStrategy('metric-affine-elastic');

  test('createFromName is deterministic', () => {
    const a = strategy.createFromName('John', 32, 'T');
    const b = strategy.createFromName('John', 32, 'T');
    assert.ok(strategy.equals(a, b));
    assert.equal(strategy.similarity(a, b), 1.0);
  });

  test('createFromName is prefix-stable across geometries', () => {
    const v32 = strategy.createFromName('Alpha', 32, 'T');
    const v64 = strategy.createFromName('Alpha', 64, 'T');
    assert.equal(v32.data.length, 32);
    assert.equal(v64.data.length, 64);
    for (let i = 0; i < 32; i++) {
      assert.equal(v32.data[i], v64.data[i]);
    }
  });

  test('bind is exactly self-inverse for atomic vectors', () => {
    const a = strategy.createRandom(32, 1);
    const b = strategy.createRandom(32, 2);
    const c = strategy.bind(a, b);
    const a2 = strategy.unbind(c, b);
    assert.ok(strategy.equals(a, a2));
    assert.equal(strategy.similarity(a, a2), 1.0);
  });

  test('random baseline similarity is ~0.665 (rough)', () => {
    const samples = 30;
    let total = 0;
    for (let i = 0; i < samples; i++) {
      const a = strategy.createRandom(64, i * 2 + 1);
      const b = strategy.createRandom(64, i * 2 + 2);
      total += strategy.similarity(a, b);
    }
    const avg = total / samples;
    assert.ok(avg > 0.60 && avg < 0.73, `avg random sim expected ~0.665, got ${avg}`);
  });

  test('bundle returns a vector and preserves best-chunk similarity', () => {
    const role = strategy.createFromName('Rel', 32, 'T');
    const a = strategy.createFromName('A', 32, 'T');
    const b = strategy.createFromName('B', 32, 'T');
    const c = strategy.createFromName('C', 32, 'T');

    const fa = strategy.bind(role, a);
    const fb = strategy.bind(role, b);
    const fc = strategy.bind(role, c);

    const bundled = strategy.bundle([fa, fb, fc]);
    assert.equal(bundled.strategyId, 'metric-affine-elastic');
    assert.equal(bundled.data instanceof Uint8Array, true);

    const simA = strategy.similarity(bundled, fa);
    const simB = strategy.similarity(bundled, fb);
    const simC = strategy.similarity(bundled, fc);
    assert.ok(simA > 0.70 || simB > 0.70 || simC > 0.70, `expected some chunk similarity > 0.70, got A=${simA},B=${simB},C=${simC}`);
  });

  test('incremental bundling does not throw and keeps bundle semantics', () => {
    let kb = null;
    for (let i = 0; i < 100; i++) {
      const fact = strategy.createRandom(32, i + 1000);
      kb = kb ? strategy.bundle([kb, fact]) : strategy.clone(fact);
    }
    assert.equal(kb.strategyId, 'metric-affine-elastic');
    const probe = strategy.createRandom(32, 9999);
    const sim = strategy.similarity(kb, probe);
    assert.ok(sim >= 0 && sim <= 1);
  });
});

