const KEY_SEP = '\u001f';

function binaryKey(operator, arg0, arg1) {
  return `${operator}${KEY_SEP}${arg0}${KEY_SEP}${arg1}`;
}

/**
 * Lightweight fact index for O(1) exact lookups.
 *
 * Intended hot-path uses:
 * - theory-driven contradiction checks (mutuallyExclusive, contradictsSameArgs)
 * - direct-fact presence checks (exact operator + args)
 *
 * Notes:
 * - This index is exact-string based; canonicalization must already be applied
 *   before facts are inserted (Session.addToKB does that).
 * - The index stores only the first fact per key (duplicates are not relevant
 *   for contradiction detection).
 */
export class FactIndex {
  constructor() {
    /** @type {Map<string, any>} */
    this.byBinary = new Map(); // operator+arg0+arg1 -> fact
  }

  addFact(fact) {
    const meta = fact?.metadata;
    if (!meta?.operator || !Array.isArray(meta.args) || meta.args.length < 2) return;
    const [arg0, arg1] = meta.args;
    if (!arg0 || !arg1) return;
    const key = binaryKey(meta.operator, arg0, arg1);
    if (!this.byBinary.has(key)) {
      this.byBinary.set(key, fact);
    }
  }

  getBinary(operator, arg0, arg1) {
    if (!operator || !arg0 || !arg1) return null;
    return this.byBinary.get(binaryKey(operator, arg0, arg1)) || null;
  }

  hasBinary(operator, arg0, arg1) {
    if (!operator || !arg0 || !arg1) return false;
    return this.byBinary.has(binaryKey(operator, arg0, arg1));
  }
}

export default FactIndex;

