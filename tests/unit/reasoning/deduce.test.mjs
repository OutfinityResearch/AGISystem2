/**
 * Tests for Deduce Meta-Operator
 * Forward-chaining deduction through causal and type chains
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { searchDeduce } from '../../../src/reasoning/query-meta-ops.mjs';

describe('searchDeduce', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  function learn(dsl) {
    const result = session.learn(dsl);
    if (!result.success) {
      throw new Error(`Learn failed: ${result.errors?.join(', ')}`);
    }
    return result;
  }

  function makeSource(name) {
    return { name, vector: null };
  }

  function makeFilter(name) {
    return { name, vector: null };
  }

  function makeHole(name) {
    return { name };
  }

  describe('basic causal chain deduction', () => {
    test('should follow causes chain one level', () => {
      setup();
      learn(`
        causes Inflation HigherPrices
        causes HigherPrices ReducedSpending
      `);

      const source = makeSource('Inflation');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 5);

      assert.ok(result.success, 'should succeed');
      assert.ok(result.allResults.length > 0, 'should have results');

      // Should find the next step in the chain
      const conclusions = result.allResults.map(r => r.proof?.conclusion || '');
      const hasReducedSpending = conclusions.some(c => c.includes('ReducedSpending'));
      assert.ok(hasReducedSpending, 'should deduce ReducedSpending through chain');
    });

    test('should follow causes chain multiple levels', () => {
      setup();
      learn(`
        causes A B
        causes B C
        causes C D
      `);

      const source = makeSource('A');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 3, 10);

      assert.ok(result.success, 'should succeed');

      // Check for chain propagation
      const chains = result.allResults.map(r => r.proof?.chain || []);
      const hasD = chains.some(c => c.includes('D'));
      assert.ok(hasD, 'should reach D through multi-level chain');
    });

    test('should respect depth limit', () => {
      setup();
      learn(`
        causes Step1 Step2
        causes Step2 Step3
        causes Step3 Step4
        causes Step4 Step5
      `);

      const source = makeSource('Step1');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      // With depth 2, should not reach Step5
      const result = searchDeduce(session, source, filter, hole, 2, 10);

      assert.ok(result.success, 'should succeed');

      // Should find Step3 (depth 2) but not Step5 (depth 4)
      const conclusions = result.allResults.map(r => r.proof?.conclusion || '');
      const hasStep3 = conclusions.some(c => c.includes('Step3'));
      const hasStep5 = conclusions.some(c => c.includes('Step5'));

      assert.ok(hasStep3, 'should find Step3 within depth limit');
      assert.ok(!hasStep5, 'should not find Step5 beyond depth limit');
    });
  });

  describe('isA transitive chain deduction', () => {
    test('should follow isA chain', () => {
      setup();
      learn(`
        isA Dog Mammal
        isA Mammal Animal
        isA Animal LivingThing
      `);

      const source = makeSource('Dog');
      const filter = makeFilter('isA');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 3, 10);

      assert.ok(result.success, 'should succeed');

      // Should find transitive isA
      const conclusions = result.allResults.map(r => r.proof?.conclusion || '');
      const hasAnimal = conclusions.some(c => c.includes('Animal'));
      assert.ok(hasAnimal, 'Dog should be deduced as Animal');
    });

    test('should track isA derivation chain', () => {
      setup();
      learn(`
        isA Poodle Dog
        isA Dog Mammal
        isA Mammal Vertebrate
      `);

      const source = makeSource('Poodle');
      const filter = makeFilter('isA');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 3, 10);

      assert.ok(result.success, 'should succeed');
      assert.ok(result.allResults.length > 0, 'should have results');

      // Check that proof chain exists
      const firstProof = result.allResults[0]?.proof;
      assert.ok(firstProof, 'should have proof');
      assert.ok(firstProof.chain, 'proof should have chain');
      assert.ok(firstProof.chain.length > 1, 'chain should have multiple steps');
    });
  });

  describe('result limiting', () => {
    test('should respect limit parameter', () => {
      setup();
      learn(`
        causes X A
        causes X B
        causes X C
        causes A D
        causes B E
        causes C F
      `);

      const source = makeSource('X');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 3);

      assert.ok(result.success, 'should succeed');
      assert.ok(result.allResults.length <= 3, 'should respect limit');
    });
  });

  describe('empty and edge cases', () => {
    test('should handle no derivable facts', () => {
      setup();
      learn('isA Foo Bar');

      const source = makeSource('Baz'); // Not in KB
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 5);

      // Should not crash, may return empty
      assert.ok('success' in result, 'should return result object');
      assert.ok('allResults' in result, 'should have allResults array');
    });

    test('should handle depth 1 (immediate derivations only)', () => {
      setup();
      learn(`
        causes A B
        causes B C
        causes C D
      `);

      const source = makeSource('A');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 1, 10);

      // With depth 1, we follow one level from A→B, getting B→C at depth 1
      // C→D would be at depth 2
      const conclusions = result.allResults.map(r => r.proof?.conclusion || '');
      const hasD = conclusions.some(c => c.includes('D'));

      // C→D is depth 2, should not appear with depth=1
      assert.ok(!hasD, 'should not find D beyond depth limit');
    });

    test('should handle circular references gracefully', () => {
      setup();
      learn(`
        causes A B
        causes B C
        causes C A
      `);

      const source = makeSource('A');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      // Should not infinite loop
      const result = searchDeduce(session, source, filter, hole, 5, 10);

      assert.ok('success' in result, 'should complete without hanging');
    });
  });

  describe('result structure', () => {
    test('should have proper bindings structure', () => {
      setup();
      learn(`
        causes Rain Flooding
        causes Flooding Damage
      `);

      const source = makeSource('Rain');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 5);

      assert.ok(result.success, 'should succeed');
      assert.ok(result.bindings instanceof Map, 'bindings should be a Map');
      assert.ok(result.bindings.has('result'), 'should have result binding');

      const binding = result.bindings.get('result');
      assert.ok('answer' in binding, 'binding should have answer');
      assert.ok('confidence' in binding, 'binding should have confidence');
      assert.ok('method' in binding, 'binding should have method');
      assert.equal(binding.method, 'deduce', 'method should be deduce');
    });

    test('should have proper proof structure', () => {
      setup();
      learn(`
        causes Sun Heat
        causes Heat Evaporation
      `);

      const source = makeSource('Sun');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 5);

      assert.ok(result.success, 'should succeed');
      assert.ok(result.allResults.length > 0, 'should have results');

      const proof = result.allResults[0].proof;
      assert.ok(proof, 'should have proof');
      assert.equal(proof.operation, 'deduce', 'operation should be deduce');
      assert.equal(proof.source, 'Sun', 'source should be Sun');
      assert.ok('depth' in proof, 'proof should have depth');
      assert.ok('chain' in proof, 'proof should have chain');
    });

    test('should include confidence/score in results', () => {
      setup();
      // Need a chain so we get derived facts (not just initial depth 0)
      learn(`
        causes Cold Snow
        causes Snow Accumulation
      `);

      const source = makeSource('Cold');
      const filter = makeFilter('causes');
      const hole = makeHole('result');

      const result = searchDeduce(session, source, filter, hole, 2, 5);

      assert.ok(result.success, 'should succeed');
      assert.ok(typeof result.confidence === 'number', 'should have numeric confidence');
      assert.ok(result.confidence >= 0 && result.confidence <= 1, 'confidence should be 0-1');

      for (const r of result.allResults) {
        assert.ok(typeof r.score === 'number', 'each result should have score');
      }
    });
  });

  describe('mixed chains', () => {
    test('should handle both causes and isA chains together', () => {
      setup();
      learn(`
        isA Cat Mammal
        isA Mammal Animal
        causes Predator Hunting
        causes Hunting Prey
      `);

      // First test isA chain
      const sourceIsA = makeSource('Cat');
      const filterIsA = makeFilter('isA');
      const holeIsA = makeHole('result');

      const resultIsA = searchDeduce(session, sourceIsA, filterIsA, holeIsA, 2, 5);
      assert.ok(resultIsA.success, 'isA chain should succeed');

      // Then test causes chain
      const sourceCauses = makeSource('Predator');
      const filterCauses = makeFilter('causes');
      const holeCauses = makeHole('result');

      const resultCauses = searchDeduce(session, sourceCauses, filterCauses, holeCauses, 2, 5);
      assert.ok(resultCauses.success, 'causes chain should succeed');
    });
  });
});

describe('deduce via session.query', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  test('should work through session.query interface', () => {
    setup();
    session.learn(`
      causes Virus Infection
      causes Infection Symptoms
      causes Symptoms Treatment
    `);

    // Define filter pattern
    session.learn('@filter causes ?X ?Y');

    // Run deduce query
    const result = session.query('@q deduce Virus $filter ?result 3 5');

    assert.ok(result.success, 'query should succeed');
    assert.ok(result.allResults?.length > 0, 'should have results');
  });

  test('should parse depth and limit from query', () => {
    setup();
    session.learn(`
      causes A B
      causes B C
      causes C D
      causes D E
    `);

    session.learn('@filter causes ?X ?Y');

    // Test with small depth
    const result = session.query('@q deduce A $filter ?result 1 2');

    assert.ok('success' in result, 'should return result');
    // With depth 1, should not reach far
    if (result.success) {
      assert.ok(result.allResults.length <= 2, 'should respect limit');
    }
  });
});
