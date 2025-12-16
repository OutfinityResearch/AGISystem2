/**
 * AGISystem2 - Test Assertions
 * @module test-lib/assertions
 *
 * Domain-specific test assertions for HDC operations.
 */

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class Assertions {
  /**
   * Assert similarity is above threshold
   */
  static similarityAbove(actual, threshold, message) {
    if (actual < threshold) {
      throw new AssertionError(
        message || `Expected similarity > ${threshold}, got ${actual.toFixed(4)}`
      );
    }
  }

  /**
   * Assert similarity is below threshold
   */
  static similarityBelow(actual, threshold, message) {
    if (actual > threshold) {
      throw new AssertionError(
        message || `Expected similarity < ${threshold}, got ${actual.toFixed(4)}`
      );
    }
  }

  /**
   * Assert strong confidence (>0.65)
   */
  static confidenceStrong(result) {
    if (!result.confidence || result.confidence < 0.65) {
      throw new AssertionError(
        `Expected strong confidence (>0.65), got ${result.confidence?.toFixed(4) || 0}`
      );
    }
  }

  /**
   * Assert query succeeds
   */
  static querySucceeds(result) {
    if (!result.success) {
      throw new AssertionError(`Query failed: ${result.reason || 'unknown'}`);
    }
  }

  /**
   * Assert query returns specific value
   */
  static queryReturns(result, hole, expectedValue) {
    Assertions.querySucceeds(result);
    const binding = result.bindings?.get?.(hole) || result.bindings?.[hole];

    if (!binding || binding.answer !== expectedValue) {
      throw new AssertionError(
        `Expected ${hole}=${expectedValue}, got ${binding?.answer || 'undefined'}`
      );
    }
  }

  /**
   * Assert proof is valid
   */
  static proofValid(result) {
    if (!result.valid) {
      throw new AssertionError(`Proof invalid: ${result.reason || 'unknown'}`);
    }
  }

  /**
   * Assert proof is invalid
   */
  static proofInvalid(result) {
    if (result.valid) {
      throw new AssertionError('Expected proof to be invalid, but it succeeded');
    }
  }

  /**
   * Assert decoding produces expected operator
   */
  static decodesTo(decoded, operator, args = []) {
    if (!decoded.success) {
      throw new AssertionError(`Decoding failed: ${decoded.reason}`);
    }
    if (decoded.structure.operator !== operator) {
      throw new AssertionError(
        `Expected operator ${operator}, got ${decoded.structure.operator}`
      );
    }
    // Optionally check args
    if (args.length > 0) {
      for (let i = 0; i < args.length; i++) {
        const actual = decoded.structure.arguments.find(a => a.position === i + 1);
        if (!actual || actual.value !== args[i]) {
          throw new AssertionError(
            `Expected arg[${i}]=${args[i]}, got ${actual?.value || 'undefined'}`
          );
        }
      }
    }
  }

  /**
   * Assert vectors are orthogonal
   */
  static vectorsOrthogonal(a, b, session) {
    const sim = session.similarity(a, b);
    if (sim > 0.55) {
      throw new AssertionError(
        `Vectors should be orthogonal (sim < 0.55), got ${sim.toFixed(4)}`
      );
    }
    if (sim < 0.45) {
      throw new AssertionError(
        `Vectors should be orthogonal (sim > 0.45), got ${sim.toFixed(4)}`
      );
    }
  }

  /**
   * Assert vectors are equal (high similarity)
   */
  static vectorsEqual(a, b, session) {
    const sim = session.similarity(a, b);
    if (sim < 0.99) {
      throw new AssertionError(
        `Vectors should be equal (sim > 0.99), got ${sim.toFixed(4)}`
      );
    }
  }

  /**
   * Assert vectors are similar (high correlation)
   */
  static vectorsSimilar(a, b, session, threshold = 0.8) {
    const sim = session.similarity(a, b);
    if (sim < threshold) {
      throw new AssertionError(
        `Vectors should be similar (sim > ${threshold}), got ${sim.toFixed(4)}`
      );
    }
  }

  /**
   * Assert vector density is approximately 0.5
   */
  static vectorBalanced(v, tolerance = 0.05) {
    const density = v.density();
    if (Math.abs(density - 0.5) > tolerance) {
      throw new AssertionError(
        `Vector should be balanced (density ~0.5), got ${density.toFixed(4)}`
      );
    }
  }
}

export default Assertions;
