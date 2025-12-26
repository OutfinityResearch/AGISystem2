/**
 * AGISystem2 - Planning Solver (MVP)
 * @module reasoning/planning/solver
 *
 * Implements a small forward-search planner, integrated via `solve planning`.
 *
 * Domain encoding (facts in KB):
 * - requires Action <fact...>   (precondition)
 * - causes   Action <fact...>   (add effect)
 * - prevents Action <fact...>   (delete effect)
 *
 * `<fact...>` can be encoded as:
 * - operator arg1 arg2 ... (recommended; deterministic metadata)
 * - a single reference name (e.g., "p") that resolves via `session.referenceMetadata.get('p')`
 * - a single parenthesized compound string like "(at Alice Home)" (parsed via DSL parser)
 * - a list like "[(at A B), (has X Y)]" (parsed via DSL parser)
 *
 * State representation:
 * - a Set of canonical keys: `${operator}\u001f${args.join('\u001f')}`
 */

import { parse } from '../../parser/parser.mjs';

const PLANNING_DEF_OPERATORS = new Set([
  'requires',
  'causes',
  'prevents',
  // produced outputs
  'planStep',
  'planAction',
  'plan',
  // runtime meta facts
  'cspSolution',
  'bundlePattern',
  'inducePattern',
  // rules
  'Implies'
]);

const KEY_SEP = '\u001f';

function factKey(meta) {
  if (!meta?.operator) return null;
  const args = Array.isArray(meta.args) ? meta.args : [];
  return `${meta.operator}${KEY_SEP}${args.join(KEY_SEP)}`;
}

function parseFactKey(key) {
  const parts = String(key || '').split(KEY_SEP);
  if (parts.length === 0) return { operator: null, args: [] };
  return { operator: parts[0] || null, args: parts.slice(1) };
}

function parseExprToMeta(expr) {
  if (!expr) return null;

  // (operator arg1 arg2 ...)
  if (expr.type === 'Compound') {
    const operator = expr.operator?.type === 'Identifier' ? expr.operator.name : expr.operator?.toString?.();
    if (!operator) return null;
    const args = (expr.args || []).map(a => {
      if (a?.type === 'Identifier') return a.name;
      if (a?.type === 'Literal') return String(a.value);
      if (a?.type === 'Reference') return a.name; // ref label; caller may resolve via session.referenceMetadata
      return a?.toString?.() ?? null;
    }).filter(a => a !== null);
    return { operator, args };
  }

  if (expr.type === 'Identifier') {
    return { operator: expr.name, args: [] };
  }

  return null;
}

function parseFactStringToMetas(factString) {
  const src = String(factString || '').trim();
  if (!src) return [];

  // If it doesn't look like an expression, treat as a single token (likely a ref label).
  if (!src.startsWith('(') && !src.startsWith('[')) {
    return [{ operator: src, args: [] }];
  }

  // Parse as DSL expression by embedding into a dummy statement arg.
  const program = parse(`dummy ${src}`);
  const stmt = program?.statements?.[0];
  const expr = stmt?.args?.[0];
  if (!expr) return [];

  if (expr.type === 'Compound') {
    const meta = parseExprToMeta(expr);
    return meta ? [meta] : [];
  }

  if (expr.type === 'List') {
    const metas = [];
    for (const item of expr.items || []) {
      if (item.type === 'Compound') {
        const meta = parseExprToMeta(item);
        if (meta) metas.push(meta);
      } else if (item.type === 'Identifier') {
        metas.push({ operator: item.name, args: [] });
      }
    }
    return metas;
  }

  return [];
}

function resolveFactSpec(session, tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];

  // Recommended form: operator arg1 arg2 ...
  if (tokens.length >= 2) {
    return [{ operator: tokens[0], args: tokens.slice(1) }];
  }

  // Single token: maybe a reference label, or a compound/list string.
  const single = String(tokens[0] || '').trim();
  if (!single) return [];

  // Reference label (preferred fallback).
  const refMeta = session?.referenceMetadata?.get?.(single);
  if (refMeta?.operator) {
    return [{ operator: refMeta.operator, args: Array.isArray(refMeta.args) ? refMeta.args : [] }];
  }

  // Compound/list string (e.g., "(at A B)" or "[(at A B), (has X Y)]")
  const metas = parseFactStringToMetas(single);
  // If meta is a bare identifier, treat it as a ref label again.
  return metas.flatMap(m => {
    if (m.args.length === 0) {
      const maybeRef = session?.referenceMetadata?.get?.(m.operator);
      if (maybeRef?.operator) {
        return [{ operator: maybeRef.operator, args: Array.isArray(maybeRef.args) ? maybeRef.args : [] }];
      }
    }
    return [m];
  });
}

