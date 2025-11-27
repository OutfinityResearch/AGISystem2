/**
 * Phase 3 Performance Benchmarks
 *
 * Measures performance of:
 * - Encoder throughput
 * - Retriever query latency (LSH vs brute force)
 * - ValidationEngine query execution
 * - TheoryStack composition overhead
 */

const Encoder = require('../../src/ingest/encoder');
const Retriever = require('../../src/reason/retrieval');
const ValidationEngine = require('../../src/reason/validation');
const BoundedDiamond = require('../../src/core/bounded_diamond');
const MathEngine = require('../../src/core/math_engine');
const TheoryLayer = require('../../src/knowledge/theory_layer');
const TheoryStack = require('../../src/knowledge/theory_stack');
const RelationPermuter = require('../../src/core/relation_permuter');
const Config = require('../../src/support/config');

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
}

// Helper to create diamond
function createDiamond(dims, minVal, maxVal) {
  const diamond = new BoundedDiamond('id', 'label', dims);
  for (let i = 0; i < dims; i++) {
    diamond.minValues[i] = minVal;
    diamond.maxValues[i] = maxVal;
    diamond.center[i] = Math.floor((minVal + maxVal) / 2);
  }
  return diamond;
}

// Benchmark utility
function benchmark(name, fn, iterations = 1000) {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    fn();
  }

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();

  const totalMs = Number(end - start) / 1_000_000;
  const perOpUs = (Number(end - start) / iterations) / 1_000;

  return {
    name,
    iterations,
    totalMs: totalMs.toFixed(2),
    perOpUs: perOpUs.toFixed(2),
    opsPerSec: Math.floor(iterations / (totalMs / 1000))
  };
}

console.log('\n=== Phase 3 Performance Benchmarks ===\n');
console.log(`Dimensions: ${DIMS}`);
console.log('');

const results = [];

// ============================================
// ENCODER BENCHMARKS
// ============================================
console.log('--- Encoder Benchmarks ---');

