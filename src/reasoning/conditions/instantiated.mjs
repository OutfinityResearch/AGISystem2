/**
 * Instantiated (binding-aware) compound condition proving.
 *
 * Split out of `src/reasoning/conditions.mjs` to keep each file <500 LOC.
 */

import { Statement, Identifier } from '../../parser/ast.mjs';
import { debug_trace } from '../../utils/debug.js';
import { instantiatePart } from './utils.mjs';

function dbg(category, ...args) {
  debug_trace(`[Cond:${category}]`, ...args);
}

export function proveInstantiatedCondition(self, rule, bindings, depth) {
  if (depth > self.options.maxDepth) {
    return { valid: false, reason: 'Depth limit' };
  }

  const condAST = rule.conditionAST;
  if (!condAST) {
    return { valid: false, reason: 'No condition AST' };
  }

  if (rule.conditionParts) {
    return proveInstantiatedCompound(self, rule.conditionParts, bindings, depth);
  }

  const instantiated = self.engine.unification.instantiateAST(condAST, bindings);
  dbg('INST', 'Instantiated condition:', instantiated);

  return self.proveSingleCondition(instantiated, bindings, depth);
}

export function proveInstantiatedCompound(self, condParts, bindings, depth) {
  if (condParts.type === 'And') {
    return proveInstantiatedAnd(self, condParts.parts, new Map(bindings), depth);
  }
  if (condParts.type === 'Or') {
    return proveInstantiatedOr(self, condParts.parts, bindings, depth);
  }
  if (condParts.type === 'Not') {
    return proveInstantiatedNot(self, condParts.inner, bindings, depth);
  }
  if (condParts.type === 'leaf') {
    const leafAST = condParts.ast || condParts;
    if (leafAST.operator) {
      const inst = self.engine.unification.instantiateAST(leafAST, bindings);
      return self.proveSingleCondition(inst, bindings, depth);
    }
  }
  return { valid: false, reason: 'Unknown compound type' };
}

export function proveInstantiatedNot(self, inner, bindings, depth) {
  // Try to prove the inner condition
  let innerResult;
  if (inner.type === 'And' || inner.type === 'Or' || inner.type === 'Not') {
    innerResult = proveInstantiatedCompound(self, inner, bindings, depth);
  } else if (inner.type === 'leaf' && inner.ast) {
    const inst = self.engine.unification.instantiateAST(inner.ast, bindings);
    innerResult = self.proveSingleCondition(inst, bindings, depth);
  } else {
    innerResult = { valid: false };
  }

  // Not succeeds via negation-as-failure only when CWA is enabled.
  if (!innerResult.valid && self.session.closedWorldAssumption) {
    return {
      valid: true,
      method: 'not_condition',
      confidence: self.thresholds.CONDITION_CONFIDENCE,
      steps: [{ operation: 'not_proved', detail: 'inner condition cannot be proved' }]
    };
  }
  return { valid: false, reason: 'Not condition failed - inner is provable' };
}

export function proveInstantiatedAnd(self, parts, bindings, depth) {
  const ordered = orderAndParts(self, parts, bindings);
  return proveAndWithBacktracking(self, ordered, 0, new Map(bindings), [], depth);
}

export function proveAndWithBacktracking(self, parts, partIndex, bindings, accumulatedSteps, depth) {
  if (partIndex >= parts.length) {
    const detail = parts.map(p => instantiatePart(self, p, bindings)).filter(Boolean).join(', ');
    return {
      valid: true,
      method: 'and_instantiated',
      confidence: self.thresholds.CONDITION_CONFIDENCE,
      steps: [...accumulatedSteps, { operation: 'and_satisfied', detail }]
    };
  }

  const part = parts[partIndex];
  const matches = findAllMatches(self, part, bindings, depth);

  if (matches.length === 0) {
    return { valid: false, reason: `And part ${partIndex} has no matches` };
  }

  for (const match of matches) {
    const newBindings = new Map(bindings);
    if (match.newBindings) {
      for (const [k, v] of match.newBindings) {
        newBindings.set(k, v);
      }
    }

    const remainingResult = proveAndWithBacktracking(
      self,
      parts,
      partIndex + 1,
      newBindings,
      [...accumulatedSteps, ...(match.steps || [])],
      depth
    );

    if (remainingResult.valid) {
      return remainingResult;
    }
  }

  return { valid: false, reason: 'Backtracking exhausted' };
}

