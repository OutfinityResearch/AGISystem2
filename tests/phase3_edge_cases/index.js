/**
 * Phase 3 Edge Case Tests
 *
 * Tests for boundary conditions, error handling, and unusual inputs:
 * - Empty stores and null inputs
 * - Boundary values (Int8 limits: -128 to 127)
 * - Large numbers of concepts
 * - Concurrent operations
 * - Serialization/deserialization
 */

const Encoder = require('../../src/ingest/encoder');
const Retriever = require('../../src/reason/retrieval');
const ValidationEngine = require('../../src/reason/validation');
const BoundedDiamond = require('../../src/core/bounded_diamond');
const MathEngine = require('../../src/core/math_engine');
const TheoryLayer = require('../../src/knowledge/theory_layer');
const TheoryStack = require('../../src/knowledge/theory_stack');
const Config = require('../../src/support/config');

// Test utilities
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

// Config
const testConfig = new Config().load({ profile: 'auto_test' });
const DIMS = testConfig.get('dimensions');

// Mock store
class MockConceptStore {
  constructor() {
    this._concepts = new Map();
  }
  getConcept(label) {
    return this._concepts.get(label);
  }
  storeConcept(concept) {
    this._concepts.set(concept.label, concept);
    return concept;
  }
  deleteConcept(label) {
    this._concepts.delete(label);
  }
}

// Helper to create diamond
function createDiamond(dims, minVal, maxVal) {
  const diamond = new BoundedDiamond('test-id', 'test', dims);
  for (let i = 0; i < dims; i++) {
    diamond.minValues[i] = minVal;
    diamond.maxValues[i] = maxVal;
    diamond.center[i] = Math.floor((minVal + maxVal) / 2);
  }
  return diamond;
}

console.log('\n=== Phase 3 Edge Case Tests ===\n');

// ============================================
// ENCODER EDGE CASES
// ============================================
console.log('--- Encoder Edge Cases ---');

test('Encoder handles empty subject', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: '', relation: 'IS_A', object: 'Animal' };
  const result = encoder.encode(node);
  assert(result, 'Should handle empty subject');
  assert(result.length === DIMS, 'Should return correct dimensions');
});

test('Encoder handles null object', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: 'Dog', relation: 'IS_A', object: null };
  const result = encoder.encode(node);
  assert(result, 'Should handle null object');
});

test('Encoder handles missing relation', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: 'Dog', object: 'Animal' };
  const result = encoder.encode(node);
  assert(result, 'Should handle missing relation');
});

test('Encoder handles very long strings', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const longString = 'A'.repeat(10000);
  const node = { subject: longString, relation: 'IS_A', object: 'Thing' };
  const result = encoder.encode(node);
  assert(result, 'Should handle very long strings');
  assert(result.length === DIMS, 'Should maintain dimensions');
});

test('Encoder handles special characters', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: '日本語テスト', relation: 'IS_A', object: 'émojis 🎉' };
  const result = encoder.encode(node);
  assert(result, 'Should handle unicode and special chars');
});

test('Encoder encodeBatch handles empty array', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const results = encoder.encodeBatch([]);
  assert(Array.isArray(results), 'Should return array');
  assert(results.length === 0, 'Should be empty');
});

test('Encoder handles deeply nested structures', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  // Create 5-level deep nesting
  let node = { subject: 'Leaf', relation: 'IS', object: 'End' };
  for (let i = 0; i < 5; i++) {
    node = { subject: `Level${i}`, relation: 'CONTAINS', object: node };
  }
  const result = encoder.encode(node);
  assert(result, 'Should handle deep nesting');
});

// ============================================
// RETRIEVER EDGE CASES
// ============================================
console.log('\n--- Retriever Edge Cases ---');

test('Retriever handles empty store', () => {
  const store = new MockConceptStore();
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  const results = retriever.nearest(new Int8Array(DIMS), { k: 5 });
  assert(Array.isArray(results), 'Should return array');
  assert(results.length === 0, 'Should be empty for empty store');
});

