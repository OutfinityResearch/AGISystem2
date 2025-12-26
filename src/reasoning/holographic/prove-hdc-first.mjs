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
      // Quantifiers are higher-order expressions; route them directly to symbolic proof.
      // HDC matching is not meaningful for Exists/ForAll goals (and can produce misleading "trivial echo" outputs).
      const topOp = this.extractOperatorName(goal);
      const inner = goal?.args?.[0];
      const innerOp = inner?.type === 'Compound' ? (inner.operator?.name || inner.operator?.value) : null;
      const isQuantifier = topOp === 'Exists' || topOp === 'ForAll' ||
        (topOp === 'Not' && (innerOp === 'Exists' || innerOp === 'ForAll'));
      if (isQuantifier) {
        const symbolicResult = this.symbolicEngine.prove(goal);
        symbolicResult.reasoningSteps = this.reasoningSteps + (symbolicResult.reasoningSteps || 0);
        return symbolicResult;
      }

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
    const goalMeta = this.extractStatementMetadata(goal);

    // Build goal vector
    const goalVec = this.session.executor.buildStatementVector(goal);
    if (!goalVec) {
      return { valid: false, reason: 'Cannot build goal vector', goal: goalStr };
    }

    // Check if goal is explicitly negated first
    if (this.isGoalNegated(goalMeta)) {
      return { valid: false, reason: 'Goal is negated', goal: goalStr };
    }

    // Step 1: HDC direct KB similarity search
    const directMatch = this.hdcDirectSearch(goalVec, goalMeta, goalStr);
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
          ...(directMatch.matchedFact
            ? [{ operation: 'hdc_candidate', fact: directMatch.matchedFact, confidence: directMatch.confidence }]
            : []),
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
        if (this.config.VALIDATION_REQUIRED) {
          const symbolicProof = this.validateWithSymbolic(goal);
          if (symbolicProof.valid) {
            return {
              ...transitiveResult,
              method: 'hdc_transitive_validated',
              steps: [
                ...(symbolicProof.steps?.length ? symbolicProof.steps : transitiveResult.steps),
                { operation: 'validation', method: 'symbolic', fact: goalStr, valid: true }
              ]
            };
          }
        }
        return transitiveResult;
      }
    }

    // Step 3: HDC rule matching
    const ruleResult = this.hdcRuleSearch(goal, goalVec);
    if (ruleResult.valid) {
      ruleResult.goal = goalStr;
      return ruleResult;
    }

    if (this.config.FALLBACK_TO_SYMBOLIC) {
      try {
        const symbolic = this.symbolicEngine.prove(goal);
        return symbolic;
      } catch (e) {
        dbg('VALIDATE', `Symbolic fallback error: ${e.message}`);
      }
    }

    return { valid: false, reason: 'HDC proof not found', goal: goalStr };
  }

  /**
   * Direct HDC similarity search in KB
   * Now with synonym-aware component matching
   * @private
   */
  hdcDirectSearch(goalVec, goalMeta, goalStr) {
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

    // Second: try component-based matching with synonyms/canonicalization
    // Use synonyms unless we have a very high confidence match (>= 0.95)
    const synonymThreshold = Math.max(this.thresholds.HDC_MATCH, 0.95);
    if (bestSim < synonymThreshold && componentKB) {
      const meta = goalMeta || this.extractGoalMetadata(goalStr);
      if (meta?.operator && meta?.args?.length >= 1) {
        // Look for synonym-expanded matches
        const candidates = componentKB.findByOperatorAndArg0(meta.operator, meta.args[0]);
        for (const fact of candidates) {
          // Check if arg1 matches with synonyms
          if (meta.args.length >= 2 && fact.args?.[1]) {
            const a = componentKB.canonicalizeName(meta.args[1]);
            const b = componentKB.canonicalizeName(fact.args[1]);
            const synArgs = componentKB.expandSynonyms(a);
            if (a === b || synArgs.has(b)) {
              dbg('SYNONYM', `Match via synonym/canonical: ${meta.args[1]} ~ ${fact.args[1]}`);
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
      const meta = bestFact?.metadata;
      const matchedFact =
        meta && meta.operator
          ? `${meta.operator} ${(meta.args || []).join(' ')}`.trim()
          : goalStr;
      return {
        valid: true,
        confidence: bestSim,
        matchedFact
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
      // Validate chain by confirming each edge exists (symbolic proof is optional).
      if (this.validateChainEdges(opName, chain)) {
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
      edges.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

      for (const edge of edges) {
        if (edge.to === to) {
          // Found target!
          return [...path, { from: edge.from || node, to: edge.to, similarity: edge.similarity }];
        }

        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            node: edge.to,
            path: [...path, { from: edge.from || node, to: edge.to, similarity: edge.similarity }]
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
        const fromArg = fact.args?.[0] || from;
        const toArg = fact.args?.[1] || fact.metadata?.args?.[1];
        if (toArg) {
          // Compute similarity for ranking
          const patternGoal = this.buildStepGoal(relation, from, toArg);
          const patternVec = this.session.executor?.buildStatementVector?.(patternGoal);

          if (patternVec && fact.vector) {
            edges.push({
              from: fromArg,
              to: toArg,
              similarity: similarity(patternVec, fact.vector)
            });
          } else {
            // Direct metadata match - high confidence
            edges.push({ from: fromArg, to: toArg, similarity: 1.0 });
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
              from,
              to: toArg,
              similarity: similarity(patternVec, fact.vector)
            });
          } else {
            edges.push({ from, to: toArg, similarity: 1.0 });
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
      const conclusionVec = rule?.conclusion || this.buildConclusionVector(rule);
      if (!conclusionVec) continue;

      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, conclusionVec);
      if (sim < this.thresholds.CONCLUSION_MATCH) continue;

      dbg('RULE', `Rule conclusion similarity: ${sim.toFixed(3)}`);

      // Try to satisfy conditions
      const conditionResult = this.checkConditionsHDC(rule);
      if (conditionResult.satisfied) {
        // Validate with symbolic and capture proof steps
        const symbolicProof = this.validateWithSymbolic(goal);
        if (symbolicProof.valid) {
          return {
            valid: true,
            confidence: sim * conditionResult.confidence,
            method: 'hdc_rule_validated',
            rule: rule.label || rule.name || rule.id,
            steps: [
              ...(symbolicProof.steps?.length
                ? symbolicProof.steps
                : [{
                    operation: 'rule_application',
                    rule: rule.label || rule.name || rule.id,
                    ruleId: rule.id || null,
                    confidence: conditionResult.confidence
                  }]),
              { operation: 'validation', method: 'symbolic', fact: goalStr, valid: true }
            ]
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
    if (!rule.conclusionAST) return null;
    try {
      return this.session.executor.buildStatementVector(rule.conclusionAST);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check rule conditions using HDC similarity
   * @private
   */
  checkConditionsHDC(rule) {
    if (!rule?.conditionParts) {
      // If we don't have a decomposed condition, we can't do HDC prefiltering.
      return { satisfied: true, confidence: 1.0 };
    }

    const evaluateLeaf = (leaf) => {
      const vec = leaf?.vector;
      if (!vec) return { satisfied: false, confidence: 0 };

      let best = 0;
      for (const fact of this.session.kbFacts) {
        this.session.reasoningStats.kbScans++;
        if (!fact.vector) continue;
        this.session.reasoningStats.similarityChecks++;
        const sim = similarity(vec, fact.vector);
        if (sim > best) best = sim;
      }
      return { satisfied: best >= this.thresholds.VERIFICATION, confidence: best };
    };

    const evalPart = (part) => {
      if (!part) return { satisfied: false, confidence: 0 };
      if (part.type === 'leaf') return evaluateLeaf(part);

      if (part.type === 'And') {
        let min = 1.0;
        for (const p of part.parts || []) {
          const r = evalPart(p);
          if (!r.satisfied) return { satisfied: false, confidence: 0 };
          min = Math.min(min, r.confidence);
        }
        return { satisfied: true, confidence: min };
      }

      if (part.type === 'Or') {
        let best = 0;
        for (const p of part.parts || []) {
          const r = evalPart(p);
          if (r.satisfied) best = Math.max(best, r.confidence);
        }
        return { satisfied: best > 0, confidence: best };
      }

      if (part.type === 'Not') {
        const inner = evalPart(part.inner);
        // If inner is provable with high confidence, Not is not satisfied.
        if (inner.satisfied) return { satisfied: false, confidence: 0 };
        return { satisfied: true, confidence: 1.0 - inner.confidence };
      }

      return { satisfied: false, confidence: 0 };
    };

    return evalPart(rule.conditionParts);
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
  validateChainEdges(relation, chain) {
    if (chain.length === 0) return false;
    for (const step of chain) {
      const ok = this.symbolicEngine.factExists(relation, step.from, step.to);
      if (!ok) return false;
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
    if (this.session?.semanticIndex?.isTransitive) return this.session.semanticIndex.isTransitive(name);
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
  isGoalNegated(goalMeta) {
    if (!goalMeta?.operator || !Array.isArray(goalMeta.args)) return false;
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== 'Not') continue;

      const innerOp = meta.innerOperator || meta.args?.[0];
      const innerArgs = meta.innerArgs || (meta.args ? meta.args.slice(1) : []);
      if (!innerOp || !Array.isArray(innerArgs)) continue;

      if (innerOp !== goalMeta.operator) continue;
      if (innerArgs.length !== goalMeta.args.length) continue;
      let ok = true;
      for (let i = 0; i < innerArgs.length; i++) {
        if (innerArgs[i] !== goalMeta.args[i]) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  extractStatementMetadata(stmt) {
    const operator = this.extractOperatorName(stmt);
    const args = (stmt.args || []).map(a => this.extractArgName(a)).filter(a => a !== null && a !== undefined);
    return { operator, args };
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
