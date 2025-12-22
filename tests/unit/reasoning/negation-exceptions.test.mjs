/**
 * Negation & Exception Tests
 *
 * Tests default reasoning with exceptions:
 * - Birds can fly (default)
 * - Penguins are birds but CANNOT fly (exception)
 * - Ostriches are birds but CANNOT fly (exception)
 *
 * Property inheritance allows properties to propagate down isA hierarchies:
 * can Bird Fly + isA Tweety Bird → can Tweety Fly
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';

describe('Negation & Exceptions', () => {

  describe('Default with exceptions', () => {

    test('bird can fly by default (property inheritance)', () => {
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

    test('sparrow can fly (property inheritance)', () => {
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

    test('individual prove checks for flying ability', () => {
      // Query enumeration not yet implemented - test via individual proofs
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

      // Bird can fly (direct fact)
      const birdProof = session.prove('@g can Bird Fly');
      assert.ok(birdProof.valid, 'Bird should fly (direct fact)');

      // Tweety can fly (bird via inheritance)
      const tweetyProof = session.prove('@g can Tweety Fly');
      assert.ok(tweetyProof.valid, 'Tweety (bird) should fly via inheritance');

      // Robin can fly (sparrow -> bird via inheritance)
      const robinProof = session.prove('@g can Robin Fly');
      assert.ok(robinProof.valid, 'Robin (sparrow) should fly via inheritance');

      // Opus cannot fly (penguin exception)
      const opusProof = session.prove('@g can Opus Fly');
      assert.ok(!opusProof.valid || opusProof.result === false, 'Opus (penguin) should NOT fly');

      session.close();
    });
  });

  describe('Deep inheritance with exceptions', () => {

    test('deep chain: Sparrow -> Passerine -> Bird, can fly', () => {
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

    test('good driver needs license AND NOT violations', () => {
      const session = new Session({ geometry: 2048 });

      // Use correct DSL syntax for rule with And/Not
      session.learn(`
        has Alice License
        has Bob License
        has Bob Violation

        @goodDriver:goodDriver __Relation
        @hasLic has ?x License
        @hasVio has ?x Violation
        @notVio Not $hasVio
        @cond And $hasLic $notVio
        @conc goodDriver ?x
        @rule:rule Implies $cond $conc
      `);

      const aliceProof = session.prove('@g goodDriver Alice');
      const bobProof = session.prove('@g goodDriver Bob');

      assert.ok(aliceProof.valid, 'Alice (license, no violations) is good driver');
      assert.ok(!bobProof.valid || bobProof.result === false, 'Bob (has violations) is NOT good driver');

      session.close();
    });
  });
});
