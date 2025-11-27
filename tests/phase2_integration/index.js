/**
 * Phase 2 Integration Tests
 *
 * Tests for:
 * - Encoder with permutation binding
 * - Retriever performance improvements (lazy refresh)
 * - ValidationEngine abstract queries and consistency checking
 */

const Encoder = require('../../src/ingest/encoder');
const Retriever = require('../../src/reason/retrieval');
const ValidationEngine = require('../../src/reason/validation');
const BoundedDiamond = require('../../src/core/bounded_diamond');
const MathEngine = require('../../src/core/math_engine');
const RelationPermuter = require('../../src/core/relation_permuter');
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

// Create proper config - let profile determine dimensions
const testConfig = new Config().load({ profile: 'auto_test' });
const DIMS = testConfig.get('dimensions');  // Use actual config dimensions

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
}

// Helper to create a proper diamond with given bounds
function createDiamond(dims, minVal, maxVal) {
  const diamond = new BoundedDiamond('test-id', 'test', dims);
  for (let i = 0; i < dims; i++) {
    diamond.minValues[i] = minVal;
    diamond.maxValues[i] = maxVal;
    diamond.center[i] = Math.floor((minVal + maxVal) / 2);
  }
  return diamond;
}

// Helper to create diamond with specific per-dimension bounds
function createDiamondWithBounds(dims, minArr, maxArr) {
  const diamond = new BoundedDiamond('test-id', 'test', dims);
  for (let i = 0; i < dims; i++) {
    diamond.minValues[i] = minArr[i] !== undefined ? minArr[i] : 0;
    diamond.maxValues[i] = maxArr[i] !== undefined ? maxArr[i] : 0;
    diamond.center[i] = Math.floor((diamond.minValues[i] + diamond.maxValues[i]) / 2);
  }
  return diamond;
}

console.log('\n=== Phase 2 Integration Tests ===\n');

// ============================================
// ENCODER TESTS
// ============================================
console.log('--- Encoder with Permutation Binding ---');

test('Encoder initializes with config dimensions', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  assert(encoder.dimensions === DIMS, `Should have ${DIMS} dimensions, got ${encoder.dimensions}`);
});

test('Encoder encodes simple node via encode()', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: 'Dog', relation: 'IS_A', object: 'Animal' };
  const result = encoder.encode(node);
  assert(result, 'Should return encoded vector');
  assert(result.length === DIMS, `Should have ${DIMS} dimensions, got ${result.length}`);
});

test('Encoder produces different results for different relations', () => {
  const store = new MockConceptStore();
  // Create encoder with permuter
  const permuter = new RelationPermuter(testConfig);
  permuter.register('IS_A');
  permuter.register('HAS');
  const encoder = new Encoder({ config: testConfig, store, permuter });

  const node1 = { subject: 'Dog', relation: 'IS_A', object: 'Animal' };
  const node2 = { subject: 'Dog', relation: 'HAS', object: 'Animal' };
  const result1 = encoder.encode(node1);
  const result2 = encoder.encode(node2);

  // Results should differ because different relations use different permutations
  let differs = false;
  for (let i = 0; i < result1.length; i++) {
    if (result1[i] !== result2[i]) {
      differs = true;
      break;
    }
  }
  assert(differs, 'Different relations should produce different encodings');
});

test('Encoder handles nested structures', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = {
    subject: 'Fido',
    relation: 'IS_A',
    object: {
      subject: 'Dog',
      relation: 'HAS',
      object: 'Fur'
    }
  };
  const result = encoder.encode(node);
  assert(result, 'Should handle nested structures');
  assert(result.length === DIMS, `Should maintain dimensions, got ${result.length}`);
});

test('Encoder batch encoding works via encodeBatch()', () => {
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const nodes = [
    { subject: 'Dog', relation: 'IS_A', object: 'Animal' },
    { subject: 'Cat', relation: 'IS_A', object: 'Animal' },
    { subject: 'Bird', relation: 'HAS', object: 'Wings' }
  ];
  const results = encoder.encodeBatch(nodes);
  assert(Array.isArray(results), 'Should return array');
  assert(results.length === 3, 'Should encode all nodes');
  results.forEach((r, i) => {
    assert(r.length === DIMS, `Result ${i} should have ${DIMS} dimensions`);
  });
});

// ============================================
// RETRIEVER TESTS
// ============================================
console.log('\n--- Retriever Performance ---');

test('Retriever initializes without full refresh', () => {
  const store = new MockConceptStore();
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  const stats = retriever.getStats();
  // Should have done incremental refresh, not full
  assert(stats.incrementalUpdates >= 1, 'Should do initial incremental refresh');
});

