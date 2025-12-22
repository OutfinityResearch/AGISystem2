/**
 * Tests for Planning Solve (solve planning)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../../src/runtime/session.mjs';
import { initHDC } from '../../../../src/hdc/facade.mjs';

describe('Planning Solve DSL', () => {
  test.before(async () => {
    await initHDC();
  });

  test('should produce a 1-step plan and store planStep facts', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      at Alice Home

      requires MoveToPark at Alice Home
      causes MoveToPark at Alice Park
      prevents MoveToPark at Alice Home

      @goal at Alice Park
      @plan solve planning
        goal from goal
        maxDepth from 3
      end
    `);

    assert.ok(result.success, 'learn should succeed');
    assert.ok(result.solveResult, 'should include solveResult');
    assert.equal(result.solveResult.success, true, 'planning should succeed');
    assert.deepEqual(result.solveResult.plan, ['MoveToPark'], 'expected a 1-step plan');

    const q = session.query('@q planStep plan 1 ?action');
    assert.ok(q.success, 'query should succeed');
    assert.equal(q.bindings.get('action')?.answer, 'MoveToPark');
  });

  test('should produce a 2-step plan for chained preconditions', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      at Alice Home

      requires MoveHomeToStreet at Alice Home
      causes MoveHomeToStreet at Alice Street
      prevents MoveHomeToStreet at Alice Home

      requires MoveStreetToPark at Alice Street
      causes MoveStreetToPark at Alice Park
      prevents MoveStreetToPark at Alice Street

      @goal at Alice Park
      @plan solve planning
        goal from goal
        maxDepth from 4
      end
    `);

    assert.ok(result.success, 'learn should succeed');
    assert.ok(result.solveResult, 'should include solveResult');
    assert.equal(result.solveResult.success, true, 'planning should succeed');
    assert.deepEqual(result.solveResult.plan, ['MoveHomeToStreet', 'MoveStreetToPark']);

    const q1 = session.query('@q planStep plan 1 ?action');
    assert.ok(q1.success);
    assert.equal(q1.bindings.get('action')?.answer, 'MoveHomeToStreet');

    const q2 = session.query('@q planStep plan 2 ?action');
    assert.ok(q2.success);
    assert.equal(q2.bindings.get('action')?.answer, 'MoveStreetToPark');
  });

  test('should return an empty plan when goals already satisfied (and still store plan length)', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      at Alice Park
      @goal at Alice Park
      @plan solve planning
        goal from goal
        maxDepth from 2
      end
    `);

    assert.ok(result.success);
    assert.ok(result.solveResult);
    assert.equal(result.solveResult.success, true);
    assert.deepEqual(result.solveResult.plan, []);

    const q = session.query('@q plan plan ?len');
    assert.ok(q.success);
    assert.equal(q.bindings.get('len')?.answer, '0');
  });

  test('should emit planAction facts when actionSig is available (tool + parameters)', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      @actionSig:actionSig __Relation
      actionSig MoveToPark Walk Alice Park

      at Alice Home

      requires MoveToPark at Alice Home
      causes MoveToPark at Alice Park
      prevents MoveToPark at Alice Home

      @goal at Alice Park
      @plan solve planning
        goal from goal
        maxDepth from 3
      end
    `);

    assert.ok(result.success);
    assert.ok(result.solveResult);
    assert.equal(result.solveResult.success, true);
    assert.deepEqual(result.solveResult.plan, ['MoveToPark']);

    const q = session.query('@q planAction plan 1 ?tool ?p1 ?p2');
    assert.ok(q.success);
    assert.equal(q.bindings.get('tool')?.answer, 'Walk');
    assert.equal(q.bindings.get('p1')?.answer, 'Alice');
    assert.equal(q.bindings.get('p2')?.answer, 'Park');
  });

  test('should find a safe 7-step plan for wolf-goat-cabbage with a conflict guard constraint', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      # Static constraints
      conflictsWith Wolf Goat
      conflictsWith Goat Cabbage

      # Action model
      requires CrossGoatLR at Farmer Left
      requires CrossGoatLR at Goat Left
      causes CrossGoatLR at Farmer Right
      causes CrossGoatLR at Goat Right
      prevents CrossGoatLR at Farmer Left
      prevents CrossGoatLR at Goat Left

      requires CrossGoatRL at Farmer Right
      requires CrossGoatRL at Goat Right
      causes CrossGoatRL at Farmer Left
      causes CrossGoatRL at Goat Left
      prevents CrossGoatRL at Farmer Right
      prevents CrossGoatRL at Goat Right

      requires CrossWolfLR at Farmer Left
      requires CrossWolfLR at Wolf Left
      causes CrossWolfLR at Farmer Right
      causes CrossWolfLR at Wolf Right
      prevents CrossWolfLR at Farmer Left
      prevents CrossWolfLR at Wolf Left

      requires CrossWolfRL at Farmer Right
      requires CrossWolfRL at Wolf Right
      causes CrossWolfRL at Farmer Left
      causes CrossWolfRL at Wolf Left
      prevents CrossWolfRL at Farmer Right
      prevents CrossWolfRL at Wolf Right

      requires CrossCabbageLR at Farmer Left
      requires CrossCabbageLR at Cabbage Left
      causes CrossCabbageLR at Farmer Right
      causes CrossCabbageLR at Cabbage Right
      prevents CrossCabbageLR at Farmer Left
      prevents CrossCabbageLR at Cabbage Left

      requires CrossCabbageRL at Farmer Right
      requires CrossCabbageRL at Cabbage Right
      causes CrossCabbageRL at Farmer Left
      causes CrossCabbageRL at Cabbage Left
      prevents CrossCabbageRL at Farmer Right
      prevents CrossCabbageRL at Cabbage Right

      requires CrossAloneLR at Farmer Left
      causes CrossAloneLR at Farmer Right
      prevents CrossAloneLR at Farmer Left

      requires CrossAloneRL at Farmer Right
      causes CrossAloneRL at Farmer Left
      prevents CrossAloneRL at Farmer Right

      # Goals (refs)
      @gFarmer at Farmer Right
      @gWolf at Wolf Right
      @gGoat at Goat Right
      @gCabbage at Cabbage Right

      # Start state for planning (refs)
      @sFarmer at Farmer Left
      @sWolf at Wolf Left
      @sGoat at Goat Left
      @sCabbage at Cabbage Left

      @crossingPlan solve planning
        start from sFarmer
        start from sWolf
        start from sGoat
        start from sCabbage

        goal from gFarmer
        goal from gWolf
        goal from gGoat
        goal from gCabbage

        guard from Farmer
        conflictOp from conflictsWith
        locationOp from at
        maxDepth from 8
      end
    `);

    assert.ok(result.success);
    assert.ok(result.solveResult);
    assert.equal(result.solveResult.success, true);
    assert.deepEqual(result.solveResult.plan, [
      'CrossGoatLR',
      'CrossAloneRL',
      'CrossWolfLR',
      'CrossGoatRL',
      'CrossCabbageLR',
      'CrossAloneRL',
      'CrossGoatLR'
    ]);

    const len = session.query('@q plan crossingPlan ?len');
    assert.ok(len.success);
    assert.equal(len.bindings.get('len')?.answer, '7');
  });

  test('should reject planning when the start state violates the conflict guard constraint', () => {
    const session = new Session({ geometry: 2048 });

    const result = session.learn(`
      conflictsWith Wolf Goat

      requires CrossAloneRL at Farmer Right
      causes CrossAloneRL at Farmer Left
      prevents CrossAloneRL at Farmer Right

      @gFarmer at Farmer Left
      @sFarmer at Farmer Right
      @sWolf at Wolf Left
      @sGoat at Goat Left

      @badPlan solve planning
        start from sFarmer
        start from sWolf
        start from sGoat

        goal from gFarmer
        guard from Farmer
        conflictOp from conflictsWith
        locationOp from at
        maxDepth from 2
      end
    `);

    assert.ok(result.success);
    assert.ok(result.solveResult);
    assert.equal(result.solveResult.success, false);
    assert.match(String(result.solveResult.error || ''), /Initial state violates planning constraints/i);
  });
});
