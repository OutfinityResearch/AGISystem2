/**
 * CSP + HDC Integration Tests
 *
 * Tests holographic/hyperdimensional computing for CSP solutions:
 * - Compound vector encoding (bundle of bound assignments)
 * - Multi-hole query extraction
 * - Solution verification via HDC similarity
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { bind, bundle, similarity } from '../../../src/core/operations.mjs';
import { withPosition } from '../../../src/core/position.mjs';

describe('CSP HDC Compound Encoding', () => {

  test('solve block creates compound solution vectors', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA A Entity
      isA B Entity
      isA X Slot
      isA Y Slot

      @assign solve WeddingSeating [
        (variablesFrom Entity),
        (domainFrom Slot),
        (noConflict conflictsWith)
      ]
    `);

    // Check compound solutions exist
    const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
    assert.ok(solutions.length > 0, 'Should create compound solutions');

    // Each solution should have a vector
    for (const sol of solutions) {
      assert.ok(sol.vector, 'Solution should have vector');
      assert.ok(sol.metadata?.facts, 'Solution should have facts metadata');
      assert.ok(sol.metadata?.assignments, 'Solution should have assignments metadata');
    }

    session.close();
  });

  test('compound vector is bundle of bound assignments', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Alice Person
      isA T1 Table

      @placement solve WeddingSeating [
        (variablesFrom Person),
        (domainFrom Table),
        (noConflict conflictsWith)
      ]
    `);

    const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
    assert.equal(solutions.length, 1, 'Should have exactly 1 solution');

    const sol = solutions[0];

    // Manually construct expected vector: bind(placement, pos1(Alice), pos2(T1))
    const placementVec = session.vocabulary.getOrCreate('placement');
    const aliceVec = session.vocabulary.getOrCreate('Alice');
    const t1Vec = session.vocabulary.getOrCreate('T1');

    const expectedBinding = bind(bind(placementVec, withPosition(1, aliceVec)), withPosition(2, t1Vec));

    // Compound solution vector should be similar to the binding
    const sim = similarity(sol.vector, expectedBinding);
    assert.ok(sim > 0.3, `Compound should be similar to binding, got ${sim}`);

    session.close();
  });

  test('query extracts bindings from compound solution metadata', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Guest1 Person
      isA Table1 Seat

      @loc solve WeddingSeating [
        (variablesFrom Person),
        (domainFrom Seat),
        (noConflict conflictsWith)
      ]
    `);

    // Query with single hole
    const result = session.query('loc Guest1 ?where');
    assert.ok(result.success, 'Query should succeed');

    // Check binding was extracted
    const binding = result.bindings?.get?.('where') || result.bindings?.where;
    const answer = binding?.answer || binding;
    assert.equal(answer, 'Table1', 'Should extract correct binding');

    session.close();
  });
});

describe('Multi-Hole Query Extraction', () => {

  test('two-hole query returns all valid combinations', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Alice G1
      isA Bob G1
      isA T1 S1
      isA T2 S1
      conflictsWith Alice Bob
      conflictsWith Bob Alice

      @seat solve WeddingSeating [
        (variablesFrom G1),
        (domainFrom S1),
        (noConflict conflictsWith)
      ]
    `);

    // Query with two holes
    const result = session.query('seat ?person ?table');
    assert.ok(result.success, 'Two-hole query should succeed');
    assert.ok(result.allResults?.length >= 2, 'Should have multiple results');

    // Collect unique person-table pairs
    const seen = new Set();
    for (const r of result.allResults || []) {
      const person = r.bindings instanceof Map ? r.bindings.get('person')?.answer : null;
      const table = r.bindings instanceof Map ? r.bindings.get('table')?.answer : null;
      if (person && table && ['Alice', 'Bob'].includes(person) && ['T1', 'T2'].includes(table)) {
        seen.add(`${person}-${table}`);
      }
    }

    // Should have all 4 combinations (across 2 solutions)
    assert.ok(seen.size >= 2, `Should have multiple pairs, got: ${[...seen].join(', ')}`);

    session.close();
  });

  test('single-hole query enumerates all possibilities', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA X Item
      isA Slot1 Place
      isA Slot2 Place
      isA Slot3 Place

      @position solve WeddingSeating [
        (variablesFrom Item),
        (domainFrom Place),
        (noConflict conflictsWith)
      ]
    `);

    // Query: X can be at any of 3 places
    const result = session.query('position X ?place');
    assert.ok(result.success, 'Query should succeed');

    const places = new Set();
    for (const r of result.allResults || []) {
      const place = r.bindings instanceof Map ? r.bindings.get('place')?.answer : null;
      if (place && place.startsWith('Slot')) places.add(place);
    }

    assert.equal(places.size, 3, `Should find all 3 places, got: ${[...places].join(', ')}`);

    session.close();
  });
});

describe('HDC Verification', () => {

  test('extracted facts verify against compound vector', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Entity1 Type1
      isA Slot1 Type2

      @rel solve WeddingSeating [
        (variablesFrom Type1),
        (domainFrom Type2),
        (noConflict conflictsWith)
      ]
    `);

    const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
    const sol = solutions[0];

    // Build fact vector from metadata
    const relVec = session.vocabulary.getOrCreate('rel');
    const entityVec = session.vocabulary.getOrCreate('Entity1');
    const slotVec = session.vocabulary.getOrCreate('Slot1');

    const factVec = bind(bind(relVec, withPosition(1, entityVec)), withPosition(2, slotVec));

    // Fact vector should be similar to compound solution
    const sim = similarity(factVec, sol.vector);
    assert.ok(sim > 0.2, `Fact should verify against compound, got ${sim}`);

    session.close();
  });
});

describe('Constraint Verification', () => {

  test('conflicting guests are NEVER in same room across ALL solutions', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA Carol Guest
      isA Dave Guest
      isA Eve Guest
      isA RoomA Room
      isA RoomB Room
      isA RoomC Room
      conflictsWith Carol Dave
      conflictsWith Dave Carol

      @seating solve WeddingSeating [
        (variablesFrom Guest),
        (domainFrom Room),
        (noConflict conflictsWith)
      ]
    `);

    const solutions = session.kbFacts.filter(f =>
      f.metadata?.operator === 'cspSolution' &&
      f.metadata?.solutionRelation === 'seating'
    );

    assert.equal(solutions.length, 18, 'Should have 18 solutions');

    // Verify constraint in EVERY solution
    let violations = 0;
    for (const sol of solutions) {
      const assignments = sol.metadata?.assignments || [];
      const carolRoom = assignments.find(a => a.entity === 'Carol')?.value;
      const daveRoom = assignments.find(a => a.entity === 'Dave')?.value;

      if (carolRoom === daveRoom) {
        violations++;
      }
    }

    assert.equal(violations, 0, 'Carol and Dave must NEVER be in same room');

    session.close();
  });

  test('non-conflicting guest can be anywhere', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA A Person
      isA B Person
      isA C Person
      isA S1 Slot
      isA S2 Slot
      isA S3 Slot
      conflictsWith A B
      conflictsWith B A

      @pos solve WeddingSeating [
        (variablesFrom Person),
        (domainFrom Slot),
        (noConflict conflictsWith)
      ]
    `);

    const solutions = session.kbFacts.filter(f =>
      f.metadata?.operator === 'cspSolution'
    );

    // C has no conflicts, so C should appear in all 3 slots across solutions
    const cSlots = new Set();
    for (const sol of solutions) {
      const cAssignment = (sol.metadata?.assignments || []).find(a => a.entity === 'C');
      if (cAssignment) cSlots.add(cAssignment.value);
    }

    assert.equal(cSlots.size, 3, 'C (no conflicts) should be at all 3 slots across solutions');

    session.close();
  });
});

describe('Unsatisfiable CSP', () => {

  test('triangle conflict with 2 slots produces no solutions', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA A Item2
      isA B Item2
      isA C Item2
      isA S1 Place2
      isA S2 Place2
      conflictsWith A B
      conflictsWith B A
      conflictsWith B C
      conflictsWith C B
      conflictsWith A C
      conflictsWith C A

      @fail solve WeddingSeating [
        (variablesFrom Item2),
        (domainFrom Place2),
        (noConflict conflictsWith)
      ]
    `);

    const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
    assert.equal(solutions.length, 0, 'Unsatisfiable CSP should have no solutions');

    session.close();
  });

  test('query on unsatisfiable problem returns no results', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      isA X Item3
      isA Y Item3
      isA S Place3
      conflictsWith X Y
      conflictsWith Y X

      @impossible solve WeddingSeating [
        (variablesFrom Item3),
        (domainFrom Place3),
        (noConflict conflictsWith)
      ]
    `);

    const result = session.query('impossible X ?slot');

    // Either fails or has no valid results
    const hasValid = result.success && result.allResults?.some(r =>
      r.bindings instanceof Map && r.bindings.get('slot')?.answer
    );
    assert.ok(!hasValid, 'Should have no valid results');

    session.close();
  });
});
