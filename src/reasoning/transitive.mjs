/**
 * AGISystem2 - Transitive Reasoning Module
 * @module reasoning/transitive
 *
 * Handles transitive chain proofs for relations like isA, locatedIn, partOf.
 * Relation properties are loaded from config/Core/00-relations.sys2
 */

import { getThresholds } from '../core/constants.mjs';
import { DEFAULT_SEMANTIC_INDEX } from '../runtime/semantic-index.mjs';

/**
 * Transitive relations that support chaining
 * Loaded from config/Core/00-relations.sys2
 */
export const TRANSITIVE_RELATIONS = DEFAULT_SEMANTIC_INDEX.transitiveRelations;

/**
 * Reserved words to exclude from intermediates
 */
export const RESERVED_WORDS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
  'True', 'False', 'forall', 'exists', 'implies', 'and', 'or', 'not'
]);

/**
 * Transitive reasoning engine
 */
export class TransitiveReasoner {
  constructor(proofEngine) {
    this.engine = proofEngine;
    // Get strategy-dependent thresholds
    const strategy = proofEngine.session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
  }

  get session() {
    return this.engine.session;
  }

  get options() {
    return this.engine.options;
  }

  /**
   * Try transitive chain for supported relations
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryTransitiveChain(goal, depth) {
    const operatorName = this.engine.extractOperatorName(goal);
    const isTransitive =
      (this.session?.semanticIndex?.isTransitive?.(operatorName)) ??
      (operatorName ? TRANSITIVE_RELATIONS.has(operatorName) : false);

    if (!operatorName || !isTransitive) {
      return { valid: false };
    }

    if (!goal.args || goal.args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.engine.extractArgName(goal.args[0]);
    const objectName = this.engine.extractArgName(goal.args[1]);
    if (!subjectName || !objectName) {
      return { valid: false };
    }

    const intermediates = this.findIntermediates(operatorName, subjectName);

    for (const intermediate of intermediates) {
      if (this.engine.isTimedOut()) {
        throw new Error('Proof timed out');
      }

      this.session.reasoningStats.transitiveSteps++;

      if (intermediate === objectName) {
        const stepFact = `${operatorName} ${subjectName} ${objectName}`;
        this.engine.logStep('transitive_found', stepFact);
        return {
          valid: true,
          method: 'transitive_direct',
          confidence: this.thresholds.TRANSITIVE_BASE,
          goal: goal.toString(),
          steps: [{ operation: 'transitive_found', fact: stepFact }]
        };
      }

      const chainResult = this.proveTransitiveStep(
        operatorName, intermediate, objectName, depth + 1
      );

      if (chainResult.valid) {
        const stepFact = `${operatorName} ${subjectName} ${intermediate}`;
        this.engine.logStep('transitive_step', stepFact);
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * this.thresholds.TRANSITIVE_DECAY,
          goal: goal.toString(),
          steps: [
            { operation: 'transitive_step', fact: stepFact },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Prove a single transitive step
   * @param {string} operatorName - Relation operator
   * @param {string} from - Source entity
   * @param {string} to - Target entity
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  proveTransitiveStep(operatorName, from, to, depth) {
    if (this.engine.isTimedOut()) {
      throw new Error('Proof timed out');
    }

    this.engine.incrementSteps();
    if (this.engine.reasoningSteps > this.engine.maxSteps) {
      return { valid: false, reason: 'Step limit' };
    }

    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    const cycleKey = `${operatorName}:${from}:${to}`;
    if (this.engine.visited.has(cycleKey)) {
      return { valid: false, reason: 'Cycle' };
    }
    this.engine.visited.add(cycleKey);

    // Direct match using metadata
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      if (fact.metadata?.operator === operatorName &&
          fact.metadata.args?.[0] === from &&
          fact.metadata.args?.[1] === to) {
        const stepFact = `${operatorName} ${from} ${to}`;
        return {
          valid: true,
          method: 'direct',
          confidence: this.thresholds.TRANSITIVE_BASE,
          steps: [{ operation: 'transitive_match', fact: stepFact }]
        };
      }
    }

    // Try further chaining
    const nextIntermediates = this.findIntermediates(operatorName, from);
    for (const next of nextIntermediates) {
      this.session.reasoningStats.transitiveSteps++;

      if (next === to) {
        const stepFact = `${operatorName} ${from} ${next}`;
        return {
          valid: true,
          method: 'transitive_found',
          confidence: this.thresholds.RULE_CONFIDENCE,
          steps: [{ operation: 'transitive_found', fact: stepFact }]
        };
      }

      const chainResult = this.proveTransitiveStep(operatorName, next, to, depth + 1);
      if (chainResult.valid) {
        const stepFact = `${operatorName} ${from} ${next}`;
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * this.thresholds.TRANSITIVE_DECAY,
          steps: [
            { operation: 'transitive_step', fact: stepFact },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find intermediate values for transitive relation
   * @param {string} operatorName - Relation operator
   * @param {string} subjectName - Subject entity
   * @returns {Array<string>} List of intermediate values
   */
  findIntermediates(operatorName, subjectName) {
    const intermediates = [];

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== operatorName) continue;
      if (!meta.args || meta.args.length < 2) continue;
      if (meta.args[0] !== subjectName) continue;

      const intermediate = meta.args[1];
      if (!intermediate) continue;
      if (RESERVED_WORDS.has(intermediate)) continue;
      if (intermediate === subjectName || intermediate === operatorName) continue;

      if (!intermediates.includes(intermediate)) {
        intermediates.push(intermediate);
      }
    }

    return intermediates;
  }

  /**
   * Find all transitive targets reachable from subject
   * E.g., for "isA Poodle ?x", returns [{value: 'Dog', steps: [...]}, ...]
   * @param {string} operatorName - Relation operator
   * @param {string} subject - Subject entity
   * @param {Set} visited - Already visited entities
   * @returns {Array} List of targets with proof steps
   */
  findAllTransitiveTargets(operatorName, subject, visited = new Set()) {
    const targets = [];
    if (visited.has(subject)) return targets;
    visited.add(subject);

    const directTargets = this.findIntermediates(operatorName, subject);

    for (const target of directTargets) {
      targets.push({
        value: target,
        steps: [{ operation: 'transitive_step', fact: `${operatorName} ${subject} ${target}` }]
      });

      const furtherTargets = this.findAllTransitiveTargets(operatorName, target, visited);
      for (const further of furtherTargets) {
        targets.push({
          value: further.value,
          steps: [
            { operation: 'transitive_step', fact: `${operatorName} ${subject} ${target}` },
            ...further.steps
          ]
        });
      }
    }

    return targets;
  }

  /**
   * Try transitive reasoning for a condition string
   * @param {string} condStr - Condition string "op subject target"
   * @returns {Object} Proof result
   */
  tryTransitiveForCondition(condStr) {
    const parts = condStr.split(/\s+/);
    if (parts.length !== 3) return { valid: false };

    const [op, subject, target] = parts;
    const isTransitive =
      (this.session?.semanticIndex?.isTransitive?.(op)) ??
      (op ? TRANSITIVE_RELATIONS.has(op) : false);
    if (!isTransitive) return { valid: false };

    const simpleGoal = {
      operator: { name: op },
      args: [
        { type: 'Identifier', name: subject },
        { type: 'Identifier', name: target }
      ],
      toString: () => condStr
    };

    const savedVisited = new Set(this.engine.visited);
    const result = this.tryTransitiveChain(simpleGoal, 0);
    this.engine.visited = savedVisited;

    return result;
  }
}

export default TransitiveReasoner;
