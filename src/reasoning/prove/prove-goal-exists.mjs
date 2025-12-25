/**
 * Exists/quantifier helpers for `proveGoal`.
 *
 * Split out of `src/reasoning/prove/prove-goal.mjs` to keep files <500 LOC.
 */

import { Statement, Identifier, Compound } from '../../parser/ast.mjs';

function opName(expr) {
  if (!expr) return null;
  return expr.operator?.name || expr.operator?.value || expr.name || expr.value || null;
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
    const entities = [];
    for (const k of componentKB.arg0Index?.keys?.() || []) {
      if (!k) continue;
      if (String(k).startsWith('?')) continue;
      entities.push(k);
    }
    return entities;
  }

  const domain = new Set();
  for (const fact of session.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta) continue;
    for (const a of meta.args || []) {
      if (!a) continue;
      if (String(a).startsWith('?')) continue;
      domain.add(a);
    }
  }
  return [...domain];
}

function collectCandidatesFromAtom(session, op, args, varName) {
  const componentKB = session?.componentKB;
  if (!componentKB || typeof componentKB.findByOperatorAndArg1 !== 'function') return null;
  if (!op || !Array.isArray(args) || args.length !== 2) return null;
  const [a0, a1] = args;
  if (a0?.type !== 'Hole' || a0.name !== varName) return null;
  if (a1?.type !== 'Identifier') return null;
  const value = a1.name;
  if (!value) return null;

  const facts = componentKB.findByOperatorAndArg1(op, value);
  if (!facts || facts.length === 0) return [];
  const out = new Set();
  for (const f of facts) {
    const subj = f?.args?.[0];
    if (!subj) continue;
    if (String(subj).startsWith('?')) continue;
    out.add(subj);
  }
  return [...out];
}

function collectCandidatesFromPredicate(session, predicate, varName) {
  if (!predicate || predicate.type !== 'Compound') return null;
  const op = opName(predicate.operator);
  if (!op) return null;

  if (op === 'And') {
    const parts = predicate.args || [];
    let current = null;
    for (const p of parts) {
      if (!p || p.type !== 'Compound') continue;
      const subOp = opName(p.operator);
      if (!subOp) continue;
      if (subOp === 'Not') continue;
      const candidates = collectCandidatesFromAtom(session, subOp, p.args || [], varName);
      if (candidates === null) continue;
      if (current === null) current = new Set(candidates);
      else current = new Set(candidates.filter(x => current.has(x)));
      if (current.size === 0) return [];
    }
    return current ? [...current] : null;
  }

  if (op === 'Not') return null;
  return collectCandidatesFromAtom(session, op, predicate.args || [], varName);
}

function buildTypeImplicationIndex(session) {
  const index = new Map();
  const rules = session?.rules || [];
  for (const rule of rules) {
    const conc = rule.conclusionParts;
    const cond = rule.conditionParts;
    if (!conc || !cond) continue;
    if (conc.type !== 'leaf' || !conc.ast) continue;
    if (cond.type !== 'leaf' || !cond.ast) continue;

    const concOp = conc.ast.operator?.name || conc.ast.operator?.value;
    const condOp = cond.ast.operator?.name || cond.ast.operator?.value;
    if (concOp !== 'isA' || condOp !== 'isA') continue;

    const concArgs = conc.ast.args || [];
    const condArgs = cond.ast.args || [];
    if (concArgs.length !== 2 || condArgs.length !== 2) continue;
    if (!isHole(concArgs[0]) || !isHole(condArgs[0])) continue;
    if (concArgs[0].name !== condArgs[0].name) continue;

    const fromType = condArgs[1]?.name || condArgs[1]?.value;
    const toType = concArgs[1]?.name || concArgs[1]?.value;
    if (!fromType || !toType) continue;

    if (!index.has(fromType)) {
      index.set(fromType, { implies: new Set(), impliedNeg: new Set(), reachable: new Set() });
    }
    index.get(fromType).implies.add(toType);
  }

  // Not(isA x T) conclusions encode disjointness: A -> Not(B) means A disjoint B.
  for (const rule of rules) {
    const conc = rule.conclusionParts;
    const cond = rule.conditionParts;
    if (!conc || !cond) continue;
    if (conc.type !== 'Not' || !conc.inner) continue;
    if (cond.type !== 'leaf' || !cond.ast) continue;
    if (conc.inner.type !== 'leaf' || !conc.inner.ast) continue;

    const concOp = conc.inner.ast.operator?.name || conc.inner.ast.operator?.value;
    const condOp = cond.ast.operator?.name || cond.ast.operator?.value;
    if (concOp !== 'isA' || condOp !== 'isA') continue;

    const concArgs = conc.inner.ast.args || [];
    const condArgs = cond.ast.args || [];
    if (concArgs.length !== 2 || condArgs.length !== 2) continue;
    if (!isHole(concArgs[0]) || !isHole(condArgs[0])) continue;
    if (concArgs[0].name !== condArgs[0].name) continue;

    const fromType = condArgs[1]?.name || condArgs[1]?.value;
    const negType = concArgs[1]?.name || concArgs[1]?.value;
    if (!fromType || !negType) continue;

    if (!index.has(fromType)) {
      index.set(fromType, { implies: new Set(), impliedNeg: new Set(), reachable: new Set() });
    }
    index.get(fromType).impliedNeg.add(negType);
  }

  // Compute reachability closure.
  for (const [t] of index) {
    index.get(t).reachable = computeReachability(index, t);
  }

  return index;
}

