/**
 * Policy view materialization (derived audit lines; no KB injection)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Policy view materialization', () => {
  test('materializedFactLines are derived and do not mutate kbFacts', () => {
    const session = new Session({ geometry: 256 });

    session.learn(`
      @negates:negates __Relation
      @policyNewerWins:policyNewerWins __Relation
      @:oldFact isA Socrates Man
      @:newFact isA Socrates Mortal
      @:neg1 negates newFact oldFact
      policyNewerWins P True
    `);

    const oldId = session.kbFacts.find(f => f.name === 'oldFact')?.id ?? null;
    const newId = session.kbFacts.find(f => f.name === 'newFact')?.id ?? null;
    assert.ok(Number.isFinite(oldId), 'should create oldFact');
    assert.ok(Number.isFinite(newId), 'should create newFact');

    const kbCountBefore = session.kbFacts.length;
    const kbVersionBefore = session._kbBundleVersion ?? 0;

    session.urcMaterializeFacts = true;
    const view1 = session.materializePolicyView({});

    assert.equal(view1.success, true);
    assert.equal(session.kbFacts.length, kbCountBefore, 'should not inject derived facts into kbFacts');
    assert.equal(session._kbBundleVersion ?? 0, kbVersionBefore, 'should not change KB version');

    assert.equal(view1.policy?.policyId, 'P');
    assert.equal(view1.newerWins, true);

    assert.ok(Array.isArray(view1.materializedFactLines));
    assert.ok(view1.materializedFactLines.some(l => l === `Supersedes Fact#${newId} Fact#${oldId}`), 'should include Supersedes line');
    assert.ok(view1.materializedFactLines.some(l => l === `Current Fact#${newId} True`), 'should include Current line');

    const view2 = session.materializePolicyView({});
    assert.equal(view2.success, true);
    assert.equal(session.kbFacts.length, kbCountBefore, 'second call should still not mutate kbFacts');
    assert.equal(session._kbBundleVersion ?? 0, kbVersionBefore, 'second call should still not change KB version');
    assert.deepEqual(view2.materializedFactLines, view1.materializedFactLines, 'materializedFactLines should be stable');

    session.close();
  });

  test('materializedFactLines clear when materialization is disabled', () => {
    const session = new Session({ geometry: 256 });

    session.learn(`
      @negates:negates __Relation
      @:oldFact isA Socrates Man
      @:newFact isA Socrates Mortal
      @:neg1 negates newFact oldFact
    `);

    session.urcMaterializeFacts = true;
    const view1 = session.materializePolicyView({});
    assert.equal(view1.success, true);
    assert.ok(view1.materializedFactLines.length > 0);

    session.urcMaterializeFacts = false;
    const view2 = session.materializePolicyView({});
    assert.equal(view2.success, true);
    assert.deepEqual(view2.materializedFactLines, []);
    assert.equal(view2.materializedAtKbVersion, null);

    session.close();
  });
});