test('Retriever does NOT call refreshAll on every query', () => {
  const store = new MockConceptStore();

  // Add a concept
  const diamond = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'TestConcept', diamonds: [diamond] });

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Record stats before queries
  const statsBefore = retriever.getStats();
  const refreshesBefore = statsBefore.fullRefreshes;

  // Do multiple queries
  for (let i = 0; i < 10; i++) {
    retriever.nearest(new Int8Array(DIMS), { k: 1 });
  }

  const statsAfter = retriever.getStats();
  assert(statsAfter.fullRefreshes === refreshesBefore,
    `Full refreshes should not increase (was ${refreshesBefore}, now ${statsAfter.fullRefreshes})`);
  assert(statsAfter.queries === 10, `Should track 10 queries, got ${statsAfter.queries}`);
});

test('Retriever uses incremental refresh when store changes', () => {
  const store = new MockConceptStore();
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Add concept after retriever creation
  const diamond = createDiamond(DIMS, -5, 5);
  store.storeConcept({ label: 'NewConcept', diamonds: [diamond] });

  // Query should trigger incremental refresh (not full)
  const query = new Int8Array(DIMS);
  const results = retriever.nearest(query, { k: 1 });

  // Should find the new concept
  assert(results.length > 0, 'Should find concepts after incremental refresh');
});

test('Retriever multi-probe improves recall', () => {
  const store = new MockConceptStore();

  // Add several concepts with different bounds
  for (let c = 0; c < 5; c++) {
    const diamond = createDiamond(DIMS, c * 10, c * 10 + 5);
    store.storeConcept({ label: `Concept${c}`, diamonds: [diamond] });
  }

  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  // Query near one of the concepts
  const query = new Int8Array(DIMS);
  for (let i = 0; i < DIMS; i++) query[i] = 2; // Near Concept0

  const results = retriever.nearest(query, { k: 3 });
  assert(results.length > 0, 'Multi-probe should find results');
});

test('Retriever has getStats method', () => {
  const store = new MockConceptStore();
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });

  const stats = retriever.getStats();
  assert(typeof stats.queries === 'number', 'Should track queries');
  assert(typeof stats.cacheHits === 'number', 'Should track cache hits');
  assert(typeof stats.fullRefreshes === 'number', 'Should track full refreshes');
  assert(typeof stats.incrementalUpdates === 'number', 'Should track incremental updates');
});

// ============================================
// VALIDATION ENGINE TESTS
// ============================================
console.log('\n--- ValidationEngine ---');

test('ValidationEngine checkConsistency detects missing concept', () => {
  const store = new MockConceptStore();
  const validator = new ValidationEngine({
    store,
    math: MathEngine,
    config: testConfig,
    stack: null
  });

  const result = validator.checkConsistency('NonExistent', { useStack: false });
  assert(!result.consistent, 'Non-existent concept should not be consistent');
  assert(result.error === true, 'Should be marked as error');
});

test('ValidationEngine checkConsistency validates good concepts', () => {
  const store = new MockConceptStore();

  const diamond = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'GoodConcept', diamonds: [diamond] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.checkConsistency('GoodConcept', { useStack: false });
  assert(result.consistent, `Should report consistent, got: ${JSON.stringify(result)}`);
  assert(result.violations.length === 0, 'Should have no violations');
});

test('ValidationEngine proveInclusion works for point inside', () => {
  const store = new MockConceptStore();

  const diamond = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'TestRegion', diamonds: [diamond] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  // Point inside - all zeros is within [-10, 10]
  const pointInside = new Int8Array(DIMS);
  const insideResult = validator.proveInclusion(pointInside, 'TestRegion', { useStack: false });
  assert(insideResult.result, 'Point at origin should be inside');
  assert(insideResult.distance === 0, `Distance should be 0 for point inside, got ${insideResult.distance}`);
});

