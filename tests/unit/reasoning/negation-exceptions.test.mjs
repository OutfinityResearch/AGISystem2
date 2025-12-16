/**
 * Negation & Exception Tests
 *
 * Tests default reasoning with exceptions:
 * - Birds can fly (default)
 * - Penguins are birds but CANNOT fly (exception)
 * - Ostriches are birds but CANNOT fly (exception)
 *
 * NOTE: Some tests document EXPECTED behavior that is not yet implemented.
 * Rule inheritance (can Bird Fly + isA Tweety Bird → can Tweety Fly) requires
 * property inheritance which is a separate feature from CSP.
 */

import { test, describe, skip } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Negation & Exceptions', () => {

  describe('Default with exceptions', () => {

    // SKIP: Requires property inheritance (can Bird Fly → can Tweety Fly)
    // This is not yet implemented - keeping test as documentation of expected behavior
    skip('bird can fly by default (requires property inheritance)', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Tweety Bird
        can Bird Fly
      `);

      const proof = session.prove('@g can Tweety Fly');
      assert.ok(proof.valid, 'Tweety (bird) should be able to fly');

      session.close();
    });

    test('penguin cannot fly (exception blocks default)', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Penguin Bird
        isA Opus Penguin
        can Bird Fly
        Not can Penguin Fly
      `);

      const proof = session.prove('@g can Opus Fly');
      assert.ok(!proof.valid || proof.result === false, 'Opus (penguin) should NOT be able to fly');

      session.close();
    });

    test('ostrich cannot fly (exception blocks default)', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Ostrich Bird
        isA Oscar Ostrich
        can Bird Fly
        Not can Ostrich Fly
      `);

      const proof = session.prove('@g can Oscar Fly');
      assert.ok(!proof.valid || proof.result === false, 'Oscar (ostrich) should NOT be able to fly');

      session.close();
    });

    // SKIP: Requires property inheritance
    skip('sparrow can fly (requires property inheritance)', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Sparrow Bird
        isA Robin Sparrow
        can Bird Fly
      `);

      const proof = session.prove('@g can Robin Fly');
      assert.ok(proof.valid, 'Robin (sparrow) should be able to fly');

      session.close();
    });

    test('non-bird cannot fly (no default)', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Rock Thing
        can Bird Fly
      `);

      const proof = session.prove('@g can Rock Fly');
      assert.ok(!proof.valid, 'Rock should NOT be able to fly');

      session.close();
    });
  });

  describe('Query with exceptions', () => {

    // SKIP: Requires property inheritance + exception handling in queries
    skip('query ?who can fly should return only non-excepted birds', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Penguin Bird
        isA Sparrow Bird

        isA Tweety Bird
        isA Robin Sparrow
        isA Opus Penguin

        can Bird Fly
        Not can Penguin Fly
      `);

      const result = session.query('@q can ?who Fly');

      // Collect valid flyers
      const flyers = new Set();
      for (const r of result.allResults || []) {
        const who = r.bindings instanceof Map ? r.bindings.get('who')?.answer : null;
        if (who) flyers.add(who);
      }

      // Tweety and Robin should fly, Opus should NOT
      assert.ok(flyers.has('Tweety') || flyers.has('Bird'), 'Tweety/Bird should fly');
      assert.ok(!flyers.has('Opus'), 'Opus (penguin) should NOT be in flyers');

      session.close();
    });
  });

  describe('Deep inheritance with exceptions', () => {

    // SKIP: Requires property inheritance through deep chains
    skip('deep chain: Sparrow -> Passerine -> Bird, can fly', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Passerine Bird
        isA Sparrow Passerine
        isA JackySparrow Sparrow
        can Bird Fly
      `);

      const proof = session.prove('@g can JackySparrow Fly');
      assert.ok(proof.valid, 'JackySparrow (deep bird chain) should fly');

      session.close();
    });

    test('deep chain with exception: Penguin blocks even for sub-types', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        isA Bird Animal
        isA Penguin Bird
        isA EmperorPenguin Penguin
        isA Pingu EmperorPenguin
        can Bird Fly
        Not can Penguin Fly
      `);

      const proof = session.prove('@g can Pingu Fly');
      assert.ok(!proof.valid || proof.result === false, 'Pingu (emperor penguin) should NOT fly');

      session.close();
    });
  });

  describe('Multiple conditions with negation', () => {

    // SKIP: Requires rule evaluation with negation in body
    skip('good driver needs license AND NOT violations', () => {
      const session = new Session({ geometry: 2048 });

      session.learn(`
        has Alice License
        has Bob License
        has Bob Violation

        goodDriver ?x :- has ?x License, Not has ?x Violation
      `);

      const aliceProof = session.prove('@g goodDriver Alice');
      const bobProof = session.prove('@g goodDriver Bob');

      assert.ok(aliceProof.valid, 'Alice (license, no violations) is good driver');
      assert.ok(!bobProof.valid || bobProof.result === false, 'Bob (has violations) is NOT good driver');

      session.close();
    });
  });
});
