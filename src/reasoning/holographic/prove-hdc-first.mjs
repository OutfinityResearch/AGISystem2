/**
 * AGISystem2 - Holographic Proof Engine (HDC-First)
 * @module reasoning/holographic/prove-hdc-first
 *
 * HDC-first proof implementation:
 * 1. Use HDC similarity search to find candidate proofs
 * 2. Validate candidates with symbolic verification
 * 3. Fall back to symbolic proof if no HDC results validate
 *
 * Same interface as ProofEngine - drop-in replacement.
 */

import { similarity, bind } from '../../core/operations.mjs';
import { withPosition } from '../../core/position.mjs';
import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, MAX_REASONING_STEPS, getThresholds, getHolographicThresholds } from '../../core/constants.mjs';
import { ProofEngine } from '../prove.mjs';
import { TRANSITIVE_RELATIONS } from '../transitive.mjs';
import { debug_trace } from '../../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[HoloProve:${category}]`, ...args);
}

/**
 * Holographic Proof Engine - HDC similarity with symbolic validation
 */
export class HolographicProofEngine {
  /**
   * Create holographic proof engine
   * @param {Session} session - Parent session
   * @param {Object} options - Proof options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.symbolicEngine = new ProofEngine(session, options);

    this.options = {
      maxDepth: options.maxDepth || MAX_PROOF_DEPTH,
      timeout: options.timeout || PROOF_TIMEOUT_MS
    };

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
    this.config = getHolographicThresholds(strategy);

    // Proof state
    this.steps = [];
    this.visited = new Set();
    this.startTime = 0;
    this.reasoningSteps = 0;
    this.maxSteps = MAX_REASONING_STEPS;

    dbg('INIT', `Strategy: ${strategy}, MinSim: ${this.thresholds.SIMILARITY}`);
  }

  // ============================================================
  // PUBLIC API - Same interface as ProofEngine
  // ============================================================

  /**
   * Prove a goal statement using HDC-first approach
   * @param {Statement} goal - Goal to prove
   * @returns {ProofResult} Same interface as ProofEngine
   */
  prove(goal) {
    this.resetState();

    // Track holographic stats
    this.session.reasoningStats.holographicProofs =
      (this.session.reasoningStats.holographicProofs || 0) + 1;

    try {
      // Step 1: Try HDC similarity search
      const hdcResult = this.tryHDCProof(goal);

      if (hdcResult.valid) {
        dbg('HDC', `HDC proof succeeded: ${goal.toString?.() || ''}`);
        this.session.reasoningStats.hdcProofSuccesses =
          (this.session.reasoningStats.hdcProofSuccesses || 0) + 1;
        hdcResult.reasoningSteps = this.reasoningSteps;
        return hdcResult;
      }

      // Step 2: Fall back to symbolic if HDC failed
      if (this.config.FALLBACK_TO_SYMBOLIC) {
        dbg('FALLBACK', 'HDC proof failed, falling back to symbolic');
        this.session.reasoningStats.symbolicProofFallbacks =
          (this.session.reasoningStats.symbolicProofFallbacks || 0) + 1;

        const symbolicResult = this.symbolicEngine.prove(goal);
        if (symbolicResult.valid) {
          symbolicResult.method = 'symbolic_fallback';
        }
        // Include HDC reasoning steps + symbolic steps
        symbolicResult.reasoningSteps = this.reasoningSteps + (symbolicResult.reasoningSteps || 0);
        return symbolicResult;
      }

      return {
        valid: false,
        reason: 'HDC proof failed, no fallback',
        goal: goal.toString?.() || '',
        steps: this.steps,
        confidence: 0,
        proof: null,
        reasoningSteps: this.reasoningSteps
      };

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

  // ============================================================
  // HDC-FIRST PROOF STRATEGY
  // ============================================================

  /**
   * Try to prove goal using HDC similarity search
   * @private
   */
  tryHDCProof(goal) {
    const goalStr = goal.toString?.() || '';

    // Build goal vector
    const goalVec = this.session.executor.buildStatementVector(goal);
    if (!goalVec) {
      return { valid: false, reason: 'Cannot build goal vector', goal: goalStr };
    }

    // Check if goal is explicitly negated first
    if (this.isGoalNegated(goal, goalVec)) {
      return { valid: false, reason: 'Goal is negated', goal: goalStr };
    }

    // Step 1: HDC direct KB similarity search
    const directMatch = this.hdcDirectSearch(goalVec, goalStr);
    if (directMatch.valid && directMatch.confidence >= this.thresholds.VERIFICATION) {
      // Synonym matches are already validated through ComponentKB
      if (directMatch.method === 'synonym_match') {
        directMatch.goal = goalStr;
        directMatch.steps = [{
          operation: 'synonym_match',
          fact: directMatch.matchedFact,
          confidence: directMatch.confidence
        }];
        return directMatch;
      }

      // Validate non-synonym matches with symbolic
      const symbolicProof = this.validateWithSymbolic(goal);
      if (symbolicProof.valid) {
        directMatch.method = 'hdc_direct_validated';
        directMatch.goal = goalStr;
        // Use symbolic proof steps if available, otherwise just show the goal
        const baseSteps = (symbolicProof.steps && symbolicProof.steps.length > 0)
          ? symbolicProof.steps
          : [{ operation: 'hdc_direct', fact: goalStr, confidence: directMatch.confidence }];

        directMatch.steps = [
          ...baseSteps,
          { operation: 'validation', method: 'symbolic', fact: goalStr, valid: true }
        ];
        return directMatch;
      }
    }

    // Step 2: HDC transitive chain search
    const opName = this.extractOperatorName(goal);
    if (this.isTransitiveRelation(opName)) {
      const transitiveResult = this.hdcTransitiveSearch(goal, goalVec);
      if (transitiveResult.valid) {
        transitiveResult.goal = goalStr;
        return transitiveResult;
      }
    }

    // Step 3: HDC rule matching
    const ruleResult = this.hdcRuleSearch(goal, goalVec);
    if (ruleResult.valid) {
      ruleResult.goal = goalStr;
      return ruleResult;
    }

    return { valid: false, reason: 'HDC proof not found', goal: goalStr };
  }

  /**
   * Direct HDC similarity search in KB
   * Now with synonym-aware component matching
   * @private
   */
  hdcDirectSearch(goalVec, goalStr) {
    let bestSim = 0;
    let bestFact = null;
    const componentKB = this.session.componentKB;

    // First: try exact vector match in KB
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      if (!fact.vector) continue;

      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, fact.vector);
      if (sim > bestSim) {
        bestSim = sim;
        bestFact = fact;
      }
    }

    // Second: try component-based matching with synonyms
    // Use synonyms unless we have a very high confidence match (>= 0.95)
    const synonymThreshold = Math.max(this.thresholds.HDC_MATCH, 0.95);
    if (bestSim < synonymThreshold && componentKB) {
      const meta = this.extractGoalMetadata(goalStr);
      if (meta?.operator && meta?.args?.length >= 1) {
        // Look for synonym-expanded matches
        const candidates = componentKB.findByOperatorAndArg0(meta.operator, meta.args[0]);
        for (const fact of candidates) {
          // Check if arg1 matches with synonyms
          if (meta.args.length >= 2 && fact.args?.[1]) {
            const synArgs = componentKB.expandSynonyms(meta.args[1]);
            if (synArgs.has(fact.args[1])) {
              dbg('SYNONYM', `Match via synonym: ${meta.args[1]} <-> ${fact.args[1]}`);
              return {
                valid: true,
                confidence: 0.95, // High confidence for synonym match
                matchedFact: `${fact.operator} ${fact.args.join(' ')}`,
                method: 'synonym_match'
              };
            }
          }
        }
      }
    }

    dbg('DIRECT', `Best similarity: ${bestSim.toFixed(3)} for ${goalStr}`);

    if (bestSim >= this.thresholds.HDC_MATCH) {
      return {
        valid: true,
        confidence: bestSim,
        matchedFact: bestFact?.metadata?.toString || goalStr
      };
    }

    return { valid: false, confidence: bestSim };
  }

