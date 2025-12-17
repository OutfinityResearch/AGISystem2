/**
 * AGISystem2 - Proof Engine (Orchestration)
 * @module reasoning/prove
 *
 * Main proof engine that orchestrates reasoning components:
 * - Transitive reasoning (isA, locatedIn, partOf chains)
 * - Variable unification (quantified rules)
 * - Compound conditions (And/Or with backtracking)
 * - KB pattern matching
 * - Disjoint proofs (spatial negation)
 *
 * The proof strategy follows this priority:
 * 1. Direct KB match (high confidence)
 * 2. Transitive chain reasoning
 * 3. Backward chaining with rules
 * 4. Weak direct match
 * 5. Disjoint proof for spatial relations
 */

import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, MAX_REASONING_STEPS, getThresholds } from '../core/constants.mjs';
import { TransitiveReasoner } from './transitive.mjs';
import { PropertyInheritanceReasoner } from './property-inheritance.mjs';
import { UnificationEngine } from './unification.mjs';
import { ConditionProver } from './conditions.mjs';
import { KBMatcher } from './kb-matching.mjs';
import { DisjointProver } from './disjoint.mjs';

/**
 * Main proof engine - orchestrates all reasoning components
 */
export class ProofEngine {
  /**
   * Create proof engine
   * @param {Session} session - Parent session with KB and rules
   * @param {Object} options - Proof options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxDepth: options.maxDepth || MAX_PROOF_DEPTH,
      timeout: options.timeout || PROOF_TIMEOUT_MS
    };

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);

    // Proof state
    this.steps = [];
    this.visited = new Set();
    this.startTime = 0;
    this.reasoningSteps = 0;
    this.maxSteps = MAX_REASONING_STEPS;

    // Initialize reasoning components
    this.transitive = new TransitiveReasoner(this);
    this.propertyInheritance = new PropertyInheritanceReasoner(this);
    this.unification = new UnificationEngine(this);
    this.conditions = new ConditionProver(this);
    this.kbMatcher = new KBMatcher(this);
    this.disjoint = new DisjointProver(this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Prove a goal statement
   * @param {Statement} goal - Goal to prove
   * @returns {ProofResult} Proof result with steps and confidence
   */
  prove(goal) {
    this.resetState();

    try {
      const result = this.proveGoal(goal, 0);
      result.goal = result.goal || goal.toString?.() || '';

      if (!result.steps || result.steps.length === 0) {
        result.steps = this.steps;
      }

      // Ensure confidence is set (default based on valid)
      if (result.confidence === undefined) {
        result.confidence = result.valid ? this.thresholds.DEFAULT_CONFIDENCE : 0;
      }

      // Add proof field for API compatibility
      result.proof = result.valid ? result.steps : null;

      // Add total reasoning steps (includes all backtracking attempts)
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

  /**
   * Try direct KB match (delegates to kbMatcher)
   * @param {Vector} goalVector - Goal vector
   * @param {string} goalStr - Goal string representation
   * @returns {Object} Match result with success and confidence
   */
  tryDirectMatch(goalVector, goalStr) {
    const result = this.kbMatcher.tryDirectMatch(goalVector, goalStr);
    return {
      success: result.valid,
      confidence: result.confidence || 0
    };
  }

  /**
   * Combine confidences from multiple proof results
   * Returns minimum confidence with chain penalty
   * @param {Array} results - Array of results with confidence
   * @returns {number} Combined confidence
   */
  combineConfidences(results) {
    if (!results || results.length === 0) {
      return 1.0;
    }
    const minConf = Math.min(...results.map(r => r.confidence || 0));
    // Apply chain length penalty using transitive decay
    return minConf * Math.pow(this.thresholds.TRANSITIVE_DECAY, results.length);
  }

  // ============================================================
  // ORCHESTRATION - Main Proof Loop
  // ============================================================

  /**
   * Main proof loop with depth tracking
   * Tries strategies in priority order:
   * 1. Direct KB match (high confidence)
   * 2. Transitive chain reasoning
   * 3. Backward chaining with rules
   * 4. Weak direct match
   * 5. Disjoint proof
   */
  proveGoal(goal, depth) {
    // Check limits
    if (this.isTimedOut()) {
      throw new Error('Proof timed out');
    }
    this.incrementSteps();
    if (this.reasoningSteps > this.maxSteps) {
      return { valid: false, reason: 'Step limit exceeded' };
    }
    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    // Build goal vector and check cycles
    const goalVec = this.session.executor.buildStatementVector(goal);
    const goalHash = this.hashVector(goalVec);

    if (this.visited.has(goalHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    this.visited.add(goalHash);

    const goalStr = goal.toString();

    // Check if goal is explicitly negated (blocks all proofs)
    if (this.isGoalNegated(goal)) {
      return { valid: false, reason: 'Goal is negated' };
    }

    // Strategy 1: Direct KB match (strong threshold)
    const directResult = this.kbMatcher.tryDirectMatch(goalVec, goalStr);
    if (directResult.valid && directResult.confidence > this.thresholds.VERY_STRONG_MATCH) {
      directResult.steps = [{ operation: 'direct_match', fact: this.goalToFact(goal) }];
      return directResult;
    }

    // Strategy 1.5: Synonym-based matching
    const synonymResult = this.trySynonymMatch(goal, depth);
    if (synonymResult.valid) {
      return synonymResult;
    }

    // Strategy 2: Transitive reasoning
    const transitiveResult = this.transitive.tryTransitiveChain(goal, depth);
    if (transitiveResult.valid) {
      return transitiveResult;
    }

    // Strategy 2.5: Property inheritance (can Bird Fly + isA Tweety Bird => can Tweety Fly)
    const inheritanceResult = this.propertyInheritance.tryPropertyInheritance(goal, depth);
    if (inheritanceResult.valid) {
      return inheritanceResult;
    }

    // Strategy 3: Rule matching (backward chaining)
    for (const rule of this.session.rules) {
      this.session.reasoningStats.ruleAttempts++;
      const ruleResult = this.kbMatcher.tryRuleMatch(goal, rule, depth);
      if (ruleResult.valid) {
        return ruleResult;
      }
    }

    // Strategy 4: Weak direct match
    if (directResult.valid && directResult.confidence > this.thresholds.STRONG_MATCH) {
      directResult.steps = [{ operation: 'weak_match', fact: this.goalToFact(goal) }];
      return directResult;
    }

    // Strategy 5: Disjoint proof for spatial relations
    const disjointResult = this.disjoint.tryDisjointProof(goal, depth);
    if (disjointResult.valid) {
      return disjointResult;
    }

    return { valid: false, reason: 'No proof found' };
  }

  /**
   * Try to prove goal using synonym expansion
   * If goal is "isA X Y" and Y has synonym Z, try "isA X Z"
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  trySynonymMatch(goal, depth) {
    const componentKB = this.session?.componentKB;
    if (!componentKB) {
      return { valid: false };
    }

    // Extract operator and args
    const op = goal.operator?.name || goal.operator?.value;
    const args = goal.args?.map(a => a.name || a.value) || [];

    if (args.length < 2) {
      return { valid: false };
    }

    // Try synonym expansion on arg1 (the second argument)
    // E.g., for "isA Rex Canine", check if Canine has synonym Dog
    const arg0 = args[0];
    const arg1 = args[1];
    const synonyms = componentKB.expandSynonyms(arg1);

    // Remove the original arg1 to avoid infinite recursion
    synonyms.delete(arg1);

    if (synonyms.size === 0) {
      return { valid: false };
    }

    // Try to find a KB fact matching "op arg0 synonym"
    for (const synonym of synonyms) {
      this.session.reasoningStats.kbScans++;
      const candidates = componentKB.findByOperatorAndArg0(op, arg0);

      for (const fact of candidates) {
        this.session.reasoningStats.kbScans++;
        if (fact.args?.[1] === synonym) {
          // Found: "op arg0 synonym" proves "op arg0 arg1" via synonym
          return {
            valid: true,
            confidence: 0.95,
            method: 'synonym_match',
            matchedFact: `${fact.operator} ${fact.args.join(' ')}`,
            steps: [{
              operation: 'synonym_match',
              fact: `${fact.operator} ${fact.args.join(' ')}`,
              synonymUsed: `${arg1} <-> ${synonym}`,
              confidence: 0.95
            }]
          };
        }
      }
    }

    return { valid: false };
  }

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  /**
   * Reset proof state for new proof
   */
  resetState() {
    this.steps = [];
    this.visited = new Set();
    this.startTime = Date.now();
    this.reasoningSteps = 0;
  }

  /**
   * Check if proof has timed out
   * @returns {boolean}
   */
  isTimedOut() {
    return Date.now() - this.startTime > this.options.timeout;
  }

  /**
   * Increment reasoning step counter
   */
  incrementSteps() {
    this.reasoningSteps++;
  }

  /**
   * Log a proof step
   * @param {string} operation - Operation type
   * @param {string} detail - Step details
   */
  logStep(operation, detail) {
    this.steps.push({
      operation,
      detail,
      timestamp: Date.now() - this.startTime
    });
  }

  // ============================================================
  // UTILITY METHODS (used by all components)
  // ============================================================

  /**
   * Convert goal statement to DSL fact string
   * @param {Object} goal - Goal statement
   * @returns {string} Fact string "op arg1 arg2"
   */
  goalToFact(goal) {
    const op = this.extractOperatorName(goal);
    if (!op) return '';
    const args = (goal.args || []).map(a => this.extractArgName(a) || '').filter(Boolean);
    return `${op} ${args.join(' ')}`.trim();
  }

  /**
   * Extract operator name from statement
   * @param {Object} stmt - Statement AST
   * @returns {string|null}
   */
  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  /**
   * Extract argument name from AST node
   * @param {Object} arg - Argument node
   * @returns {string|null}
   */
  extractArgName(arg) {
    if (!arg) return null;
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'Reference') return arg.name;
    return arg.name || arg.value || null;
  }

  /**
   * Create hash for vector (cycle detection)
   * @param {Object} vec - Vector
   * @returns {string} Hash string
   */
  hashVector(vec) {
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (!vec) return 'invalid:' + Math.random().toString(36);

    // Dense-binary: use first 4 words
    if (vec.data) {
      const parts = [];
      for (let i = 0; i < Math.min(4, vec.words || 0); i++) {
        parts.push(vec.data[i]?.toString(16) || '0');
      }
      return parts.join(':');
    }

    // Sparse-polynomial: use exponents
    if (vec.exponents) {
      return [...vec.exponents].slice(0, 4).map(e => e.toString(16)).join(':');
    }

    return 'invalid:' + Math.random().toString(36);
  }

  /**
   * Check if a goal is explicitly negated in the KB
   * Looks for facts like "Not $ref" where $ref matches the goal
   * @param {Object} goal - Goal statement
   * @returns {boolean} True if goal is negated
   */
  isGoalNegated(goal) {
    const goalVec = this.session.executor.buildStatementVector(goal);
    if (!goalVec) return false;

    // Look for Not statements in KB
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta) continue;

      // Check if this is a Not statement
      if (meta.operator === 'Not') {
        // Get the referenced name
        const negatedRef = meta.args?.[0];
        if (!negatedRef) continue;

        // Look up the vector in scope
        const refName = negatedRef.replace('$', '');
        const negatedVec = this.session.scope.get(refName);

        if (negatedVec) {
          // Compare vectors using similarity
          this.session.reasoningStats.similarityChecks++;
          const sim = this.session.similarity(goalVec, negatedVec);
          if (sim > this.thresholds.RULE_MATCH) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

export default ProofEngine;
