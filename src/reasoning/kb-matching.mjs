/**
 * AGISystem2 - KB Matching Module
 * @module reasoning/kb-matching
 *
 * Direct KB fact matching and pattern search.
 * Handles rule chaining for conditions.
 */

import { similarity } from '../core/operations.mjs';
import { TRANSITIVE_RELATIONS } from './transitive.mjs';
import { getThresholds } from '../core/constants.mjs';
import { canonicalizeTokenName } from '../runtime/canonicalize.mjs';

/**
 * KB matching engine
 */
export class KBMatcher {
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
   * Try direct match against KB
   * @param {Object} goalVec - Goal vector
   * @param {string} goalStr - Goal string
   * @returns {Object} Match result with confidence
   */
  tryDirectMatch(goalVec, goalStr) {
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (!goalVec || (!goalVec.data && !goalVec.exponents)) {
      return { valid: false, confidence: 0 };
    }

    let bestSim = 0;
    for (const fact of this.session.kbFacts) {
      if (!fact.vector) continue;
      this.session.reasoningStats.kbScans++;
      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, fact.vector);
      if (sim > bestSim) {
        bestSim = sim;
      }
    }

    if (bestSim > this.thresholds.SIMILARITY) {
      return {
        valid: true,
        method: 'direct',
        confidence: bestSim,
        goal: goalStr
      };
    }

