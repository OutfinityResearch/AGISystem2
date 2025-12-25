/**
 * AGISystem2 - Unification Module
 * @module reasoning/unification
 *
 * Variable unification for quantified rules.
 * AST manipulation and binding management.
 */

import { getThresholds } from '../core/constants.mjs';
import { debug_trace } from '../utils/debug.js';
import { computeGoalLevel } from './constructivist-level.mjs';

function dbg(category, ...args) {
  debug_trace(`[Unify:${category}]`, ...args);
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
   * @param {Object} options - Options
   * @param {number|null} options.goalLevel - Goal constructivist level (for pruning)
   * @param {boolean} options.useLevelOptimization - Enable level pruning
   * @returns {Object} Proof result with bindings
   */
  tryUnification(goal, rule, depth, options = {}) {
    dbg('UNIFY', 'Trying unification for rule:', rule.name);

    const goalOp = this.engine.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => this.engine.extractArgName(a)).filter(Boolean);

    if (!goalOp || goalArgs.length === 0) {
      return { valid: false };
    }

    const componentKB = this.session?.componentKB;
    const useLevelOpt = options.useLevelOptimization ??
      (componentKB?.useLevelOptimization && this.session.useLevelOptimization !== false);
    const goalLevel = options.goalLevel ?? (useLevelOpt && componentKB ? componentKB.computeGoalLevel(goal.toString?.() || '') : null);
    const strictLevelPruning = options.strictLevelPruning === true;

    const leafConclusions = [];
    const collectLeafAsts = (part) => {
      if (!part) return;
      if (part.type === 'leaf' && part.ast) {
        leafConclusions.push(part.ast);
        return;
      }
      // Do not treat Not(P) as P when matching conclusions.
      if (part.type === 'Not') return;
      if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
        for (const p of part.parts) collectLeafAsts(p);
      }
    };
    if (rule.conclusionParts) collectLeafAsts(rule.conclusionParts);

    const candidateConclusions = leafConclusions.length > 0 ? leafConclusions : [rule.conclusionAST];

    for (const concAST of candidateConclusions) {
      const concOp = this.extractOperatorFromAST(concAST);
      const concArgs = this.extractArgsFromAST(concAST);

      // Operators must match
      if (goalOp !== concOp) continue;

      // Args count must match
      if (goalArgs.length !== concArgs.length) continue;

      // Build bindings from unification
      const bindings = new Map();
      let unifyOk = true;

      for (let i = 0; i < goalArgs.length; i++) {
        const goalArg = goalArgs[i];
        const concArg = concArgs[i];

        if (concArg.isVariable) {
          if (bindings.has(concArg.name)) {
            if (bindings.get(concArg.name) !== goalArg) {
              unifyOk = false;
              break;
            }
          } else {
            bindings.set(concArg.name, goalArg);
          }
        } else {
          if (concArg.name !== goalArg) {
            unifyOk = false;
            break;
          }
        }
      }

      if (!unifyOk) continue;

      dbg('UNIFY', 'Bindings:', [...bindings.entries()]);

      if (strictLevelPruning && useLevelOpt && goalLevel !== null) {
        const premLevel = this.computeMaxPremiseLevel(rule, bindings);
        if (Number.isFinite(premLevel) && premLevel > goalLevel) {
          continue;
        }
      }

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
            {
              operation: 'unification_match',
              rule: rule.label || rule.id || rule.name || rule.source,
              ruleId: rule.id || null,
              bindings: Object.fromEntries(bindings)
            },
            ...condResult.steps
          ]
        };
      }
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

  /**
   * Estimate the maximum constructivist level of a rule's premises after applying bindings.
   * Uses a safe-under-approximation when variables remain unbound (those tokens are ignored).
   * @param {Object} rule
   * @param {Map<string,string>} bindings
   * @returns {number|null}
   */
  computeMaxPremiseLevel(rule, bindings) {
    const componentKB = this.session?.componentKB;
    const conceptLevels = componentKB?.levelManager?.conceptLevels || new Map();

    const walk = (part) => {
      if (!part) return 0;
      if (part.type === 'leaf' && part.ast) {
        const s = this.instantiateAST(part.ast, bindings);
        return computeGoalLevel(s, conceptLevels);
      }
      if (part.type === 'Not') return walk(part.inner);
      if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
        let max = 0;
        for (const p of part.parts) max = Math.max(max, walk(p));
        return max;
      }
      if (part.operator && Array.isArray(part.args)) {
        const s = this.instantiateAST(part, bindings);
        return computeGoalLevel(s, conceptLevels);
      }
      return 0;
    };

    if (rule.conditionParts) {
      return walk(rule.conditionParts);
    }

    if (rule.conditionAST) {
      const s = this.instantiateAST(rule.conditionAST, bindings);
      return computeGoalLevel(s, conceptLevels);
    }

    return null;
  }
}

export default UnificationEngine;