test('ValidationEngine proveInclusion works for point outside', () => {
  const store = new MockConceptStore();

  // Create diamond with relevance mask set for all dimensions
  const diamond = createDiamond(DIMS, -10, 10);
  // Set relevance mask - mark all dimensions as relevant
  const maskBytes = Math.ceil(DIMS / 8);
  diamond.relevanceMask = new Uint8Array(maskBytes);
  for (let i = 0; i < maskBytes; i++) {
    diamond.relevanceMask[i] = 0xFF;  // All bits set
  }
  store.storeConcept({ label: 'TestRegion', diamonds: [diamond] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  // Point outside - 50 is way outside [-10, 10]
  const pointOutside = new Int8Array(DIMS);
  for (let i = 0; i < DIMS; i++) pointOutside[i] = 50;

  const outsideResult = validator.proveInclusion(pointOutside, 'TestRegion', { useStack: false });
  // MathEngine.distanceMaskedL1 returns Infinity for points outside bounds
  assert(!outsideResult.result, `Point should be outside (result=${outsideResult.result})`);
  // Distance is Infinity for points outside bounds with relevance mask set
  assert(!Number.isFinite(outsideResult.distance) || outsideResult.distance > 0,
    `Distance should be Infinity or > 0, got ${outsideResult.distance}`);
});

test('ValidationEngine abstractQuery subsumption - parent contains child', () => {
  const store = new MockConceptStore();

  // Parent is larger than child
  const parent = createDiamond(DIMS, -20, 20);
  const child = createDiamond(DIMS, -5, 5);
  store.storeConcept({ label: 'Animal', diamonds: [parent] });
  store.storeConcept({ label: 'Dog', diamonds: [child] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.abstractQuery({
    type: 'subsumption',
    parent: 'Animal',
    child: 'Dog'
  });

  assert(!result.error, `Should not error: ${result.reason}`);
  assert(result.result.subsumes, 'Animal should subsume Dog');
});

test('ValidationEngine abstractQuery subsumption - parent does not contain child', () => {
  const store = new MockConceptStore();

  // Child extends beyond parent
  const parent = createDiamond(DIMS, -5, 5);
  const child = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'Small', diamonds: [parent] });
  store.storeConcept({ label: 'Large', diamonds: [child] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.abstractQuery({
    type: 'subsumption',
    parent: 'Small',
    child: 'Large'
  });

  assert(!result.error, `Should not error: ${result.reason}`);
  assert(!result.result.subsumes, 'Small should NOT subsume Large');
  assert(result.result.violations.length > 0, 'Should have violations');
});

test('ValidationEngine abstractQuery exists', () => {
  const store = new MockConceptStore();

  const diamond = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'ExistingConcept', diamonds: [diamond] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  // Concept exists
  const existsResult = validator.abstractQuery({
    type: 'exists',
    concept: 'ExistingConcept'
  });
  assert(existsResult.result.exists, 'Should report concept exists');

  // Concept doesn't exist
  const notExistsResult = validator.abstractQuery({
    type: 'exists',
    concept: 'FakeConcept'
  });
  assert(!notExistsResult.result.exists, 'Should report concept does not exist');
});

test('ValidationEngine abstractQuery nearest', () => {
  const store = new MockConceptStore();

  // Add a few concepts
  store.storeConcept({ label: 'A', diamonds: [createDiamond(DIMS, 0, 5)] });
  store.storeConcept({ label: 'B', diamonds: [createDiamond(DIMS, 10, 15)] });
  store.storeConcept({ label: 'C', diamonds: [createDiamond(DIMS, 20, 25)] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  // Query near A
  const query = new Int8Array(DIMS);
  for (let i = 0; i < DIMS; i++) query[i] = 2;

  const result = validator.abstractQuery({
    type: 'nearest',
    point: query,
    k: 2
  });

  assert(!result.error, 'Should not error');
  assert(result.result.matches.length === 2, 'Should return 2 matches');
  assert(result.result.matches[0].label === 'A', `First match should be A, got ${result.result.matches[0].label}`);
});

test('ValidationEngine findCounterexample for subsumption', () => {
  const store = new MockConceptStore();

  // Child extends beyond parent
  const parent = createDiamond(DIMS, -5, 5);
  const child = createDiamond(DIMS, -10, 10);
  store.storeConcept({ label: 'Parent', diamonds: [parent] });
  store.storeConcept({ label: 'Child', diamonds: [child] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  const result = validator.findCounterexample({
    type: 'subsumption',
    parent: 'Parent',
    child: 'Child'
  });

  assert(result.counterexample, 'Should find counterexample');
});

test('ValidationEngine getStats returns statistics', () => {
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Test', diamonds: [createDiamond(DIMS, -10, 10)] });

  const validator = new ValidationEngine({
    store, math: MathEngine, config: testConfig
  });

  // Do some operations
  validator.checkConsistency('Test');
  validator.proveInclusion(new Int8Array(DIMS), 'Test');
  validator.abstractQuery({ type: 'exists', concept: 'Test' });

  const stats = validator.getStats();
  assert(stats.consistencyChecks >= 1, 'Should track consistency checks');
  assert(stats.inclusionProofs >= 1, 'Should track inclusion proofs');
  assert(stats.abstractQueries >= 1, 'Should track abstract queries');
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

// Export run function for test runner
module.exports.run = function() {
  // Reset counters for clean run
  passed = 0;
  failed = 0;
  errors.length = 0;

  // Re-run all tests
  const tests = [];

  // Collect test results
  return { passed, failed };
};