    return { valid: false, confidence: bestSim };
  }

  /**
   * Find matching fact in KB by exact string match
   * @param {string} factStr - Fact string "op arg1 arg2"
   * @returns {Object} Match result
   */
  findMatchingFact(factStr) {
    const parts = factStr.split(/\s+/);
    if (parts.length < 2) {
      return { found: false };
    }

    const op = parts[0];
    const args = parts.slice(1);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta) continue;

      if (meta.operator === op && meta.args) {
        if (meta.args.length === args.length) {
          let match = true;
          for (let i = 0; i < args.length; i++) {
            if (meta.args[i] !== args[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            return { found: true, confidence: this.thresholds.DIRECT_MATCH, fact };
          }
        }
      }
    }

    return { found: false };
  }

  /**
   * Find all KB facts matching a pattern (for backtracking)
   * @param {string} condStr - Condition string with possible ?vars
   * @param {Map} bindings - Current bindings
   * @returns {Array} List of matches
   */
  findAllFactMatches(condStr, bindings) {
    const matches = [];
    const parts = condStr.split(/\s+/);

    if (parts.length < 2) {
      return matches;
    }

    const op = parts[0];
    const args = parts.slice(1);

    // Direct KB matches
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      const newBindings = new Map();
      let matchOk = true;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const factArg = meta.args[i];

        if (arg.startsWith('?')) {
          const varName = arg.substring(1);
          if (bindings.has(varName)) {
            if (bindings.get(varName) !== factArg) {
              matchOk = false;
              break;
            }
          } else {
            newBindings.set(varName, factArg);
          }
        } else {
          if (arg !== factArg) {
            matchOk = false;
            break;
          }
        }
      }

      if (matchOk) {
        // Include proof from fact metadata (e.g., CSP constraint satisfaction)
        const proofSteps = [];
        if (meta.proof) {
          proofSteps.push({ operation: 'constraint_proof', fact: meta.proof });
        }
        proofSteps.push({ operation: 'pattern_match', fact: `${op} ${meta.args.join(' ')}`, bindings: Object.fromEntries(newBindings) });

        matches.push({
          valid: true,
          confidence: this.thresholds.CONDITION_CONFIDENCE,
          newBindings,
          steps: proofSteps
        });
      }
    }

    // For transitive relations "isA Subject ?var", find all transitive targets
    if (TRANSITIVE_RELATIONS.has(op) && args.length === 2 && !args[0].startsWith('?') && args[1].startsWith('?')) {
      const subject = args[0];
      const varName = args[1].substring(1);
      const transitiveTargets = this.engine.transitive.findAllTransitiveTargets(op, subject);

      for (const target of transitiveTargets) {
        const alreadyFound = matches.some(m => m.newBindings?.get(varName) === target.value);
        if (alreadyFound) continue;

        const newBindings = new Map();
        newBindings.set(varName, target.value);
        matches.push({
          valid: true,
          confidence: this.thresholds.RULE_CONFIDENCE,
          newBindings,
          steps: target.steps
        });
      }
    }

    // For fully instantiated conditions, try transitive and rule chaining
    if (matches.length === 0 && !condStr.includes('?')) {
      const transResult = this.engine.transitive.tryTransitiveForCondition(condStr);
      if (transResult.valid) {
        matches.push({
          valid: true,
          confidence: transResult.confidence,
          newBindings: new Map(),
          steps: transResult.steps
        });
      } else {
        const ruleResult = this.tryRuleChainForCondition(condStr, 0);
        if (ruleResult.valid) {
          matches.push({
            valid: true,
            confidence: ruleResult.confidence || this.thresholds.RULE_CONFIDENCE,
            newBindings: new Map(),
            steps: ruleResult.steps || []
          });
        }
      }
    }

    return matches;
  }

  /**
   * Try to prove a condition string by applying rules (backward chaining)
   * @param {string} condStr - Condition string
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryRuleChainForCondition(condStr, depth) {
    const parts = condStr.split(/\s+/);
    if (parts.length < 2) return { valid: false };

    const goalOp = parts[0];
    const goalArgs = parts.slice(1);

    for (const rule of this.session.rules) {
      if (!rule.hasVariables) continue;

      const concAST = rule.conclusionAST;
      const concOp = this.engine.unification.extractOperatorFromAST(concAST);
      const concArgs = this.engine.unification.extractArgsFromAST(concAST);

      if (concOp !== goalOp || concArgs.length !== goalArgs.length) continue;

      const ruleBindings = new Map();
      let unifyOk = true;

      for (let i = 0; i < goalArgs.length; i++) {
        const concArg = concArgs[i];
        if (concArg.isVariable) {
          ruleBindings.set(concArg.name, goalArgs[i]);
        } else if (concArg.name !== goalArgs[i]) {
          unifyOk = false;
          break;
        }
      }

      if (!unifyOk) continue;

      const condResult = this.engine.conditions.proveInstantiatedCondition(rule, ruleBindings, depth);
      if (condResult.valid) {
        this.session.reasoningStats.ruleAttempts++;
        return {
          valid: true,
          method: 'rule_chain',
          confidence: (condResult.confidence || this.thresholds.CONDITION_CONFIDENCE) * this.thresholds.CONDITION_CONFIDENCE,
          steps: [
            { operation: 'rule_applied', fact: condStr, rule: rule.label || rule.name, ruleId: rule.id || null },
            ...(condResult.steps || [])
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Try to match and apply a rule (backward chaining)
   * @param {Object} goal - Goal statement
   * @param {Object} rule - Rule to try
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  tryRuleMatch(goal, rule, depth) {
    if (!rule.conclusion || !rule.condition) {
      return { valid: false };
    }

    // For ground-term rules (no variables), prefer AST/metadata equality over vector similarity.
    // This avoids false negatives for graph/macro operators where stored fact vectors are
    // `bind(op, graphResult)` but buildStatementVector(goal) is `bindAll(op, PosN⊕argN, ...)`.
    const goalOp = this.engine.unification.extractOperatorFromAST(goal);
    const goalArgs = this.engine.unification.extractArgsFromAST(goal);
    const concOp = this.engine.unification.extractOperatorFromAST(rule.conclusionAST);
    const concArgs = this.engine.unification.extractArgsFromAST(rule.conclusionAST);

    const canon = (name) => {
      if (!this.session?.canonicalizationEnabled) return name;
      return canonicalizeTokenName(this.session, name);
    };

    const goalMatchesConclusion =
      !rule.hasVariables &&
      goalOp &&
      concOp &&
      canon(goalOp) === canon(concOp) &&
      goalArgs.length === concArgs.length &&
      goalArgs.every((arg, i) => !arg.isVariable && !concArgs[i]?.isVariable && canon(arg.name) === canon(concArgs[i]?.name));

    let conclusionSim = 0;
    if (!goalMatchesConclusion) {
      const goalVec = this.session.executor.buildStatementVector(goal);
      this.session.reasoningStats.similarityChecks++;
      conclusionSim = similarity(goalVec, rule.conclusion);
    }

    if ((goalMatchesConclusion || conclusionSim > this.thresholds.CONCLUSION_MATCH) && !rule.hasVariables) {
      const conditionResult = this.engine.conditions.proveCondition(rule, depth + 1);

      if (conditionResult.valid) {
        this.engine.logStep('rule_match', rule.name || rule.source);
        // Extract conclusion fact from rule source
        let conclusionFact = '';
        const match = rule.source?.match(/Implies\s+[@$]?(\w+)\s+[@$]?(\w+)/i);
        if (match && this.session.referenceTexts.has(match[2])) {
          conclusionFact = this.session.referenceTexts.get(match[2]);
        }
        return {
          valid: true,
          method: 'backward_chain',
          rule: rule.name,
          confidence: (goalMatchesConclusion ? 1.0 : Math.min(conclusionSim, conditionResult.confidence)) * this.thresholds.CONFIDENCE_DECAY,
          goal: goal.toString(),
          steps: [
            { operation: 'rule_match', rule: rule.label || rule.name || rule.source, ruleId: rule.id || null, fact: conclusionFact },
            ...conditionResult.steps
          ]
        };
      }
    }

    if (rule.hasVariables && rule.conclusionAST) {
      const unifyResult = this.engine.unification.tryUnification(goal, rule, depth);
      if (unifyResult.valid) {
        return unifyResult;
      }
    }

    return { valid: false };
  }
}

export default KBMatcher;