function collectActionDefs(session) {
  const actions = new Map();

  const ensure = (name) => {
    if (!actions.has(name)) {
      actions.set(name, {
        name,
        requires: [],
        adds: [],
        deletes: []
      });
    }
    return actions.get(name);
  };

  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta?.operator || !Array.isArray(meta.args) || meta.args.length < 2) continue;

    const op = meta.operator;
    if (op !== 'requires' && op !== 'causes' && op !== 'prevents') continue;

    const actionName = meta.args[0];
    if (!actionName) continue;

    const def = ensure(actionName);
    const specTokens = meta.args.slice(1);
    const metas = resolveFactSpec(session, specTokens);
    if (metas.length === 0) continue;

    if (op === 'requires') def.requires.push(...metas);
    if (op === 'causes') def.adds.push(...metas);
    if (op === 'prevents') def.deletes.push(...metas);
  }

  return actions;
}

function stateSignature(state) {
  return [...state].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join('\n');
}

function applicable(action, state) {
  for (const req of action.requires || []) {
    const key = factKey(req);
    if (key && !state.has(key)) return false;
  }
  return true;
}

function applyAction(action, state) {
  const next = new Set(state);

  for (const del of action.deletes || []) {
    const key = factKey(del);
    if (key) next.delete(key);
  }

  for (const add of action.adds || []) {
    const key = factKey(add);
    if (key) next.add(key);
  }

  return next;
}

function goalsSatisfied(goalKeys, state) {
  for (const key of goalKeys) {
    if (!state.has(key)) return false;
  }
  return true;
}

function normalizeStringSet(values, defaults = []) {
  const set = new Set();
  for (const v of values || []) {
    const s = String(v ?? '').trim();
    if (s) set.add(s);
  }
  if (set.size === 0) {
    for (const d of defaults) set.add(d);
  }
  return set;
}

