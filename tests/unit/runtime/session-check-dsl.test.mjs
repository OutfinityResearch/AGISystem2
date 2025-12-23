/**
 * Session checkDSL strictness tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Session DSL validation', () => {
  test('learn rejects unknown operator when not declared', () => {
    const session = new Session({ geometry: 1024 });
    assert.throws(() => session.learn('@f blorp A B'));
  });

  test('learn allows operators declared in the same script', () => {
    const session = new Session({ geometry: 1024 });
    const result = session.learn(`
      @rel:rel __Relation
      rel A B
    `);
    assert.equal(result.success, true);
    assert.equal(result.facts, 2);
  });

  test('checkDSLStrict rejects unknown concepts (atoms) when required', () => {
    const session = new Session({ geometry: 1024 });
    assert.throws(
      () => session.checkDSLStrict(`
        @isA:isA __Relation
        isA Rex Dog
      `),
      /Unknown concept 'Rex'|Unknown concept 'Dog'/
    );
  });

  test('checkDSLStrict allows concepts declared/persisted in the same program', () => {
    const session = new Session({ geometry: 1024 });
    const ast = session.checkDSLStrict(`
      @isA:isA __Relation
      @Rex:Rex __Relation
      @Dog:Dog __Relation
      isA Rex Dog
    `);
    assert.ok(ast);
    assert.equal(ast.statements.length, 4);
  });

  test('checkDSLStrict treats @name bindings as declared atoms', () => {
    const session = new Session({ geometry: 1024 });
    const ast = session.checkDSLStrict(`
      @Foo:Foo ___NewVector
      @rel:rel __Relation
      rel Foo Foo
    `);
    assert.ok(ast);
  });

  test('checkDSLStrict treats graph names as declared atoms', () => {
    const session = new Session({ geometry: 1024 });
    const ast = session.checkDSLStrict(`
      @Animal:Animal graph x
        return $x
      end
      @rel:rel __Relation
      rel Animal Animal
    `);
    assert.ok(ast);
  });
});
