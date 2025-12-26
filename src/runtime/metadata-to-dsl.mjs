/**
 * DS19: Canonical DSL reconstruction from canonical metadata.
 *
 * Goal: ensure canonical metadata is sufficient to reconstruct a stable DSL surface form.
 */

function joinTokens(tokens) {
  return tokens.filter(t => t !== null && t !== undefined && String(t).trim() !== '').join(' ');
}

/**
 * Convert canonical metadata into a canonical DSL string.
 *
 * @param {{operator?: string, args?: any[], innerOperator?: string, innerArgs?: any[]}} metadata
 * @returns {string|null}
 */
export function metadataToCanonicalDsl(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const op = metadata.operator;
  if (typeof op !== 'string' || !op) return null;

  if (op === 'Exists' || op === 'ForAll') {
    const variable = metadata.variable || (Array.isArray(metadata.args) ? metadata.args[0] : null);
    const body = metadata.body ? metadataToCanonicalDsl(metadata.body) : null;
    if (typeof variable === 'string' && variable && body) {
      return `${op} ${variable} (${body})`;
    }
  }

  if (op === 'And' || op === 'Or') {
    const parts = Array.isArray(metadata.parts) ? metadata.parts : null;
    if (parts && parts.length > 0) {
      const rendered = parts
        .map(p => metadataToCanonicalDsl(p))
        .filter(Boolean)
        .map(s => `(${s})`);
      if (rendered.length > 0) return `${op} ${rendered.join(' ')}`.trim();
    }
  }

  if (op === 'Implies') {
    const cond = metadata.condition ? metadataToCanonicalDsl(metadata.condition) : null;
    const conc = metadata.conclusion ? metadataToCanonicalDsl(metadata.conclusion) : null;
    if (cond && conc) return `Implies (${cond}) (${conc})`;
  }

  if (op === 'Not') {
    const innerOp = metadata.innerOperator || (Array.isArray(metadata.args) ? metadata.args[0] : null);
    const innerArgs = metadata.innerArgs || (Array.isArray(metadata.args) ? metadata.args.slice(1) : []);
    if (typeof innerOp !== 'string' || !innerOp) return 'Not';
    const inner = joinTokens([innerOp, ...(innerArgs || [])].map(String));
    return `Not (${inner})`;
  }

  const args = Array.isArray(metadata.args) ? metadata.args.map(String) : [];
  return joinTokens([op, ...args]);
}
