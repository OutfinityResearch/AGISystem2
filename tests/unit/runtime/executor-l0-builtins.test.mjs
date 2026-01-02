import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';
import { bind, bundle } from '../../../src/core/operations.mjs';
import { withPosition } from '../../../src/core/position.mjs';
import { equals } from '../../../src/hdc/facade.mjs';

describe('Executor L0 builtins (DS19)', () => {
  test('___Bind computes bind(a,b)', () => {
    const session = new Session({ geometry: 2048, l0BuiltinsEnabled: true });
    session.learn('@x ___Bind A B');
    const x = session.scope.get('x');
    const a = session.vocabulary.getOrCreate('A');
    const b = session.vocabulary.getOrCreate('B');
    assert.ok(equals(x, bind(a, b)));
  });

  test('___Bundle computes bundle(a,b,c)', () => {
    const session = new Session({ geometry: 2048, l0BuiltinsEnabled: true });
    session.learn('@x ___Bundle A B C');
    const x = session.scope.get('x');
    const a = session.vocabulary.getOrCreate('A');
    const b = session.vocabulary.getOrCreate('B');
    const c = session.vocabulary.getOrCreate('C');
    assert.ok(equals(x, bundle([a, b, c])));
  });

  test('___BundlePositioned bundles position-tagged list items', () => {
    const session = new Session({ geometry: 2048, l0BuiltinsEnabled: true });
    session.learn('@x ___BundlePositioned [A, B]');
    const x = session.scope.get('x');
    const a = session.vocabulary.getOrCreate('A');
    const b = session.vocabulary.getOrCreate('B');
    assert.ok(equals(x, bundle([withPosition(1, a, session), withPosition(2, b, session)])));
  });

  test('___NewVector without args is fresh per call', () => {
    const session = new Session({ geometry: 2048, l0BuiltinsEnabled: true });
    session.learn('@a ___NewVector');
    session.learn('@b ___NewVector');
    const a = session.scope.get('a');
    const b = session.scope.get('b');
    assert.ok(a && b);
    assert.equal(equals(a, b), false);
  });

  test('___NewVector with (name,theory) is deterministic', () => {
    const session = new Session({ geometry: 2048, l0BuiltinsEnabled: true });
    session.learn('@x ___NewVector "NumericType" "Core"');
    session.learn('@y ___NewVector "NumericType" "Core"');
    const x = session.scope.get('x');
    const y = session.scope.get('y');
    assert.ok(equals(x, y));
  });
});
