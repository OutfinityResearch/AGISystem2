/**
 * Parser Robustness Tests
 * Tests for parser behavior with invalid/malformed input
 * Added after fixing infinite loop bugs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parse, ParseError } from '../../../src/parser/parser.mjs';

describe('Parser Robustness', () => {

  describe('Invalid tokens', () => {
    test('should throw error on unexpected comma', () => {
      assert.throws(() => {
        parse('someth If Is open, it is not closed');
      }, ParseError);
    });

    test('should throw error on standalone comma', () => {
      assert.throws(() => {
        parse('test A, B');
      }, ParseError);
    });

    test('should throw error on multiple commas', () => {
      assert.throws(() => {
        parse('test A, B, C');
      }, ParseError);
    });

    test('should throw error message includes token info', () => {
      try {
        parse('test A, B');
        assert.fail('Should have thrown');
      } catch (e) {
        assert.ok(e.message.includes(','), 'error should mention the comma');
      }
    });
  });

  describe('No infinite loops', () => {
    test('should terminate on malformed input within reasonable iterations', () => {
      const start = Date.now();
      try {
        parse('!@#$%^&*()');
      } catch (e) {
        // Error is expected
      }
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `Parser took too long: ${elapsed}ms`);
    });

    test('should terminate on empty parentheses', () => {
      const start = Date.now();
      const ast = parse('test () A');
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `Parser took too long: ${elapsed}ms`);
    });

    test('should throw on unclosed parentheses', () => {
      // Parser now throws on unclosed parentheses
      assert.throws(() => {
        parse('test (A B');
      }, ParseError);
    });

    test('should terminate on mixed invalid tokens', () => {
      const start = Date.now();
      try {
        parse('test A ; B : C');
      } catch (e) {
        // Error expected
      }
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `Parser took too long: ${elapsed}ms`);
    });

    test('should throw on unexpected keyword in graph body', () => {
      const start = Date.now();
      assert.throws(() => {
        parse(`@:_graph graph Param\n  @x isA $Param Thing\n  @bad theory $Param Bad\nend`);
      }, ParseError);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `Parser took too long: ${elapsed}ms`);
    });
  });

  describe('Valid edge cases', () => {
    test('should parse empty input', () => {
      const ast = parse('');
      assert.equal(ast.statements.length, 0);
    });

    test('should parse whitespace only', () => {
      const ast = parse('   \n\n   ');
      assert.equal(ast.statements.length, 0);
    });

    test('should parse comment only', () => {
      const ast = parse('# This is a comment');
      assert.equal(ast.statements.length, 0);
    });

    test('should parse statement after comment', () => {
      const ast = parse('# comment\ntest A B');
      assert.equal(ast.statements.length, 1);
    });

    test('should handle multiple newlines', () => {
      const ast = parse('test A B\n\n\ntest C D');
      assert.equal(ast.statements.length, 2);
    });
  });

  describe('Parentheses handling', () => {
    test('should parse nested parentheses as Compound', () => {
      // Parser now supports nested parentheses as Compound expressions
      const ast = parse('test (A (B C))');
      assert.equal(ast.statements.length, 1);
      const stmt = ast.statements[0];
      assert.equal(stmt.args.length, 1);
      assert.equal(stmt.args[0].type, 'Compound');
    });

    test('should handle empty list', () => {
      const ast = parse('@f test []');
      assert.equal(ast.statements.length, 1);
    });

    test('should handle list with items', () => {
      const ast = parse('@f test [A B C]');
      assert.equal(ast.statements.length, 1);
    });
  });
});
