import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import SessionDefault, { Session, translateNL2DSL } from '../../src/index.mjs';

describe('src/index.mjs exports', () => {
  test('default export is Session', () => {
    assert.equal(typeof SessionDefault, 'function');
    assert.equal(SessionDefault, Session);
  });

  test('translateNL2DSL is exported', () => {
    assert.equal(typeof translateNL2DSL, 'function');
    const out = translateNL2DSL('All dogs are animals.', { source: 'ruletaker', isQuestion: false });
    assert.equal(out.success, true, JSON.stringify(out.errors));
    assert.match(out.dsl, /\bImplies\b/);
    assert.match(out.dsl, /\bDog\b/);
    assert.match(out.dsl, /\bAnimal\b/);
  });
});