function collectConflictPairs(session, conflictOperators) {
  const pairs = [];
  const seen = new Set();

  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta?.operator || !conflictOperators.has(meta.operator)) continue;
    if (!Array.isArray(meta.args) || meta.args.length < 2) continue;
    const a = meta.args[0];
    const b = meta.args[1];
    if (!a || !b) continue;

    const x = a < b ? a : b;
    const y = a < b ? b : a;
    const k = `${x}${KEY_SEP}${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    pairs.push([x, y]);
  }

  return pairs;
}

function buildConflictGuardValidator(session, { guard, conflictOperators, locationOperators } = {}) {
  const guardName = String(guard ?? '').trim();
  if (!guardName) return null;

  const conflictOps = normalizeStringSet(conflictOperators, ['conflicts', 'conflictsWith']);
  const locationOps = normalizeStringSet(locationOperators, ['location', 'at', 'locatedAt']);

  const conflictPairs = collectConflictPairs(session, conflictOps);
  if (conflictPairs.length === 0) {
    // No conflicts -> constraint is vacuously satisfied.
    return null;
  }

  return (state) => {
    const locations = new Map();

    for (const key of state || []) {
      const { operator, args } = parseFactKey(key);
      if (!operator || !locationOps.has(operator)) continue;
      if (!Array.isArray(args) || args.length < 2) continue;

      const entity = args[0];
      const place = args[1];
      if (!entity || !place) continue;

      const prev = locations.get(entity);
      if (prev && prev !== place) {
        // Entity in multiple places at once -> invalid state for planning.
        return false;
      }
      locations.set(entity, place);
    }

    const guardLoc = locations.get(guardName);
    if (!guardLoc) return false;

    for (const [a, b] of conflictPairs) {
      const locA = locations.get(a);
      const locB = locations.get(b);
      if (!locA || !locB) continue;
      if (locA !== locB) continue;
      if (guardLoc !== locA) return false;
    }

    return true;
  };
}

export function buildInitialStateFromSession(session, { explicitFacts = [] } = {}) {
  const state = new Set();

  const addMeta = (meta) => {
    const key = factKey(meta);
    if (key) state.add(key);
  };

  if (Array.isArray(explicitFacts) && explicitFacts.length > 0) {
    for (const meta of explicitFacts) addMeta(meta);
    return state;
  }

  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta?.operator) continue;
    if (PLANNING_DEF_OPERATORS.has(meta.operator)) continue;
    addMeta(meta);
  }

  return state;
}

export function solvePlanning(session, {
  goals = [],
  startFacts = [],
  maxDepth = 6,
  maxStates = 50_000,
  guard = null,
  conflictOperators = null,
  locationOperators = null
} = {}) {
  const startedAt = Date.now();

  const actionDefs = collectActionDefs(session);
  const actions = [...actionDefs.values()];
  const goalKeys = goals.map(factKey).filter(Boolean);
  const initialState = buildInitialStateFromSession(session, { explicitFacts: startFacts });

  const isValidState = buildConflictGuardValidator(session, {
    guard,
    conflictOperators,
    locationOperators
  });
  let invalidStatesPruned = 0;

  if (goalKeys.length === 0) {
    return { success: false, error: 'No goals provided', stats: { durationMs: Date.now() - startedAt } };
  }

  if (isValidState && !isValidState(initialState)) {
    return {
      success: false,
      error: 'Initial state violates planning constraints',
      stats: { durationMs: Date.now() - startedAt }
    };
  }

  if (goalsSatisfied(goalKeys, initialState)) {
    return {
      success: true,
      plan: [],
      stats: { durationMs: Date.now() - startedAt, nodesExpanded: 0, transitions: 0, maxDepth: 0, invalidStatesPruned: 0 }
    };
  }

  const queue = [{ state: initialState, plan: [] }];
  const visited = new Set([stateSignature(initialState)]);

  let nodesExpanded = 0;
  let transitions = 0;

  while (queue.length > 0) {
    const node = queue.shift();
    nodesExpanded++;

    if (node.plan.length >= maxDepth) continue;
    if (nodesExpanded > maxStates) break;

    for (const action of actions) {
      if (!applicable(action, node.state)) continue;
      transitions++;

      const nextState = applyAction(action, node.state);
      const nextPlan = [...node.plan, action.name];

      if (isValidState && !isValidState(nextState)) {
        invalidStatesPruned++;
        continue;
      }

      if (goalsSatisfied(goalKeys, nextState)) {
        return {
          success: true,
          plan: nextPlan,
          stats: {
            durationMs: Date.now() - startedAt,
            nodesExpanded,
            transitions,
            maxDepth: nextPlan.length,
            invalidStatesPruned
          }
        };
      }

      const sig = stateSignature(nextState);
      if (visited.has(sig)) continue;
      visited.add(sig);
      queue.push({ state: nextState, plan: nextPlan });
    }
  }

  return {
    success: false,
    error: `No plan found within depth ${maxDepth}`,
    stats: { durationMs: Date.now() - startedAt, nodesExpanded, transitions, maxDepth, invalidStatesPruned }
  };
}

export function resolveGoalRefs(session, refs = []) {
  const metas = [];
  for (const ref of refs) {
    const refMeta = session?.referenceMetadata?.get?.(ref);
    if (refMeta?.operator) {
      metas.push({ operator: refMeta.operator, args: Array.isArray(refMeta.args) ? refMeta.args : [] });
      continue;
    }

    // Allow inline "(...)" or "[...]" in solve decl source.
    const parsed = resolveFactSpec(session, [ref]);
    for (const m of parsed) {
      if (m?.operator) metas.push(m);
    }
  }
  return metas;
}

function findPlanFact(session, planName) {
  const name = String(planName ?? '').trim();
  if (!name) return null;
  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'plan') continue;
    if (!Array.isArray(meta.args) || meta.args.length < 2) continue;
    if (meta.args[0] === name) return fact;
  }
  return null;
}

function readPlanStepsFromKB(session, planName) {
  const name = String(planName ?? '').trim();
  const steps = [];
  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'planStep') continue;
    if (!Array.isArray(meta.args) || meta.args.length < 3) continue;
    if (meta.args[0] !== name) continue;
    const idx = Number.parseInt(String(meta.args[1]), 10);
    if (!Number.isFinite(idx) || idx <= 0) continue;
    const action = meta.args[2];
    if (!action) continue;
    steps.push([idx, action]);
  }
  steps.sort((a, b) => a[0] - b[0]);
  return steps.map(([, action]) => action);
}

function describeMeta(meta) {
  if (!meta?.operator) return '';
  const args = Array.isArray(meta.args) ? meta.args : [];
  return `${meta.operator} ${args.join(' ')}`.trim();
}

/**
 * Verify a stored plan produced by `solve planning`.
 * - Checks that each step is applicable (requires satisfied)
 * - Applies effects (causes/prevents)
 * - Re-checks optional conflict/guard constraints
 * - Confirms that all goal facts are satisfied in the final state
 */
export function verifyPlan(session, planName) {
  const startedAt = Date.now();
  const name = String(planName ?? '').trim();
  if (!name) return { success: false, valid: false, error: 'Missing plan name' };

  const planFact = findPlanFact(session, name);
  const meta = planFact?.metadata || null;

  const plan = Array.isArray(meta?.plan) ? meta.plan : readPlanStepsFromKB(session, name);
  const goals = Array.isArray(meta?.goals) ? meta.goals : [];
  const startFacts = Array.isArray(meta?.startFacts) ? meta.startFacts : [];

  const guard = meta?.guard ?? null;
  const conflictOperators = meta?.conflictOperators ?? null;
  const locationOperators = meta?.locationOperators ?? null;

  if (!Array.isArray(plan) || plan.length === 0) {
    return { success: false, valid: false, error: `No plan steps found for ${name}` };
  }
  if (goals.length === 0) {
    return { success: false, valid: false, error: `Plan ${name} has no stored goals to verify` };
  }
  if (startFacts.length === 0) {
    return { success: false, valid: false, error: `Plan ${name} has no stored start facts to verify` };
  }

  const actionDefs = collectActionDefs(session);
  const isValidState = buildConflictGuardValidator(session, { guard, conflictOperators, locationOperators });

  let state = buildInitialStateFromSession(session, { explicitFacts: startFacts });
  const proof = [];

  if (isValidState && !isValidState(state)) {
    return {
      success: true,
      valid: false,
      planName: name,
      steps: ['Initial state violates planning constraints'],
      stats: { durationMs: Date.now() - startedAt }
    };
  }

  proof.push(`Loaded plan ${name} (${plan.length} steps)`);
  proof.push(`Start: ${startFacts.map(describeMeta).filter(Boolean).join(', ')}`);

  for (let i = 0; i < plan.length; i++) {
    const stepIndex = i + 1;
    const actionName = plan[i];
    const action = actionDefs.get(actionName);
    if (!action) {
      return {
        success: true,
        valid: false,
        planName: name,
        steps: [...proof, `Step ${stepIndex}: unknown action ${actionName}`],
        stats: { durationMs: Date.now() - startedAt }
      };
    }

    if (!applicable(action, state)) {
      const missing = [];
      for (const req of action.requires || []) {
        const key = factKey(req);
        if (key && !state.has(key)) missing.push(describeMeta(req));
      }
      return {
        success: true,
        valid: false,
        planName: name,
        steps: [
          ...proof,
          `Step ${stepIndex}: ${actionName} not applicable`,
          ...(missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : [])
        ],
        stats: { durationMs: Date.now() - startedAt }
      };
    }

    const nextState = applyAction(action, state);
    if (isValidState && !isValidState(nextState)) {
      return {
        success: true,
        valid: false,
        planName: name,
        steps: [...proof, `Step ${stepIndex}: ${actionName} violates planning constraints`],
        stats: { durationMs: Date.now() - startedAt }
      };
    }

    proof.push(`Step ${stepIndex}: applied ${actionName}`);
    state = nextState;
  }

  const goalKeys = goals.map(factKey).filter(Boolean);
  if (!goalsSatisfied(goalKeys, state)) {
    const missing = [];
    for (const g of goals) {
      const key = factKey(g);
      if (key && !state.has(key)) missing.push(describeMeta(g));
    }
    return {
      success: true,
      valid: false,
      planName: name,
      steps: [...proof, `Goals not satisfied: ${missing.join(', ')}`],
      stats: { durationMs: Date.now() - startedAt }
    };
  }

  proof.push(`Goals satisfied: ${goals.map(describeMeta).filter(Boolean).join(', ')}`);

  return {
    success: true,
    valid: true,
    planName: name,
    steps: proof,
    stats: { durationMs: Date.now() - startedAt }
  };
}
