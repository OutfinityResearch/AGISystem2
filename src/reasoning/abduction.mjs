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
import { getThresholds } from '../core/constants.mjs';

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
    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
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

    // Build observation vector (kept for HDC analogical fallback)
    const obsVec = this.session.executor.buildStatementVector(observation);
    const obsStr = observation.toString?.() || this.statementToString(observation);

    // Strategy 1: Find rules where conclusion unifies with the observation
    for (const rule of this.session.rules) {
      const match = this.matchRuleConclusion(rule, obsVec, observation);
      if (match.score > minConfidence) {
        const hypothesis = this.extractHypothesis(rule, match.bindings);
        explanations.push({
          type: 'rule_backward',
          hypothesis,
          rule: rule.name,
          score: match.score,
          bindings: match.bindings,
          explanation: `If ${this.describeCondition(rule)} then ${obsStr}`
        });
      }
    }

    // Strategy 2: Find causal chains that lead to observation
    const causalExplanations = this.findCausalChains(observation);
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

    // Prefer symbolic unification when available.
    let bindings = null;
    if (rule.conclusionAST) {
      bindings = this.tryUnify(rule.conclusionAST, observation);
      if (bindings) {
        return { score: 0.92, bindings };
      }
    }

    // Fallback: vector similarity check
    this.session.reasoningStats.similarityChecks++;
    const sim = similarity(rule.conclusion, obsVec);
    if (sim < this.thresholds.SIMILARITY) return { score: 0, bindings: null };

    const score = Math.min(1.0, sim);

    return { score, bindings };
  }

  /**
   * Extract hypothesis (condition) from rule
   * @private
   */
  extractHypothesis(rule, bindings = null) {
    if (rule.conditionAST) {
      const grounded = bindings ? this.groundAst(rule.conditionAST, bindings) : null;
      return grounded?.toString?.() || grounded || rule.conditionAST.toString?.() || 'condition';
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
  findCausalChains(observation) {
    const explanations = [];

    const observedEvent = this.extractObservedEvent(observation);
    if (!observedEvent) return explanations;

    const componentKB = this.session?.componentKB;
    const causeFacts = componentKB
      ? componentKB.findByOperator('causes')
      : (this.session.kbFacts || []).map(f => f?.metadata).filter(m => m?.operator === 'causes');

    const reverse = new Map(); // effect -> Set(cause)
    for (const fact of causeFacts) {
      const args = fact?.args || [];
      const cause = args[0];
      const effect = args[1];
      if (!cause || !effect) continue;
      if (!reverse.has(effect)) reverse.set(effect, new Set());
      reverse.get(effect).add(cause);
    }

    const MAX_DEPTH = 6;
    const MAX_EXPLANATIONS = 6;

    const queue = [{ node: observedEvent, path: [observedEvent] }];
    const visited = new Set([observedEvent]);

    while (queue.length > 0 && explanations.length < MAX_EXPLANATIONS) {
      const { node, path } = queue.shift();
      const depth = path.length - 1;
      if (depth >= MAX_DEPTH) continue;

      const causes = reverse.get(node);
      if (!causes) continue;
      for (const c of causes) {
        if (path.includes(c)) continue;
        const nextPath = [c, ...path];
        const score = Math.max(0.4, 0.9 - ((nextPath.length - 2) * 0.07));
        explanations.push({
          type: 'causal',
          hypothesis: `${c} causes ${observedEvent}`,
          cause: c,
          effect: observedEvent,
          score,
          steps: [`Causal path: ${nextPath.join(' → ')}`],
          explanation: `Causal path: ${nextPath.join(' → ')}`
        });

        if (!visited.has(c)) {
          visited.add(c);
          queue.push({ node: c, path: nextPath });
        }
      }
    }

    // Prefer shorter paths.
    explanations.sort((a, b) => b.score - a.score);
    return explanations.slice(0, MAX_EXPLANATIONS);
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

  extractObservedEvent(observation) {
    if (!observation || typeof observation !== 'object') return null;
    const op = observation.operator?.name || observation.operator?.value;
    const args = observation.args || [];

    if (op === 'observed' && args.length >= 1) {
      const a0 = args[0];
      return a0?.name || a0?.value || null;
    }

    // Treat arity-0 statements as atomic events (e.g., WetGrass).
    if (op && Array.isArray(args) && args.length === 0) return op;

    // Otherwise, abduction-by-causality is undefined unless a theory maps the structured proposition.
    return null;
  }

  statementToString(stmt) {
    if (!stmt || typeof stmt !== 'object') return '';
    const op = stmt.operator?.name || stmt.operator?.value || '';
    const args = Array.isArray(stmt.args) ? stmt.args.map(a => a?.name || a?.value || '').filter(Boolean) : [];
    return `${op}${args.length > 0 ? ` ${args.join(' ')}` : ''}`.trim();
  }

  groundAst(ast, bindings) {
    if (!ast || typeof ast !== 'object' || !(bindings instanceof Map)) return null;

    const clone = (node) => {
      if (!node || typeof node !== 'object') return node;
      if (node.type === 'Hole') {
        const bound = bindings.get(node.name);
        return bound || node;
      }
      if (node.type === 'Statement') {
        return {
          ...node,
          operator: clone(node.operator),
          args: Array.isArray(node.args) ? node.args.map(clone) : []
        };
      }
      if (node.type === 'Identifier' || node.type === 'Literal' || node.type === 'Reference') return node;
      return node;
    };

    const grounded = clone(ast);
    if (grounded?.type !== 'Statement') return grounded;
    return this.statementToString(grounded);
  }

  /**
   * Find analogical explanations from similar KB facts
   * Requires higher similarity threshold since analogy is weaker evidence
   * @private
   */
  findAnalogicalExplanations(obsVec, minSim) {
    const explanations = [];

    // Require higher threshold for analogical reasoning (strategy-dependent)
    const analogyThreshold = Math.max(this.thresholds.ANALOGY_MIN, minSim);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      if (!fact.vector) continue;

      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(fact.vector, obsVec);
      if (sim > analogyThreshold && sim < this.thresholds.ANALOGY_MAX) { // Not exact match but strongly similar
        const meta = fact.metadata;
        if (meta?.operator && meta?.args) {
          explanations.push({
            type: 'analogical',
            hypothesis: `Similar to: ${meta.operator} ${meta.args.join(' ')}`,
            similarFact: fact.name || 'anonymous',
            score: sim * this.thresholds.ANALOGY_DISCOUNT, // Discount for analogy
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
