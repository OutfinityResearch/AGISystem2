/**
 * Negation helpers for `proveGoal`.
 *
 * Split out of `src/reasoning/prove/prove-goal.mjs` to keep files <500 LOC.
 */

import { Statement, Identifier, Compound } from '../../parser/ast.mjs';

function buildStatementFromStrings(op, args = []) {
  return new Statement(null, new Identifier(op), args.map(a => new Identifier(a)));
}

function buildNotGoalFromStrings(op, args = []) {
  const inner = new Compound(new Identifier(op), args.map(a => new Identifier(a)));
  return new Statement(null, new Identifier('Not'), [inner]);
}

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

function extractNotLeafAsts(part, out = []) {
  if (!part) return out;
  if (part.type === 'Not') {
    const inner = part.inner;
    if (inner?.type === 'leaf' && inner.ast) out.push(inner.ast);
    else extractNotLeafAsts(inner, out);
    return out;
  }
  if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
    for (const p of part.parts) extractNotLeafAsts(p, out);
  }
  return out;
}

export function tryRuleDerivedNot(self, innerOp, innerArgs, depth) {
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

export function tryRuleDerivedNotFromCompoundConclusion(self, innerOp, innerArgs, depth) {
  for (const rule of self.session.rules || []) {
    const concParts = rule.conclusionParts;
    if (!concParts || (concParts.type !== 'And' && concParts.type !== 'Or')) continue;

    const notLeaves = extractNotLeafAsts(concParts, []);
    if (notLeaves.length === 0) continue;

    for (const ast of notLeaves) {
      const concInnerOp = self.unification.extractOperatorFromAST(ast);
      const concInnerArgs = self.unification.extractArgsFromAST(ast);
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
  }

  return { valid: false };
}

export function tryContrapositiveNot(self, innerOp, innerArgs, depth, proveGoalFn) {
  for (const rule of self.session.rules || []) {
    if (!rule.conditionParts || rule.conditionParts.type !== 'And') continue;

    const condLeaves = extractLeafAsts(rule.conditionParts, []);
    if (condLeaves.length < 2) continue;

    const concLeaves = [];
    if (rule.conclusionParts) extractLeafAsts(rule.conclusionParts, concLeaves);
    else if (rule.conclusionAST) concLeaves.push(rule.conclusionAST);
    if (concLeaves.length === 0) continue;

    for (let targetIdx = 0; targetIdx < condLeaves.length; targetIdx++) {
      const leafAst = condLeaves[targetIdx];
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
        const notConcRes = proveGoalFn(self, notConcGoal, depth + 1);
        if (!notConcRes.valid) continue;

        const otherSteps = [];
        let ok = true;
        for (let i = 0; i < condLeaves.length; i++) {
          if (i === targetIdx) continue;
          const other = condLeaves[i];
          const inst = self.unification.instantiateAST(other, bindings);
          if (!inst || inst.includes('?')) { ok = false; break; }
          const parts = inst.trim().split(/\s+/);
          if (parts.length < 2) { ok = false; break; }
          const stmt = buildStatementFromStrings(parts[0], parts.slice(1));
          const res = proveGoalFn(self, stmt, depth + 1);
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

export { buildStatementFromStrings };
