/**
 * AGISystem2 - Unification Module
 * @module reasoning/unification
 *
 * Variable unification for quantified rules.
 * AST manipulation and binding management.
 */

import { getThresholds } from '../core/constants.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Unify:${category}]`, ...args);
}

/**
 * Unification engine for variable binding
 */
export class UnificationEngine {
  constructor(proofEngine) {
    this.engine = proofEngine;
    // Get strategy-dependent thresholds
    const strategy = proofEngine.session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
  }

  get session() {
    return this.engine.session;
  }

  /**
   * Try to unify goal with rule conclusion and prove instantiated condition
   * @param {Object} goal - Goal statement
   * @param {Object} rule - Rule to match
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result with bindings
   */
  tryUnification(goal, rule, depth) {
    dbg('UNIFY', 'Trying unification for rule:', rule.name);

    const goalOp = this.engine.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => this.engine.extractArgName(a)).filter(Boolean);

    if (!goalOp || goalArgs.length === 0) {
      return { valid: false };
    }

    const concAST = rule.conclusionAST;
    const concOp = this.extractOperatorFromAST(concAST);
    const concArgs = this.extractArgsFromAST(concAST);

    // Operators must match
    if (goalOp !== concOp) {
      return { valid: false };
    }

    // Args count must match
    if (goalArgs.length !== concArgs.length) {
      return { valid: false };
    }

    // Build bindings from unification
    const bindings = new Map();
    for (let i = 0; i < goalArgs.length; i++) {
      const goalArg = goalArgs[i];
      const concArg = concArgs[i];

      if (concArg.isVariable) {
        if (bindings.has(concArg.name)) {
          if (bindings.get(concArg.name) !== goalArg) {
            return { valid: false }; // Inconsistent binding
          }
        } else {
          bindings.set(concArg.name, goalArg);
        }
      } else {
        if (concArg.name !== goalArg) {
          return { valid: false };
        }
      }
    }

    dbg('UNIFY', 'Bindings:', [...bindings.entries()]);

    // Prove the instantiated condition
    const condResult = this.engine.conditions.proveInstantiatedCondition(rule, bindings, depth + 1);

    if (condResult.valid) {
      this.engine.logStep('unification_match', rule.name || rule.source);
      return {
        valid: true,
        method: 'backward_chain_unified',
        rule: rule.name,
        bindings: Object.fromEntries(bindings),
        confidence: condResult.confidence * this.thresholds.CONFIDENCE_DECAY,
        goal: goal.toString(),
        steps: [
          { operation: 'unification_match', rule: rule.name || rule.source, bindings: Object.fromEntries(bindings) },
          ...condResult.steps
        ]
      };
    }

    return { valid: false };
  }

  /**
   * Extract operator from AST node
   * @param {Object} ast - AST node
   * @returns {string|null} Operator name
   */
  extractOperatorFromAST(ast) {
    if (!ast) return null;
    if (ast.type === 'Statement' && ast.operator) {
      return ast.operator.name || ast.operator.value || null;
    }
    if (ast.operator) {
      return ast.operator.name || ast.operator.value || null;
    }
    return null;
  }

  /**
   * Extract args from AST with variable info
   * @param {Object} ast - AST node
   * @returns {Array} Args with isVariable flag
   */
  extractArgsFromAST(ast) {
    if (!ast) return [];
    const args = ast.args || [];
    return args.map(arg => {
      if (arg.type === 'Hole') {
        return { name: arg.name, isVariable: true };
      }
      if (arg.type === 'Identifier') {
        return { name: arg.name, isVariable: false };
      }
      return { name: arg.name || arg.value || '', isVariable: false };
    });
  }

  /**
   * Instantiate AST with bindings to produce fact string
   * @param {Object} ast - AST node
   * @param {Map} bindings - Variable bindings
   * @returns {string} Instantiated fact string
   */
  instantiateAST(ast, bindings) {
    if (!ast) return '';

    const op = this.extractOperatorFromAST(ast);
    if (!op) return '';

    const args = (ast.args || []).map(arg => {
      if (arg.type === 'Hole') {
        return bindings.get(arg.name) || `?${arg.name}`;
      }
      return arg.name || arg.value || '';
    });

    return `${op} ${args.join(' ')}`.trim();
  }

  /**
   * Parse instantiated string back to a goal-like structure
   * @param {string} factStr - Fact string
   * @returns {Object|null} Goal-like structure
   */
  parseInstantiatedGoal(factStr) {
    const parts = factStr.split(/\s+/);
    if (parts.length < 2) return null;

    return {
      operator: { name: parts[0], value: parts[0] },
      args: parts.slice(1).map(name => ({ type: 'Identifier', name })),
      toString: () => factStr
    };
  }
}

export default UnificationEngine;