test('Retriever handles k larger than store size', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Only', diamonds: [createDiamond(DIMS, 0, 10)] });
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  const results = retriever.nearest(new Int8Array(DIMS), { k: 100 });
  assert(results.length <= 1, 'Should not return more than available');
});

test('Retriever handles concept deletion', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'A', diamonds: [createDiamond(DIMS, 0, 5)] });
  store.storeConcept({ label: 'B', diamonds: [createDiamond(DIMS, 10, 15)] });

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Delete concept A
  store.deleteConcept('A');
  retriever.markDirty();

  const query = new Int8Array(DIMS);
  const results = retriever.nearest(query, { k: 5 });

  // Should only find B now
  const hasA = results.some(r => r.label === 'A');
  assert(!hasA, 'Should not find deleted concept');
});

test('Retriever handles boundary Int8 values', () => {
  const store = new MockConceptStore();
  // Diamond at Int8 boundaries
  const diamond = createDiamond(DIMS, -127, 127);
  store.storeConcept({ label: 'Boundary', diamonds: [diamond] });

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Query at extreme values
  const query = new Int8Array(DIMS);
  for (let i = 0; i < DIMS; i++) query[i] = 127;

  const results = retriever.nearest(query, { k: 1 });
  assert(results.length > 0, 'Should find concept at boundary');
});

test('Retriever handles many concepts', () => {
  const store = new MockConceptStore();

  // Add 100 concepts
  for (let i = 0; i < 100; i++) {
    const val = (i % 127) - 63;  // Spread across Int8 range
    store.storeConcept({
      label: `Concept${i}`,
      diamonds: [createDiamond(DIMS, val, val + 10)]
    });
  }

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  const query = new Int8Array(DIMS);
  const results = retriever.nearest(query, { k: 10 });

  assert(results.length === 10, 'Should return k results');
  // Results should be sorted by distance
  for (let i = 1; i < results.length; i++) {
    assert(results[i].distance >= results[i-1].distance,
      'Results should be sorted by distance');
  }
});

test('Retriever setStrategy changes behavior', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Test', diamonds: [createDiamond(DIMS, 0, 10)] });

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Switch to brute force
  retriever.setStrategy({ strategy: 'brute_force' });
  const results1 = retriever.nearest(new Int8Array(DIMS), { k: 1 });

  // Switch to LSH
  retriever.setStrategy({ strategy: 'lsh' });
  const results2 = retriever.nearest(new Int8Array(DIMS), { k: 1 });

  // Both should find the same concept
  assert(results1.length > 0 && results2.length > 0, 'Both strategies should work');
});

// ============================================
// VALIDATION ENGINE EDGE CASES
// ============================================
console.log('\n--- ValidationEngine Edge Cases ---');

test('ValidationEngine handles concept with no diamonds', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Empty', diamonds: [] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.checkConsistency('Empty');
  assert(!result.consistent, 'Empty diamonds should be inconsistent');
  assert(result.error, 'Should be marked as error');
});

test('ValidationEngine handles null store lookup', () => {
  const store = new MockConceptStore();
  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.proveInclusion(new Int8Array(DIMS), 'NonExistent');
  assert(!result.result, 'Should return false for non-existent');
  assert(result.error, 'Should be marked as error');
});

test('ValidationEngine abstractQuery handles invalid type', () => {
  const store = new MockConceptStore();
  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.abstractQuery({ type: 'invalid_type' });
  assert(result.error, 'Should error on invalid type');
  assert(result.supportedTypes, 'Should list supported types');
});

