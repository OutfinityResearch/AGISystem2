/**
 * AGISystem2 - Proof Engine (Orchestration)
 * @module reasoning/prove
 *
 * Split into smaller modules under `src/reasoning/prove/*` to keep files <500 LOC.
 */

import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, MAX_REASONING_STEPS, getThresholds } from '../core/constants.mjs';
import { TransitiveReasoner } from './transitive.mjs';
import { PropertyInheritanceReasoner } from './property-inheritance.mjs';
import { UnificationEngine } from './unification.mjs';
import { ConditionProver } from './conditions.mjs';
import { KBMatcher } from './kb-matching.mjs';
import { DisjointProver } from './disjoint.mjs';
import { DefaultReasoner } from './defaults.mjs';
import { SymmetricReasoner } from './symmetric.mjs';
import { InverseReasoner } from './inverse.mjs';

import { buildSearchTrace as buildSearchTraceImpl } from './prove-search-trace.mjs';

import { proveGoal as proveGoalImpl } from './prove/prove-goal.mjs';
import { resetState, isTimedOut, incrementSteps, logStep } from './prove/state.mjs';
import { extractOperatorName, extractArgName, goalToFact, hashVector } from './prove/utils.mjs';
import { factExists } from './prove/fact-exists.mjs';
import { trySynonymMatch } from './prove/synonym-match.mjs';
import { checkGoalNegation, buildNegationSearchTrace, isGoalNegated } from './prove/negation.mjs';
import { tryDefaultReasoning } from './prove/defaults.mjs';
import { tryImplicationModusPonens, proveImplicationCondition, describeSimpleImplication } from './prove/modus-ponens.mjs';
import { buildRuleIndexByConclusionOp } from './prove/rule-index.mjs';

export class ProofEngine {
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxDepth: options.maxDepth || MAX_PROOF_DEPTH,
      timeout: options.timeout || PROOF_TIMEOUT_MS,
      includeSearchTrace: options.includeSearchTrace !== false,
      ignoreNegation: options.ignoreNegation === true
    };

    const strategy = session?.hdcStrategy || 'exact';
    this.thresholds = getThresholds(strategy);

    this.steps = [];
    this.visited = new Set();
    this.startTime = 0;
    this.reasoningSteps = 0;
    this.maxSteps = MAX_REASONING_STEPS;
    this._ruleIndex = null;
    this._ruleIndexLen = 0;

    this.transitive = new TransitiveReasoner(this);
    this.symmetric = new SymmetricReasoner(this);
    this.inverse = new InverseReasoner(this);
    this.propertyInheritance = new PropertyInheritanceReasoner(this);
    this.unification = new UnificationEngine(this);
    this.conditions = new ConditionProver(this);
    this.kbMatcher = new KBMatcher(this);
    this.disjoint = new DisjointProver(this);
    this.defaults = new DefaultReasoner(session);
  }

  prove(goal) {
    this.resetState();

    try {
      const result = this.proveGoal(goal, 0);
      result.goal = result.goal || goal.toString?.() || '';

      if (!result.steps || result.steps.length === 0) {
        result.steps = this.steps;
      }

      if (result.confidence === undefined) {
        result.confidence = result.valid ? this.thresholds.DEFAULT_CONFIDENCE : 0;
      }

      result.proof = result.valid ? result.steps : null;
      result.reasoningSteps = this.reasoningSteps;
      return result;
    } catch (e) {
      return {
        valid: false,
        reason: e.message,
        goal: goal.toString?.() || '',
        steps: this.steps,
        confidence: 0,
        proof: null,
        reasoningSteps: this.reasoningSteps
      };
    }
  }

  tryDirectMatch(goalVector, goalStr) {
    const result = this.kbMatcher.tryDirectMatch(goalVector, goalStr);
    return {
      success: result.valid,
      confidence: result.confidence || 0
    };
  }

  combineConfidences(results) {
    if (!results || results.length === 0) {
      return 1.0;
    }
    const minConf = Math.min(...results.map(r => r.confidence || 0));
    return minConf * Math.pow(this.thresholds.TRANSITIVE_DECAY, results.length);
  }

  proveGoal(goal, depth) {
    return proveGoalImpl(this, goal, depth);
  }

  getRulesByConclusionOp(op) {
    const rules = this.session?.rules || [];
    if (!this._ruleIndex || this._ruleIndexLen !== rules.length) {
      this._ruleIndex = buildRuleIndexByConclusionOp(this.session);
      this._ruleIndexLen = rules.length;
    }
    if (!op) return rules;
    return this._ruleIndex.get(op) || [];
  }

  buildSearchTrace(goal, goalStr) {
    return buildSearchTraceImpl(this, goal, goalStr);
  }

  factExists(op, arg0, arg1) {
    return factExists(this, op, arg0, arg1);
  }

  trySynonymMatch(goal, depth) {
    return trySynonymMatch(this, goal, depth);
  }

  resetState() {
    return resetState(this);
  }

  isTimedOut() {
    return isTimedOut(this);
  }

  incrementSteps() {
    return incrementSteps(this);
  }

  logStep(operation, detail) {
    return logStep(this, operation, detail);
  }

  goalToFact(goal) {
    return goalToFact(this, goal);
  }

  extractOperatorName(stmt) {
    return extractOperatorName(stmt);
  }

  extractArgName(arg) {
    return extractArgName(arg);
  }

  hashVector(vec) {
    return hashVector(vec);
  }

  checkGoalNegation(goal) {
    return checkGoalNegation(this, goal);
  }

  buildNegationSearchTrace(goal, negationInfo) {
    return buildNegationSearchTrace(this, goal, negationInfo);
  }

  isGoalNegated(goal) {
    return isGoalNegated(this, goal);
  }

  tryDefaultReasoning(goal, depth) {
    return tryDefaultReasoning(this, goal, depth);
  }

  tryImplicationModusPonens(goal, depth) {
    return tryImplicationModusPonens(this, goal, depth);
  }

  proveImplicationCondition(rule, depth) {
    return proveImplicationCondition(this, rule, depth);
  }

  describeSimpleImplication(rule) {
    return describeSimpleImplication(rule);
  }
}

export default ProofEngine;
