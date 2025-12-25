/**
 * Rule index by conclusion operator.
 *
 * Used to avoid scanning all rules on every prove/condition step.
 */

function extractOpFromAst(ast) {
  if (!ast) return null;
  const op = ast.operator?.name || ast.operator?.value || ast.name || ast.value || null;
  return op || null;
}

function collectLeafConclusionOpsFromParts(parts, out) {
  if (!parts) return;
  if (parts.type === 'Not') return;
  if (parts.type === 'leaf') {
    const op = extractOpFromAst(parts.ast);
    if (op) out.add(op);
    return;
  }
  if ((parts.type === 'And' || parts.type === 'Or') && Array.isArray(parts.parts)) {
    for (const p of parts.parts) collectLeafConclusionOpsFromParts(p, out);
  }
}

export function buildRuleIndexByConclusionOp(session) {
  const index = new Map();
  for (const rule of session?.rules || []) {
    const ops = new Set();
    if (rule.conclusionParts) {
      collectLeafConclusionOpsFromParts(rule.conclusionParts, ops);
    }
    if (ops.size === 0) {
      const op = extractOpFromAst(rule.conclusionAST);
      if (op) ops.add(op);
    }
    for (const op of ops) {
      const list = index.get(op);
      if (list) list.push(rule);
      else index.set(op, [rule]);
    }
  }
  return index;
}