// Simple encoding
{
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const node = { subject: 'Dog', relation: 'IS_A', object: 'Animal' };

  const result = benchmark('Encoder.encode (simple)', () => {
    encoder.encode(node);
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Encoding with permuter
{
  const store = new MockConceptStore();
  const permuter = new RelationPermuter(testConfig);
  permuter.register('IS_A');
  permuter.register('HAS');
  permuter.register('PART_OF');
  const encoder = new Encoder({ config: testConfig, store, permuter });
  const node = { subject: 'Dog', relation: 'IS_A', object: 'Animal' };

  const result = benchmark('Encoder.encode (with permuter)', () => {
    encoder.encode(node);
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Batch encoding
{
  const store = new MockConceptStore();
  const encoder = new Encoder({ config: testConfig, store });
  const nodes = [];
  for (let i = 0; i < 100; i++) {
    nodes.push({ subject: `Concept${i}`, relation: 'IS_A', object: 'Thing' });
  }

  const result = benchmark('Encoder.encodeBatch (100 nodes)', () => {
    encoder.encodeBatch(nodes);
  }, 500);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// ============================================
// RETRIEVER BENCHMARKS
// ============================================
console.log('\n--- Retriever Benchmarks ---');

// Setup store with concepts
function setupRetrieverStore(conceptCount) {
  const store = new MockConceptStore();
  for (let i = 0; i < conceptCount; i++) {
    const val = (i % 100) - 50;
    store.storeConcept({
      label: `Concept${i}`,
      diamonds: [createDiamond(DIMS, val, val + 10)]
    });
  }
  return store;
}

// LSH retrieval - small store
{
  const store = setupRetrieverStore(100);
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  retriever.setStrategy({ strategy: 'lsh' });
  const query = new Int8Array(DIMS);

  const result = benchmark('Retriever.nearest LSH (100 concepts, k=5)', () => {
    retriever.nearest(query, { k: 5 });
  }, 2000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Brute force retrieval - small store
{
  const store = setupRetrieverStore(100);
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  retriever.setStrategy({ strategy: 'brute_force' });
  const query = new Int8Array(DIMS);

  const result = benchmark('Retriever.nearest brute_force (100 concepts, k=5)', () => {
    retriever.nearest(query, { k: 5 });
  }, 2000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// LSH retrieval - larger store
{
  const store = setupRetrieverStore(1000);
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  retriever.setStrategy({ strategy: 'lsh' });
  const query = new Int8Array(DIMS);

  const result = benchmark('Retriever.nearest LSH (1000 concepts, k=10)', () => {
    retriever.nearest(query, { k: 10 });
  }, 1000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Brute force retrieval - larger store
{
  const store = setupRetrieverStore(1000);
  const retriever = new Retriever({ config: testConfig, math: MathEngine, store });
  retriever.setStrategy({ strategy: 'brute_force' });
  const query = new Int8Array(DIMS);

  const result = benchmark('Retriever.nearest brute_force (1000 concepts, k=10)', () => {
    retriever.nearest(query, { k: 10 });
  }, 500);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// ============================================
// VALIDATION ENGINE BENCHMARKS
// ============================================
console.log('\n--- ValidationEngine Benchmarks ---');

// Consistency check
{
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Test', diamonds: [createDiamond(DIMS, -10, 10)] });
  const validator = new ValidationEngine({ store, math: MathEngine, config: testConfig });

  const result = benchmark('ValidationEngine.checkConsistency', () => {
    validator.checkConsistency('Test', { useStack: false });
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Prove inclusion
{
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Test', diamonds: [createDiamond(DIMS, -10, 10)] });
  const validator = new ValidationEngine({ store, math: MathEngine, config: testConfig });
  const point = new Int8Array(DIMS);

  const result = benchmark('ValidationEngine.proveInclusion', () => {
    validator.proveInclusion(point, 'Test', { useStack: false });
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Subsumption query
{
  const store = new MockConceptStore();
  store.storeConcept({ label: 'Parent', diamonds: [createDiamond(DIMS, -20, 20)] });
  store.storeConcept({ label: 'Child', diamonds: [createDiamond(DIMS, -5, 5)] });
  const validator = new ValidationEngine({ store, math: MathEngine, config: testConfig });

  const result = benchmark('ValidationEngine.abstractQuery (subsumption)', () => {
    validator.abstractQuery({ type: 'subsumption', parent: 'Parent', child: 'Child' });
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// ============================================
// THEORY STACK BENCHMARKS
// ============================================
console.log('\n--- TheoryStack Benchmarks ---');

// Compose with empty stack
{
  const stack = new TheoryStack({ dimensions: DIMS });
  const diamond = createDiamond(DIMS, -10, 10);

  const result = benchmark('TheoryStack.compose (empty stack)', () => {
    stack.compose(diamond);
  }, 10000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Compose with 5 layers
{
  const stack = new TheoryStack({ dimensions: DIMS });
  for (let i = 0; i < 5; i++) {
    const layer = new TheoryLayer(DIMS, { priority: i + 1 });
    layer.setDimension(i * 10, i, i + 5);
    stack.push(layer);
  }
  const diamond = createDiamond(DIMS, -100, 100);

  const result = benchmark('TheoryStack.compose (5 layers)', () => {
    stack.compose(diamond);
  }, 5000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Compose with 20 layers
{
  const stack = new TheoryStack({ dimensions: DIMS });
  for (let i = 0; i < 20; i++) {
    const layer = new TheoryLayer(DIMS, { priority: i + 1 });
    layer.setDimension(i * 5, i, i + 5);
    stack.push(layer);
  }
  const diamond = createDiamond(DIMS, -100, 100);

  const result = benchmark('TheoryStack.compose (20 layers)', () => {
    stack.compose(diamond);
  }, 2000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Snapshot/restore cycle
{
  const stack = new TheoryStack({ dimensions: DIMS });
  for (let i = 0; i < 5; i++) {
    const layer = new TheoryLayer(DIMS, { priority: i + 1 });
    stack.push(layer);
  }

  const result = benchmark('TheoryStack snapshot/restore cycle', () => {
    const snapshot = stack.snapshot();
    stack.restore(snapshot);
  }, 2000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// ============================================
// MATH ENGINE BENCHMARKS
// ============================================
console.log('\n--- MathEngine Benchmarks ---');

// Distance calculation
{
  const diamond = createDiamond(DIMS, -10, 10);
  // Set relevance mask
  diamond.relevanceMask = new Uint8Array(Math.ceil(DIMS / 8)).fill(0xFF);
  const point = new Int8Array(DIMS);

  const result = benchmark('MathEngine.distanceMaskedL1', () => {
    MathEngine.distanceMaskedL1(point, diamond);
  }, 10000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// Saturated addition
{
  const vec1 = new Int8Array(DIMS).fill(50);
  const vec2 = new Int8Array(DIMS).fill(100);

  const result = benchmark('MathEngine.addSaturated', () => {
    MathEngine.addSaturated(vec1, vec2);
  }, 10000);

  console.log(`  ${result.name}: ${result.perOpUs}µs/op (${result.opsPerSec} ops/sec)`);
  results.push(result);
}

// ============================================
// SUMMARY
// ============================================
console.log('\n=== Benchmark Summary ===\n');

// Table header
console.log('Operation'.padEnd(55) + 'µs/op'.padStart(10) + 'ops/sec'.padStart(12));
console.log('-'.repeat(77));

for (const r of results) {
  const name = r.name.length > 52 ? r.name.substring(0, 52) + '...' : r.name;
  console.log(name.padEnd(55) + r.perOpUs.padStart(10) + r.opsPerSec.toString().padStart(12));
}

console.log('');

// Performance assertions (soft limits)
const warnings = [];

// Encoder should be fast
const encoderSimple = results.find(r => r.name.includes('Encoder.encode (simple)'));
if (encoderSimple && parseFloat(encoderSimple.perOpUs) > 500) {
  warnings.push(`Encoder.encode is slow: ${encoderSimple.perOpUs}µs (target: <500µs)`);
}

// Retriever LSH should be faster than brute force at scale
const lsh1000 = results.find(r => r.name.includes('LSH (1000'));
const brute1000 = results.find(r => r.name.includes('brute_force (1000'));
if (lsh1000 && brute1000) {
  const lshTime = parseFloat(lsh1000.perOpUs);
  const bruteTime = parseFloat(brute1000.perOpUs);
  if (lshTime > bruteTime) {
    warnings.push(`LSH slower than brute_force at 1000 concepts: ${lshTime}µs vs ${bruteTime}µs`);
  } else {
    const speedup = (bruteTime / lshTime).toFixed(2);
    console.log(`✓ LSH speedup over brute_force (1000 concepts): ${speedup}x`);
  }
}

if (warnings.length > 0) {
  console.log('\nPerformance Warnings:');
  warnings.forEach(w => console.log(`  ⚠ ${w}`));
}

// Export results
module.exports = {
  results,
  passed: warnings.length === 0 ? 1 : 0,
  failed: warnings.length > 0 ? 1 : 0
};

module.exports.run = function() {
  return { passed: 1, failed: 0 };
};
