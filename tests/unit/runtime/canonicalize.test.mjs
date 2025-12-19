import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import { canonicalizeStatement } from '../../../src/runtime/canonicalize.mjs';
import { parse } from '../../../src/parser/parser.mjs';

describe('canonicalize (DS19 incremental)', () => {
  test('canonicalizeStatement rewrites Identifier args using synonym canonical representative', () => {
    const session = new Session({ geometry: 2048 });
    session.componentKB.addSynonym('Automobile', 'Car');

    // Deterministic canonical rep: lexicographically smallest in the synonym component.
    // {Automobile, Car} => Automobile
    const ast = parse('isA Car Automobile');
    const canon = canonicalizeStatement(session, ast.statements[0]);

    assert.equal(canon.operator.name, 'isA');
    assert.equal(canon.args[0].name, 'Automobile'); // canonical rep of {Car, Automobile}
    assert.equal(canon.args[1].name, 'Automobile');
  });

  test('Session.prove uses canonicalized goal when enabled', () => {
    const session = new Session({ geometry: 2048, canonicalizationEnabled: true });
    session.learn(`
      synonym Car Automobile
      isA Automobile Vehicle
    `);

    // Without canonicalization, this often degrades to weak similarity;
    // with canonicalization, goal becomes "isA Automobile Vehicle" (exact).
    const result = session.prove('@goal isA Car Vehicle');
    assert.equal(result.valid, true);
    assert.ok(result.proofObject);
    assert.deepEqual(result.proofObject.goal, { operator: 'isA', args: ['Automobile', 'Vehicle'] });
  });

  test('Session.learn stores canonical metadata and canonical vectors when enabled', () => {
    const session = new Session({ geometry: 2048, canonicalizationEnabled: true });
    session.learn(`
      synonym Car Automobile
      alias Car Automobile
      isA Car Vehicle
    `);

    const isAFact = session.kbFacts.find(f => f.metadata?.operator === 'isA');
    assert.ok(isAFact);
    assert.deepEqual(isAFact.metadata.args, ['Automobile', 'Vehicle']);

    const goalAst = parse('isA Automobile Vehicle');
    const goalVec = session.executor.buildStatementVector(goalAst.statements[0]);
    const sim = session.similarity(isAFact.vector, goalVec);
    assert.ok(sim > 0.99);
  });
});
