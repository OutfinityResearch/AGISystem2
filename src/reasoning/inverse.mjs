/**
 * AGISystem2 - Inverse Relation Reasoner
 * @module reasoning/inverse
 *
 * Supports inverse relations declared in config/Core/14-constraints.sys2:
 * inverseRelation R Rinv  =>  R(A,B) <-> Rinv(B,A)
 */

import { getThresholds } from '../core/constants.mjs';
import { Statement, Identifier } from '../parser/ast.mjs';

export class InverseReasoner {
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

  getInverseOperator(op) {
    if (!op) return null;
    const idx = this.session?.semanticIndex;
    if (!idx?.getInverseRelation) return null;
    return idx.getInverseRelation(op) || null;
  }

  tryInverse(goal, depth) {
    const op = this.engine.extractOperatorName(goal);
    const inv = this.getInverseOperator(op);
    if (!inv) return { valid: false };

    if (!goal?.args || goal.args.length !== 2) return { valid: false };
    const a = this.engine.extractArgName(goal.args[0]);
    const b = this.engine.extractArgName(goal.args[1]);
    if (!a || !b) return { valid: false };

    const cycleKey = `inv:${op}:${a}:${b}`;
    if (this.engine.visited.has(cycleKey)) return { valid: false, reason: 'Cycle detected' };
    this.engine.visited.add(cycleKey);
    try {
      if (this.engine.isTimedOut()) throw new Error('Proof timed out');
      if (depth > this.options.maxDepth) return { valid: false, reason: 'Depth limit' };

      // Fast path: inverse fact exists in KB.
      if (this.engine.factExists(inv, b, a)) {
        return {
          valid: true,
          method: 'inverse_direct_metadata',
          confidence: this.thresholds.STRONG_MATCH,
          goal: goal.toString(),
          steps: [
            { operation: 'inverse_reverse_fact', fact: `${inv} ${b} ${a}` },
            { operation: 'inverse_flip', fact: `${op} ${a} ${b}` }
          ]
        };
      }

      const reverseGoal = new Statement(
        null,
        new Identifier(inv),
        [new Identifier(b), new Identifier(a)]
      );

      const reverseRes = this.engine.proveGoal(reverseGoal, depth + 1);
      if (!reverseRes?.valid) return { valid: false };

      return {
        valid: true,
        method: 'inverse_flip',
        confidence: (reverseRes.confidence || this.thresholds.CONDITION_CONFIDENCE) * this.thresholds.CONFIDENCE_DECAY,
        goal: goal.toString(),
        steps: [
          ...(reverseRes.steps || []),
          { operation: 'inverse_flip', fact: `${op} ${a} ${b}` }
        ]
      };
    } finally {
      this.engine.visited.delete(cycleKey);
    }
  }
}

export default InverseReasoner;
