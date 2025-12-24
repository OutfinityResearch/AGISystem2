/**
 * ProofEngine main proof loop implementation.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

import { Statement, Identifier, Compound } from '../../parser/ast.mjs';

function unifyConcreteArgs(concArgs, goalArgs) {
  if (concArgs.length !== goalArgs.length) return null;
  const bindings = new Map();

  for (let i = 0; i < goalArgs.length; i++) {
    const ca = concArgs[i];
    const ga = goalArgs[i];
    if (!ga) return null;

    if (ca?.isVariable) {
      const existing = bindings.get(ca.name);
      if (existing && existing !== ga) return null;
      bindings.set(ca.name, ga);
      continue;
    }

    if (!ca?.name) return null;
    if (ca.name !== ga) return null;
  }

  return bindings;
}

function buildStatementFromStrings(op, args = []) {
  return new Statement(null, new Identifier(op), args.map(a => new Identifier(a)));
}

function buildNotGoalFromStrings(op, args = []) {
  const inner = new Compound(new Identifier(op), args.map(a => new Identifier(a)));
  return new Statement(null, new Identifier('Not'), [inner]);
}

function extractLeafAsts(part, out = []) {
  if (!part) return out;
  if (part.type === 'leaf' && part.ast) {
    out.push(part.ast);
    return out;
  }
  if (part.type === 'Not') return out;
  if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
    for (const p of part.parts) extractLeafAsts(p, out);
  }
  return out;
}

function tryRuleDerivedNot(self, innerOp, innerArgs, depth) {
  for (const rule of self.session.rules || []) {
    const concParts = rule.conclusionParts;
    if (!concParts || concParts.type !== 'Not') continue;
    const inner = concParts.inner;
    if (!inner || inner.type !== 'leaf' || !inner.ast) continue;

    const concInnerOp = self.unification.extractOperatorFromAST(inner.ast);
    const concInnerArgs = self.unification.extractArgsFromAST(inner.ast);
    if (!concInnerOp || concInnerOp !== innerOp) continue;
    if (concInnerArgs.length !== innerArgs.length) continue;

    const bindings = unifyConcreteArgs(concInnerArgs, innerArgs);
    if (!bindings) continue;

    const condResult = self.conditions.proveInstantiatedCondition(rule, bindings, depth + 1);
    if (!condResult.valid) continue;

    self.session.reasoningStats.ruleAttempts++;
    return {
      valid: true,
      method: 'rule_derived_negation',
      confidence: (condResult.confidence || self.thresholds.RULE_CONFIDENCE) * self.thresholds.CONFIDENCE_DECAY,
      steps: [
        { operation: 'rule_match', rule: rule.label || rule.name || rule.source, ruleId: rule.id || null, fact: `Not (${innerOp} ${innerArgs.join(' ')})` },
        ...condResult.steps,
        { operation: 'rule_applied', rule: rule.label || rule.name || rule.source, ruleId: rule.id || null, fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim() }
      ]
    };
  }
  return { valid: false };
}

function tryContrapositiveNot(self, innerOp, innerArgs, depth) {
  for (const rule of self.session.rules || []) {
    if (!rule.conditionParts || rule.conditionParts.type !== 'And') continue;

    const condLeaves = extractLeafAsts(rule.conditionParts, []);
    if (condLeaves.length < 2) continue;

    const concLeaves = [];
    if (rule.conclusionParts) extractLeafAsts(rule.conclusionParts, concLeaves);
    else if (rule.conclusionAST) concLeaves.push(rule.conclusionAST);
    if (concLeaves.length === 0) continue;

    for (const leafAst of condLeaves) {
      const leafOp = self.unification.extractOperatorFromAST(leafAst);
      const leafArgs = self.unification.extractArgsFromAST(leafAst);
      if (!leafOp || leafOp !== innerOp) continue;
      if (leafArgs.length !== innerArgs.length) continue;

      const bindings = unifyConcreteArgs(leafArgs, innerArgs);
      if (!bindings) continue;

      for (const concAst of concLeaves) {
        const concOp = self.unification.extractOperatorFromAST(concAst);
        const concArgs = self.unification.extractArgsFromAST(concAst);
        if (!concOp) continue;

        const concArgVals = concArgs.map(a => a.isVariable ? bindings.get(a.name) : a.name);
        if (concArgVals.some(v => !v)) continue;

        const notConcGoal = buildNotGoalFromStrings(concOp, concArgVals);
        const notConcRes = proveGoal(self, notConcGoal, depth + 1);
        if (!notConcRes.valid) continue;

        const otherSteps = [];
        let ok = true;
        for (const other of condLeaves) {
          if (other === leafAst) continue;
          const inst = self.unification.instantiateAST(other, bindings);
          if (!inst || inst.includes('?')) { ok = false; break; }
          const parts = inst.trim().split(/\s+/);
          if (parts.length < 2) { ok = false; break; }
          const stmt = buildStatementFromStrings(parts[0], parts.slice(1));
          const res = proveGoal(self, stmt, depth + 1);
          if (!res.valid) { ok = false; break; }
          otherSteps.push(...(res.steps || []));
        }
        if (!ok) continue;

        self.session.reasoningStats.ruleAttempts++;
        return {
          valid: true,
          method: 'contrapositive',
          confidence: self.thresholds.CONDITION_CONFIDENCE,
          steps: [
            ...(notConcRes.steps || []),
            ...otherSteps,
            {
              operation: 'rule_application',
              fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim(),
              rule: rule.label || rule.name || rule.source,
              ruleId: rule.id || null,
              inference: 'contrapositive'
            }
          ]
        };
      }
    }
  }
  return { valid: false };
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

  const goalVec = self.session.executor.buildStatementVector(goal);
  const goalHash = self.hashVector(goalVec);
  const goalKey = `goal:${goalHash}`;

  if (self.visited.has(goalKey)) {
    return { valid: false, reason: 'Cycle detected' };
  }
  self.visited.add(goalKey);

  try {
    const goalStr = goal.toString();
    const goalOp = self.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => self.extractArgName(a)).filter(Boolean);
    const goalFactExists = goalOp ? self.factExists(goalOp, goalArgs[0], goalArgs[1]) : false;

    if (goalOp === 'Not' && Array.isArray(goal.args) && goal.args.length === 1) {
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

        const contra = tryContrapositiveNot(self, innerOp, innerArgs, depth);
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

    const negationInfo = self.checkGoalNegation(goal);
    if (negationInfo.negated) {
      const searchTrace = self.buildNegationSearchTrace(goal, negationInfo);
      return {
        valid: false,
        reason: 'Goal is negated',
        goal: goalStr,
        searchTrace,
        steps: self.steps
      };
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

    for (const rule of self.session.rules) {
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

    const searchTrace = self.buildSearchTrace(goal, goalStr);

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
