import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DS19: SemanticIndex is theory-driven at runtime', () => {
  test('learned __TransitiveRelation declarations affect proofs', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn(`
      @r:r __TransitiveRelation
      r A B
      r B C
    `);

    const res = session.prove('@goal r A C');
    assert.equal(res.valid, true);
  });

  test('learned __SymmetricRelation declarations affect proofs', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn(`
      @friend:friend __SymmetricRelation
      friend Alice Bob
    `);

    const res = session.prove('@goal friend Bob Alice');
    assert.equal(res.valid, true);
  });

  test('learned inverseRelation facts affect inverse reasoning', () => {
    const session = new Session({ geometry: 2048, strictMode: true });

    session.learn(`
      @olderThan:olderThan __Relation
      @youngerThan:youngerThan __Relation
      inverseRelation olderThan youngerThan
      olderThan Alice Bob
    `);

    const res = session.prove('@goal youngerThan Bob Alice');
    assert.equal(res.valid, true);
  });
});
