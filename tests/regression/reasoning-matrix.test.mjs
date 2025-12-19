import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../src/runtime/session.mjs';

function makeSession({ profile, priority, strategy = 'dense-binary' }) {
  return new Session({
    geometry: 2048,
    hdcStrategy: strategy,
    reasoningPriority: priority,
    reasoningProfile: profile
  });
}

test('regression matrix: legacy(symbolic) vs theoryDriven(holographic)', async (t) => {
  const configs = [
    { name: 'legacy-symbolic', profile: 'legacy', priority: 'symbolicPriority' },
    { name: 'theoryDriven-holographic', profile: 'theoryDriven', priority: 'holographicPriority' }
  ];

  const cases = [
    {
      name: 'direct proof',
      run(session) {
        session.learn('isA Socrates Human');
        const result = session.prove('@g isA Socrates Human');
        assert.equal(result.valid, true);
        assert.ok(result.proofObject);
      }
    },
    {
      name: 'transitive proof',
      run(session) {
        session.learn('isA Socrates Philosopher');
        session.learn('isA Philosopher Human');
        const result = session.prove('@g isA Socrates Human');
        assert.equal(result.valid, true);
        assert.ok(typeof result.method === 'string' && result.method.length > 0);
      }
    },
    {
      name: 'property inheritance',
      run(session) {
        session.learn('isA Tweety Bird');
        session.learn('can Bird Fly');
        const result = session.prove('@g can Tweety Fly');
        assert.equal(result.valid, true);
      }
    },
    {
      name: 'rule backward chaining',
      run(session) {
        session.learn(`
          @cond:cond isA Socrates Human
          @conc isA Socrates Mortal
          @r Implies $cond $conc
        `);
        const result = session.prove('@g isA Socrates Mortal');
        assert.equal(result.valid, true);
        assert.ok(result.proofObject.steps.some(s => s.kind === 'rule'), 'expected a rule step');
      }
    },
    {
      name: 'query hole fill (single fact)',
      run(session) {
        session.learn('likes John Pizza');
        const result = session.query('@q likes John ?food');
        assert.equal(result.success, true);
        assert.equal(result.bindings.get('food')?.answer, 'Pizza');
      }
    },
    {
      name: 'alias/canonicalization difference (expected)',
      run(session, config) {
        session.learn(`
          alias Automobile Car
          isA Car Vehicle
        `);
        const result = session.prove('@g isA Automobile Vehicle');
        if (config.profile === 'theoryDriven') {
          assert.equal(result.valid, true);
        } else {
          // Legacy baseline is allowed to fail without theory-driven canonicalization.
          assert.equal(result.valid, false);
        }
      }
    }
  ];

  for (const config of configs) {
    await t.test(config.name, async (st) => {
      for (const c of cases) {
        await st.test(c.name, () => {
          const session = makeSession(config);
          c.run(session, config);
        });
      }
    });
  }
});
