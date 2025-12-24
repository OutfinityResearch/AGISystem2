/**
 * AGISystem2 - Compound Conditions Module
 * @module reasoning/conditions
 *
 * NOTE: This file is intentionally kept small (<500 LOC).
 * The implementation lives in `src/reasoning/conditions/*`.
 */

import { getThresholds } from '../core/constants.mjs';
import {
  proveInstantiatedCondition,
  proveInstantiatedCompound,
  proveInstantiatedNot,
  proveInstantiatedAnd,
  proveAndWithBacktracking,
  findAllMatches,
  collectEntityDomain,
  findAllNotMatches,
  proveInstantiatedOr,
  proveCompoundPart
} from './conditions/instantiated.mjs';
import {
  proveSingleCondition,
  tryValueTypeInheritance,
  checkIsATransitive,
  proveWithUnboundVars
} from './conditions/single.mjs';
import {
  proveCondition,
  proveSimpleCondition,
  proveCompoundCondition,
  proveNotCondition,
  proveAndCondition,
  proveOrCondition,
  provePart
} from './conditions/rule-conditions.mjs';
import { instantiatePart } from './conditions/utils.mjs';

/**
 * Condition prover with backtracking.
 */
export class ConditionProver {
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

  proveInstantiatedCondition(rule, bindings, depth) {
    return proveInstantiatedCondition(this, rule, bindings, depth);
  }

  proveInstantiatedCompound(condParts, bindings, depth) {
    return proveInstantiatedCompound(this, condParts, bindings, depth);
  }

  proveInstantiatedNot(inner, bindings, depth) {
    return proveInstantiatedNot(this, inner, bindings, depth);
  }

  proveInstantiatedAnd(parts, bindings, depth) {
    return proveInstantiatedAnd(this, parts, bindings, depth);
  }

  proveAndWithBacktracking(parts, partIndex, bindings, accumulatedSteps, depth) {
    return proveAndWithBacktracking(this, parts, partIndex, bindings, accumulatedSteps, depth);
  }

  findAllMatches(part, bindings, depth) {
    return findAllMatches(this, part, bindings, depth);
  }

  collectEntityDomain() {
    return collectEntityDomain(this);
  }

  findAllNotMatches(part, bindings, depth) {
    return findAllNotMatches(this, part, bindings, depth);
  }

  proveInstantiatedOr(parts, bindings, depth) {
    return proveInstantiatedOr(this, parts, bindings, depth);
  }

  proveCompoundPart(part, bindings, depth) {
    return proveCompoundPart(this, part, bindings, depth);
  }

  proveSingleCondition(condStr, bindings, depth) {
    return proveSingleCondition(this, condStr, bindings, depth);
  }

  tryValueTypeInheritance(condStr, depth) {
    return tryValueTypeInheritance(this, condStr, depth);
  }

  checkIsATransitive(child, parent, depth, visited) {
    return checkIsATransitive(this, child, parent, depth, visited);
  }

  proveWithUnboundVars(condStr, bindings, depth) {
    return proveWithUnboundVars(this, condStr, bindings, depth);
  }

  proveCondition(rule, depth) {
    return proveCondition(this, rule, depth);
  }

  proveSimpleCondition(conditionVec, depth) {
    return proveSimpleCondition(this, conditionVec, depth);
  }

  proveCompoundCondition(conditionParts, depth) {
    return proveCompoundCondition(this, conditionParts, depth);
  }

  proveNotCondition(inner, depth) {
    return proveNotCondition(this, inner, depth);
  }

  proveAndCondition(parts, depth) {
    return proveAndCondition(this, parts, depth);
  }

  proveOrCondition(parts, depth) {
    return proveOrCondition(this, parts, depth);
  }

  provePart(part, depth) {
    return provePart(this, part, depth);
  }

  instantiatePart(part, bindings) {
    return instantiatePart(this, part, bindings);
  }
}

export default ConditionProver;

