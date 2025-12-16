/**
 * AGISystem2 - Abductive Reasoning Engine
 * @module reasoning/abduction
 *
 * Implements "best explanation" reasoning:
 * Given an observation O, find hypothesis H such that H would explain O.
 *
 * Use cases:
 * - Diagnostic reasoning: "Patient has fever → What disease explains this?"
 * - Causal inference: "Fire detected → What caused it?"
 * - Gap filling: "Missing link in chain → What connects A to C?"
 *
 * Algorithm:
 * 1. Find rules where observation matches conclusion
 * 2. Score hypotheses by explanation quality
 * 3. Return ranked explanations with confidence
 */

import { similarity } from '../core/operations.mjs';

/**
 * Abductive Reasoning Engine
 */
export class AbductionEngine {
  /**
   * Create abduction engine
   * @param {Session} session - Parent session with KB and rules
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Find best explanations for an observation
   * @param {Object} observation - Observed fact to explain
   * @param {Object} options - Abduction options
   * @returns {Object} Abduction result with ranked explanations
   */
  abduce(observation, options = {}) {
    const maxExplanations = options.maxExplanations || 5;
    const minConfidence = options.minConfidence || 0.3;

    const explanations = [];

    // Build observation vector
    const obsVec = this.session.executor.buildStatementVector(observation);
    const obsStr = observation.toString?.() || '';

    // Strategy 1: Find rules where conclusion matches observation
    for (const rule of this.session.rules) {
      const match = this.matchRuleConclusion(rule, obsVec, observation);
      if (match.score > minConfidence) {
        explanations.push({
          type: 'rule_backward',
          hypothesis: this.extractHypothesis(rule),
          rule: rule.name,
          score: match.score,
          bindings: match.bindings,
          explanation: `If ${this.describeCondition(rule)} then ${obsStr}`
        });
      }
    }

    // Strategy 2: Find causal chains that lead to observation
    const causalExplanations = this.findCausalChains(observation, obsVec);
    explanations.push(...causalExplanations);

    // Strategy 3: Find similar KB facts as analogical explanations
    const analogicalExplanations = this.findAnalogicalExplanations(obsVec, minConfidence);
    explanations.push(...analogicalExplanations);

    // Sort by score and limit
    explanations.sort((a, b) => b.score - a.score);
    const topExplanations = explanations.slice(0, maxExplanations);

    return {
      success: topExplanations.length > 0,
      observation: obsStr,
      explanations: topExplanations,
      bestExplanation: topExplanations[0] || null,
      confidence: topExplanations[0]?.score || 0,
      method: 'abduction'
    };
  }

  /**
   * Match rule conclusion against observation
   * @private
   */
  matchRuleConclusion(rule, obsVec, observation) {
    if (!rule.conclusion) {
      return { score: 0, bindings: null };
    }

    // Vector similarity check
    const sim = similarity(rule.conclusion, obsVec);
    if (sim < 0.5) {
      return { score: 0, bindings: null };
    }

    // Try unification if rule has variables
    let bindings = null;
    if (rule.hasVariables && rule.conclusionAST) {
      bindings = this.tryUnify(rule.conclusionAST, observation);
    }

    // Score based on similarity and binding success
    const bindingBonus = bindings ? 0.2 : 0;
    const score = Math.min(1.0, sim + bindingBonus);

    return { score, bindings };
  }

  /**
   * Extract hypothesis (condition) from rule
   * @private
   */
  extractHypothesis(rule) {
    if (rule.conditionAST) {
      return rule.conditionAST.toString?.() || 'condition';
    }
    return rule.source || 'hypothesis';
  }

  /**
   * Describe rule condition in natural language
   * @private
   */
  describeCondition(rule) {
    if (rule.conditionAST) {
      const op = rule.conditionAST.operator?.name || '';
      const args = (rule.conditionAST.args || [])
        .map(a => a.name || a.value || '?')
        .join(', ');
      return `${op}(${args})`;
    }
    return 'condition';
  }

  /**
   * Try to unify two AST structures
   * @private
   */
  tryUnify(pattern, target) {
    const bindings = new Map();

    function unify(p, t) {
      if (!p || !t) return false;

      // Variable (Hole) matches anything
      if (p.type === 'Hole') {
        bindings.set(p.name, t);
        return true;
      }

      // Same type and value
      if (p.type === t.type) {
        if (p.name && t.name && p.name === t.name) return true;
        if (p.value && t.value && p.value === t.value) return true;
      }

      // Structural match for statements
      if (p.type === 'Statement' && t.type === 'Statement') {
        if (!unify(p.operator, t.operator)) return false;
        if ((p.args?.length || 0) !== (t.args?.length || 0)) return false;
        for (let i = 0; i < (p.args?.length || 0); i++) {
          if (!unify(p.args[i], t.args[i])) return false;
        }
        return true;
      }

      return false;
    }

    const success = unify(pattern, target);
    return success ? bindings : null;
  }

  /**
   * Find causal chains leading to observation
   * @private
   */
  findCausalChains(observation, obsVec) {
    const explanations = [];
    const opName = observation.operator?.name || observation.operator?.value;

    // Look for "causes" relations that lead to this
    if (opName) {
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'causes' && meta.args?.length >= 2) {
          // Check if effect matches observation
          const effectName = meta.args[1];
          if (effectName === opName || this.matchesObservation(effectName, observation)) {
            explanations.push({
              type: 'causal',
              hypothesis: `${meta.args[0]} causes ${effectName}`,
              cause: meta.args[0],
              effect: effectName,
              score: 0.7,
              explanation: `Causal chain: ${meta.args[0]} → ${effectName}`
            });
          }
        }
      }
    }

    return explanations;
  }

  /**
   * Check if a name matches observation
   * @private
   */
  matchesObservation(name, observation) {
    const obsOp = observation.operator?.name || observation.operator?.value;
    const obsArg = observation.args?.[0]?.name || observation.args?.[0]?.value;
    return name === obsOp || name === obsArg;
  }

  /**
   * Find analogical explanations from similar KB facts
   * Requires higher similarity threshold since analogy is weaker evidence
   * @private
   */
  findAnalogicalExplanations(obsVec, minSim) {
    const explanations = [];

    // Require higher threshold for analogical reasoning (at least 0.6)
    const analogyThreshold = Math.max(0.6, minSim);

    for (const fact of this.session.kbFacts) {
      if (!fact.vector) continue;

      const sim = similarity(fact.vector, obsVec);
      if (sim > analogyThreshold && sim < 0.95) { // Not exact match but strongly similar
        const meta = fact.metadata;
        if (meta?.operator && meta?.args) {
          explanations.push({
            type: 'analogical',
            hypothesis: `Similar to: ${meta.operator} ${meta.args.join(' ')}`,
            similarFact: fact.name || 'anonymous',
            score: sim * 0.7, // Discount for analogy
            explanation: `By analogy with similar fact`
          });
        }
      }
    }

    return explanations;
  }

  /**
   * Explain why an observation might be true
   * Higher-level API that combines abduction with proof checking
   * @param {string} dsl - Observation in DSL format
   * @returns {Object} Explanation result
   */
  explain(dsl) {
    try {
      const ast = this.session.executor.session === this.session
        ? require('../parser/parser.mjs').parse(dsl)
        : { statements: [] };

      if (ast.statements.length === 0) {
        return { success: false, reason: 'Empty observation' };
      }

      return this.abduce(ast.statements[0]);
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }
}

export default AbductionEngine;
