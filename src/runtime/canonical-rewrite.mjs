import { Statement, Identifier } from '../parser/ast.mjs';

function asName(node) {
  if (!node) return null;
  if (node instanceof Identifier) return node.name;
  if (typeof node.name === 'string') return node.name;
  if (node.value !== undefined) return String(node.value);
  return null;
}

function isSameName(a, b) {
  const na = asName(a);
  const nb = asName(b);
  return !!na && na === nb;
}

/**
 * DS19: rewrite selected non-canonical surface forms into canonical macros.
 * This is intentionally conservative and only rewrites when the mapping is unambiguous.
 *
 * @param {import('./session.mjs').Session} session
 * @param {import('../parser/ast.mjs').Statement} stmt
 * @param {string} operatorName
 * @returns {{rewritten: boolean, statement: any, detail?: object}}
 */
export function rewriteCanonicalSurfaceStatement(session, stmt, operatorName) {
  if (!session?.enforceCanonical) return { rewritten: false, statement: stmt };
  if (!operatorName || typeof operatorName !== 'string') return { rewritten: false, statement: stmt };

  const rules = session?.canonicalRewriteIndex?.getRules?.(operatorName) || [];
  if (rules.length === 0) return { rewritten: false, statement: stmt };

  const arity = (stmt.args || []).length;
  const scored = [];
  for (const rule of rules) {
    const map = rule.argMap || [];
    if (!Array.isArray(map) || map.length === 0) continue;
    if (map.some(i => !Number.isInteger(i) || i < 0 || i >= arity)) continue;
    const eqPairs = Array.isArray(rule.eq) ? rule.eq : [];
    let ok = true;
    for (const pair of eqPairs) {
      if (!pair || pair.length !== 2) continue;
      const [a, b] = pair;
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      if (a < 0 || b < 0 || a >= arity || b >= arity) { ok = false; break; }
      if (!isSameName(stmt.args[a], stmt.args[b])) { ok = false; break; }
    }
    if (!ok) continue;
    scored.push({ rule, score: eqPairs.length, order: rule.order ?? 0 });
  }

  if (scored.length === 0) return { rewritten: false, statement: stmt };
  scored.sort((a, b) => (b.score - a.score) || (a.order - b.order));
  const chosen = scored[0].rule;

  const newArgs = chosen.argMap.map(i => stmt.args[i]);
  const rewritten = new Statement(
    stmt.destination,
    new Identifier(chosen.toOp, stmt.operator?.line, stmt.operator?.column),
    newArgs,
    stmt.line,
    stmt.column,
    stmt.persistName
  );
  rewritten.source = stmt.source || null;
  rewritten.comment = stmt.comment ?? null;
  rewritten.commentColumn = stmt.commentColumn ?? null;

  return {
    rewritten: true,
    statement: rewritten,
    detail: {
      kind: 'canonicalRewrite',
      ruleId: chosen.id,
      from: chosen.fromOp,
      to: chosen.toOp,
      argMap: chosen.argMap,
      eq: chosen.eq || []
    }
  };
}

export function isRewritableNonCanonicalPrimitive(operatorName, stmt) {
  // Back-compat helper used in some places; prefer `session.canonicalRewriteIndex.canRewrite`.
  if (!operatorName || typeof operatorName !== 'string') return false;
  const arity = (stmt?.args || []).length;
  if (operatorName === '_mtrans') return arity === 4;
  if (operatorName === '_atrans') return arity === 4;
  if (operatorName === '_ptrans') return arity === 4;
  if (operatorName === '_speak') return arity === 2;
  return false;
}
