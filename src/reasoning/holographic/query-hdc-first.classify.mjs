/**
 * AGISystem2 - Holographic Query Engine (HDC-First) - Query Classification
 * @module reasoning/holographic/query-hdc-first.classify
 */

import { isTransitiveRelation } from '../query-transitive.mjs';

export function getRuleConclusionOperators(engine) {
  // Cache by rule count (rules are appended during learn/loadCore).
  const n = engine.session?.rules?.length || 0;
  if (engine._ruleOpsCache && engine._ruleOpsCacheN === n) return engine._ruleOpsCache;

  const ops = new Set();
  const rules = engine.session?.rules || [];

  const addLeafOp = (ast) => {
    const op = ast?.operator?.name || ast?.operator?.value || null;
    if (typeof op === 'string' && op) ops.add(op);
  };

  const walkParts = (part) => {
    if (!part) return;
    if (part.type === 'leaf' && part.ast) {
      addLeafOp(part.ast);
      return;
    }
    if (part.type === 'Not') return;
    if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
      for (const p of part.parts) walkParts(p);
    }
  };

  for (const r of rules) {
    if (r?.conclusionParts) {
      walkParts(r.conclusionParts);
      continue;
    }
    if (r?.conclusionAST) addLeafOp(r.conclusionAST);
  }

  engine._ruleOpsCache = ops;
  engine._ruleOpsCacheN = n;
  return ops;
}

export function isGraphOperator(engine, operatorName) {
  if (!operatorName) return false;
  return !!(engine.session?.graphs?.has?.(operatorName) || engine.session?.graphAliases?.has?.(operatorName));
}

export function classifyQuery(engine, operatorName, holes, knowns) {
  // Keep this coarse on purpose: it is used to decide which fast paths are safe.
  const HDC_BYPASS_OPERATORS = new Set([
    'abduce',
    'whatif',
    'explain',
    'deduce',
    'induce',
    'bundle',
    'difference',
    'analogy',
    'similar',
    'verifyPlan',
    // CSP helper (DS19): deterministic tuple extraction should come from direct KB facts / symbolic engine,
    // not from HDC unbind over the full KB bundle (which is noisy and non-deterministic for multi-hole tuples).
    'cspTuple'
  ]);

  if (HDC_BYPASS_OPERATORS.has(operatorName)) {
    return { kind: 'meta', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
  }

  // Quantifiers are higher-order; HDC unbind candidate extraction is not meaningful.
  if (operatorName === 'Exists' || operatorName === 'ForAll') {
    return { kind: 'quantifier', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
  }

  if (isTransitiveRelation(operatorName, engine.session)) {
    // Transitive closure is derived reasoning; HDC unbind only sees explicit edges.
    return { kind: 'transitive', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
  }

  // Graph operators wrap inner DS07a records (bind(op, innerRecord)) and therefore do not follow
  // the flat record encoding assumed by the Master Equation unbind path.
  const isGraph = isGraphOperator(engine, operatorName);

  const isAssignment = engine.session?.semanticIndex?.isAssignmentRelation
    ? engine.session.semanticIndex.isAssignmentRelation(operatorName)
    : false;

  const isInheritable = engine.session?.semanticIndex?.isInheritableProperty
    ? engine.session.semanticIndex.isInheritableProperty(operatorName)
    : false;

  const isSpecialDerived = operatorName === 'elementOf';

  // Rule-derived operators: if there are rules concluding this operator, symbolic may return results
  // that are not explicit facts and are therefore not retrievable by unbind alone.
  const ruleOps = getRuleConclusionOperators(engine);
  const isRuleDerived = ruleOps.has(operatorName);

  if (isInheritable || isSpecialDerived || isRuleDerived) {
    return {
      kind: 'derived',
      symbolicOnly: false,
      hdcUnbindAllowed: !isGraph,
      indexFastPathAllowed: false
    };
  }

  // Fact-retrieval pattern: 1 hole, direct membership query.
  // For these, we can use ComponentKB to answer without proof search or HDC similarity.
  if (holes.length === 1) {
    return {
      kind: isGraph ? 'graph_fact' : (isAssignment ? 'assignment_fact' : 'fact'),
      symbolicOnly: false,
      hdcUnbindAllowed: !isGraph,
      indexFastPathAllowed: true
    };
  }

  return { kind: 'other', symbolicOnly: false, hdcUnbindAllowed: !isGraph, indexFastPathAllowed: false };
}

