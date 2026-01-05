/**
 * ProofEngine explicit-negation checks.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

import { buildNegationSearchTrace as buildNegationSearchTraceImpl } from '../prove-search-trace.mjs';

export function checkGoalNegation(self, goal) {
  const goalOp = self.extractOperatorName(goal);
  const goalArgs = (goal.args || []).map(a => self.extractArgName(a)).filter(Boolean);
  if (!goalOp) return { negated: false };

  const canon = (name) => {
    if (!self.session?.canonicalizationEnabled) return name;
    return self.session.componentKB?.canonicalizeName?.(name) || name;
  };

  for (const fact of self.session.kbFacts) {
    const meta = fact.metadata;
    if (!meta) continue;

    if (meta.operator !== 'Not' && meta.operator !== '___Not') continue;

    if (meta.innerOperator && meta.innerArgs) {
      const innerFactText = `${meta.innerOperator} ${meta.innerArgs.join(' ')}`;

      const innerOp = canon(meta.innerOperator);
      const innerArgs = Array.isArray(meta.innerArgs) ? meta.innerArgs.map(canon) : [];
      const gOp = canon(goalOp);
      const gArgs = goalArgs.map(canon);

      const match =
        gOp === innerOp &&
        gArgs.length === innerArgs.length &&
        gArgs.every((a, i) => a === innerArgs[i]);

      if (match) {
        return {
          negated: true,
          negationRef: innerFactText,
          negationType: 'explicit',
          innerOperator: meta.innerOperator,
          innerArgs: meta.innerArgs
        };
      }
    }

    const negatedRef = meta.args?.[0];
    if (!negatedRef || typeof negatedRef !== 'string') continue;

    const goalVec = self.session.executor.buildStatementVector(goal);
    if (!goalVec) continue;
    const refName = negatedRef.replace('$', '');
    let negatedVec = self.session.scope.get(refName);
    if (!negatedVec && self.session.vocabulary.has(refName)) {
      negatedVec = self.session.vocabulary.get(refName);
    }

    if (negatedVec) {
      self.session.reasoningStats.similarityChecks++;
      const sim = self.session.similarity(goalVec, negatedVec);
      if (sim > self.thresholds.RULE_MATCH) {
        return {
          negated: true,
          negationRef: refName,
          negationType: 'explicit'
        };
      }
    }
  }

  return { negated: false };
}

export function buildNegationSearchTrace(self, goal, negationInfo) {
  return buildNegationSearchTraceImpl(self, goal, negationInfo);
}

export function isGoalNegated(self, goal) {
  const result = self.checkGoalNegation(goal);
  return result.negated;
}

