/**
 * Test Suite: Forgetting System
 * DS(/tests/forgetting/runSuite)
 *
 * Tests ConceptStore forgetting functionality
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
  // Protection Mechanism Tests
  // =========================================================================

  test('protect marks concept as protected', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('Important');
    store.protect('Important');
    return store.isProtected('Important') === true;
  });

  test('unprotect removes protection', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('Temporary');
    store.protect('Temporary');
    store.unprotect('Temporary');
    return store.isProtected('Temporary') === false;
  });

  test('listProtected returns all protected concepts', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('Protected1');
    store.ensureConcept('Protected2');
    store.protect('Protected1');
    store.protect('Protected2');
    const list = store.listProtected();
    return list.includes('Protected1') && list.includes('Protected2');
  });

  // =========================================================================
  // Specific Concept Forgetting Tests
  // =========================================================================

  test('forget specific concept removes it', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('ToForget');
    const result = store.forget({ concept: 'ToForget' });
    return result.count === 1 && !store.listConcepts().includes('ToForget');
  });

  test('forget protected concept is blocked', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('Protected');
    store.protect('Protected');
    const result = store.forget({ concept: 'Protected' });
    return result.count === 0 && result.protected.includes('Protected');
  });

  // =========================================================================
  // Pattern-based Forgetting Tests
  // =========================================================================

  test('forget by pattern removes matching concepts', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('temp_session_1');
    store.ensureConcept('temp_session_2');
    store.ensureConcept('permanent_data');
    const result = store.forget({ pattern: 'temp_*' });
    return result.count === 2 && store.listConcepts().includes('permanent_data');
  });

  test('forget by pattern respects protection', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('temp_important');
    store.ensureConcept('temp_disposable');
    store.protect('temp_important');
    const result = store.forget({ pattern: 'temp_*' });
    return result.count === 1 && store.listConcepts().includes('temp_important');
  });

  // =========================================================================
  // Threshold-based Forgetting Tests
  // =========================================================================

  test('forget by threshold removes low-usage concepts', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('LowUsage');
    store.ensureConcept('HighUsage');
    store.boostUsage('HighUsage', 100);
    const result = store.forget({ threshold: 50 });
    return result.removed.includes('LowUsage') && !result.removed.includes('HighUsage');
  });

  // =========================================================================
  // Dry Run Tests
  // =========================================================================

  test('dryRun shows what would be removed without removing', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('DryRunTest');
    const result = store.forget({ concept: 'DryRunTest', dryRun: true });
    return result.wouldRemove.includes('DryRunTest') &&
           result.removed.length === 0 &&
           store.listConcepts().includes('DryRunTest');
  });

  // =========================================================================
  // Associated Facts Cleanup Tests
  // =========================================================================

  test('forget removes associated facts', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('Subject');
    store.addFact({ subject: 'Subject', relation: 'HAS', object: 'Property' });
    const factsBefore = store.getFactsBySubject('Subject');
    store.forget({ concept: 'Subject' });
    const factsAfter = store.getFactsBySubject('Subject');
    return factsBefore.length > 0 && factsAfter.length === 0;
  });

  // =========================================================================
  // Return Structure Tests
  // =========================================================================

  test('forget returns correct structure', () => {
    const store = new ConceptStore({ dimensions: 64 });
    store.ensureConcept('TestReturn');
    const result = store.forget({ concept: 'TestReturn' });
    return Array.isArray(result.removed) &&
           typeof result.count === 'number' &&
           Array.isArray(result.protected);
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
