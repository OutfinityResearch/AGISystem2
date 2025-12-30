import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DSL @_: Set command', () => {
  test('toggles closedWorldAssumption within a single Session', () => {
    const session = new Session({
      geometry: 512,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven'
    });
    session.loadCore({ includeIndex: true });

    assert.equal(session.closedWorldAssumption, false);

    session.learn('@_ Set CWA on');
    assert.equal(session.closedWorldAssumption, true);

    session.learn('@_ Set CWA off');
    assert.equal(session.closedWorldAssumption, false);
  });

  test('changes Not(goal) semantics when toggled', () => {
    const session = new Session({
      geometry: 512,
      reasoningPriority: 'symbolicPriority',
      reasoningProfile: 'theoryDriven'
    });
    session.loadCore({ includeIndex: true });

    session.learn('hasProperty Bob big');

    session.learn('@_ Set CWA off');
    const openWorld = session.prove('@goal Not (hasProperty Zed big)');
    assert.equal(openWorld.valid, false);

    session.learn('@_ Set CWA on');
    const closedWorld = session.prove('@goal Not (hasProperty Zed big)');
    assert.equal(closedWorld.valid, true);
  });
});
