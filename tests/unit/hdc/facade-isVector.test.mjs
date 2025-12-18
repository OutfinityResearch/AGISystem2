/**
 * Tests for isVector() - multi-strategy vector detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isVector, listStrategies } from '../../../src/hdc/facade.mjs';
import { getStrategy } from '../../../src/hdc/strategies/index.mjs';

describe('isVector - Multi-Strategy Support', () => {
  test('should detect dense-binary vectors', () => {
    const strategy = getStrategy('dense-binary');
    const vec = strategy.createRandom(2048);

    assert.ok(isVector(vec), 'dense-binary vector should be detected');
    assert.equal(vec.data instanceof Uint32Array, true, 'should have Uint32Array data');
  });

  test('should detect sparse-polynomial vectors', () => {
    const strategy = getStrategy('sparse-polynomial');
    const vec = strategy.createRandom(4);

    assert.ok(isVector(vec), 'sparse-polynomial vector should be detected');
    assert.equal(vec.exponents instanceof Set, true, 'should have Set exponents');
  });

  test('should detect metric-affine vectors', () => {
    const strategy = getStrategy('metric-affine');
    const vec = strategy.createRandom(32);

    assert.ok(isVector(vec), 'metric-affine vector should be detected');
    assert.equal(vec.data instanceof Uint8Array, true, 'should have Uint8Array data');
  });

  test('should detect vectors from all registered strategies', () => {
    const strategies = listStrategies();

    for (const strategyId of strategies) {
      const strategy = getStrategy(strategyId);
      const geometry = strategyId === 'sparse-polynomial' ? 4 :
                       strategyId === 'metric-affine' ? 32 : 2048;
      const vec = strategy.createRandom(geometry);

      assert.ok(isVector(vec), `${strategyId} vector should be detected by isVector()`);
    }
  });

  test('should reject non-vectors', () => {
    assert.equal(isVector(null), false, 'null is not a vector');
    assert.equal(isVector(undefined), false, 'undefined is not a vector');
    assert.equal(isVector(42), false, 'number is not a vector');
    assert.equal(isVector('string'), false, 'string is not a vector');
    assert.equal(isVector([1, 2, 3]), false, 'array is not a vector');
    assert.equal(isVector({}), false, 'empty object is not a vector');
    assert.equal(isVector({ geometry: 100 }), false, 'object with only geometry is not a vector');
    assert.equal(isVector({ data: [1, 2] }), false, 'object with plain array data is not a vector');
  });

  test('should reject objects that look similar but are not vectors', () => {
    // Has geometry but wrong data type
    assert.equal(isVector({ geometry: 100, data: [1, 2, 3] }), false);
    // Has data but no geometry
    assert.equal(isVector({ data: new Uint32Array(10) }), false);
  });
});
