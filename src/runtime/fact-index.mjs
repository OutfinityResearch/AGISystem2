const KEY_SEP = '\u001f';

function binaryKey(operator, arg0, arg1) {
  return `${operator}${KEY_SEP}${arg0}${KEY_SEP}${arg1}`;
}

function naryKey(operator, args) {
  const parts = [operator, ...(Array.isArray(args) ? args : [])].map(s => String(s ?? ''));
  return parts.join(KEY_SEP);
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
    /** @type {Map<string, any>} */
    this.byNary = new Map(); // operator+args... -> fact (first fact wins)
    /** @type {Map<string, any[]>} */
    this.byOperator = new Map(); // operator -> facts (in insertion order)
  }

  addFact(fact) {
    const meta = fact?.metadata;
    if (!meta?.operator) return;

    if (!this.byOperator.has(meta.operator)) this.byOperator.set(meta.operator, []);
    this.byOperator.get(meta.operator).push(fact);

    if (Array.isArray(meta.args)) {
      const key = naryKey(meta.operator, meta.args);
      if (!this.byNary.has(key)) this.byNary.set(key, fact);
    }

    if (!Array.isArray(meta.args) || meta.args.length < 2) return;
    const [arg0, arg1] = meta.args;
    if (!arg0 || !arg1) return;
    const key = binaryKey(meta.operator, arg0, arg1);
    if (!this.byBinary.has(key)) {
      this.byBinary.set(key, fact);
    }
  }

  getByOperator(operator) {
    if (!operator) return [];
    return this.byOperator.get(operator) || [];
  }

  getNary(operator, args) {
    if (!operator) return null;
    return this.byNary.get(naryKey(operator, args)) || null;
  }

  hasNary(operator, args) {
    if (!operator) return false;
    return this.byNary.has(naryKey(operator, args));
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
