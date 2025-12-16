/**
 * CSP Wedding Seating Integration Tests - Node.js native test runner
 *
 * Tests the CSP solver with HDC compound solution storage:
 * - Learn facts + execute solve block → stores compound solution vectors
 * - Query with holes → extracts bindings from compound solutions
 * - Natural language generation for assignment relations
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TestSession } from '../../src/test-lib/test-session.mjs';

describe('CSP Wedding Seating', () => {

  describe('Simple Solvable Case (2 guests, 2 tables, 1 conflict)', () => {
    test('should find exactly 2 valid solutions', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice

        @seating solve WeddingSeating
          guests from Guest
          tables from Table
          noConflict conflictsWith
        end
      `);

      // Check compound solutions were created
      const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
      assert.equal(solutions.length, 2, 'Should have exactly 2 solutions');

      // Check solution facts are present
      const solutionFacts = solutions.flatMap(s => s.metadata?.facts || []);
      assert.ok(solutionFacts.some(f => f.includes('seating Alice')), 'Should have Alice seating');
      assert.ok(solutionFacts.some(f => f.includes('seating Bob')), 'Should have Bob seating');

      session.close();
    });

    test('should query Alice seating with single hole', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice

        @seating solve WeddingSeating
          guests from Guest
          tables from Table
          noConflict conflictsWith
        end
      `);

      // Query: seating Alice ?table
      const result = session.query('seating Alice ?table');
      assert.ok(result.success, 'Query should succeed');
      assert.ok(result.allResults?.length >= 1, 'Should have at least 1 result');

      // Check bindings
      const tables = new Set();
      for (const r of result.allResults || []) {
        const table = r.bindings instanceof Map ? r.bindings.get('table')?.answer : null;
        if (table) tables.add(table);
      }
      assert.ok(tables.has('T1') || tables.has('T2'), 'Alice should be at T1 or T2');

      session.close();
    });

    test('should generate natural language "X is at Y"', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice

        @seating solve WeddingSeating
          guests from Guest
          tables from Table
          noConflict conflictsWith
        end
      `);

      // Generate NL for a seating fact
      const nlText = session.generateText('seating', ['Alice', 'T1']);
      assert.ok(nlText.includes('Alice'), 'NL should mention Alice');
      assert.ok(nlText.includes('is at') || nlText.includes('T1'), 'NL should show assignment');

      session.close();
    });

    test('should query with two holes', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice

        @seating solve WeddingSeating
          guests from Guest
          tables from Table
          noConflict conflictsWith
        end
      `);

      // Query: seating ?guest ?table
      const result = session.query('seating ?guest ?table');
      assert.ok(result.success, 'Two-hole query should succeed');

      // Should have multiple results (Alice-T1, Alice-T2, Bob-T1, Bob-T2)
      const seen = new Set();
      for (const r of result.allResults || []) {
        const guest = r.bindings instanceof Map ? r.bindings.get('guest')?.answer : null;
        const table = r.bindings instanceof Map ? r.bindings.get('table')?.answer : null;
        if (guest && table) seen.add(`${guest}-${table}`);
      }
      assert.ok(seen.size >= 2, `Should have multiple guest-table pairs, got: ${[...seen].join(', ')}`);

      session.close();
    });
  });

  describe('Multiple Arrangements (3 guests, 3 tables, 1 conflict pair)', () => {
    test('should find 18 valid arrangements', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Carol Guest2
        isA Dave Guest2
        isA Eve Guest2
        isA RoomA Table2
        isA RoomB Table2
        isA RoomC Table2
        conflictsWith Carol Dave
        conflictsWith Dave Carol

        @arrangement solve WeddingSeating
          guests from Guest2
          tables from Table2
          noConflict conflictsWith
        end
      `);

      const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
      assert.equal(solutions.length, 18, 'Should have exactly 18 arrangements');

      session.close();
    });

    test('should allow Eve at any room (no conflicts)', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Carol Guest2
        isA Dave Guest2
        isA Eve Guest2
        isA RoomA Table2
        isA RoomB Table2
        isA RoomC Table2
        conflictsWith Carol Dave
        conflictsWith Dave Carol

        @arrangement solve WeddingSeating
          guests from Guest2
          tables from Table2
          noConflict conflictsWith
        end
      `);

      // Query Eve's possible rooms
      const result = session.query('arrangement Eve ?room');
      assert.ok(result.success, 'Query should succeed');

      const rooms = new Set();
      for (const r of result.allResults || []) {
        const room = r.bindings instanceof Map ? r.bindings.get('room')?.answer : null;
        if (room) rooms.add(room);
      }

      // Eve should be at all 3 rooms (across 18 solutions)
      assert.equal(rooms.size, 3, `Eve should be at all 3 rooms, got: ${[...rooms].join(', ')}`);

      session.close();
    });

    test('should produce coherent NL for all guests', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA Carol Guest2
        isA Dave Guest2
        isA Eve Guest2
        isA RoomA Table2
        isA RoomB Table2
        isA RoomC Table2
        conflictsWith Carol Dave
        conflictsWith Dave Carol

        @arrangement solve WeddingSeating
          guests from Guest2
          tables from Table2
          noConflict conflictsWith
        end
      `);

      // Get first solution and generate NL
      const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
      const firstSolution = solutions[0];
      const facts = firstSolution?.metadata?.facts || [];

      // Generate NL for each fact in the solution
      const nlTexts = facts.map(f => {
        const parts = f.split(' ');
        return session.generateText(parts[0], parts.slice(1));
      });

      // All should have "is at" pattern
      for (const nl of nlTexts) {
        assert.ok(nl.includes('is at'), `NL should use "is at" pattern: ${nl}`);
      }

      session.close();
    });
  });

  describe('Unsatisfiable Problem (triangle conflict, 2 tables)', () => {
    test('should find no valid solutions', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA P1 Guest3
        isA P2 Guest3
        isA P3 Guest3
        isA Spot1 Table3
        isA Spot2 Table3
        conflictsWith P1 P2
        conflictsWith P2 P1
        conflictsWith P2 P3
        conflictsWith P3 P2
        conflictsWith P1 P3
        conflictsWith P3 P1

        @impossible solve WeddingSeating
          guests from Guest3
          tables from Table3
          noConflict conflictsWith
        end
      `);

      const solutions = session.kbFacts.filter(f => f.metadata?.operator === 'cspSolution');
      assert.equal(solutions.length, 0, 'Should have no solutions (unsatisfiable)');

      session.close();
    });

    test('should return no results for queries on impossible problem', () => {
      const session = new TestSession({ geometry: 2048 });

      session.learn(`
        isA P1 Guest3
        isA P2 Guest3
        isA P3 Guest3
        isA Spot1 Table3
        isA Spot2 Table3
        conflictsWith P1 P2
        conflictsWith P2 P1
        conflictsWith P2 P3
        conflictsWith P3 P2
        conflictsWith P1 P3
        conflictsWith P3 P1

        @impossible solve WeddingSeating
          guests from Guest3
          tables from Table3
          noConflict conflictsWith
        end
      `);

      // Query should fail or return empty
      const result = session.query('impossible P1 ?table');

      // Either no success or no valid results
      const hasValidResults = result.success && result.allResults?.some(r =>
        r.bindings instanceof Map && r.bindings.get('table')?.answer
      );
      assert.ok(!hasValidResults, 'Should have no valid results for impossible problem');

      session.close();
    });
  });

  describe('Abstract Relation Naming', () => {
    test('solve destination becomes queryable relation', () => {
      const session = new TestSession({ geometry: 2048 });

      // Use custom destination name
      session.learn(`
        isA X Entity1
        isA Y Entity1
        isA Slot1 Place1
        isA Slot2 Place1

        @myCustomRelation solve WeddingSeating
          guests from Entity1
          tables from Place1
          noConflict conflictsWith
        end
      `);

      // Query using the custom destination name
      const result = session.query('myCustomRelation X ?place');
      assert.ok(result.success, 'Should query using custom relation name');

      // Check KB has compound solutions with custom relation
      const customSolutions = session.kbFacts.filter(f =>
        f.metadata?.operator === 'cspSolution' && f.metadata?.solutionRelation === 'myCustomRelation'
      );
      assert.ok(customSolutions.length > 0, 'KB should have solutions with custom relation');

      session.close();
    });
  });
});
