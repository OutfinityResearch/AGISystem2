/**
 * ProofEngine main proof loop implementation.
 *
 * Kept small by delegating helper logic to:
 * - `src/reasoning/prove/prove-goal-exists.mjs`
 * - `src/reasoning/prove/prove-goal-negation.mjs`
 */

import { proveExistsGoal, tryProveNotExistsViaTypeDisjointness } from './prove-goal-exists.mjs';
import {
  buildStatementFromStrings,
  tryRuleDerivedNot,
  tryRuleDerivedNotFromCompoundConclusion,
  tryContrapositiveNot
} from './prove-goal-negation.mjs';

function opName(expr) {
  if (!expr) return null;
  return expr.operator?.name || expr.operator?.value || expr.name || expr.value || null;
}

export function proveGoal(self, goal, depth) {
  if (self.isTimedOut()) {
    throw new Error('Proof timed out');
  }
  self.incrementSteps();
  if (self.reasoningSteps > self.maxSteps) {
    return { valid: false, reason: 'Step limit exceeded' };
  }
  if (depth > self.options.maxDepth) {
    return { valid: false, reason: 'Depth limit exceeded' };
  }

  const goalStr = goal.toString();
  const goalOp = self.extractOperatorName(goal);

  // Cycle detection must be order-sensitive.
  // HDC vectors are commutative under XOR binding, so swapped args can hash identically.
  const goalKey = `goalStr:${goalStr}`;
  if (self.visited.has(goalKey)) return { valid: false, reason: 'Cycle detected' };
  self.visited.add(goalKey);

  try {
    if (goalOp === 'Exists') {
      return proveExistsGoal(self, goalStr, goal, depth, proveGoal);
    }

    const goalVec = self.session.executor.buildStatementVector(goal);

    const goalArgs = (goal.args || []).map(a => self.extractArgName(a)).filter(Boolean);
    const goalFactExists = goalOp ? self.factExists(goalOp, goalArgs[0], goalArgs[1]) : false;

    if (goalOp === 'Not' && Array.isArray(goal.args) && goal.args.length === 1) {
      const innerExpr = goal.args[0];
      if (innerExpr?.type === 'Compound' && opName(innerExpr.operator) === 'Exists') {
        const disjoint = tryProveNotExistsViaTypeDisjointness(self, goalStr, innerExpr);
        if (disjoint.valid) return disjoint;
      }

      const meta = self.session.executor.extractMetadataWithNotExpansion(goal, 'Not');
      const innerOp = meta?.innerOperator;
      const innerArgs = meta?.innerArgs;

      if (innerOp && Array.isArray(innerArgs)) {
        for (const fact of self.session.kbFacts) {
          const fm = fact.metadata;
          if (fm?.operator !== 'Not') continue;
          if (fm.innerOperator !== innerOp) continue;
          if (!Array.isArray(fm.innerArgs) || fm.innerArgs.length !== innerArgs.length) continue;
          let ok = true;
          for (let i = 0; i < innerArgs.length; i++) {
            if (fm.innerArgs[i] !== innerArgs[i]) { ok = false; break; }
          }
          if (ok) {
            return {
              valid: true,
              method: 'explicit_negation',
              confidence: self.thresholds.STRONG_MATCH,
              goal: goalStr,
              steps: [{ operation: 'not_fact', fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim() }]
            };
          }
        }

        const derived = tryRuleDerivedNot(self, innerOp, innerArgs, depth);
        if (derived.valid) {
          derived.goal = goalStr;
          return derived;
        }

        const derivedCompound = tryRuleDerivedNotFromCompoundConclusion(self, innerOp, innerArgs, depth);
        if (derivedCompound.valid) {
          derivedCompound.goal = goalStr;
          return derivedCompound;
        }

        const contra = tryContrapositiveNot(self, innerOp, innerArgs, depth, proveGoal);
        if (contra.valid) {
          contra.goal = goalStr;
          return contra;
        }

        const innerStmt = buildStatementFromStrings(innerOp, innerArgs);
        const innerResult = proveGoal(self, innerStmt, depth + 1);
        if (!innerResult.valid && self.session.closedWorldAssumption) {
          return {
            valid: true,
            method: 'closed_world_assumption',
            confidence: self.thresholds.CONDITION_CONFIDENCE,
            goal: goalStr,
            steps: [
              ...(innerResult.steps || []),
              { operation: 'cwa_negation', fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim() }
            ]
          };
        }

        if (!innerResult.valid && !self.session.closedWorldAssumption) {
          return {
            valid: false,
            reason: 'Not goal requires explicit negation (open world)',
            goal: goalStr,
            steps: self.steps
          };
        }

        return {
          valid: false,
          reason: 'Not goal failed - inner is provable',
          goal: goalStr,
          steps: self.steps
        };
      }
    }

    if (self.options.ignoreNegation !== true) {
      const negationInfo = self.checkGoalNegation(goal);
      if (negationInfo.negated) {
        const searchTrace = self.options.includeSearchTrace ? self.buildNegationSearchTrace(goal, negationInfo) : null;
        return {
          valid: false,
          reason: 'Goal is negated',
          goal: goalStr,
          searchTrace,
          steps: self.steps
        };
      }
    }

    const directResult = self.kbMatcher.tryDirectMatch(goalVec, goalStr);
    const directMatchTrusted = directResult.valid && goalFactExists;
    if (directMatchTrusted && directResult.confidence > self.thresholds.VERY_STRONG_MATCH) {
      directResult.steps = [{ operation: 'direct_match', fact: self.goalToFact(goal) }];
      return directResult;
    }
    if (goalFactExists) {
      return {
        valid: true,
        method: 'direct_metadata',
        confidence: self.thresholds.STRONG_MATCH,
        goal: goalStr,
        steps: [{ operation: 'direct_fact', fact: self.goalToFact(goal) }]
      };
    }

    const symmetricResult = self.symmetric?.trySymmetric ? self.symmetric.trySymmetric(goal, depth) : { valid: false };
    if (symmetricResult.valid) {
      return symmetricResult;
    }

    const inverseResult = self.inverse?.tryInverse ? self.inverse.tryInverse(goal, depth) : { valid: false };
    if (inverseResult.valid) {
      return inverseResult;
    }

    const synonymResult = self.trySynonymMatch(goal, depth);
    if (synonymResult.valid) {
      return synonymResult;
    }

    const transitiveResult = self.transitive.tryTransitiveChain(goal, depth);
    if (transitiveResult.valid) {
      return transitiveResult;
    }

    const inheritanceResult = self.propertyInheritance.tryPropertyInheritance(goal, depth);
    if (inheritanceResult.valid) {
      return inheritanceResult;
    }

    const defaultResult = self.tryDefaultReasoning(goal, depth);
    if (defaultResult.valid) {
      return defaultResult;
    }
    if (defaultResult.definitive) {
      return defaultResult;
    }

    const modusResult = self.tryImplicationModusPonens(goal, depth);
    if (modusResult.valid) {
      return modusResult;
    }

    const candidateRules = self.getRulesByConclusionOp ? self.getRulesByConclusionOp(goalOp) : self.session.rules;
    for (const rule of candidateRules) {
      self.session.reasoningStats.ruleAttempts++;
      const ruleResult = self.kbMatcher.tryRuleMatch(goal, rule, depth);
      if (ruleResult.valid) {
        return ruleResult;
      }
    }

    if (directMatchTrusted && directResult.confidence > self.thresholds.STRONG_MATCH) {
      const entityArg = goal.args?.[0] ? self.extractArgName(goal.args[0]) : null;
      const componentKB = self.session?.componentKB;

      const entityExists = entityArg && componentKB && (
        componentKB.findByArg0(entityArg, false).length > 0 ||
        componentKB.findByArg1(entityArg, false).length > 0
      );

      if (entityExists) {
        directResult.steps = [{ operation: 'weak_match', fact: self.goalToFact(goal) }];
        return directResult;
      }
    }

    const disjointResult = self.disjoint.tryDisjointProof(goal, depth);
    if (disjointResult.valid) {
      return disjointResult;
    }

    const searchTrace = self.options.includeSearchTrace ? self.buildSearchTrace(goal, goalStr) : null;

    return {
      valid: false,
      reason: 'No proof found',
      goal: goalStr,
      searchTrace,
      steps: self.steps
    };
  } finally {
    self.visited.delete(goalKey);
  }
}