export function findAllMatches(self, part, bindings, depth) {
  const matches = [];

  if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
    if (part.type === 'Not') {
      return findAllNotMatches(self, part, bindings, depth);
    }
    const result = proveInstantiatedCompound(self, part, bindings, depth);
    if (result.valid) matches.push(result);
    return matches;
  }

  if (part.type === 'leaf' && part.ast) {
    const condStr = self.engine.unification.instantiateAST(part.ast, bindings);
    const directMatches = self.engine.kbMatcher.findAllFactMatches(condStr, bindings, depth);
    if (directMatches.length > 0) return directMatches;

    // If the condition still contains unbound variables, try a bounded witness search
    // by grounding them against known entities and proving each grounded condition.
    // This enables multi-rule chaining inside compound And/Or conditions.
    if (!condStr || !condStr.includes('?')) return directMatches;

    const tokens = condStr.trim().split(/\s+/);
    if (tokens.length < 2) return directMatches;

    const varTokens = tokens.slice(1).filter(t => t.startsWith('?'));
    const unboundVars = [...new Set(varTokens.map(v => v.slice(1)).filter(v => v && !bindings.has(v)))];
    if (unboundVars.length === 0) return directMatches;
    if (unboundVars.length > 2) return directMatches;

    const domain = collectEntityDomain(self);
    if (domain.length === 0) return directMatches;

    const MAX_DOMAIN = 80;
    const MAX_ASSIGNMENTS = 200;
    const candidates = domain.slice(0, MAX_DOMAIN);

    const tryGrounded = (extraBindings) => {
      const merged = new Map(bindings);
      for (const [k, v] of extraBindings) merged.set(k, v);
      const grounded = self.engine.unification.instantiateAST(part.ast, merged);
      if (!grounded || grounded.includes('?')) return null;
      const p = grounded.trim().split(/\s+/);
      if (p.length < 2) return null;
      const groundedOp = p[0];
      const groundedArgs = p.slice(1);
      const stmt = new Statement(null, new Identifier(groundedOp), groundedArgs.map(a => new Identifier(a)));
      const res = self.engine.proveGoal(stmt, depth + 1);
      if (!res?.valid) return null;
      return {
        valid: true,
        confidence: self.thresholds.CONDITION_CONFIDENCE,
        newBindings: extraBindings,
        steps: [{ operation: 'derived_condition', fact: grounded }, ...(res.steps || [])]
      };
    };

    const derived = [];
    if (unboundVars.length === 1) {
      const v = unboundVars[0];
      for (const candidate of candidates) {
        const extra = new Map([[v, candidate]]);
        const m = tryGrounded(extra);
        if (m) derived.push(m);
        if (derived.length >= MAX_ASSIGNMENTS) break;
      }
    } else if (unboundVars.length === 2) {
      const [v1, v2] = unboundVars;
      for (const c1 of candidates) {
        for (const c2 of candidates) {
          const extra = new Map([[v1, c1], [v2, c2]]);
          const m = tryGrounded(extra);
          if (m) derived.push(m);
          if (derived.length >= MAX_ASSIGNMENTS) break;
        }
        if (derived.length >= MAX_ASSIGNMENTS) break;
      }
    }

    return derived;
  }

  return matches;
}

export function collectEntityDomain(self) {
  const componentKB = self.session?.componentKB;
  if (componentKB?.getEntityDomain) {
    const cached = componentKB.getEntityDomain();
    if (Array.isArray(cached) && cached.length > 0) return cached;
  }

  const domain = new Set();
  for (const fact of self.session.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta) continue;
    for (const a of meta.args || []) {
      if (typeof a !== 'string') continue;
      if (!a) continue;
      if (a.startsWith('__')) continue;
      domain.add(a);
    }
  }
  return [...domain];
}

function parseConditionHint(text) {
  if (!text || typeof text !== 'string') return null;
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 1) return null;
  const cleaned = tokens.filter(t => !t.startsWith('@'));
  if (cleaned.length < 1) return null;
  return { op: cleaned[0], arg0: cleaned[1] || null, arg1: cleaned[2] || null, tokens: cleaned };
}

function estimatePartFanout(self, part, bindings) {
  const componentKB = self.session?.componentKB;

  // Prefer to prove compound parts later: they can recurse/branch heavily.
  if (part.type === 'And' || part.type === 'Or') return { estimate: 1e9, grounded: 0 };
  if (part.type === 'Not') return { estimate: 5e8, grounded: 0 };

  if (!(part.type === 'leaf' && part.ast)) return { estimate: 1e9, grounded: 0 };

  const condStr = self.engine.unification.instantiateAST(part.ast, bindings);
  const hint = parseConditionHint(condStr);
  if (!hint?.op) return { estimate: 1e9, grounded: 0 };

  const grounded = hint.tokens.slice(1).filter(t => t && !t.startsWith('?')).length;

  if (!componentKB) {
    return { estimate: (self.session?.kbFacts?.length || 0) * (1 + Math.max(0, hint.tokens.length - 2 - grounded)), grounded };
  }

  // Exact counts (no synonym expansion) to preserve semantics and avoid surprises.
  if (hint.arg0 && !hint.arg0.startsWith('?')) {
    return { estimate: componentKB.countByOperatorAndArg0(hint.op, hint.arg0, false), grounded };
  }
  return { estimate: componentKB.countByOperator(hint.op, false), grounded };
}

