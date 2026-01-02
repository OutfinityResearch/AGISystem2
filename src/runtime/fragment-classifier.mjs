/**
 * AGISystem2 - Fragment Classifier (v0)
 * @module runtime/fragment-classifier
 *
 * URC direction (DS49/DS73):
 * classify Content into a fragment tag that drives backend selection.
 *
 * v0: purely syntactic/operator-based classification on Sys2DSL AST.
 */

import { parse } from '../parser/parser.mjs';

function collectOperators(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Program') {
    for (const s of node.statements || []) collectOperators(s, out);
    return;
  }
  if (node.type === 'Statement') {
    const op = node.operator?.name || node.operator?.value;
    if (op) out.add(op);
    for (const a of node.args || []) collectOperators(a, out);
    return;
  }
  if (node.type === 'Compound') {
    const op = node.operator?.name || node.operator?.value;
    if (op) out.add(op);
    for (const a of node.args || []) collectOperators(a, out);
    return;
  }
}

export function classifyDslFragment(dsl) {
  const program = parse(String(dsl || ''));
  const ops = new Set();
  collectOperators(program, ops);

  // Solver blocks (these are URC-backend fragments, not just content fragments).
  if (ops.has('solve') && ops.has('csp')) return { fragment: 'Frag_CP', operators: ops };
  if (ops.has('solve') && ops.has('planning')) return { fragment: 'Frag_TS', operators: ops };

  const boolOps = new Set(['And', 'Or', 'Not', 'Implies', 'True', 'False']);
  const smtPred = new Set(['equals', 'lt', 'leq', 'gt', 'geq']);
  const smtArith = new Set(['Add', 'Sub', 'Mul', 'Div', 'Neg']);

  let okBool = true;
  let okSMT = true;
  for (const op of ops) {
    if (boolOps.has(op)) continue;
    okBool = false;
    if (smtPred.has(op) || smtArith.has(op)) continue;
    okSMT = false;
  }

  if (okBool) return { fragment: 'Frag_Bool', operators: ops };
  if (okSMT) return { fragment: 'Frag_SMT_LRA', operators: ops };
  return { fragment: 'Frag_Unknown', operators: ops };
}

