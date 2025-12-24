/**
 * Condition proving utilities.
 *
 * Split out of `src/reasoning/conditions.mjs` to keep each file <500 LOC.
 */

export function instantiatePart(self, part, bindings) {
  if (!part) return '';
  if (part.type === 'leaf' && part.ast) {
    return self.engine.unification.instantiateAST(part.ast, bindings);
  }
  if (part.operator && part.args) {
    const args = part.args
      .map(a => bindings.get(a.name) || a.name || a.value || '')
      .filter(Boolean);
    return `${part.operator.name || part.operator.value} ${args.join(' ')}`.trim();
  }
  return '';
}

