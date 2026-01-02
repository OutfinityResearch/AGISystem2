/**
 * Lexer Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer, LexerError } from '../../../src/parser/lexer.mjs';
import { TOKEN_TYPES } from '../../../src/core/constants.mjs';

describe('Lexer', () => {
  describe('basic tokens', () => {
    test('should tokenize @identifier', () => {
      const lexer = new Lexer('@foo');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.AT);
      assert.equal(tokens[0].value, 'foo');
    });

    test('should tokenize ?hole', () => {
      const lexer = new Lexer('?who');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.HOLE);
      assert.equal(tokens[0].value, 'who');
    });

    test('should tokenize identifier', () => {
      const lexer = new Lexer('loves');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[0].value, 'loves');
    });

    test('should tokenize number', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.NUMBER);
      assert.equal(tokens[0].value, 42);
    });

    test('should tokenize negative number', () => {
      const lexer = new Lexer('-123');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.NUMBER);
      assert.equal(tokens[0].value, -123);
    });

    test('should tokenize float', () => {
      const lexer = new Lexer('3.14');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.NUMBER);
      assert.equal(tokens[0].value, 3.14);
    });

    test('should tokenize string with double quotes', () => {
      const lexer = new Lexer('"hello world"');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.STRING);
      assert.equal(tokens[0].value, 'hello world');
    });

    test('should tokenize string with single quotes', () => {
      const lexer = new Lexer("'test'");
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.STRING);
      assert.equal(tokens[0].value, 'test');
    });

    test('should handle escape sequences in strings', () => {
      const lexer = new Lexer('"line1\\nline2"');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].value, 'line1\nline2');
    });
  });

  describe('punctuation', () => {
    test('should tokenize parentheses', () => {
      const lexer = new Lexer('()');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.LPAREN);
      assert.equal(tokens[1].type, TOKEN_TYPES.RPAREN);
    });

    test('should tokenize brackets', () => {
      const lexer = new Lexer('[]');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.LBRACKET);
      assert.equal(tokens[1].type, TOKEN_TYPES.RBRACKET);
    });

    test('should tokenize comma and colon', () => {
      const lexer = new Lexer(',: ');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.COMMA);
      assert.equal(tokens[1].type, TOKEN_TYPES.COLON);
    });
  });

  describe('comments', () => {
    test('should skip line comments with #', () => {
      const lexer = new Lexer('foo # this is a comment\nbar');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 2);
      assert.equal(identifiers[0].value, 'foo');
      assert.equal(identifiers[1].value, 'bar');
    });

    test('should skip line comments with //', () => {
      const lexer = new Lexer('foo // comment\nbar');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 2);
    });

    test('should skip block comments', () => {
      const lexer = new Lexer('foo /* block\ncomment */ bar');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
      assert.equal(identifiers.length, 2);
    });
  });

  describe('keywords', () => {
    test('should recognize keywords', () => {
      const lexer = new Lexer('theory import');
      const tokens = lexer.tokenize();
      assert.equal(tokens[0].type, TOKEN_TYPES.KEYWORD);
      assert.equal(tokens[0].value, 'theory');
      assert.equal(tokens[1].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[1].value, 'import');
    });
  });

  describe('full statement', () => {
    test('should tokenize full statement', () => {
      const lexer = new Lexer('@f loves John Mary');
      const tokens = lexer.tokenize();

      assert.equal(tokens[0].type, TOKEN_TYPES.AT);
      assert.equal(tokens[0].value, 'f');
      assert.equal(tokens[1].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[1].value, 'loves');
      assert.equal(tokens[2].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[2].value, 'John');
      assert.equal(tokens[3].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[3].value, 'Mary');
    });

    test('should tokenize query with holes', () => {
      const lexer = new Lexer('@q loves ?who Mary');
      const tokens = lexer.tokenize();

      assert.equal(tokens[0].type, TOKEN_TYPES.AT);
      assert.equal(tokens[1].type, TOKEN_TYPES.IDENTIFIER);
      assert.equal(tokens[2].type, TOKEN_TYPES.HOLE);
      assert.equal(tokens[2].value, 'who');
      assert.equal(tokens[3].type, TOKEN_TYPES.IDENTIFIER);
    });
  });

  describe('errors', () => {
    test('should throw on unexpected character', () => {
      const lexer = new Lexer('foo $ bar');
      assert.throws(() => lexer.tokenize(), LexerError);
    });

    test('should throw on unterminated string', () => {
      const lexer = new Lexer('"unterminated');
      assert.throws(() => lexer.tokenize(), LexerError);
    });

    test('should throw on empty @ identifier', () => {
      const lexer = new Lexer('@ foo');
      assert.throws(() => lexer.tokenize(), LexerError);
    });
  });

  describe('position tracking', () => {
    test('should track line and column', () => {
      const lexer = new Lexer('foo\nbar');
      const tokens = lexer.tokenize();
      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);

      assert.equal(identifiers[0].line, 1);
      assert.equal(identifiers[0].column, 1);
      assert.equal(identifiers[1].line, 2);
      assert.equal(identifiers[1].column, 1);
    });
  });
});
