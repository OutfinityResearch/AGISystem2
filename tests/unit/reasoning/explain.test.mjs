/**
 * Tests for Explain Meta-Operator
 * @module tests/unit/reasoning/explain.test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Explain meta-operator', () => {
  test('prove-first explanation for transitive causal goal', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      causes Storm Rain
      causes Rain WetGrass
      causes WetGrass SlipHazard
      causes SlipHazard Injury
    `);

    const result = session.query('@q explain (causes Storm Injury) ?why', { maxResults: 1 });

    assert.equal(result.success, true);
    assert.ok(result.bindings instanceof Map);
    const why = result.bindings.get('why');
    assert.ok(why && typeof why.answer === 'string' && why.answer.length > 0);
    assert.ok(result.allResults?.[0]?.proof?.operation === 'explain');
    assert.equal(result.allResults?.[0]?.proof?.via, 'prove');
  });

  test('abduce fallback explanation when goal is not provable', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      @cond hasProperty ?p Flu
      @conc hasProperty ?p Sick
      Implies $cond $conc
    `);

    const result = session.query('@q explain (hasProperty Alice Sick) ?why', { maxResults: 1 });

    assert.equal(result.success, true);
    const why = result.bindings.get('why');
    assert.ok(why && typeof why.answer === 'string' && why.answer.length > 0);
    assert.ok(result.allResults?.[0]?.proof?.operation === 'explain');
    assert.equal(result.allResults?.[0]?.proof?.via, 'abduce');
    assert.ok(/Flu/i.test(String(result.allResults?.[0]?.proof?.explanation || '')));
  });

  test('holographicPriority bypasses HDC for explain/whatif', () => {
    const session = new Session({
      geometry: 2048,
      hdcStrategy: 'dense-binary',
      reasoningPriority: 'holographicPriority'
    });

    session.learn(`
      causes Storm Rain
      causes Rain WetGrass
      causes WetGrass SlipHazard
      causes SlipHazard Injury
      causes Accident Injury
    `);

    const explain = session.query('@q explain (causes Storm Injury) ?why', { maxResults: 1 });
    assert.equal(explain.success, true);

    const whatif = session.query('@q whatif Storm Injury ?outcome', { maxResults: 1 });
    assert.equal(whatif.success, true);
    const outcome = whatif.bindings.get('outcome')?.answer;
    assert.ok(['unchanged', 'uncertain', 'would_fail'].includes(String(outcome)));
  });
});

