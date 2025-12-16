/**
 * Tests for Scope management
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Scope } from '../../../src/runtime/scope.mjs';

describe('Scope', () => {
  describe('constructor', () => {
    test('should create empty scope', () => {
      const scope = new Scope();
      assert.equal(scope.size, 0, 'should have no bindings');
      assert.equal(scope.parent, null, 'should have no parent');
    });

    test('should create scope with parent', () => {
      const parent = new Scope();
      const child = new Scope(parent);
      assert.equal(child.parent, parent, 'should reference parent');
    });
  });

  describe('define', () => {
    test('should define new binding', () => {
      const scope = new Scope();
      scope.define('x', 42);
      assert.equal(scope.get('x'), 42);
    });

    test('should throw on duplicate definition', () => {
      const scope = new Scope();
      scope.define('x', 1);
      assert.throws(() => scope.define('x', 2), /already defined/);
    });

    test('should allow defining null and undefined', () => {
      const scope = new Scope();
      scope.define('n', null);
      scope.define('u', undefined);
      assert.equal(scope.get('n'), null);
      assert.equal(scope.get('u'), undefined);
    });
  });

  describe('set', () => {
    test('should set new binding', () => {
      const scope = new Scope();
      scope.set('x', 10);
      assert.equal(scope.get('x'), 10);
    });

    test('should update existing binding', () => {
      const scope = new Scope();
      scope.set('x', 1);
      scope.set('x', 2);
      assert.equal(scope.get('x'), 2);
    });

    test('should update parent binding if defined there', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      child.set('x', 2);

      assert.equal(parent.get('x'), 2, 'parent should be updated');
      assert.equal(child.get('x'), 2, 'child should see update');
    });

    test('should create local binding if not in parent', () => {
      const parent = new Scope();
      const child = new Scope(parent);
      child.set('y', 5);

      assert.equal(child.get('y'), 5);
      assert.equal(parent.get('y'), undefined, 'parent should not have binding');
    });
  });

  describe('get', () => {
    test('should return undefined for missing binding', () => {
      const scope = new Scope();
      assert.equal(scope.get('missing'), undefined);
    });

    test('should return local binding', () => {
      const scope = new Scope();
      scope.define('x', 'local');
      assert.equal(scope.get('x'), 'local');
    });

    test('should inherit from parent', () => {
      const parent = new Scope();
      parent.define('x', 'parent');

      const child = new Scope(parent);
      assert.equal(child.get('x'), 'parent');
    });

    test('should shadow parent binding', () => {
      const parent = new Scope();
      parent.define('x', 'parent');

      const child = new Scope(parent);
      child.define('x', 'child');

      assert.equal(child.get('x'), 'child');
      assert.equal(parent.get('x'), 'parent');
    });

    test('should search ancestor chain', () => {
      const grandparent = new Scope();
      grandparent.define('a', 'gp');

      const parent = new Scope(grandparent);
      parent.define('b', 'p');

      const child = new Scope(parent);
      child.define('c', 'c');

      assert.equal(child.get('a'), 'gp');
      assert.equal(child.get('b'), 'p');
      assert.equal(child.get('c'), 'c');
    });
  });

  describe('has', () => {
    test('should return false for missing', () => {
      const scope = new Scope();
      assert.equal(scope.has('x'), false);
    });

    test('should return true for local', () => {
      const scope = new Scope();
      scope.define('x', 1);
      assert.equal(scope.has('x'), true);
    });

    test('should return true for inherited', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      assert.equal(child.has('x'), true);
    });
  });

  describe('delete', () => {
    test('should delete local binding', () => {
      const scope = new Scope();
      scope.define('x', 1);
      const result = scope.delete('x');
      assert.equal(result, true);
      assert.equal(scope.has('x'), false);
    });

    test('should return false for missing', () => {
      const scope = new Scope();
      assert.equal(scope.delete('x'), false);
    });

    test('should not delete parent binding', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      child.delete('x');

      assert.equal(parent.has('x'), true, 'parent should still have binding');
    });
  });

  describe('findDefiningScope', () => {
    test('should return null for missing', () => {
      const scope = new Scope();
      assert.equal(scope.findDefiningScope('x'), null);
    });

    test('should return self for local', () => {
      const scope = new Scope();
      scope.define('x', 1);
      assert.equal(scope.findDefiningScope('x'), scope);
    });

    test('should return parent for inherited', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      assert.equal(child.findDefiningScope('x'), parent);
    });
  });

  describe('child', () => {
    test('should create child scope', () => {
      const parent = new Scope();
      const child = parent.child();
      assert.equal(child.parent, parent);
    });

    test('child should inherit parent bindings', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = parent.child();
      assert.equal(child.get('x'), 1);
    });
  });

  describe('localNames', () => {
    test('should return only local names', () => {
      const parent = new Scope();
      parent.define('a', 1);

      const child = new Scope(parent);
      child.define('b', 2);
      child.define('c', 3);

      const names = child.localNames();
      assert.deepEqual(names.sort(), ['b', 'c']);
    });
  });

  describe('allNames', () => {
    test('should return all names including inherited', () => {
      const parent = new Scope();
      parent.define('a', 1);

      const child = new Scope(parent);
      child.define('b', 2);

      const names = child.allNames();
      assert.deepEqual(names.sort(), ['a', 'b']);
    });

    test('should dedupe shadowed names', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      child.define('x', 2);

      const names = child.allNames();
      assert.deepEqual(names, ['x']);
    });
  });

  describe('entries', () => {
    test('should iterate over local bindings', () => {
      const scope = new Scope();
      scope.define('a', 1);
      scope.define('b', 2);

      const entries = [...scope.entries()];
      assert.equal(entries.length, 2);
    });
  });

  describe('clear', () => {
    test('should remove all local bindings', () => {
      const scope = new Scope();
      scope.define('a', 1);
      scope.define('b', 2);
      scope.clear();
      assert.equal(scope.size, 0);
    });

    test('should not affect parent', () => {
      const parent = new Scope();
      parent.define('x', 1);

      const child = new Scope(parent);
      child.define('y', 2);
      child.clear();

      assert.equal(child.size, 0);
      assert.equal(parent.size, 1);
      assert.equal(child.get('x'), 1, 'should still inherit from parent');
    });
  });
});
