/**
 * AGISystem2 - Symmetric Relation Reasoner
 * @module reasoning/symmetric
 *
 * Supports symmetric relations declared in config/Core/00-relations.sys2:
 * R(A,B) => R(B,A)
 */

import { getThresholds } from '../core/constants.mjs';
import { Statement, Identifier } from '../parser/ast.mjs';

export class SymmetricReasoner {
  constructor(proofEngine) {
    this.engine = proofEngine;
    const strategy = proofEngine.session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
  }

  get session() {
    return this.engine.session;
  }

  get options() {
    return this.engine.options;
  }

  isSymmetricOperator(name) {
    if (!name) return false;
    if (this.session?.useSemanticIndex && this.session?.semanticIndex?.isSymmetric) {
      return this.session.semanticIndex.isSymmetric(name);
    }
    return false;
  }

  trySymmetric(goal, depth) {
    const op = this.engine.extractOperatorName(goal);
    if (!this.isSymmetricOperator(op)) return { valid: false };

    if (!goal?.args || goal.args.length !== 2) return { valid: false };
    const a = this.engine.extractArgName(goal.args[0]);
    const b = this.engine.extractArgName(goal.args[1]);
    if (!a || !b) return { valid: false };

    // R(A,A) is trivially satisfied under symmetry; treat as reflexive-like shortcut.
    if (a === b) {
      return {
        valid: true,
        method: 'symmetric_reflexive',
        confidence: this.thresholds.STRONG_MATCH,
        goal: goal.toString(),
        steps: [{ operation: 'symmetric_reflexive', fact: `${op} ${a} ${b}` }]
      };
    }

    const cycleKey = `sym:${op}:${a}:${b}`;
    if (this.engine.visited.has(cycleKey)) return { valid: false, reason: 'Cycle detected' };
    this.engine.visited.add(cycleKey);
    try {
      if (this.engine.isTimedOut()) throw new Error('Proof timed out');
      if (depth > this.options.maxDepth) return { valid: false, reason: 'Depth limit' };

      // Fast path: explicit reverse fact exists in KB.
      if (this.engine.factExists(op, b, a)) {
        return {
          valid: true,
          method: 'symmetric_direct_metadata',
          confidence: this.thresholds.STRONG_MATCH,
          goal: goal.toString(),
          steps: [
            { operation: 'symmetric_reverse_fact', fact: `${op} ${b} ${a}` },
            { operation: 'symmetric_flip', fact: `${op} ${a} ${b}` }
          ]
        };
      }

      // Prove the reversed goal and flip.
      const reverseGoal = new Statement(
        null,
        new Identifier(op),
        [new Identifier(b), new Identifier(a)]
      );

      const reverseRes = this.engine.proveGoal(reverseGoal, depth + 1);
      if (!reverseRes?.valid) return { valid: false };

      return {
        valid: true,
        method: 'symmetric_flip',
        confidence: (reverseRes.confidence || this.thresholds.CONDITION_CONFIDENCE) * this.thresholds.CONFIDENCE_DECAY,
        goal: goal.toString(),
        steps: [
          ...(reverseRes.steps || []),
          { operation: 'symmetric_flip', fact: `${op} ${a} ${b}` }
        ]
      };
    } finally {
      this.engine.visited.delete(cycleKey);
    }
  }
}

export default SymmetricReasoner;