function orderAndParts(self, parts, bindings) {
  if (!Array.isArray(parts) || parts.length < 2) return parts;
  const scored = parts.map((p, index) => {
    const { estimate, grounded } = estimatePartFanout(self, p, bindings);
    return { p, index, estimate, grounded };
  });
  scored.sort((a, b) => {
    if (a.estimate !== b.estimate) return a.estimate - b.estimate;
    if (a.grounded !== b.grounded) return b.grounded - a.grounded;
    return a.index - b.index;
  });
  return scored.map(s => s.p);
}

export function findAllNotMatches(self, part, bindings, depth) {
  const matches = [];
  const inner = part.inner;

  // Nested Not/And/Or - treat as boolean (no new bindings).
  if (inner.type === 'And' || inner.type === 'Or' || inner.type === 'Not') {
    const result = proveInstantiatedNot(self, inner, bindings, depth);
    if (result.valid) matches.push(result);
    return matches;
  }

  if (!(inner.type === 'leaf' && inner.ast)) return matches;

  const innerStr = self.engine.unification.instantiateAST(inner.ast, bindings);
  if (!innerStr) return matches;

  const varTokens = innerStr.split(/\s+/).filter(t => t.startsWith('?'));
  const unboundVars = [...new Set(varTokens.map(v => v.slice(1)).filter(v => v && !bindings.has(v)))];

  // Ground (under current bindings) → boolean Not.
  if (unboundVars.length === 0) {
    const result = proveInstantiatedNot(self, inner, bindings, depth);
    if (result.valid) matches.push(result);
    return matches;
  }

  // Open-world mode: do not allow negation-as-failure for unbound vars.
  if (!self.session.closedWorldAssumption) return matches;

  // Existential witness search (RuleTaker-style "something does not ..."):
  // find at least one assignment that makes inner unprovable.
  const domain = collectEntityDomain(self);
  if (domain.length === 0) return matches;

  const MAX_WITNESSES = 200;
  const candidates = domain.slice(0, MAX_WITNESSES);

  // Best-effort support for multiple vars without exploding combos.
  if (unboundVars.length > 1) {
    for (const candidate of candidates) {
      const newBindings = new Map(bindings);
      for (const v of unboundVars) newBindings.set(v, candidate);
      const instantiated = self.engine.unification.instantiateAST(inner.ast, newBindings);
      if (!instantiated || instantiated.includes('?')) continue;
      const parts = instantiated.trim().split(/\s+/);
      if (parts.length < 2) continue;
      const op = parts[0];
      const args = parts.slice(1);
      const innerStmt = new Statement(null, new Identifier(op), args.map(a => new Identifier(a)));
      const innerResult = self.engine.proveGoal(innerStmt, depth + 1);
      if (!innerResult.valid) {
        matches.push({
          valid: true,
          confidence: self.thresholds.CONDITION_CONFIDENCE,
          newBindings: new Map(unboundVars.map(v => [v, candidate])),
          steps: [{ operation: 'not_witness', detail: `${unboundVars.map(v => `?${v}=${candidate}`).join(', ')}` }]
        });
      }
    }
    return matches;
  }

  const v = unboundVars[0];
  for (const candidate of candidates) {
    const newBindings = new Map(bindings);
    newBindings.set(v, candidate);
    const instantiated = self.engine.unification.instantiateAST(inner.ast, newBindings);
    if (!instantiated || instantiated.includes('?')) continue;
    const parts = instantiated.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const op = parts[0];
    const args = parts.slice(1);
    const innerStmt = new Statement(null, new Identifier(op), args.map(a => new Identifier(a)));
    const innerResult = self.engine.proveGoal(innerStmt, depth + 1);
    if (!innerResult.valid) {
      matches.push({
        valid: true,
        confidence: self.thresholds.CONDITION_CONFIDENCE,
        newBindings: new Map([[v, candidate]]),
        steps: [{ operation: 'not_witness', detail: `?${v}=${candidate}` }]
      });
    }
  }

  return matches;
}

export function proveInstantiatedOr(self, parts, bindings, depth) {
  for (const part of parts) {
    const partResult = proveCompoundPart(self, part, new Map(bindings), depth);
    if (partResult.valid) {
      return {
        valid: true,
        method: 'or_instantiated',
        confidence: partResult.confidence * self.thresholds.CONFIDENCE_DECAY,
        steps: [...(partResult.steps || []), { operation: 'or_satisfied', detail: instantiatePart(self, part, bindings) }]
      };
    }
  }
  return { valid: false, reason: 'No Or branch succeeded' };
}

export function proveCompoundPart(self, part, bindings, depth) {
  if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
    return proveInstantiatedCompound(self, part, bindings, depth);
  }

  if (part.type === 'leaf') {
    if (part.ast) {
      const inst = self.engine.unification.instantiateAST(part.ast, bindings);
      return self.proveSingleCondition(inst, bindings, depth);
    }
  }

  return { valid: false, reason: 'Cannot prove part' };
}
