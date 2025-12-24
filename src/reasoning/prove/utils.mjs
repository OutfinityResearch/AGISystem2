/**
 * ProofEngine low-level utilities.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

export function extractOperatorName(stmt) {
  if (!stmt?.operator) return null;
  return stmt.operator.name || stmt.operator.value || null;
}

export function extractArgName(arg) {
  if (!arg) return null;
  if (arg.type === 'Identifier') return arg.name;
  if (arg.type === 'Reference') return arg.name;
  return arg.name || arg.value || null;
}

export function goalToFact(self, goal) {
  const op = self.extractOperatorName(goal);
  if (!op) return '';
  const args = (goal.args || []).map(a => self.extractArgName(a) || '').filter(Boolean);
  return `${op} ${args.join(' ')}`.trim();
}

export function hashVector(vec) {
  // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
  if (!vec) return 'invalid:' + Math.random().toString(36);

  // Dense-binary / metric-affine: use first 8 entries to reduce collisions
  if (vec.data) {
    const parts = [];
    const limit = Number.isFinite(vec.words) ? vec.words : vec.data.length;
    for (let i = 0; i < Math.min(8, limit || 0); i++) {
      parts.push(vec.data[i]?.toString(16) || '0');
    }
    return parts.join(':');
  }

  // Sparse-polynomial: use first 8 exponents
  if (vec.exponents) {
    return [...vec.exponents].slice(0, 8).map(e => e.toString(16)).join(':');
  }

  return 'invalid:' + Math.random().toString(36);
}

