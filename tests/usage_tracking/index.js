/**
 * Test Suite: Usage Tracking
 * DS(/tests/usage_tracking/runSuite)
 *
 * Tests ConceptStore usage tracking functionality
 */

const ConceptStore = require('../../src/knowledge/concept_store');

async function run({ profile }) {
  let passed = 0;
  let failed = 0;
  const errors = [];

  function test(name, testFn) {
    try {
      const result = testFn();
      if (!result) {
        errors.push({ name, error: 'Test returned false' });
        failed++;
      } else {
        passed++;
      }
    } catch (err) {
      errors.push({ name, error: err.message });
      failed++;
    }
  }

  // =========================================================================
  // Basic Usage Counter Tests
  // =========================================================================

  test('ensureConcept initializes usage metrics', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('TestConcept');
    const stats = store.getUsageStats('TestConcept');
    return stats && stats.usageCount === 0 && stats.assertCount === 0;
  });

  test('getConcept increments queryCount', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('QueryTest');
    store.getConcept('QueryTest');
    store.getConcept('QueryTest');
    const stats = store.getUsageStats('QueryTest');
    return stats.queryCount === 2 && stats.usageCount === 2;
  });

  test('addFact increments assertCount for subject and object', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.addFact({ subject: 'Cat', relation: 'IS_A', object: 'Animal' });
    const catStats = store.getUsageStats('Cat');
    const animalStats = store.getUsageStats('Animal');
    return catStats.assertCount === 1 && animalStats.assertCount === 1;
  });

  // =========================================================================
  // Derived Metrics Tests
  // =========================================================================

  test('recency is calculated correctly', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('RecencyTest');
    const stats = store.getUsageStats('RecencyTest');
    return stats.recency >= 0.9;
  });

  test('frequency increases with usage', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('FreqTest');
    const freq1 = store.getUsageStats('FreqTest').frequency;
    for (let i = 0; i < 100; i++) {
      store.getConcept('FreqTest');
    }
    const freq2 = store.getUsageStats('FreqTest').frequency;
    return freq2 > freq1;
  });

  test('priority combines recency and frequency', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('PriorityTest');
    const stats = store.getUsageStats('PriorityTest');
    return stats.priority >= 0 && stats.priority <= 1;
  });

  // =========================================================================
  // getConceptsByUsage Tests
  // =========================================================================

  test('getConceptsByUsage returns sorted results', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('LowPriority');
    store.ensureConcept('HighPriority');
    for (let i = 0; i < 50; i++) {
      store.getConcept('HighPriority');
    }
    const sorted = store.getConceptsByUsage({ limit: 10, order: 'usageCount' });
    return sorted.length >= 2 && sorted[0].label === 'HighPriority';
  });

  test('getConceptsByUsage respects limit', () => {
    const store = new ConceptStore({ dimensions: 64 });
    for (let i = 0; i < 20; i++) {
      store.ensureConcept(`Concept${i}`);
    }
    const limited = store.getConceptsByUsage({ limit: 5 });
    return limited.length === 5;
  });

  // =========================================================================
  // boostUsage Tests
  // =========================================================================

  test('boostUsage increases usageCount', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('BoostTest');
    const before = store.getUsageStats('BoostTest').usageCount;
    store.boostUsage('BoostTest', 25);
    const after = store.getUsageStats('BoostTest').usageCount;
    return after - before === 25;
  });

  test('boostUsage with default amount uses 10', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('DefaultBoost');
    store.boostUsage('DefaultBoost');
    const stats = store.getUsageStats('DefaultBoost');
    return stats.usageCount === 10;
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  test('getUsageStats returns null for non-existent concept', () => {
    const store = new ConceptStore({ dimensions: 64 });
    const stats = store.getUsageStats('NonExistent');
    return stats === null;
  });

  return {
    ok: failed === 0,
    passed,
    failed,
    total: passed + failed,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = { run };
