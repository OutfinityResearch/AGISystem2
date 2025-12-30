import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';

test('holographic query skips symbolic supplement when HDC validates', () => {
  const session = new Session({
    hdcStrategy: 'dense-binary',
    geometry: 256,
    reasoningPriority: 'holographicPriority',
    autoLoadCore: false
  });

  // Make candidate extraction permissive for this unit test.
  assert.equal(typeof session.queryEngine?.execute, 'function');
  session.queryEngine.config.UNBIND_MIN_SIMILARITY = -1;
  session.queryEngine.config.UNBIND_MAX_CANDIDATES = 10;
  session.queryEngine.config.FALLBACK_TO_SYMBOLIC = true;
  session.queryEngine.config.VALIDATION_REQUIRED = true;

  // Minimal theory: declare relation + two entities + one fact.
  session.learn(`
@rel:rel __Relation
rel A B
`);

  // Spy on symbolic engine.
  let symbolicCalled = false;
  const original = session.queryEngine.symbolicEngine.execute.bind(session.queryEngine.symbolicEngine);
  session.queryEngine.symbolicEngine.execute = (...args) => {
    symbolicCalled = true;
    return original(...args);
  };

  const result = session.query('rel ?x ?y', { maxResults: 10 });
  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.allResults));
  assert.ok(result.allResults.length >= 1);

  // Decision D4: if HDC validated at least one result, skip symbolic supplement.
  assert.equal(symbolicCalled, false);

  session.close();
});

