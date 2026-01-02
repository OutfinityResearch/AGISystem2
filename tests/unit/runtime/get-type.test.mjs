import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('___GetType (strict typing)', () => {
  test('extracts primary type from typed constructor bind chain', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn(`
      @_ Load "./config/Packs/Bootstrap/00-types.sys2"
      @_ Load "./config/Packs/Bootstrap/02-constructors.sys2"
    `);

    session.learn('@John:John __Person');
    session.learn('@t ___GetType $John');

    const extracted = session.scope.get('t');
    const expected = session.scope.get('PersonType');
    assert.ok(expected, 'expected PersonType to be declared in scope');
    assert.ok(session.similarity(extracted, expected) > 0.99, 'expected extracted type to match PersonType');
  });

  test('__GetType is an alias of ___GetType', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn(`
      @_ Load "./config/Packs/Bootstrap/00-types.sys2"
      @_ Load "./config/Packs/Bootstrap/02-constructors.sys2"
    `);

    session.learn('@John:John __Person');
    session.learn('@t __GetType $John');

    const extracted = session.scope.get('t');
    const expected = session.scope.get('PersonType');
    assert.ok(expected, 'expected PersonType to be declared in scope');
    assert.ok(session.similarity(extracted, expected) > 0.99, 'expected extracted type to match PersonType');
  });

  test('throws deterministically when type is unknown in strict mode', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn('@X:X ___NewVector "X" "User"');

    const result = session.learn('@_ ___GetType $X');
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes('___GetType: instance has no known type')));
  });

  test('returns __UnknownType__ when not strict', () => {
    const session = new Session({ geometry: 2048, strictMode: false, l0BuiltinsEnabled: true });

    session.learn('@X:X ___NewVector "X" "User"');
    session.learn('@t ___GetType $X');

    const typeName = session.vocabulary.reverseLookup(session.scope.get('t'));
    assert.equal(typeName, '__UnknownType__');
  });
});
