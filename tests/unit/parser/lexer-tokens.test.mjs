/**
 * Lexer Token Tests
 * Tests for lexer tokenization
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../../../src/parser/lexer.mjs';
import { TOKEN_TYPES } from '../../../src/core/constants.mjs';

describe('Lexer Tokens', () => {

  describe('Basic tokenization', () => {
    test('should tokenize identifier', () => {
      const lexer = new Lexer('test');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[0].value, 'test');
    });

    test('should tokenize multiple identifiers', () => {
      const lexer = new Lexer('test A B C');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 4);
    });

    test('should tokenize @ destination', () => {
      const lexer = new Lexer('@fact test A');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.AT);
      assert.equal(tokens[0].value, 'fact');
    });

    test('should tokenize $ reference', () => {
      const lexer = new Lexer('test $ref');
      const tokens = lexer.tokenize();
      const refs = tokens.filter(t => t.type === TOKEN_TYPES.REFERENCE);
      assert.equal(refs.length, 1);
      assert.equal(refs[0].value, 'ref');
    });

    test('should tokenize ? hole', () => {
      const lexer = new Lexer('@q test ?what');
      const tokens = lexer.tokenize();
      const holes = tokens.filter(t => t.type === TOKEN_TYPES.HOLE);
      assert.equal(holes.length, 1);
      assert.equal(holes[0].value, 'what');
    });
  });

  describe('Special tokens', () => {
    test('should tokenize comma as COMMA', () => {
      const lexer = new Lexer('A, B');
      const tokens = lexer.tokenize();
      const commas = tokens.filter(t => t.type === TOKEN_TYPES.COMMA);
      assert.equal(commas.length, 1);
    });

    test('should tokenize string literal', () => {
      const lexer = new Lexer('"hello world"');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.STRING);
      assert.equal(tokens[0].value, 'hello world');
    });

    test('should tokenize number', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.NUMBER);
      assert.equal(tokens[0].value, 42);
    });

    test('should tokenize brackets', () => {
      const lexer = new Lexer('[A B]');
      const tokens = lexer.tokenize();
      assert.ok(tokens.some(t => t.type === TOKEN_TYPES.LBRACKET));
      assert.ok(tokens.some(t => t.type === TOKEN_TYPES.RBRACKET));
    });

    test('should tokenize parentheses', () => {
      const lexer = new Lexer('(A B)');
      const tokens = lexer.tokenize();
      assert.ok(tokens.some(t => t.type === TOKEN_TYPES.LPAREN));
      assert.ok(tokens.some(t => t.type === TOKEN_TYPES.RPAREN));
    });
  });

  describe('Keywords', () => {
    test('should tokenize theory as keyword', () => {
      const lexer = new Lexer('theory Test');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.KEYWORD);
      assert.equal(tokens[0].value, 'theory');
    });

    test('should tokenize import as identifier', () => {
      const lexer = new Lexer('import Test');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.IDENTIFIER);
    });

    test('should tokenize rule as identifier', () => {
      const lexer = new Lexer('rule Test');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.IDENTIFIER);
    });

    test('macro should be a keyword', () => {
      const lexer = new Lexer('macro test');
      const tokens = lexer.tokenize();
      // macro is a DSL keyword for macro definitions
      assert.equal(tokens[0].type, TOKEN_TYPES.KEYWORD);
      assert.equal(tokens[0].value, 'macro');
    });

    test('end should be a keyword', () => {
      const lexer = new Lexer('end');
      const tokens = lexer.tokenize();
      // end is a DSL keyword for closing blocks
      assert.equal(tokens[0].type, TOKEN_TYPES.KEYWORD);
      assert.equal(tokens[0].value, 'end');
    });
  });

  describe('Comments', () => {
    test('should skip comment lines', () => {
      const lexer = new Lexer('# this is a comment\ntest A');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 2); // test, A
    });

    test('should handle inline comments', () => {
      const lexer = new Lexer('test A # comment');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 2); // test, A
    });
  });

  describe('Line tracking', () => {
    test('should track line numbers', () => {
      const lexer = new Lexer('A\nB\nC');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].line, 1);
      assert.equal(tokens[2].line, 2); // After newline
    });

    test('should track column numbers', () => {
      const lexer = new Lexer('test A B');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].column, 1);
      assert.ok(tokens[1].column > 1);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty input', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      assert.equal(tokens.length, 1); // EOF
      assert.equal(tokens[0].type, TOKEN_TYPES.EOF);
    });

    test('should handle whitespace only', () => {
      const lexer = new Lexer('   \t  \n  ');
      const tokens = lexer.tokenize();
      // Should have newlines and EOF
      assert.ok(tokens.some(t => t.type === TOKEN_TYPES.EOF));
    });

    test('should handle @dest:persist syntax', () => {
      const lexer = new Lexer('@fact:persistent test A');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.AT);
      assert.equal(tokens[0].value, 'fact:persistent');
    });
  });
});
