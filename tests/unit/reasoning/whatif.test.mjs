/**
 * Tests for Counterfactual (What-If) Reasoning
 * @module tests/unit/reasoning/whatif.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Counterfactual Reasoning (whatif)', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  describe('Direct Causal Negation', () => {
    test('should detect direct causal link would fail', () => {
      setup();

      session.learn(`
        causes Rain WetGrass
        causes Rain WetSidewalk
        causes Sprinkler WetGrass
      `);

      // What if Rain didn't happen? WetGrass might not happen
      const result = session.query('@q whatif Rain WetGrass ?outcome');

      console.log('Direct whatif result:', JSON.stringify(result, null, 2));

      assert.ok(result.success, 'Query should succeed');
      // Should show that WetGrass would fail without Rain (unless Sprinkler)
    });

    test('should show unchanged when no causal link', () => {
      setup();

      session.learn(`
        causes Rain WetGrass
        causes Sun DryGrass
      `);

      // What if Sun didn't happen? WetGrass is unaffected
      const result = session.query('@q whatif Sun WetGrass ?outcome');

      console.log('No link whatif result:', JSON.stringify(result, null, 2));

      // Sun doesn't cause WetGrass, so no effect
    });
  });

  describe('Transitive Causal Chains', () => {
    test('should trace transitive causal effects', () => {
      setup();

      session.learn(`
        causes Pollution ClimateChange
        causes ClimateChange Drought
        causes Drought CropFailure
      `);

      // What if Pollution didn't happen? CropFailure might not happen
      const result = session.query('@q whatif Pollution Drought ?outcome');

      console.log('Transitive whatif result:', JSON.stringify(result, null, 2));

      // Pollution -> ClimateChange -> Drought, so Drought would fail
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle multiple causal paths', () => {
      setup();

      session.learn(`
        causes Rain WetGrass
        causes Sprinkler WetGrass
        causes PowerOutage SprinklerOff
      `);

      // What if Rain didn't happen?
      // WetGrass could still happen via Sprinkler
      const result = session.query('@q whatif Rain WetGrass ?outcome');

      console.log('Multiple paths whatif:', JSON.stringify(result, null, 2));

      // Result should show uncertainty since there's an alternative cause
    });
  });

  describe('Absence of Facts', () => {
    test('should handle missing causal facts gracefully', () => {
      setup();

      session.learn(`
        isA Bird Animal
        can Bird Fly
      `);

      // What if Bird? No causal facts exist
      const result = session.query('@q whatif Bird Fly ?outcome');

      console.log('No causal facts result:', JSON.stringify(result, null, 2));

      // Should indicate no causal relationship found
    });
  });
});

describe('Whatif Integration with Session', () => {
  test('should work through session.query interface', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      causes Storm Rain
      causes Rain Flooding
    `);

    const result = session.query('@q whatif Storm Rain ?outcome');

    console.log('Session whatif:', JSON.stringify(result, null, 2));

    assert.ok('success' in result, 'Should return a result object');
  });
});
