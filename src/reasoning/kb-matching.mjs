/**
 * AGISystem2 - KB Matching Module
 * @module reasoning/kb-matching
 *
 * Direct KB fact matching and pattern search.
 * Handles rule chaining for conditions.
 * Supports constructivist level optimization for search space pruning.
 */

import { similarity } from '../core/operations.mjs';
import { TRANSITIVE_RELATIONS } from './transitive.mjs';
import { getThresholds } from '../core/constants.mjs';
import { canonicalizeTokenName } from '../runtime/canonicalize.mjs';
import { LevelAwareRuleIndex } from './prove/rule-index.mjs';

/**
 * KB matching engine with level-aware optimization
 */
export class KBMatcher {
  constructor(proofEngine) {
    this.engine = proofEngine;
    // Get strategy-dependent thresholds
    const strategy = proofEngine.session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);

    // Level-aware rule index (lazy initialized)
    this._levelRuleIndex = null;
  }

  /**
   * Get level-aware rule index
   */
  get levelRuleIndex() {
    if (!this._levelRuleIndex) {
      this._levelRuleIndex = new LevelAwareRuleIndex(this.session);
    }
    return this._levelRuleIndex;
  }

  get session() {
    return this.engine.session;
  }

  /**
   * Try direct match against KB
   * @param {Object} goalVec - Goal vector
   * @param {string} goalStr - Goal string
   * @param {Object} options - Additional options (goalLevel for level-aware search)
   * @returns {Object} Match result with confidence
   */
  tryDirectMatch(goalVec, goalStr, options = {}) {
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (!goalVec || (!goalVec.data && !goalVec.exponents)) {
      return { valid: false, confidence: 0 };
    }

    // Optimization: avoid full-KB similarity scans when we can cheaply narrow
    // candidates by operator/arg0 using ComponentKB indices.
    //
    // This is especially important for sparse-polynomial similarity, which can be
    // noticeably slower per comparison and may cause timeouts in deep proof chains.
    const parseGoalHint = (text) => {
      if (!text || typeof text !== 'string') return null;
      const tokens = text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length < 1) return null;
      const cleaned = tokens.filter(t => !t.startsWith('@'));
      if (cleaned.length < 1) return null;
      return { op: cleaned[0], arg0: cleaned[1] || null };
    };

    let scanFacts = this.session.kbFacts;
    const componentKB = this.session.componentKB;
    const hint = parseGoalHint(goalStr);

    // Level-aware optimization - DISABLED by default pending fix for deep chain regression
    // TODO: Fix level computation for variables in rules before re-enabling
    const useLevelOpt = false; // options.useLevelOptimization ??
      // (componentKB?.useLevelOptimization && this.session.useLevelOptimization !== false);
    const goalLevel = null; // options.goalLevel ?? (useLevelOpt && componentKB ? componentKB.computeGoalLevel(goalStr) : null);

    if (componentKB && hint?.op) {
      // Use level-aware search if enabled
      if (useLevelOpt && goalLevel !== null) {
        scanFacts = componentKB.findByOperatorAtLevel(hint.op, goalLevel);
      } else {
        const opFacts = componentKB.findByOperator(hint.op);
        if (opFacts.length === 0) {
          return { valid: false, confidence: 0 };
        }
        if (hint.arg0) {
          const narrowed = componentKB.findByOperatorAndArg0(hint.op, hint.arg0);
          scanFacts = narrowed.length > 0 ? narrowed : opFacts;
        } else {
          scanFacts = opFacts;
        }
      }

      if (scanFacts.length === 0) {
        return { valid: false, confidence: 0 };
      }
    }

    let bestSim = 0;
    for (const fact of scanFacts) {
      const vec = fact?.vector;
      if (!vec) continue;
      this.session.reasoningStats.kbScans++;
      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, vec);
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

    const componentKB = this.session.componentKB;
    let scanFacts = this.session.kbFacts;
    if (componentKB && op) {
      const arg0 = args[0] || null;
      scanFacts = arg0 ? componentKB.findByOperatorAndArg0(op, arg0) : componentKB.findByOperator(op);
    }

    for (const fact of scanFacts) {
      if (this.engine.isTimedOut()) throw new Error('Proof timed out');
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
   * @param {number} depth - Current proof depth (for bounded rule chaining)
   * @returns {Array} List of matches
   */
  findAllFactMatches(condStr, bindings, depth = 0) {
    const matches = [];
    const parts = condStr.split(/\s+/);

    if (parts.length < 2) {
      return matches;
    }

    const op = parts[0];
    const args = parts.slice(1);

    const componentKB = this.session.componentKB;
    let scanFacts = this.session.kbFacts;
    if (componentKB && op) {
      const arg0 = args[0] && !String(args[0]).startsWith('?') ? args[0] : null;
      scanFacts = arg0 ? componentKB.findByOperatorAndArg0(op, arg0) : componentKB.findByOperator(op);
    }

    // Direct KB matches
    for (const fact of scanFacts) {
      if (this.engine.isTimedOut()) throw new Error('Proof timed out');
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
    const isTransitive =
      this.session?.semanticIndex?.isTransitive
        ? this.session.semanticIndex.isTransitive(op)
        : TRANSITIVE_RELATIONS.has(op);
    if (isTransitive && args.length === 2 && !args[0].startsWith('?') && args[1].startsWith('?')) {
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
        if (depth < this.engine.options.maxDepth) {
          const ruleResult = this.tryRuleChainForCondition(condStr, depth + 1);
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
    }

    return matches;
  }

  /**
   * Try to prove a condition string by applying rules (backward chaining)
   * @param {string} condStr - Condition string
   * @param {number} depth - Current proof depth
   * @param {Object} options - Additional options (goalLevel for level pruning)
   * @returns {Object} Proof result
   */
  tryRuleChainForCondition(condStr, depth, options = {}) {
    const parts = condStr.split(/\s+/);
    if (parts.length < 2) return { valid: false };

    const goalOp = parts[0];
    const goalArgs = parts.slice(1);

    if (this.engine.isTimedOut()) throw new Error('Proof timed out');
    if (depth > this.engine.options.maxDepth) return { valid: false, reason: 'Depth limit' };

    const componentKB = this.session.componentKB;
    const useLevelOpt = options.useLevelOptimization ??
      (componentKB?.useLevelOptimization && this.session.useLevelOptimization !== false);
    const goalLevel = options.goalLevel ?? (useLevelOpt && componentKB ? componentKB.computeGoalLevel(condStr) : null);
    const strictLevelPruning = options.strictLevelPruning === true;

    let candidates;
    candidates = this.engine.getRulesByConclusionOp ? this.engine.getRulesByConclusionOp(goalOp) : this.session.rules;

    for (const rule of candidates) {
      if (this.engine.isTimedOut()) throw new Error('Proof timed out');
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

      if (strictLevelPruning && useLevelOpt && goalLevel !== null) {
        const premLevel = this.engine.unification.computeMaxPremiseLevel(rule, ruleBindings);
        if (Number.isFinite(premLevel) && premLevel > goalLevel) {
          continue;
        }
      }

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
  tryRuleMatch(goal, rule, depth, options = {}) {
    if (!rule.conclusion || !rule.condition) {
      return { valid: false };
    }

    const flattenConclusionLeaves = () => {
      if (!rule.conclusionParts) {
        return [{ ast: rule.conclusionAST, vector: rule.conclusion }];
      }
      const leaves = [];
      const walk = (part) => {
        if (!part) return;
        if (part.type === 'leaf' && part.ast) {
          leaves.push({ ast: part.ast, vector: part.vector });
          return;
        }
        // IMPORTANT: Do not treat Not(P) as a leaf P.
        // If we recurse into inner here, the prover can incorrectly match P goals
        // against rules that *conclude* Not(P), creating contradictions and cycles.
        if (part.type === 'Not') return;
        if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
          for (const p of part.parts) walk(p);
        }
      };
      walk(rule.conclusionParts);
      return leaves.length > 0 ? leaves : [{ ast: rule.conclusionAST, vector: rule.conclusion }];
    };

    // For ground-term rules (no variables), prefer AST/metadata equality over vector similarity.
    // This avoids false negatives for graph/macro operators where stored fact vectors are
    // `bind(op, graphResult)` but buildStatementVector(goal) is `bindAll(op, PosN⊕argN, ...)`.
    const goalOp = this.engine.unification.extractOperatorFromAST(goal);
    const goalArgs = this.engine.unification.extractArgsFromAST(goal);

    const componentKB = this.session.componentKB;
    const useLevelOpt = options.useLevelOptimization ??
      (componentKB?.useLevelOptimization && this.session.useLevelOptimization !== false);
    const goalLevel = options.goalLevel ?? (useLevelOpt && componentKB ? componentKB.computeGoalLevel(goal.toString?.() || '') : null);
    const strictLevelPruning = options.strictLevelPruning === true;

    const canon = (name) => {
      if (!this.session?.canonicalizationEnabled) return name;
      return canonicalizeTokenName(this.session, name);
    };

    if (!rule.hasVariables) {
      if (strictLevelPruning && useLevelOpt && goalLevel !== null) {
        const premLevel = rule._maxPremLevel ?? null;
        if (Number.isFinite(premLevel) && premLevel > goalLevel) {
          return { valid: false };
        }
      }

      const candidates = flattenConclusionLeaves();
      const goalVec = this.session.executor.buildStatementVector(goal);

      for (const candidate of candidates) {
        const concOp = this.engine.unification.extractOperatorFromAST(candidate.ast);
        const concArgs = this.engine.unification.extractArgsFromAST(candidate.ast);

        const goalMatchesConclusion =
          goalOp &&
          concOp &&
          canon(goalOp) === canon(concOp) &&
          goalArgs.length === concArgs.length &&
          goalArgs.every((arg, i) => !arg.isVariable && !concArgs[i]?.isVariable && canon(arg.name) === canon(concArgs[i]?.name));

        let conclusionSim = 0;
        if (!goalMatchesConclusion) {
          const vec = candidate.vector || (candidate.ast ? this.session.executor.buildStatementVector(candidate.ast) : null);
          if (vec) {
            this.session.reasoningStats.similarityChecks++;
            conclusionSim = similarity(goalVec, vec);
          }
        }

        if (!(goalMatchesConclusion || conclusionSim > this.thresholds.CONCLUSION_MATCH)) continue;

        const conditionResult = this.engine.conditions.proveCondition(rule, depth + 1);
        if (!conditionResult.valid) continue;

        this.engine.logStep('rule_match', rule.name || rule.source);

        return {
          valid: true,
          method: 'backward_chain',
          rule: rule.name,
          confidence: (goalMatchesConclusion ? 1.0 : Math.min(conclusionSim, conditionResult.confidence)) * this.thresholds.CONFIDENCE_DECAY,
          goal: goal.toString(),
          steps: [
            {
              operation: 'rule_match',
              rule: rule.label || rule.name || rule.source,
              ruleId: rule.id || null,
              fact: candidate.ast?.toString?.() || ''
            },
            ...conditionResult.steps
          ]
        };
      }
    }

    if (rule.hasVariables && rule.conclusionAST) {
      const unifyResult = this.engine.unification.tryUnification(goal, rule, depth, {
        useLevelOptimization: useLevelOpt,
        goalLevel
      });
      if (unifyResult.valid) {
        return unifyResult;
      }
    }

    return { valid: false };
  }
}

export default KBMatcher;