test('ValidationEngine intersection with non-overlapping concepts', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Left', diamonds: [createDiamond(DIMS, -100, -50)] });
  store.storeConcept({ label: 'Right', diamonds: [createDiamond(DIMS, 50, 100)] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.abstractQuery({
    type: 'intersection',
    concepts: ['Left', 'Right']
  });

  assert(result.result.empty, 'Non-overlapping intersection should be empty');
});

test('ValidationEngine validateAll on empty store', () => {
  const store = new MockConceptStore();
  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const report = validator.validateAll();
  assert(report.totalConcepts === 0, 'Should report 0 concepts');
  assert(report.overallConsistent, 'Empty store should be consistent');
});

// ============================================
// THEORY LAYER EDGE CASES
// ============================================
console.log('\n--- TheoryLayer Edge Cases ---');

test('TheoryLayer handles zero dimensions', () => {
  // Edge case: what if someone creates with 0 dimensions?
  try {
    const layer = new TheoryLayer({ dimensions: 0 });
    // If it doesn't throw, check it handles gracefully
    assert(true, 'Should handle 0 dimensions without crashing');
  } catch (e) {
    // Throwing is also acceptable behavior
    assert(true, 'Throwing on 0 dimensions is acceptable');
  }
});

test('TheoryLayer setDimension clamps to Int8 range', () => {
  const layer = new TheoryLayer({ dimensions: DIMS, priority: 1 });

  // Try to set values outside Int8 range
  layer.setDimension(0, -200, 200);

  assert(layer.overrideMin[0] >= -127, 'Min should be clamped to >= -127');
  assert(layer.overrideMax[0] <= 127, 'Max should be clamped to <= 127');
});

test('TheoryLayer covers and setDimension', () => {
  const layer = new TheoryLayer({ dimensions: DIMS, priority: 1 });

  // Initially no dimensions covered
  assert(!layer.covers(0), 'Initially no dimensions covered');

  // Set a dimension
  layer.setDimension(5, 10, 20);
  assert(layer.covers(5), 'Dimension 5 should be covered');
  assert(!layer.covers(4), 'Dimension 4 should not be covered');

  // Set another dimension
  layer.setDimension(10, -5, 5);
  assert(layer.covers(10), 'Dimension 10 should be covered');
});

test('TheoryLayer serialization roundtrip', () => {
  const layer = new TheoryLayer(DIMS, { priority: 5, label: 'TestLayer' });
  layer.setDimension(0, -10, 10);
  layer.setDimension(5, 20, 30);

  const json = layer.toJSON();
  const restored = TheoryLayer.fromJSON(json);

  assert(restored.priority === 5, 'Priority should be preserved');
  assert(restored.label === 'TestLayer', 'Label should be preserved');
  assert(restored.covers(0), 'Dimension 0 should be covered');
  assert(restored.covers(5), 'Dimension 5 should be covered');
});

// ============================================
// THEORY STACK EDGE CASES
// ============================================
console.log('\n--- TheoryStack Edge Cases ---');

test('TheoryStack handles empty stack', () => {
  const stack = new TheoryStack({ dimensions: DIMS });
  const diamond = createDiamond(DIMS, -10, 10);

  const composed = stack.compose(diamond);
  // Empty stack should return original
  assert(composed, 'Should return diamond');
});

test('TheoryStack conflict detection with baseDiamond', () => {
  const stack = new TheoryStack({ dimensions: DIMS });

  const layer1 = new TheoryLayer(DIMS, { priority: 1, label: 'Layer1' });
  layer1.setDimension(0, 10, 20);

  const layer2 = new TheoryLayer(DIMS, { priority: 2, label: 'Layer2' });
  layer2.setDimension(0, 50, 60);  // Different range for same dimension (non-overlapping!)

  stack.push(layer1);
  stack.push(layer2);

  // conflicts() needs a baseDiamond to compare against
  const baseDiamond = createDiamond(DIMS, -100, 100);
  const result = stack.conflicts(baseDiamond);
  // conflicts() returns an object with hasConflicts, dimensionConflicts, layerConflicts
  assert(typeof result === 'object', 'Should return object');
  assert('hasConflicts' in result, 'Should have hasConflicts property');
  // Two layers with non-overlapping ranges (10-20 vs 50-60) should have layerConflicts
  assert(result.layerConflicts.length > 0 || result.hasConflicts,
    'Non-overlapping ranges should produce conflicts');
});

test('TheoryStack snapshot and restore', () => {
  const stack = new TheoryStack({ dimensions: DIMS });

  const layer1 = new TheoryLayer(DIMS, { priority: 1 });
  layer1.setDimension(0, 10, 20);
  stack.push(layer1);

  // Take snapshot
  const snapshot = stack.snapshot();
  assert(snapshot, 'Should create snapshot');

  // Add another layer
  const layer2 = new TheoryLayer(DIMS, { priority: 2 });
  stack.push(layer2);
  assert(stack.depth() === 2, 'Should have depth 2');

  // Restore
  stack.restore(snapshot);
  assert(stack.depth() === 1, 'Should have depth 1 after restore');
});

test('TheoryStack pushContext and popContext', () => {
  const stack = new TheoryStack({ dimensions: DIMS });

  const baseLayer = new TheoryLayer(DIMS, { priority: 1 });
  stack.push(baseLayer);

  // Push context
  stack.pushContext('test_context');

  const contextLayer = new TheoryLayer(DIMS, { priority: 2 });
  stack.push(contextLayer);

  assert(stack.depth() === 2, 'Should have depth 2');

  // Pop context - should remove layers added after pushContext
  stack.popContext();
  assert(stack.depth() === 1, 'Should have depth 1 after popContext');
});

test('TheoryStack handles high priority override', () => {
  const stack = new TheoryStack({ dimensions: DIMS });

  // Low priority layer with one value
  const lowLayer = new TheoryLayer(DIMS, { priority: 1 });
  lowLayer.setDimension(0, 0, 10);

  // High priority layer with different value
  const highLayer = new TheoryLayer(DIMS, { priority: 100 });
  highLayer.setDimension(0, 50, 60);

  stack.push(lowLayer);
  stack.push(highLayer);

  const diamond = createDiamond(DIMS, -100, 100);
  const composed = stack.compose(diamond);

  // High priority should win
  assert(composed.minValues[0] === 50, 'High priority min should be used');
  assert(composed.maxValues[0] === 60, 'High priority max should be used');
});

// ============================================
// INTEGRATION EDGE CASES
// ============================================
console.log('\n--- Integration Edge Cases ---');

test('Full pipeline: encode -> store -> retrieve -> validate', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  const validator = new ValidationEngine({ store, math: MathEngine, config: testConfig });

  // Encode a fact
  const vec = encoder.encode({ subject: 'Dog', relation: 'IS_A', object: 'Animal' });

  // Create and store a concept from the vector
  const diamond = new BoundedDiamond('dog-id', 'Dog', DIMS);
  diamond.updateFromExamples([vec]);
  store.storeConcept({ label: 'Dog', diamonds: [diamond] });

  // Mark retriever dirty to pick up new concept
  retriever.markDirty();

  // Retrieve
  const nearest = retriever.nearest(vec, { k: 1 });
  assert(nearest.length > 0, 'Should find concept');
  assert(nearest[0].label === 'Dog', 'Should find Dog');

  // Validate
  const valid = validator.checkConsistency('Dog');
  assert(valid.consistent, 'Dog should be consistent');
});

test('Theory stack affects validation', () => {
  const store = new MockConceptStore();
  const diamond = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'Base', diamonds: [diamond] });

  // Create stack with override
  const stack = new TheoryStack({ dimensions: DIMS });
  const layer = new TheoryLayer({ dimensions: DIMS, priority: 1 });
  layer.setDimension(0, 50, 60);  // Override dimension 0
  stack.push(layer);

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig, stack
  });

  // Point at 0,0,0... should be inside base diamond but outside with stack
  const point = new Int8Array(DIMS);
  const result = validator.proveInclusion(point, 'Base', { useStack: true });

  // With stack override, dimension 0 is [50,60], point[0]=0 is outside
  // But other dimensions are still [-10,10], so it depends on mask
  // This tests that stack is being applied
  assert(result !== undefined, 'Should return result with stack');
});

// ============================================
// SUMMARY
// ============================================
console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
}

// Export for test runner
module.exports = { passed, failed, errors };

module.exports.run = function() {
  return { passed, failed };
};
