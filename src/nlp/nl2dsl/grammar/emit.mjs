import { genRef } from '../utils.mjs';
import { MAX_POSITIONS } from '../../../core/constants.mjs';

export function emitAtomLine(atom) {
  return `${atom.op} ${atom.args.join(' ')}`.trim();
}

// Persistent negation fact:
// - bind base as a reference for metadata expansion
// - persist the Not(...) line (no @dest)
export function emitNotFact(atom) {
  const baseRef = genRef('base');
  return [
    `@${baseRef} ${emitAtomLine(atom)}`,
    `Not $${baseRef}`
  ];
}

export function emitExprAsRefs(exprItems, combineOp) {
  const leaves = [];
  const lines = [];

  for (const item of exprItems) {
    if (!item?.atom) continue;
    if (item.negated) {
      const baseRef = genRef('base');
      const negRef = genRef('neg');
      lines.push(`@${baseRef} ${emitAtomLine(item.atom)}`);
      lines.push(`@${negRef} Not $${baseRef}`);
      leaves.push(negRef);
    } else {
      const ref = genRef('cond');
      lines.push(`@${ref} ${emitAtomLine(item.atom)}`);
      leaves.push(ref);
    }
  }

  if (leaves.length === 0) return { lines: [], ref: null };
  if (leaves.length === 1) return { lines, ref: leaves[0] };

  // Bound by MAX_POSITIONS (positional vectors) – nest when needed.
  let current = leaves.slice();
  let lastRef = null;

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += MAX_POSITIONS) {
      const chunk = current.slice(i, i + MAX_POSITIONS);
      if (chunk.length === 1) {
        next.push(chunk[0]);
        continue;
      }
      const combRef = genRef(combineOp.toLowerCase());
      lines.push(`@${combRef} ${combineOp} ${chunk.map(r => `$${r}`).join(' ')}`);
      next.push(combRef);
      lastRef = combRef;
    }
    current = next;
  }

  return { lines, ref: current[0] || lastRef };
}