function computeReachability(index, startType) {
  const out = new Set();
  const stack = [startType];
  while (stack.length > 0) {
    const t = stack.pop();
    if (!t || out.has(t)) continue;
    out.add(t);
    const next = index.get(t)?.implies || new Set();
    for (const n of next) stack.push(n);
  }
  return out;
}

function collectIsAConstraints(expr, varName, out = { required: [], forbidden: [] }) {
  if (!expr) return out;
  if (expr.type !== 'Compound') return out;

  const isVar = (n) => {
    if (!n) return false;
    if (n.type === 'Hole') return n.name === varName;
    if (n.type === 'Identifier') return n.name === varName || n.name === `?${varName}`;
    return false;
  };

  const op = opName(expr.operator);
  if (op === 'And' || op === 'Or') {
    for (const a of expr.args || []) collectIsAConstraints(a, varName, out);
    return out;
  }
  if (op === 'Not') {
    const inner = expr.args?.[0];
    if (inner && inner.type === 'Compound') {
      const innerOp = opName(inner.operator);
      const innerArgs = inner.args || [];
      if (innerOp === 'isA' && innerArgs.length === 2 && isVar(innerArgs[0])) {
        const t = innerArgs[1]?.name || innerArgs[1]?.value || null;
        if (t) out.forbidden.push(t);
      } else {
        collectIsAConstraints(inner, varName, out);
      }
    }
    return out;
  }

  const args = expr.args || [];
  if (op === 'isA' && args.length === 2 && isVar(args[0])) {
    const t = args[1]?.name || args[1]?.value || null;
    if (t) out.required.push(t);
  }

  return out;
}

export function tryProveNotExistsViaTypeDisjointness(self, goalStr, existsExpr) {
  if (!existsExpr || existsExpr.type !== 'Compound') return { valid: false };
  const args = existsExpr.args || [];
  if (args.length < 2 || !isHole(args[0])) return { valid: false };
  const varName = args[0].name;
  const predicate = args[1];
  if (!predicate || predicate.type !== 'Compound') return { valid: false };

  const constraints = collectIsAConstraints(predicate, varName);
  const requiredTypes = [...new Set(constraints.required)];
  const forbiddenTypes = [...new Set(constraints.forbidden)];
  if (requiredTypes.length === 0 || forbiddenTypes.length === 0) return { valid: false };

  const index = buildTypeImplicationIndex(self.session);

  for (const req of requiredTypes) {
    for (const forb of forbiddenTypes) {
      const ra = index.get(req);
      const rb = index.get(forb);
      if (!ra || !rb) continue;

      const aDisjointB = ra.impliedNeg.has(forb);
      const bDisjointA = rb.impliedNeg.has(req);

      const aHitsB = [...rb.reachable].some(t => ra.impliedNeg.has(t));
      const bHitsA = [...ra.reachable].some(t => rb.impliedNeg.has(t));

      if (aDisjointB || bDisjointA || aHitsB || bHitsA) {
        return {
          valid: true,
          method: 'quantifier_type_disjointness',
          confidence: self.thresholds.CONDITION_CONFIDENCE,
          goal: goalStr,
          steps: [{ operation: 'type_disjointness', detail: `No ${req} can also be ${forb} (derived from rules)` }]
        };
      }
    }
  }

  return { valid: false };
}

export function proveExistsGoal(self, goalStr, goal, depth, proveGoalFn) {
  if (self.isTimedOut()) {
    throw new Error('Proof timed out');
  }
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
    const fromPredicate = collectCandidatesFromPredicate(self.session, predicate, varName);
    candidates = Array.isArray(fromPredicate) && fromPredicate.length > 0
      ? fromPredicate
      : collectEntityDomain(self.session);
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
      const res = proveGoalFn(self, stmt, depth + 1);
      return { valid: res.valid === true, steps: res.steps || [] };
    }

    const inst = instantiateExpr(expr, varName, entity);
    if (!inst || inst.type !== 'Compound') return { valid: false };
    const stmt = buildStatementFromCompound(inst);
    if (!stmt) return { valid: false };
    const res = proveGoalFn(self, stmt, depth + 1);
    return { valid: res.valid === true, steps: res.steps || [] };
  };

  for (const entity of candidates) {
    if (self.isTimedOut()) {
      throw new Error('Proof timed out');
    }
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
