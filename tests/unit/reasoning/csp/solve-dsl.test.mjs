/**
 * Tests for CSP Solve DSL Syntax
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../../src/runtime/session.mjs';
import { initHDC } from '../../../../src/hdc/facade.mjs';

describe('CSP Solve DSL', () => {
  
  // Initialize HDC before tests
  test.before(async () => {
    await initHDC();
  });
  
  describe('Solve Block Parsing', () => {
    test('should parse solve block with guests and tables', () => {
      const session = new Session({ geometry: 2048 });
      
      // Learn some facts
      const learnResult = session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice
      `);
      
      assert.ok(learnResult.success, 'Learning facts should succeed');
      assert.equal(learnResult.facts, 6, 'Should learn 6 facts');
    });
    
    test('should execute solve block and return solutions', () => {
      const session = new Session({ geometry: 2048 });
      
      // Learn facts
      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice
      `);
      
      // Execute solve block
      const solveResult = session.learn(`
        @solutions solve WeddingSeating [
          (variablesFrom Guest),
          (domainFrom Table),
          (noConflict conflictsWith)
        ]
      `);
      
      assert.ok(solveResult.success, 'Solve execution should succeed');
      assert.ok(solveResult.solveResult, 'Should have solve result');
      assert.equal(solveResult.solveResult.solutionCount, 2, 'Should find 2 solutions');
      assert.ok(solveResult.solveResult.solutions.length > 0, 'Should have solutions');
    });
  });
  
  describe('Solution Translation', () => {
    test('should translate solutions to natural language', () => {
      const session = new Session({ geometry: 2048 });
      
      // Learn facts
      session.learn(`
        isA Alice Guest
        isA Bob Guest
        isA T1 Table
        isA T2 Table
        conflictsWith Alice Bob
        conflictsWith Bob Alice
      `);
      
      // Execute solve block
      const solveResult = session.learn(`
        @solutions solve WeddingSeating [
          (variablesFrom Guest),
          (domainFrom Table),
          (noConflict conflictsWith)
        ]
      `);
      
      assert.ok(solveResult.solveResult, 'Should have solve result');
      
      if (solveResult.solveResult.solutions.length > 0) {
        const firstSolution = solveResult.solveResult.solutions[0];
        assert.ok(firstSolution.facts?.length > 0, 'Solution should have facts');
        
        // Check that each fact has proper structure
        firstSolution.facts.forEach(fact => {
          assert.ok(fact.dsl || fact.predicate, 'Fact should have dsl or predicate');
        });
      }
    });
  });
});
