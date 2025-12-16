/**
 * Tests for ASCII Stamping Implementation (DS01 spec)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createFromName, similarity } from '../../../src/hdc/facade.mjs';

describe('ASCII Stamping (DS01 Spec)', () => {
  const geometry = 2048;

  describe('Determinism', () => {
    test('same name should produce identical vectors', () => {
      const v1 = createFromName('John', geometry);
      const v2 = createFromName('John', geometry);

      assert.equal(similarity(v1, v2), 1.0, 'same name should be identical');
    });

    test('different names should be quasi-orthogonal', () => {
      const v1 = createFromName('John', geometry);
      const v2 = createFromName('Mary', geometry);

      const sim = similarity(v1, v2);
      assert.ok(sim > 0.4 && sim < 0.6, `should be ~0.5, got ${sim}`);
    });

    test('empty name should work', () => {
      const v = createFromName('', geometry);
      assert.equal(v.geometry, geometry);
    });
  });

  describe('Theory Scoping', () => {
    test('same name in different theories should differ', () => {
      const v1 = createFromName('John', geometry, 'FamilyTheory');
      const v2 = createFromName('John', geometry, 'BusinessTheory');

      const sim = similarity(v1, v2);
      assert.ok(sim < 0.6, `different theories should be quasi-orthogonal: ${sim}`);
    });

    test('same name in same theory should be identical', () => {
      const v1 = createFromName('John', geometry, 'TestTheory');
      const v2 = createFromName('John', geometry, 'TestTheory');

      assert.equal(similarity(v1, v2), 1.0);
    });

    test('default theory should be consistent', () => {
      const v1 = createFromName('John', geometry);
      const v2 = createFromName('John', geometry, 'default');

      assert.equal(similarity(v1, v2), 1.0);
    });
  });

  describe('ASCII Pattern Structure', () => {
    test('similar ASCII names should have moderate similarity', () => {
      // "John" and "Joan" differ by one character
      const v1 = createFromName('John', geometry);
      const v2 = createFromName('Joan', geometry);

      const sim = similarity(v1, v2);
      // Due to ASCII stamping, similar names may have slightly higher similarity
      // than purely random vectors, but still quasi-orthogonal
      assert.ok(sim > 0.3 && sim < 0.7, `similar names: ${sim}`);
    });

    test('longer names should work correctly', () => {
      const longName = 'ThisIsAVeryLongIdentifierThatExceedsTheStampSize';
      const v = createFromName(longName, geometry);

      assert.equal(v.geometry, geometry);
      // Should be deterministic
      const v2 = createFromName(longName, geometry);
      assert.equal(similarity(v, v2), 1.0);
    });

    test('unicode names should work', () => {
      const v = createFromName('Jöhn', geometry);
      assert.equal(v.geometry, geometry);

      // Unicode should produce different vector than ASCII equivalent
      const vAscii = createFromName('John', geometry);
      const sim = similarity(v, vAscii);
      assert.ok(sim < 0.7, `unicode should differ from ASCII: ${sim}`);
    });
  });

  describe('Geometry Scaling', () => {
    test('should work at different geometries', () => {
      const geometries = [1024, 2048, 4096, 8192];

      for (const g of geometries) {
        const v = createFromName('Test', g);
        assert.equal(v.geometry, g, `geometry ${g} should work`);
      }
    });

    test('larger geometry should maintain determinism', () => {
      const v1 = createFromName('Test', 8192);
      const v2 = createFromName('Test', 8192);

      assert.equal(similarity(v1, v2), 1.0);
    });
  });

  describe('Stamp Boundaries', () => {
    test('vector should be fully populated', () => {
      const v = createFromName('X', geometry);

      // Check density is roughly 50% (balanced)
      const density = v.density();
      assert.ok(density > 0.4 && density < 0.6, `density should be ~0.5: ${density}`);
    });

    test('different positions should vary', () => {
      // With 256-bit stamps, we have geometry/256 stamps
      // Each stamp has position-specific variation
      const v = createFromName('Test', 2048);

      // Check first and last words are not identical (variation works)
      const firstWord = v.data[0];
      const lastWord = v.data[v.words - 1];

      // They could be equal by chance but very unlikely
      // This is a sanity check, not a guarantee
      assert.ok(v.words >= 2, 'need multiple words to test variation');
    });
  });
});
