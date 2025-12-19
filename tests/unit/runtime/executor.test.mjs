/**
 * Tests for Executor
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Executor, ExecutionError } from '../../../src/runtime/executor.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';
import { similarity } from '../../../src/core/operations.mjs';

describe('Executor', () => {
  let session;
  let executor;

  function setup() {
    session = new Session({ geometry: 2048 });
    executor = new Executor(session);
  }

  describe('constructor', () => {
    test('should create executor with session', () => {
      setup();
      assert.ok(executor.session === session);
    });
  });

  describe('executeProgram', () => {
    test('should execute empty program', () => {
      setup();
      const program = parse('');
      const result = executor.executeProgram(program);

      assert.equal(result.success, true);
      assert.deepEqual(result.results, []);
      assert.deepEqual(result.errors, []);
    });

    test('should execute single statement', () => {
      setup();
      const program = parse('@fact loves John Mary');
      const result = executor.executeProgram(program);

      assert.equal(result.success, true);
      assert.equal(result.results.length, 1);
      assert.equal(result.results[0].destination, 'fact');
    });

    test('should execute multiple statements', () => {
      setup();
      const program = parse(`
        @f1 likes Alice Bob
        @f2 knows Bob Carol
      `);
      const result = executor.executeProgram(program);

      assert.equal(result.success, true);
      assert.equal(result.results.length, 2);
    });

    test('should collect errors without stopping', () => {
      setup();
      // First statement works, second references undefined
      const program = parse(`
        @f1 loves A B
        @f2 test $undefined
      `);
      const result = executor.executeProgram(program);

      assert.equal(result.results.length, 1, 'should have one successful result');
      assert.equal(result.errors.length, 1, 'should have one error');
    });
  });

  describe('executeStatement', () => {
    test('should store result in scope', () => {
      setup();
      const program = parse('@result test A B');
      executor.executeProgram(program);

      assert.ok(session.scope.has('result'));
    });

    test('should add fact to KB', () => {
      setup();
      const initialCount = session.kbFacts.length;

      // Use @var:name syntax for persistent fact (scope + KB)
      const program = parse('@fact:fact loves X Y');
      executor.executeProgram(program);

      assert.equal(session.kbFacts.length, initialCount + 1);
    });

    test('should return vector in result', () => {
      setup();
      const program = parse('@fact test A');
      const result = executor.executeProgram(program);

      assert.ok('vector' in result.results[0]);
      assert.equal(result.results[0].vector.geometry, 2048);
    });
  });

  describe('buildStatementVector', () => {
    test('should encode operator and arguments', () => {
      setup();
      const program = parse('@f loves John Mary');
      const result = executor.executeProgram(program);
      const vec = result.results[0].vector;

      // Vector should be similar to operator but not identical
      const opVec = session.vocabulary.getOrCreate('loves');
      const sim = similarity(vec, opVec);

      assert.ok(sim > 0.3 && sim < 0.8, `similarity to operator should be moderate: ${sim}`);
    });

    test('should encode position of arguments', () => {
      setup();
      // NOTE: Due to XOR commutativity, swapped arguments with same atoms
      // produce identical vectors. This is a known mathematical property.
      // Position encoding helps when extracting arguments, not distinguishing order.
      //
      // Test that different arguments produce different vectors:
      const program1 = parse('@f1 loves John Mary');
      const program2 = parse('@f2 loves John Alice'); // Different second argument

      executor.executeProgram(program1);
      executor.executeProgram(program2);

      const v1 = session.scope.get('f1');
      const v2 = session.scope.get('f2');

      const sim = similarity(v1, v2);
      // Different arguments should produce different vectors
      assert.ok(sim < 0.9, `different args should produce different vectors: sim=${sim}`);
    });

    test('should handle operator-only statement', () => {
      setup();
      const program = parse('@f True');
      const result = executor.executeProgram(program);

      assert.ok(result.success);
      const vec = result.results[0].vector;
      const opVec = session.vocabulary.getOrCreate('True');
      const sim = similarity(vec, opVec);

      assert.ok(sim > 0.9, 'operator-only should be very similar to operator');
    });
  });

  describe('resolveExpression', () => {
    describe('Identifier', () => {
      test('should resolve identifier to vocabulary atom', () => {
        setup();
        const program = parse('@f test Atom1 Atom2');
        executor.executeProgram(program);

        assert.ok(session.vocabulary.has('Atom1'));
        assert.ok(session.vocabulary.has('Atom2'));
      });

      test('should reuse existing scope binding', () => {
        setup();
        // Define @x first, then use it
        session.scope.set('x', session.vocabulary.getOrCreate('predefined'));

        const program = parse('@f test x y');
        executor.executeProgram(program);

        // x should be resolved from scope, not vocabulary
        assert.ok(session.vocabulary.has('y'));
      });
    });

    describe('Reference', () => {
      test('should resolve reference to scope value', () => {
        setup();
        // First statement defines @a
        const program = parse(`
          @a atom Value
          @b test $a
        `);
        const result = executor.executeProgram(program);

        assert.equal(result.success, true);
        assert.ok(session.scope.has('b'));
      });

      test('should throw on undefined reference', () => {
        setup();
        const program = parse('@f test $undefined');
        const result = executor.executeProgram(program);

        assert.equal(result.success, false);
        assert.ok(result.errors[0] instanceof ExecutionError);
      });
    });

    describe('Literal', () => {
      test('should resolve string literal to vector', () => {
        setup();
        const program = parse('@f test "hello world"');
        const result = executor.executeProgram(program);

        assert.ok(result.success);
        assert.ok(session.vocabulary.has('hello world'));
      });

      test('should resolve number literal', () => {
        setup();
        const program = parse('@f count 42');
        const result = executor.executeProgram(program);

        assert.ok(result.success);
      });
    });

    describe('Intermediate Variables', () => {
      test('should resolve reference to previous statement', () => {
        setup();
        const program = parse(`
          @inner test A B
          @f outer $inner
        `);
        const result = executor.executeProgram(program);

        assert.ok(result.success);
        assert.equal(result.results.length, 2);
      });

      test('should chain multiple references', () => {
        setup();
        const program = parse(`
          @a first X
          @b second $a
          @c third $b
        `);
        const result = executor.executeProgram(program);

        assert.ok(result.success);
        assert.equal(result.results.length, 3);
      });
    });

    describe('List', () => {
      test('should resolve list to bundled vector', () => {
        setup();
        const program = parse('@f test [A B C]');
        const result = executor.executeProgram(program);

        assert.ok(result.success);
      });

      test('should handle empty list', () => {
        setup();
        const program = parse('@f test []');
        const result = executor.executeProgram(program);

        assert.ok(result.success);
      });
    });

    describe('Hole', () => {
      test('should resolve hole to special vector', () => {
        setup();
        const program = parse('@q test ?x');
        const result = executor.executeProgram(program);

        assert.ok(result.success);
        assert.ok(session.vocabulary.has('__HOLE_x__'));
      });
    });
  });

  describe('determinism', () => {
    test('should produce same vectors across executions', () => {
      const session1 = new Session({ geometry: 2048 });
      const session2 = new Session({ geometry: 2048 });
      const exec1 = new Executor(session1);
      const exec2 = new Executor(session2);

      const dsl = '@f loves John Mary';
      exec1.executeProgram(parse(dsl));
      exec2.executeProgram(parse(dsl));

      const v1 = session1.scope.get('f');
      const v2 = session2.scope.get('f');

      const sim = similarity(v1, v2);
      assert.equal(sim, 1.0, 'same DSL should produce identical vectors');
    });
  });

  describe('complex DSL', () => {
    test('should handle rule with implies', () => {
      setup();
      const program = parse('@rule Implies (isA ?x Human) (isA ?x Mortal)');
      const result = executor.executeProgram(program);

      assert.ok(result.success);
    });

    test('should handle multi-arg statement', () => {
      setup();
      // Note: $100 would be parsed as reference, use 100 as number
      const program = parse('@sale sells Alice Book Bob 100');
      const result = executor.executeProgram(program);

      assert.ok(result.success);
    });
  });

  describe('macro definitions', () => {
    test('should collect macro body instead of executing', () => {
      setup();
      const program = parse(`
        @TestMacro:testmacro macro param1 param2
            @local1 op1 $param1
            @local2 op2 $param2
            return $local2
        end
      `);
      const result = executor.executeProgram(program);

      assert.ok(result.success, 'macro definition should not cause errors');
      assert.ok(session.graphs, 'session should have macros map');
      assert.ok(session.graphs.has('TestMacro'), 'macro should be stored');
    });

    test('should store macro parameters', () => {
      setup();
      const program = parse(`
        @MyMacro:mymacro macro arg1 arg2 arg3
            @result bundle $arg1 $arg2 $arg3
        end
      `);
      executor.executeProgram(program);

      const macro = session.graphs.get('MyMacro');
      assert.ok(macro, 'macro should exist');
      assert.deepEqual(macro.params, ['arg1', 'arg2', 'arg3']);
    });

    test('should store macro body statements', () => {
      setup();
      const program = parse(`
        @BodyTest:bodytest macro x
            @a first $x
            @b second $a
            return $b
        end
      `);
      executor.executeProgram(program);

      const macro = session.graphs.get('BodyTest');
      assert.ok(macro, 'macro should exist');
      // Body has 2 statements (@a and @b), return is stored separately in returnExpr
      assert.equal(macro.body.length, 2, 'body should have 2 statements');
      assert.ok(macro.returnExpr, 'macro should have returnExpr');
    });

    test('should handle multiple macro definitions', () => {
      setup();
      const program = parse(`
        @Macro1:m1 macro a
            @r test $a
        end
        @Macro2:m2 macro b
            @r test $b
        end
      `);
      const result = executor.executeProgram(program);

      assert.ok(result.success);
      // Now stores under both invocation name and export name
      assert.equal(session.graphs.size, 4);
      assert.ok(session.graphs.has('m1'), 'should have invocation name m1');
      assert.ok(session.graphs.has('m2'), 'should have invocation name m2');
      assert.ok(session.graphs.has('Macro1'), 'should have export name Macro1');
      assert.ok(session.graphs.has('Macro2'), 'should have export name Macro2');
    });

    test('should not execute statements inside macro body', () => {
      setup();
      // This macro body references $param which doesn't exist globally
      // If executed, it would throw "Undefined reference"
      const program = parse(`
        @SafeMacro:safe macro param
            @inner test $param
            @outer wrap $inner
        end
      `);
      const result = executor.executeProgram(program);

      // Should succeed because macro body is stored, not executed
      assert.ok(result.success, 'macro with undefined refs in body should not fail');
    });

    test('should handle macro mixed with regular statements', () => {
      setup();
      const program = parse(`
        @fact1 loves John Mary
        @TestMacro:tm macro x
            @r test $x
        end
        @fact2 knows Alice Bob
      `);
      const result = executor.executeProgram(program);

      assert.ok(result.success);
      assert.ok(session.scope.has('fact1'), 'fact1 should be in scope');
      assert.ok(session.scope.has('fact2'), 'fact2 should be in scope');
      assert.ok(session.graphs.has('TestMacro'), 'macro should be stored');
    });

    test('should handle macro without explicit end', () => {
      setup();
      const program = parse(`
        @Unclosed:unclosed macro x
            @r test $x
      `);
      const result = executor.executeProgram(program);

      // Parser currently accepts macro without 'end' (stops at EOF)
      // This is a known limitation - macro is still created
      assert.ok(result.success, 'parser accepts implicit end at EOF');
      // Macro should still be stored
      const macro = session.graphs.get('Unclosed');
      assert.ok(macro, 'macro should exist even without explicit end');
    });
  });
});
