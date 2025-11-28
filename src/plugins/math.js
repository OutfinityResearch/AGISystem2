/**
 * Math Compute Plugin
 *
 * Handles arithmetic operations and numeric comparisons.
 * Works with concepts that have numeric values encoded via HAS_VALUE
 * or parsed from labels (e.g., "celsius_20" -> 20).
 *
 * Relations handled:
 * - LESS_THAN, GREATER_THAN, EQUALS_VALUE (comparisons)
 * - PLUS, MINUS, TIMES, DIVIDED_BY (arithmetic)
 * - HAS_VALUE (value extraction/validation)
 */

class MathPlugin {
  constructor() {
    this.name = 'math';
    this.relations = [
      'LESS_THAN',
      'GREATER_THAN',
      'EQUALS_VALUE',
      'PLUS',
      'MINUS',
      'TIMES',
      'DIVIDED_BY',
      'HAS_VALUE'
    ];
  }

  /**
   * Evaluate a math relation between two concepts
   *
   * @param {string} relation - The relation to evaluate
   * @param {Object} subject - Subject with { value, unit } or raw label
   * @param {Object} object - Object with { value, unit } or raw label
   * @returns {Object} Result with truth/value and confidence
   */
  evaluate(relation, subject, object) {
    const a = this._extractValue(subject);
    const b = this._extractValue(object);

    // If we can't extract values, return unknown
    if (a === null) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot extract numeric value from subject: ${JSON.stringify(subject)}`
      };
    }

    // For HAS_VALUE, only subject matters
    if (relation === 'HAS_VALUE') {
      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: a,
        reason: 'Value extracted successfully'
      };
    }

    if (b === null) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot extract numeric value from object: ${JSON.stringify(object)}`
      };
    }

    switch (relation) {
      case 'LESS_THAN':
        return {
          truth: a < b ? 'TRUE_CERTAIN' : 'FALSE',
          confidence: 1.0,
          computed: `${a} < ${b}`,
          result: a < b
        };

      case 'GREATER_THAN':
        return {
          truth: a > b ? 'TRUE_CERTAIN' : 'FALSE',
          confidence: 1.0,
          computed: `${a} > ${b}`,
          result: a > b
        };

      case 'EQUALS_VALUE':
        // Use approximate equality for floats
        const epsilon = 1e-9;
        const equal = Math.abs(a - b) < epsilon;
        return {
          truth: equal ? 'TRUE_CERTAIN' : 'FALSE',
          confidence: 1.0,
          computed: `${a} == ${b}`,
          result: equal
        };

      case 'PLUS':
        return {
          truth: 'TRUE_CERTAIN',
          confidence: 1.0,
          value: a + b,
          computed: `${a} + ${b} = ${a + b}`
        };

      case 'MINUS':
        return {
          truth: 'TRUE_CERTAIN',
          confidence: 1.0,
          value: a - b,
          computed: `${a} - ${b} = ${a - b}`
        };

      case 'TIMES':
        return {
          truth: 'TRUE_CERTAIN',
          confidence: 1.0,
          value: a * b,
          computed: `${a} * ${b} = ${a * b}`
        };

      case 'DIVIDED_BY':
        if (b === 0) {
          return {
            truth: 'FALSE',
            confidence: 1.0,
            reason: 'Division by zero',
            error: 'DIVISION_BY_ZERO'
          };
        }
        return {
          truth: 'TRUE_CERTAIN',
          confidence: 1.0,
          value: a / b,
          computed: `${a} / ${b} = ${a / b}`
        };

      default:
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown math relation: ${relation}`
        };
    }
  }

  /**
   * Extract numeric value from various input formats
   * @private
   */
  _extractValue(input) {
    if (input === null || input === undefined) {
      return null;
    }

    // Already a number
    if (typeof input === 'number') {
      return input;
    }

    // Object with value property
    if (typeof input === 'object') {
      if (typeof input.value === 'number') {
        return input.value;
      }
      if (input.raw) {
        return this._extractValue(input.raw);
      }
      if (input.label) {
        return this._extractValue(input.label);
      }
    }

    // String: try various parsing strategies
    if (typeof input === 'string') {
      // Direct numeric string
      const direct = parseFloat(input);
      if (!isNaN(direct) && input.match(/^-?\d+\.?\d*$/)) {
        return direct;
      }

      // Label with suffix: "celsius_20", "meters_100", "value_3.14"
      const suffixMatch = input.match(/_(-?\d+\.?\d*)$/);
      if (suffixMatch) {
        return parseFloat(suffixMatch[1]);
      }

      // Label with prefix: "20_celsius", "100_meters"
      const prefixMatch = input.match(/^(-?\d+\.?\d*)_/);
      if (prefixMatch) {
        return parseFloat(prefixMatch[1]);
      }

      // Embedded number: "temp20", "v100"
      const embeddedMatch = input.match(/(-?\d+\.?\d*)/);
      if (embeddedMatch) {
        return parseFloat(embeddedMatch[1]);
      }
    }

    return null;
  }

  /**
   * Validate that two concepts can be compared/computed
   * (e.g., same units for meaningful comparison)
   */
  canCompute(relation, subject, object) {
    const a = this._extractValue(subject);
    const b = relation === 'HAS_VALUE' ? 0 : this._extractValue(object);
    return a !== null && b !== null;
  }
}

module.exports = MathPlugin;
