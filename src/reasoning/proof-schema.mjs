/**
 * AGISystem2 - Proof Schema (DS19)
 * @module reasoning/proof-schema
 *
 * Adds a stable, machine-checkable proof object wrapper around existing
 * proof engine outputs, without breaking legacy `steps` format.
 *
 * This is an incremental step toward DS19 "proof real".
 */

import { Identifier, Literal, Reference, Hole } from '../parser/ast.mjs';

function nodeToName(node) {
  if (!node) return null;
  if (node instanceof Identifier) return node.name;
  if (node instanceof Literal) return String(node.value);
  if (node instanceof Hole) return `?${node.name}`;
  if (node instanceof Reference) return `$${node.name}`;
  if (typeof node.name === 'string') return node.name;
  if (node.value !== undefined) return String(node.value);
  if (typeof node.toString === 'function') return node.toString();
  return null;
}

export function statementToGoalMetadata(stmt) {
  const operator = nodeToName(stmt?.operator);
  const args = Array.isArray(stmt?.args) ? stmt.args.map(nodeToName).filter(a => a !== null) : [];
  return { operator, args };
}

function parseFactString(fact) {
  if (!fact || typeof fact !== 'string') return null;
  const parts = fact.trim().split(/\s+/);
  if (parts.length < 1) return null;
  const operator = parts[0];
  const args = parts.slice(1);
  return { operator, args };
}

function findFactId(session, operator, args) {
  if (!session || !operator || !Array.isArray(args)) return null;
  for (const fact of session.kbFacts || []) {
    session.reasoningStats.kbScans++;
    const meta = fact?.metadata;
    if (!meta || meta.operator !== operator) continue;
    const a = meta.args || [];
    if (a.length !== args.length) continue;
    let ok = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== args[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return fact.id ?? null;
  }
  return null;
}

function fillFactIds(session, steps) {
  for (const step of steps) {
    const uses = step?.usesFacts;
    if (!Array.isArray(uses)) continue;
    for (const u of uses) {
      if (!u || u.id !== null && u.id !== undefined) continue;
      if (typeof u.operator !== 'string' || !Array.isArray(u.args)) continue;
      u.id = findFactId(session, u.operator, u.args);
    }
  }
}

function legacyStepToDs19(step) {
  if (!step || typeof step !== 'object') return null;

  const operation = step.operation || step.kind || null;
  const factMeta = parseFactString(step.fact);

  // HDC candidate traces are NOT evidence steps.
  // They may contain non-fact labels (e.g., vector names) and should not be validated as KB facts.
  if (operation === 'hdc_candidate') {
    return {
      kind: 'trace',
      detail: { ...step }
    };
  }

  if (operation === 'validation') {
    return {
      kind: 'validation',
      detail: { ...step }
    };
  }

  if (operation === 'cwa_negation') {
    return {
      kind: 'negation',
      // Closed-world negation is an assumption, not a KB-backed fact.
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  if (operation === 'not_fact') {
    return {
      kind: 'fact',
      usesFacts: factMeta ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  // Value-type inheritance is a derived step: it usually produces a new "has" fact that may not exist in KB.
  if (operation === 'value_type_inheritance') {
    return {
      kind: 'derived',
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  // Derived (proved) conditions inside instantiated And/Or backtracking may not be asserted as KB facts.
  if (operation === 'derived_condition') {
    return {
      kind: 'derived',
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  if (operation === 'rule_match' || operation === 'rule_applied' || operation === 'rule_application') {
    const ruleId = step.ruleId ?? null;
    const ruleName = step.rule ?? null;
    return {
      kind: 'rule',
      usesRules: ruleId || ruleName ? [{ id: ruleId, name: ruleName }] : undefined,
      // Rule steps often carry the derived conclusion fact; it should NOT be required to exist in KB.
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  if (operation === 'synonym_match') {
    return {
      kind: 'synonym',
      usesFacts: step.fact ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  if (operation && operation.startsWith('transitive_')) {
    return {
      kind: 'transitive',
      usesFacts: step.fact ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  if (operation === 'default_reasoning' || operation === 'exception_blocks') {
    return {
      kind: 'default',
      usesFacts: step.fact ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  if (operation === 'symmetric_reverse_fact') {
    return {
      kind: 'fact',
      usesFacts: factMeta ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  if (operation === 'symmetric_flip' || operation === 'symmetric_reflexive') {
    return {
      kind: 'derived',
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  if (operation === 'inverse_reverse_fact') {
    return {
      kind: 'fact',
      usesFacts: factMeta ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  if (operation === 'inverse_flip') {
    return {
      kind: 'derived',
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  // Derived steps are evidence-less: they represent computed conclusions, not asserted KB facts.
  if (operation === 'property_inherited' || operation === 'transitive_found') {
    return {
      kind: 'derived',
      producesFact: factMeta || null,
      detail: { ...step }
    };
  }

  // Inheritance evidence steps: the source property should exist in KB.
  if (operation === 'inherit_property' || operation === 'isA_chain') {
    return {
      kind: 'fact',
      usesFacts: step.fact ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  // Most existing proof steps are fact-like evidence steps (pattern_match, direct_match, rule_match, etc.).
  if (step.fact) {
    return {
      kind: 'fact',
      usesFacts: factMeta ? [{ id: null, ...factMeta }] : undefined,
      detail: { ...step }
    };
  }

  return {
    kind: 'trace',
    detail: { ...step }
  };
}

export function legacyStepsToDs19Steps(steps) {
  if (!Array.isArray(steps)) return [];
  const out = [];
  for (const s of steps) {
    const mapped = legacyStepToDs19(s);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Build a stable proof object wrapper from legacy proof results.
 * @param {Object} params
 * @param {import('../runtime/session.mjs').Session} params.session
 * @param {Object} params.goalStatement - AST Statement for the goal
 * @param {Object} params.result - engine result
 * @returns {Object} proof object (DS19 target shape, partial)
 */
export function buildProofObject({ session, goalStatement, result }) {
  const goal = statementToGoalMetadata(goalStatement);
  const priority = session?.reasoningPriority || 'symbolicPriority';
  const method =
    result?.method ||
    (priority === 'holographicPriority' ? 'holographic' : 'symbolic');

  const legacySteps = Array.isArray(result?.steps) ? result.steps : [];
  const steps = legacyStepsToDs19Steps(legacySteps);
  fillFactIds(session, steps);

  return {
    valid: !!result?.valid,
    goal,
    method,
    confidence: typeof result?.confidence === 'number' ? result.confidence : (result?.valid ? 1 : 0),
    steps,
    legacySteps,
    legacy: {
      reason: result?.reason || null,
      searchTrace: result?.searchTrace || null
    }
  };
}
