/**
 * Parser Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parse, ParseError } from '../../../src/parser/parser.mjs';

describe('Parser', () => {
  describe('simple statements', () => {
    test('should parse statement with destination', () => {
      const ast = parse('@f loves John Mary');
      assert.equal(ast.statements.length, 1);

      const stmt = ast.statements[0];
      assert.equal(stmt.type, 'Statement');
      assert.equal(stmt.destination, 'f');
      assert.equal(stmt.operator.name, 'loves');
      assert.equal(stmt.args.length, 2);
      assert.equal(stmt.args[0].name, 'John');
      assert.equal(stmt.args[1].name, 'Mary');
    });

    test('should parse statement without destination', () => {
      const ast = parse('loves John Mary');
      assert.equal(ast.statements.length, 1);

      const stmt = ast.statements[0];
      assert.equal(stmt.destination, null);
      assert.equal(stmt.operator.name, 'loves');
    });

    test('should parse multiple statements', () => {
      const ast = parse('@a loves John Mary\n@b parent John Alice');
      assert.equal(ast.statements.length, 2);
    });

    test('should reject multiple @ tokens on one line', () => {
      assert.throws(
        () => parse('@emotion influences @cognition'),
        (e) => e instanceof ParseError && String(e.message).includes("Multiple '@' tokens"),
        'Expected ParseError for multiple @ on one line'
      );
    });

    test('should parse and attach inline comments', () => {
      const ast = parse('@f loves John Mary  # explain why this matters');
      const stmt = ast.statements[0];
      assert.equal(stmt.comment, 'explain why this matters');
      assert.equal(stmt.toString(), '@f loves John Mary');
    });

    test('should ignore comment-only lines', () => {
      const ast = parse('# comment only\n@f loves John Mary  # explain why this matters');
      assert.equal(ast.statements.length, 1);
    });
  });

  describe('holes', () => {
    test('should parse holes in statement', () => {
      const ast = parse('@q loves ?who Mary');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[0].type, 'Hole');
      assert.equal(stmt.args[0].name, 'who');
      assert.equal(stmt.args[1].type, 'Identifier');
    });

    test('should parse multiple holes', () => {
      const ast = parse('@q sells ?seller ?item ?buyer');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[0].type, 'Hole');
      assert.equal(stmt.args[1].type, 'Hole');
      assert.equal(stmt.args[2].type, 'Hole');
    });
  });

  describe('intermediate variables', () => {
    test('should parse Implies with $references', () => {
      // Multi-line DSL using intermediate variables instead of nested parens
      const ast = parse(`
        @cond isA ?x Human
        @conc isA ?x Mortal
        @r Implies $cond $conc
      `);

      assert.equal(ast.statements.length, 3);

      const rule = ast.statements[2];
      assert.equal(rule.operator.name, 'Implies');
      assert.equal(rule.args[0].type, 'Reference');
      assert.equal(rule.args[0].name, 'cond');
      assert.equal(rule.args[1].type, 'Reference');
      assert.equal(rule.args[1].name, 'conc');
    });

    test('should parse Not with $reference', () => {
      const ast = parse(`
        @inner love John Alice
        @f Not $inner
      `);

      assert.equal(ast.statements.length, 2);

      const notStmt = ast.statements[1];
      assert.equal(notStmt.operator.name, 'Not');
      assert.equal(notStmt.args[0].type, 'Reference');
      assert.equal(notStmt.args[0].name, 'inner');
    });
  });

  describe('literals', () => {
    test('should parse number literals', () => {
      const ast = parse('@f sells Alice Book Bob 50');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[3].type, 'Literal');
      assert.equal(stmt.args[3].value, 50);
    });

    test('should parse string literals', () => {
      const ast = parse('@f message John "Hello World"');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[1].type, 'Literal');
      assert.equal(stmt.args[1].value, 'Hello World');
    });
  });

  describe('lists', () => {
    test('should parse list expression', () => {
      const ast = parse('@f tags Item [Red, Blue, Green]');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[1].type, 'List');
      assert.equal(stmt.args[1].items.length, 3);
    });
  });

  describe('graphs', () => {
    test('should parse return with statement-style prefix call as Compound', () => {
      const ast = parse(`
        @G:G graph x
          return And $x (Or $x $x)
        end
      `);
      assert.equal(ast.statements.length, 1);
      const g = ast.statements[0];
      assert.equal(g.type, 'GraphDeclaration');
      assert.ok(g.returnExpr);
      assert.equal(g.returnExpr.type, 'Compound');
      assert.equal(g.returnExpr.operator.type, 'Identifier');
      assert.equal(g.returnExpr.operator.name, 'And');
      assert.equal(g.returnExpr.args.length, 2);
      assert.equal(g.returnExpr.args[0].type, 'Reference');
      assert.equal(g.returnExpr.args[0].name, 'x');
      assert.equal(g.returnExpr.args[1].type, 'Compound');
      assert.equal(g.returnExpr.args[1].operator.name, 'Or');
    });
  });

  describe('references', () => {
    test('should parse $reference in expressions', () => {
      // $a is a reference to a stored variable
      const ast = parse('@b combo $a X');
      const stmt = ast.statements[0];

      assert.equal(stmt.destination, 'b');
      assert.equal(stmt.operator.name, 'combo');
      assert.equal(stmt.args[0].type, 'Reference');
      assert.equal(stmt.args[0].name, 'a');
      assert.equal(stmt.args[0].toString(), '$a');
      assert.equal(stmt.args[1].type, 'Identifier');
    });

    test('should parse $reference as operator argument', () => {
      // $ref as an argument to operator
      const ast = parse('@b And $a $c');
      const stmt = ast.statements[0];

      assert.equal(stmt.operator.name, 'And');
      assert.equal(stmt.args[0].type, 'Reference');
      assert.equal(stmt.args[0].name, 'a');
      assert.equal(stmt.args[1].type, 'Reference');
      assert.equal(stmt.args[1].name, 'c');
    });
  });

  describe('toString', () => {
    test('statement should have readable toString', () => {
      const ast = parse('@f loves John Mary');
      const str = ast.statements[0].toString();
      assert.ok(str.includes('loves'));
      assert.ok(str.includes('John'));
      assert.ok(str.includes('Mary'));
    });
  });

  describe('error handling', () => {
    test('should handle empty input', () => {
      const ast = parse('');
      assert.equal(ast.statements.length, 0);
    });

    test('should handle whitespace only', () => {
      const ast = parse('   \n\n   ');
      assert.equal(ast.statements.length, 0);
    });

    test('should parse parenthesized expressions as Compound', () => {
      // Parentheses create Compound expressions (nested graph calls)
      const ast = parse('@f test (something A B)');
      const stmt = ast.statements[0];
      // Parser should parse the compound expression as an argument
      assert.equal(stmt.args.length, 1);
      assert.equal(stmt.args[0].type, 'Compound');
      assert.equal(stmt.args[0].operator.name, 'something');
      assert.equal(stmt.args[0].args.length, 2);
    });
  });
});
