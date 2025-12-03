/**
 * Logic Compute Plugin
 *
 * Handles logical operations and boolean computations:
 * - Boolean operations: AND, OR, NOT, XOR, NAND, NOR
 * - Logical relations: IMPLIES, IFF (if and only if)
 * - Quantified logic: FORALL, EXISTS
 * - Truth table evaluation
 *
 * Relations handled:
 * - AND_WITH, OR_WITH, XOR_WITH: Binary logical operations
 * - NOT_OF: Negation
 * - IMPLIES: Material implication (P → Q)
 * - IFF: Biconditional (P ↔ Q)
 * - NAND_WITH, NOR_WITH: NAND and NOR operations
 * - LOGICALLY_EQUIVALENT: Equivalence check
 * - CONTRADICTS: Contradiction detection
 *
 * Truth values:
 * - TRUE_CERTAIN (127): Absolutely true
 * - TRUE_LIKELY (64): Likely true
 * - UNKNOWN (0): Indeterminate
 * - FALSE_LIKELY (-64): Likely false
 * - FALSE (-127): Absolutely false
 *
 * DS: DS(/plugins/logic.js)
 */

class LogicPlugin {
  constructor() {
    this.name = 'logic';
    this.relations = [
      'AND_WITH',
      'OR_WITH',
      'XOR_WITH',
      'NOT_OF',
      'IMPLIES',
      'IFF',
      'NAND_WITH',
      'NOR_WITH',
      'LOGICALLY_EQUIVALENT',
      'CONTRADICTS',
      'IS_SATISFIABLE',
      'IS_TAUTOLOGY'
    ];

    // Truth value mapping
    this.TRUTH = {
      TRUE_CERTAIN: 127,
      TRUE_LIKELY: 64,
      UNKNOWN: 0,
      FALSE_LIKELY: -64,
      FALSE: -127
    };
  }

