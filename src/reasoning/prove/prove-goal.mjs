/**
 * ProofEngine main proof loop implementation.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

import { Statement, Identifier, Compound } from '../../parser/ast.mjs';

function opName(expr) {
  if (!expr) return null;
  return expr.operator?.name || expr.operator?.value || expr.name || expr.value || null;
}

function isIdentifier(expr, name) {
  if (!expr) return false;
  const n = expr.name || expr.value || null;
  return expr.type === 'Identifier' && n === name;
}

function isHole(expr) {
  return expr?.type === 'Hole';
}

function instantiateExpr(expr, varName, value) {
  if (!expr) return null;
  if (expr.type === 'Hole' && expr.name === varName) {
    return new Identifier(value);
  }
  if (expr.type === 'Identifier') return new Identifier(expr.name);
  if (expr.type === 'Literal') return expr;
  if (expr.type === 'Compound') {
    const op = new Identifier(opName(expr.operator));
    const args = (expr.args || []).map(a => instantiateExpr(a, varName, value)).filter(Boolean);
    return new Compound(op, args);
  }
  if (expr.type === 'Statement') {
    const op = new Identifier(opName(expr.operator));
    const args = (expr.args || []).map(a => instantiateExpr(a, varName, value)).filter(Boolean);
    return new Statement(null, op, args);
  }
  return null;
}

function buildStatementFromCompound(comp) {
  if (!comp || comp.type !== 'Compound') return null;
  const op = opName(comp.operator);
  if (!op) return null;
  const args = [];
  for (const a of comp.args || []) {
    if (a.type === 'Identifier') args.push(new Identifier(a.name));
    else if (a.type === 'Literal') args.push(a);
    else return null;
  }
  return new Statement(null, new Identifier(op), args);
}

function collectEntitiesByType(session, typeName) {
  const out = new Set();
  const componentKB = session?.componentKB;
  if (componentKB) {
    const facts = componentKB.findByOperatorAndArg1?.('isA', typeName) || [];
    for (const f of facts) {
      if (f?.args?.[0]) out.add(f.args[0]);
    }
    return [...out];
  }
  for (const fact of session.kbFacts || []) {
    const meta = fact?.metadata;
    if (meta?.operator === 'isA' && meta.args?.[1] === typeName && meta.args?.[0]) out.add(meta.args[0]);
  }
  return [...out];
}

function collectEntityDomain(session) {
  const componentKB = session?.componentKB;
  if (componentKB) {
    const entities = new Set();
    for (const f of componentKB.facts || []) {
      for (const a of f.args || []) {
        if (a && !String(a).startsWith('?')) entities.add(a);
      }
    }
    return [...entities];
  }
  const entities = new Set();
  for (const fact of session.kbFacts || []) {
    const args = fact?.metadata?.args || [];
    for (const a of args) {
      if (a && !String(a).startsWith('?')) entities.add(a);
    }
  }
  return [...entities];
}

function buildTypeImplicationIndex(session) {
  const pos = new Map(); // A -> B
  const neg = new Map(); // A -> Not(B)

  const addEdge = (map, from, to) => {
    if (!from || !to) return;
    const s = map.get(from) || new Set();
    s.add(to);
    map.set(from, s);
  };

  for (const rule of session.rules || []) {
    const condLeaves = extractLeafAsts(rule.conditionParts, []);
    const condAst = condLeaves.length === 1 ? condLeaves[0] : rule.conditionAST;
    const antOperator = (condAst?.operator?.name || condAst?.operator?.value || null);
    if (antOperator !== 'isA') continue;
    const antArgs = (condAst?.args || []);
    if (antArgs.length !== 2 || !isHole(antArgs[0]) || antArgs[1].type !== 'Identifier') continue;
    const fromType = antArgs[1].name;

    const concParts = rule.conclusionParts;
    if (concParts) {
      const concLeaves = extractLeafAsts(concParts, []);
      for (const leaf of concLeaves) {
        const op = leaf?.operator?.name || leaf?.operator?.value || null;
        if (op !== 'isA') continue;
        const args = leaf.args || [];
        if (args.length !== 2 || !isHole(args[0]) || args[1].type !== 'Identifier') continue;
        addEdge(pos, fromType, args[1].name);
      }

      if (concParts.type === 'Not') {
        const inner = concParts.inner;
        if (inner?.type === 'leaf' && inner.ast) {
          const innerAst = inner.ast;
          const op = innerAst?.operator?.name || innerAst?.operator?.value || null;
          if (op === 'isA') {
            const args = innerAst.args || [];
            if (args.length === 2 && isHole(args[0]) && args[1].type === 'Identifier') {
              addEdge(neg, fromType, args[1].name);
            }
          }
        }
      }
    } else if (rule.conclusionAST) {
      const leaf = rule.conclusionAST;
      const op = leaf?.operator?.name || leaf?.operator?.value || null;
      if (op === 'isA') {
        const args = leaf.args || [];
        if (args.length === 2 && isHole(args[0]) && args[1].type === 'Identifier') {
          addEdge(pos, fromType, args[1].name);
        }
      }
    }
  }

  return { pos, neg };
}

function computeReachability(index, startType) {
  const reachable = new Set();
  const impliedNeg = new Set();
  const queue = [startType];
  reachable.add(startType);

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const n of index.neg.get(cur) || []) impliedNeg.add(n);
    for (const next of index.pos.get(cur) || []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  return { reachable, impliedNeg };
}

function collectIsAConstraints(expr, varName, out = { required: [], forbidden: [] }) {
  if (!expr) return out;
  if (expr.type !== 'Compound') return out;
  const op = opName(expr.operator);
  if (!op) return out;

  if (op === 'And') {
    for (const a of expr.args || []) collectIsAConstraints(a, varName, out);
    return out;
  }
  if (op === 'Not' && (expr.args || []).length === 1) {
    const inner = expr.args[0];
    if (inner?.type === 'Compound' && opName(inner.operator) === 'isA') {
      const args = inner.args || [];
      if (args.length === 2 && args[0]?.type === 'Hole' && args[0].name === varName && args[1]?.type === 'Identifier') {
        out.forbidden.push(args[1].name);
      }
    }
    return out;
  }
  if (op === 'isA') {
    const args = expr.args || [];
    if (args.length === 2 && args[0]?.type === 'Hole' && args[0].name === varName && args[1]?.type === 'Identifier') {
      out.required.push(args[1].name);
    }
  }
  return out;
}

function tryProveNotExistsViaTypeDisjointness(self, goalStr, existsExpr) {
  if (!existsExpr || existsExpr.type !== 'Compound') return { valid: false };
  if (opName(existsExpr.operator) !== 'Exists') return { valid: false };
  const args = existsExpr.args || [];
  if (args.length < 2 || !isHole(args[0])) return { valid: false };
  const varName = args[0].name;
  const predicate = args[1];
  if (!predicate || predicate.type !== 'Compound') return { valid: false };

  const constraints = collectIsAConstraints(predicate, varName);
  const required = [...new Set(constraints.required)];
  const forbidden = new Set(constraints.forbidden);

  // Immediate contradiction: requires and forbids the same type.
  for (const t of required) {
    if (forbidden.has(t)) {
      return {
        valid: true,
        method: 'quantifier_unsat',
        confidence: self.thresholds.CONDITION_CONFIDENCE,
        goal: goalStr,
        steps: [{ operation: 'unsat_constraints', detail: `Exists ${varName}: requires and forbids ${t}` }]
      };
    }
  }

  if (required.length < 2) return { valid: false };

  const index = buildTypeImplicationIndex(self.session);
  for (let i = 0; i < required.length; i++) {
    for (let j = i + 1; j < required.length; j++) {
      const a = required[i];
      const b = required[j];
      const ra = computeReachability(index, a);
      const rb = computeReachability(index, b);
      const aImpliesNot = [...ra.impliedNeg];
      const bImpliesNot = [...rb.impliedNeg];

      const aDisjointB = ra.reachable.has(b) ? aImpliesNot.includes(b) : false;
      const bDisjointA = rb.reachable.has(a) ? bImpliesNot.includes(a) : false;

      const aHitsB = [...rb.reachable].some(t => ra.impliedNeg.has(t));
      const bHitsA = [...ra.reachable].some(t => rb.impliedNeg.has(t));

      if (aDisjointB || bDisjointA || aHitsB || bHitsA) {
        return {
          valid: true,
          method: 'quantifier_type_disjointness',
          confidence: self.thresholds.CONDITION_CONFIDENCE,
          goal: goalStr,
          steps: [{ operation: 'type_disjointness', detail: `No ${a} can also be ${b} (derived from rules)` }]
        };
      }
    }
  }

  return { valid: false };
}

function proveExistsGoal(self, goalStr, goal, depth) {
  const args = goal.args || [];
  if (args.length < 2 || !isHole(args[0])) {
    return { valid: false, reason: 'Malformed Exists goal', goal: goalStr };
  }
  const varName = args[0].name;
  const predicate = args[1];
  if (!predicate || predicate.type !== 'Compound') {
    return { valid: false, reason: 'Exists predicate missing', goal: goalStr };
  }

  const constraints = collectIsAConstraints(predicate, varName);
  const requiredTypes = [...new Set(constraints.required)];

  let candidates = [];
  if (requiredTypes.length > 0) {
    candidates = collectEntitiesByType(self.session, requiredTypes[0]);
    for (let i = 1; i < requiredTypes.length; i++) {
      const next = new Set(collectEntitiesByType(self.session, requiredTypes[i]));
      candidates = candidates.filter(e => next.has(e));
    }
  } else {
    candidates = collectEntityDomain(self.session);
  }

  const MAX_CANDIDATES = 200;
  candidates = candidates.slice(0, MAX_CANDIDATES);

  const provePredicate = (expr, entity) => {
    if (!expr) return { valid: false };
    if (expr.type !== 'Compound') return { valid: false };
    const op = opName(expr.operator);
    if (!op) return { valid: false };

    if (op === 'And') {
      const sub = expr.args || [];
      const steps = [];
      for (const a of sub) {
        const res = provePredicate(a, entity);
        if (!res.valid) return { valid: false };
        steps.push(...(res.steps || []));
      }
      return { valid: true, steps };
    }
    if (op === 'Or') {
      for (const a of expr.args || []) {
        const res = provePredicate(a, entity);
        if (res.valid) return res;
      }
      return { valid: false };
    }
    if (op === 'Not') {
      const inner = expr.args?.[0];
      if (!inner || inner.type !== 'Compound') return { valid: false };
      const instInner = instantiateExpr(inner, varName, entity);
      if (!instInner || instInner.type !== 'Compound') return { valid: false };
      const stmt = new Statement(null, new Identifier('Not'), [instInner]);
      const res = proveGoal(self, stmt, depth + 1);
      return { valid: res.valid === true, steps: res.steps || [] };
    }

    const inst = instantiateExpr(expr, varName, entity);
    if (!inst || inst.type !== 'Compound') return { valid: false };
    const stmt = buildStatementFromCompound(inst);
    if (!stmt) return { valid: false };
    const res = proveGoal(self, stmt, depth + 1);
    return { valid: res.valid === true, steps: res.steps || [] };
  };

  for (const entity of candidates) {
    const res = provePredicate(predicate, entity);
    if (res.valid) {
      return {
        valid: true,
        method: 'exists_witness',
        confidence: self.thresholds.CONDITION_CONFIDENCE,
        goal: goalStr,
        steps: [
          { operation: 'exists_witness', variable: varName, entity },
          ...(res.steps || [])
        ]
      };
    }
  }

  return { valid: false, reason: 'No witness found', goal: goalStr };
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

  const goalStr = goal.toString();
  const goalOp = self.extractOperatorName(goal);

  // Quantifiers (Exists/ForAll) are handled structurally (not via vector equality),
  // since their arguments include higher-order expressions.
  const cycleKey = (goalOp === 'Exists' || goalOp === 'ForAll') ? `goalStr:${goalStr}` : null;
  if (cycleKey) {
    if (self.visited.has(cycleKey)) return { valid: false, reason: 'Cycle detected' };
    self.visited.add(cycleKey);
  }

  let goalKey = null;
  try {
    if (goalOp === 'Exists') {
      return proveExistsGoal(self, goalStr, goal, depth);
    }

    const goalVec = self.session.executor.buildStatementVector(goal);
    const goalHash = self.hashVector(goalVec);
    goalKey = `goal:${goalHash}`;
    if (!cycleKey) {
      if (self.visited.has(goalKey)) return { valid: false, reason: 'Cycle detected' };
      self.visited.add(goalKey);
    }

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
    if (cycleKey) self.visited.delete(cycleKey);
    if (goalKey) self.visited.delete(goalKey);
  }
}