  /**
   * Extract metadata from goal string for component matching
   * @private
   */
  extractGoalMetadata(goalStr) {
    // Parse "operator arg0 arg1" format, skip @goal/@query prefixes
    let parts = goalStr.split(/\s+/).filter(p => p.length > 0);

    // Skip reference prefixes like @goal, @query, etc.
    if (parts.length > 0 && parts[0].startsWith('@')) {
      parts = parts.slice(1);
    }

    if (parts.length < 2) return null;

    return {
      operator: parts[0],
      args: parts.slice(1)
    };
  }

  /**
   * HDC transitive chain search
   * @private
   */
  hdcTransitiveSearch(goal, goalVec) {
    const opName = this.extractOperatorName(goal);
    const args = goal.args || [];

    if (args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.extractArgName(args[0]);
    const targetName = this.extractArgName(args[1]);

    if (!subjectName || !targetName) {
      return { valid: false };
    }

    // Find HDC candidates that might form a chain
    const chain = this.findHDCChain(opName, subjectName, targetName);

    if (chain.length > 0) {
      // Validate chain with symbolic proof
      const validated = this.validateChainSymbolic(opName, chain);
      if (validated) {
        const confidence = this.computeChainConfidence(chain.length);
        return {
          valid: true,
          confidence,
          method: 'hdc_transitive_validated',
          steps: chain.map((step, i) => ({
            operation: 'transitive_step',
            fact: `${opName} ${step.from} ${step.to}`,
            from: step.from,
            to: step.to,
            step: i + 1
          }))
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find HDC candidate chain for transitive relation
   * @private
   */
  findHDCChain(relation, from, to, maxDepth = 10) {
    const visited = new Set([from]);
    const queue = [{ node: from, path: [] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift();

      if (path.length >= maxDepth) continue;

      // Find all HDC-similar edges from this node
      const edges = this.findHDCEdges(relation, node);

      for (const edge of edges) {
        if (edge.to === to) {
          // Found target!
          return [...path, { from: node, to: edge.to, similarity: edge.similarity }];
        }

        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            node: edge.to,
            path: [...path, { from: node, to: edge.to, similarity: edge.similarity }]
          });
        }
      }
    }

    return [];
  }

  /**
   * Find HDC-similar edges for a relation from a node
   * Uses ComponentKB for efficient matching with synonym support
   * @private
   */
  findHDCEdges(relation, from) {
    const edges = [];
    const componentKB = this.session.componentKB;

    // Use ComponentKB for efficient component-based search
    if (componentKB) {
      // Get all facts matching this operator and arg0 (with synonyms)
      const candidates = componentKB.findByOperatorAndArg0(relation, from);

      for (const fact of candidates) {
        const toArg = fact.args?.[1] || fact.metadata?.args?.[1];
        if (toArg) {
          // Compute similarity for ranking
          const patternGoal = this.buildStepGoal(relation, from, toArg);
          const patternVec = this.session.executor?.buildStatementVector?.(patternGoal);

          if (patternVec && fact.vector) {
            edges.push({
              to: toArg,
              similarity: similarity(patternVec, fact.vector)
            });
          } else {
            // Direct metadata match - high confidence
            edges.push({ to: toArg, similarity: 1.0 });
          }
        }
      }
      return edges;
    }

    // Fallback to linear scan if ComponentKB not available
    const fromVec = this.session.resolve({ name: from, type: 'Identifier' });
    const relVec = this.session.resolve({ name: relation, type: 'Identifier' });

    if (!fromVec || !relVec) return edges;

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== relation) continue;
      if (meta.args?.[0] !== from) continue;

      const toArg = meta.args?.[1];
      if (toArg) {
        const toVec = this.session.resolve({ name: toArg, type: 'Identifier' });
        if (toVec) {
          const patternGoal = this.buildStepGoal(relation, from, toArg);
          const patternVec = this.session.executor?.buildStatementVector?.(patternGoal);

          if (patternVec && fact.vector) {
            edges.push({
              to: toArg,
              similarity: similarity(patternVec, fact.vector)
            });
          } else {
            edges.push({ to: toArg, similarity: 1.0 });
          }
        }
      }
    }

    return edges;
  }

  /**
   * HDC rule matching
   * @private
   */
  hdcRuleSearch(goal, goalVec) {
    const goalStr = goal.toString?.() || '';

    for (const rule of this.session.rules) {
      // Check if conclusion matches goal (HDC similarity)
      const conclusionVec = this.buildConclusionVector(rule);
      if (!conclusionVec) continue;

      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, conclusionVec);
      if (sim < this.thresholds.CONCLUSION_MATCH) continue;

      dbg('RULE', `Rule conclusion similarity: ${sim.toFixed(3)}`);

      // Try to satisfy conditions
      const conditionResult = this.checkConditionsHDC(rule, goal);
      if (conditionResult.satisfied) {
        // Validate with symbolic
        if (this.validateRuleApplication(goal, rule)) {
          return {
            valid: true,
            confidence: sim * conditionResult.confidence,
            method: 'hdc_rule_validated',
            rule: rule.label || rule.name || rule.id,
            steps: [{
              operation: 'rule_application',
              rule: rule.label || rule.name || rule.id,
              ruleId: rule.id || null,
              confidence: conditionResult.confidence
            }]
          };
        }
      }
    }

    return { valid: false };
  }