  /**
   * Evaluate a logic relation between two concepts
   *
   * @param {string} relation - The relation to evaluate
   * @param {Object} subject - Subject concept or truth value
   * @param {Object} object - Object concept or truth value
   * @returns {Object} Result with truth value and confidence
   */
  evaluate(relation, subject, object) {
    const a = this._extractTruth(subject);
    const b = this._extractTruth(object);

    switch (relation) {
      case 'AND_WITH':
        return this._evaluateAnd(a, b);

      case 'OR_WITH':
        return this._evaluateOr(a, b);

      case 'XOR_WITH':
        return this._evaluateXor(a, b);

      case 'NOT_OF':
        return this._evaluateNot(a);

      case 'IMPLIES':
        return this._evaluateImplies(a, b);

      case 'IFF':
        return this._evaluateIff(a, b);

      case 'NAND_WITH':
        return this._evaluateNand(a, b);

      case 'NOR_WITH':
        return this._evaluateNor(a, b);

      case 'LOGICALLY_EQUIVALENT':
        return this._evaluateEquivalent(a, b);

      case 'CONTRADICTS':
        return this._evaluateContradicts(a, b);

      case 'IS_SATISFIABLE':
        return this._evaluateSatisfiable(a);

      case 'IS_TAUTOLOGY':
        return this._evaluateTautology(a);

      default:
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown logic relation: ${relation}`
        };
    }
  }

  /**
   * Extract truth value from various input formats
   * @private
   */
  _extractTruth(input) {
    if (input === null || input === undefined) {
      return this.TRUTH.UNKNOWN;
    }

    // Direct numeric value
    if (typeof input === 'number') {
      return this._clampTruth(input);
    }

    // Boolean
    if (typeof input === 'boolean') {
      return input ? this.TRUTH.TRUE_CERTAIN : this.TRUTH.FALSE;
    }

    // String truth values
    if (typeof input === 'string') {
      const normalized = input.toUpperCase().replace(/[^A-Z_]/g, '');
      if (normalized === 'TRUE' || normalized === 'TRUE_CERTAIN') return this.TRUTH.TRUE_CERTAIN;
      if (normalized === 'TRUE_LIKELY') return this.TRUTH.TRUE_LIKELY;
      if (normalized === 'FALSE' || normalized === 'FALSE_CERTAIN') return this.TRUTH.FALSE;
      if (normalized === 'FALSE_LIKELY') return this.TRUTH.FALSE_LIKELY;
      if (normalized === 'UNKNOWN') return this.TRUTH.UNKNOWN;

      // Try to parse as number
      const num = parseFloat(input);
      if (!isNaN(num)) return this._clampTruth(num);
    }

    // Object with truth or value property
    if (typeof input === 'object') {
      if ('truth' in input) {
        return this._extractTruth(input.truth);
      }
      if ('value' in input) {
        return this._extractTruth(input.value);
      }
      if ('existence' in input) {
        return this._clampTruth(input.existence);
      }
    }

    return this.TRUTH.UNKNOWN;
  }

  /**
   * Clamp truth value to [-127, 127] range
   * @private
   */
  _clampTruth(value) {
    return Math.max(-127, Math.min(127, Math.round(value)));
  }

  /**
   * Convert numeric truth to string representation
   * @private
   */
  _truthToString(value) {
    if (value >= 64) return 'TRUE_CERTAIN';
    if (value > 0) return 'TRUE_LIKELY';
    if (value === 0) return 'UNKNOWN';
    if (value > -64) return 'FALSE_LIKELY';
    return 'FALSE';
  }

  /**
   * Check if truth value is "truthy" (positive)
   * @private
   */
  _isTruthy(value) {
    return value > 0;
  }

  /**
   * Check if truth value is "falsy" (negative)
   * @private
   */
  _isFalsy(value) {
    return value < 0;
  }

  // =========================================================================
  // Logical Operations (Kleene 3-valued logic extended to [-127, 127])
  // =========================================================================

  /**
   * AND operation: min(a, b)
   * Follows pessimistic logic: take the weakest of the two values
   */
  _evaluateAnd(a, b) {
    const result = Math.min(a, b);
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `AND(${a}, ${b}) = ${result}`,
      operation: 'conjunction'
    };
  }

  /**
   * OR operation: max(a, b)
   * Follows optimistic logic: take the strongest of the two values
   */
  _evaluateOr(a, b) {
    const result = Math.max(a, b);
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `OR(${a}, ${b}) = ${result}`,
      operation: 'disjunction'
    };
  }

  /**
   * XOR operation: exclusive or
   * True when exactly one is true
   */
  _evaluateXor(a, b) {
    // XOR in multi-valued logic: high when signs differ
    const aPositive = a > 0;
    const bPositive = b > 0;

    if (a === 0 || b === 0) {
      // Unknown propagates
      return {
        truth: 'UNKNOWN',
        confidence: 0.5,
        value: 0,
        computed: `XOR(${a}, ${b}) = UNKNOWN (indeterminate input)`,
        operation: 'exclusive_disjunction'
      };
    }

    const result = (aPositive !== bPositive) ? Math.min(Math.abs(a), Math.abs(b)) : -Math.min(Math.abs(a), Math.abs(b));
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `XOR(${a}, ${b}) = ${result}`,
      operation: 'exclusive_disjunction'
    };
  }

  /**
   * NOT operation: negation
   * Simply negates the value
   */
  _evaluateNot(a) {
    const result = -a;
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `NOT(${a}) = ${result}`,
      operation: 'negation'
    };
  }

  /**
   * IMPLIES operation: material implication (P → Q)
   * Equivalent to: NOT(P) OR Q
   * True unless P is true and Q is false
   */
  _evaluateImplies(a, b) {
    // In multi-valued logic: max(-a, b)
    const result = Math.max(-a, b);
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `IMPLIES(${a}, ${b}) = max(${-a}, ${b}) = ${result}`,
      operation: 'implication',
      formula: 'P → Q ≡ ¬P ∨ Q'
    };
  }

  /**
   * IFF operation: biconditional (P ↔ Q)
   * True when both have the same truth value
   * Equivalent to: (P → Q) AND (Q → P)
   */
  _evaluateIff(a, b) {
    // IFF is true when values are similar
    const diff = Math.abs(a - b);

    // Scale result: 0 difference = 127, max difference = -127
    const result = this._clampTruth(127 - diff);
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `IFF(${a}, ${b}) = ${result} (diff=${diff})`,
      operation: 'biconditional',
      formula: 'P ↔ Q ≡ (P → Q) ∧ (Q → P)'
    };
  }

  /**
   * NAND operation: NOT AND
   */
  _evaluateNand(a, b) {
    const andResult = Math.min(a, b);
    const result = -andResult;
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `NAND(${a}, ${b}) = NOT(AND(${a}, ${b})) = ${result}`,
      operation: 'nand'
    };
  }

  /**
   * NOR operation: NOT OR
   */
  _evaluateNor(a, b) {
    const orResult = Math.max(a, b);
    const result = -orResult;
    return {
      truth: this._truthToString(result),
      confidence: 1.0,
      value: result,
      computed: `NOR(${a}, ${b}) = NOT(OR(${a}, ${b})) = ${result}`,
      operation: 'nor'
    };
  }

  /**
   * Check logical equivalence
   */
  _evaluateEquivalent(a, b) {
    const equivalent = a === b;
    const diff = Math.abs(a - b);
    const similarity = this._clampTruth(127 - diff);

    return {
      truth: equivalent ? 'TRUE_CERTAIN' : (diff < 32 ? 'TRUE_LIKELY' : 'FALSE'),
      confidence: 1 - (diff / 254),
      value: similarity,
      computed: `EQUIVALENT(${a}, ${b}) = ${equivalent}`,
      result: equivalent,
      difference: diff
    };
  }

  /**
   * Check for contradiction
   */
  _evaluateContradicts(a, b) {
    // Contradiction: one is strongly positive, other is strongly negative
    const contradicts = (a > 32 && b < -32) || (a < -32 && b > 32);
    const strength = contradicts ? Math.min(Math.abs(a), Math.abs(b)) : 0;

    return {
      truth: contradicts ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: contradicts ? strength / 127 : 1.0,
      value: contradicts ? strength : -127,
      computed: `CONTRADICTS(${a}, ${b}) = ${contradicts}`,
      result: contradicts
    };
  }

  /**
   * Check if a proposition is satisfiable (not always false)
   */
  _evaluateSatisfiable(a) {
    const satisfiable = a >= -64; // Not strongly false
    return {
      truth: satisfiable ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      value: satisfiable ? 127 : -127,
      computed: `SATISFIABLE(${a}) = ${satisfiable}`,
      result: satisfiable
    };
  }

  /**
   * Check if a proposition is a tautology (always true)
   */
  _evaluateTautology(a) {
    const tautology = a >= 64; // Strongly true
    return {
      truth: tautology ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      value: tautology ? 127 : -127,
      computed: `TAUTOLOGY(${a}) = ${tautology}`,
      result: tautology
    };
  }

  /**
   * Check if a computation can be performed
   */
  canCompute(relation, subject, object) {
    // Unary operations only need subject
    if (relation === 'NOT_OF' || relation === 'IS_SATISFIABLE' || relation === 'IS_TAUTOLOGY') {
      return true;
    }

    // Binary operations need both
    return true;
  }

  // =========================================================================
  // Extended Logic Operations (for complex reasoning)
  // =========================================================================

  /**
   * Evaluate a compound logical expression
   * @param {Array} expression - Prefix notation expression, e.g., ['AND', ['OR', 'P', 'Q'], 'R']
   * @param {Object} bindings - Variable bindings { P: 127, Q: -64, R: 0 }
   * @returns {Object} Result with evaluated truth value
   */
  evaluateExpression(expression, bindings = {}) {
    if (!Array.isArray(expression)) {
      // It's a variable or literal
      if (typeof expression === 'string' && bindings[expression] !== undefined) {
        return { value: bindings[expression], variable: expression };
      }
      return { value: this._extractTruth(expression), literal: true };
    }

    const [op, ...args] = expression;
    const evalArgs = args.map(arg => this.evaluateExpression(arg, bindings));

    switch (op.toUpperCase()) {
      case 'AND':
        return this._evaluateAnd(evalArgs[0].value, evalArgs[1]?.value ?? evalArgs[0].value);
      case 'OR':
        return this._evaluateOr(evalArgs[0].value, evalArgs[1]?.value ?? evalArgs[0].value);
      case 'NOT':
        return this._evaluateNot(evalArgs[0].value);
      case 'IMPLIES':
        return this._evaluateImplies(evalArgs[0].value, evalArgs[1].value);
      case 'IFF':
        return this._evaluateIff(evalArgs[0].value, evalArgs[1].value);
      case 'XOR':
        return this._evaluateXor(evalArgs[0].value, evalArgs[1].value);
      default:
        return { truth: 'UNKNOWN', value: 0, error: `Unknown operator: ${op}` };
    }
  }
}

module.exports = LogicPlugin;
