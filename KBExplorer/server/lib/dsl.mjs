export function containsFileOps(dsl) {
  const s = String(dsl || '');
  // Best-effort guard: block 'Load'/'Unload' tokens (ignores comment parsing for v0.1).
  return /\bLoad\b/.test(s) || /\bUnload\b/.test(s);
}

export function firstDslStatementLine(dsl) {
  const lines = String(dsl || '').split('\n').map(l => l.trim()).filter(Boolean);
  // Prefer a concrete statement line over declarations/comments.
  for (const l of lines) {
    if (l.startsWith('#')) continue;
    if (l.startsWith('//')) continue;
    // Operator declaration lines typically look like: @x:x __Relation
    if (/^@[^\s]+:[^\s]+\s+__/.test(l)) continue;
    return l;
  }
  return lines[0] || '';
}