  /**
   * Build conclusion vector from rule
   * @private
   */
  buildConclusionVector(rule) {
    if (!rule.conclusion) return null;
    try {
      return this.session.executor.buildStatementVector(rule.conclusion);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check rule conditions using HDC similarity
   * @private
   */
  checkConditionsHDC(rule, goal) {
    if (!rule.condition) {
      return { satisfied: true, confidence: 1.0 };
    }

    // For compound conditions, check each
    const conditions = rule.condition.type === 'And'
      ? (rule.condition.conditions || [rule.condition.left, rule.condition.right].filter(Boolean))
      : [rule.condition];

    let minConfidence = 1.0;

    for (const cond of conditions) {
      const condVec = this.session.executor.buildStatementVector(cond);
      if (!condVec) continue;

      // Search KB for matching condition
      let bestSim = 0;
      for (const fact of this.session.kbFacts) {
        this.session.reasoningStats.kbScans++;
        if (!fact.vector) continue;
        this.session.reasoningStats.similarityChecks++;
        const sim = similarity(condVec, fact.vector);
        if (sim > bestSim) bestSim = sim;
      }

      if (bestSim < this.thresholds.VERIFICATION) {
        return { satisfied: false, confidence: 0 };
      }

      minConfidence = Math.min(minConfidence, bestSim);
    }

    return { satisfied: true, confidence: minConfidence };
  }

  // ============================================================
  // SYMBOLIC VALIDATION
  // ============================================================

  /**
   * Validate HDC result with symbolic proof
   * @private
   * @returns {Object|boolean} Full proof result if validation required, true if not required
   */
  validateWithSymbolic(goal) {
    if (!this.config.VALIDATION_REQUIRED) {
      return { valid: true, steps: [] };
    }

    try {
      const result = this.symbolicEngine.prove(goal);
      return result; // Return full result with steps
    } catch (e) {
      dbg('VALIDATE', `Symbolic validation error: ${e.message}`);
      return { valid: false, steps: [] };
    }
  }

  /**
   * Validate transitive chain with symbolic proof
   * @private
   */
  validateChainSymbolic(relation, chain) {
    if (!this.config.VALIDATION_REQUIRED || chain.length === 0) {
      return true;
    }

    // Validate each step in the chain exists
    for (const step of chain) {
      const stepGoal = this.buildStepGoal(relation, step.from, step.to);
      const result = this.symbolicEngine.prove(stepGoal);
      if (!result.valid) {
        dbg('VALIDATE', `Chain step failed: ${relation} ${step.from} ${step.to}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate rule application with symbolic proof
   * @private
   */
  validateRuleApplication(goal, rule) {
    if (!this.config.VALIDATION_REQUIRED) {
      return true;
    }

    try {
      const result = this.symbolicEngine.prove(goal);
      return result.valid;
    } catch (e) {
      return false;
    }
  }

  /**
   * Build goal statement for chain step
   * @private
   */
  buildStepGoal(relation, from, to) {
    return {
      type: 'Statement',
      operator: { type: 'Identifier', name: relation, value: relation },
      args: [
        { type: 'Identifier', name: from, value: from },
        { type: 'Identifier', name: to, value: to }
      ],
      toString: () => `${relation} ${from} ${to}`
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Reset proof state
   */
  resetState() {
    this.steps = [];
    this.visited = new Set();
    this.startTime = Date.now();
    this.reasoningSteps = 0;
  }

  /**
   * Check if relation supports transitive reasoning
   * @private
   */
  isTransitiveRelation(name) {
    // Use shared TRANSITIVE_RELATIONS from transitive.mjs
    return TRANSITIVE_RELATIONS.has(name);
  }

  /**
   * Compute chain confidence with decay
   * @private
   */
  computeChainConfidence(chainLength) {
    return this.thresholds.TRANSITIVE_BASE *
      Math.pow(this.thresholds.TRANSITIVE_DECAY, chainLength);
  }

  /**
   * Check if goal is negated in KB
   * @private
   */
  isGoalNegated(goal, goalVec) {
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== 'Not') continue;

      const negatedRef = meta.args?.[0];
      if (!negatedRef) continue;

      const refName = negatedRef.replace('$', '');
      const negatedVec = this.session.scope.get(refName);

      if (negatedVec) {
        this.session.reasoningStats.similarityChecks++;
        const sim = similarity(goalVec, negatedVec);
        if (sim > this.thresholds.RULE_MATCH) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extract operator name from statement
   * @private
   */
  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  /**
   * Extract argument name
   * @private
   */
  extractArgName(arg) {
    if (!arg) return null;
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'Reference') return arg.name;
    return arg.name || arg.value || null;
  }

  // ============================================================
  // DELEGATED METHODS (same interface as ProofEngine)
  // ============================================================

  /**
   * Try direct KB match (delegates to symbolic)
   */
  tryDirectMatch(goalVector, goalStr) {
    return this.symbolicEngine.tryDirectMatch(goalVector, goalStr);
  }

  /**
   * Combine confidences
   */
  combineConfidences(results) {
    return this.symbolicEngine.combineConfidences(results);
  }

  /**
   * Convert goal to fact string
   */
  goalToFact(goal) {
    return this.symbolicEngine.goalToFact(goal);
  }
}

export default HolographicProofEngine;
