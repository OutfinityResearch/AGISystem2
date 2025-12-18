/**
 * Tests for Default/Exception Reasoning
 * @module tests/unit/reasoning/defaults.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('DefaultReasoner', () => {
  let session;

  function setup() {
    session = new Session({ geometry: 2048 });
  }

  describe('Basic Default Resolution', () => {
    test('should apply default when no exception exists', () => {
      setup();

      session.learn(`
        Default can Bird Fly
        isA Hawk Bird
      `);

      // Query the default reasoner directly
      const result = session.prove('@goal can Hawk Fly');

      console.log('Default test result:', JSON.stringify(result, null, 2));

      // Should succeed via default reasoning
      assert.ok(result.valid === true || result.success === true,
        `Expected Hawk can Fly via default, got: ${JSON.stringify(result)}`);
    });

    test('should block default when exception applies', () => {
      setup();

      session.learn(`
        Default can Bird Fly
        Exception can Penguin Fly
        isA Opus Penguin
        isA Penguin Bird
      `);

      const result = session.prove('@goal can Opus Fly');

      console.log('Exception test result:', JSON.stringify(result, null, 2));

      // Should fail because Penguin exception blocks default
      assert.ok(result.valid === false || result.success === false,
        `Expected Opus cannot fly due to exception, got: ${JSON.stringify(result)}`);
    });
  });

  describe('Specificity Ordering', () => {
    test('should prefer more specific exception', () => {
      setup();

      session.learn(`
        Default can Bird Fly
        Exception can Penguin Fly
        Exception can FlightlessBird Fly
        isA Opus Penguin
        isA Penguin Bird
        isA Penguin FlightlessBird
        isA FlightlessBird Bird
      `);

      const result = session.prove('@goal can Opus Fly');

      // Should fail - Opus is a Penguin which is an exception
      assert.ok(result.valid === false || result.success === false,
        'Opus should not fly due to Penguin exception');
    });

    test('should apply default to non-exception subtype', () => {
      setup();

      session.learn(`
        Default can Bird Fly
        Exception can Penguin Fly
        isA Sparrow Bird
      `);

      const result = session.prove('@goal can Sparrow Fly');

      console.log('Sparrow test result:', JSON.stringify(result, null, 2));

      // Sparrow is a Bird, not a Penguin, so default applies
      assert.ok(result.valid === true || result.success === true,
        `Expected Sparrow can fly via default, got: ${JSON.stringify(result)}`);
    });
  });

  describe('Type Hierarchy', () => {
    test('should traverse isA chain to find defaults', () => {
      setup();

      session.learn(`
        Default can Animal Move
        isA Bird Animal
        isA Sparrow Bird
      `);

      const result = session.prove('@goal can Sparrow Move');

      // Sparrow isA Bird isA Animal, Default applies to Animal
      assert.ok(result.valid === true || result.success === true,
        `Expected Sparrow can Move via Animal default, got: ${JSON.stringify(result)}`);
    });

    test('should find exception in ancestor chain', () => {
      setup();

      session.learn(`
        Default can Animal Move
        Exception can Barnacle Move
        isA Sessile Barnacle
        isA Barnacle Animal
      `);

      const result = session.prove('@goal can Sessile Move');

      // Sessile isA Barnacle (exception) isA Animal (default)
      // Exception should block
      assert.ok(result.valid === false || result.success === false,
        'Sessile should not move due to Barnacle exception');
    });
  });

  describe('Confidence Splits', () => {
    test('should handle conflicting defaults at same level', () => {
      setup();

      session.learn(`
        Default can Flying Move
        Default can Swimming Move
        isA Duck Flying
        isA Duck Swimming
      `);

      const result = session.prove('@goal can Duck Move');

      // Both defaults apply - should succeed with confidence split
      // Note: Implementation may return success with lower confidence
      console.log('Conflict test result:', JSON.stringify(result, null, 2));
    });
  });

  describe('No Default Found', () => {
    test('should fail gracefully when no default exists', () => {
      setup();

      session.learn(`
        isA Rock Thing
      `);

      const result = session.prove('@goal can Rock Fly');

      // No default for flying rocks
      assert.ok(result.valid === false || result.success === false,
        'Rock should not fly - no default applies');
    });
  });
});

describe('DefaultReasoner Integration', () => {
  test('should integrate with query engine', () => {
    const session = new Session({ geometry: 2048 });

    session.learn(`
      Default can Bird Fly
      isA Hawk Bird
      isA Penguin Bird
      Exception can Penguin Fly
    `);

    // Query format
    const query1 = session.query('@q can ?bird Fly');
    console.log('Query result:', JSON.stringify(query1, null, 2));

    // Should find Hawk via default, not Penguin
  });
});
