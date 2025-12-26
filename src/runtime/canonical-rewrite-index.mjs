function asIntegerList(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const v of value) {
    const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN);
    if (!Number.isInteger(n) || n < 0) return null;
    out.push(n);
  }
  return out;
}

function asEqPairs(value) {
  if (!Array.isArray(value)) return [];
  const pairs = [];
  for (const pair of value) {
    const ints = asIntegerList(pair);
    if (!ints || ints.length !== 2) continue;
    pairs.push([ints[0], ints[1]]);
  }
  return pairs;
}

export class CanonicalRewriteIndex {
  constructor({ rules = new Map(), nextOrder = 0 } = {}) {
    this.rules = rules; // fromOp -> Array<rule>
    this.nextOrder = nextOrder;
  }

  clone() {
    const copied = new Map();
    for (const [from, list] of this.rules.entries()) {
      copied.set(from, list.map(r => ({ ...r, eq: (r.eq || []).map(p => [...p]) })));
    }
    return new CanonicalRewriteIndex({ rules: copied, nextOrder: this.nextOrder });
  }

  observeFact(fact) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'canonicalRewrite') return;
    const args = meta.args || [];
    const fromOp = args[0];
    const toOp = args[1];
    if (typeof fromOp !== 'string' || typeof toOp !== 'string') return;

    const argMap = asIntegerList(meta.argMap);
    if (!argMap || argMap.length === 0) return;

    const eq = asEqPairs(meta.eq);

    const rule = {
      id: fact.id ?? null,
      fromOp,
      toOp,
      argMap,
      eq,
      order: this.nextOrder++
    };

    if (!this.rules.has(fromOp)) this.rules.set(fromOp, []);
    const existing = this.rules.get(fromOp);
    const sig = JSON.stringify({ toOp, argMap, eq });
    const seen = existing.some(r => JSON.stringify({ toOp: r.toOp, argMap: r.argMap, eq: r.eq }) === sig);
    if (!seen) existing.push(rule);
  }

  getRules(fromOp) {
    return this.rules.get(fromOp) || [];
  }

  canRewrite(fromOp, arity) {
    if (!fromOp) return false;
    for (const rule of this.getRules(fromOp)) {
      if (rule.argMap.every(i => i < arity)) return true;
    }
    return false;
  }

  /**
   * Convenience: bootstrap default core rewrites if no rules loaded.
   * This keeps strict mode usable even when Core isn't loaded yet.
   */
  static withCoreDefaults() {
    const idx = new CanonicalRewriteIndex();

    // These match config/Core/11-bootstrap-verbs.sys2 canonical macros.
    const defaults = [
      { fromOp: '_mtrans', toOp: 'tell', argMap: [0, 1, 3], eq: [[0, 2]] },
      { fromOp: '_atrans', toOp: 'give', argMap: [0, 1, 3], eq: [[0, 2]] },
      { fromOp: '_atrans', toOp: 'take', argMap: [0, 1, 2], eq: [[0, 3]] },
      { fromOp: '_ptrans', toOp: 'go', argMap: [0, 2, 3], eq: [[0, 1]] },
      { fromOp: '_ptrans', toOp: 'move', argMap: [0, 1, 2, 3], eq: [] },
      { fromOp: '_speak', toOp: 'say', argMap: [0, 1], eq: [] }
    ];
    for (const item of defaults) {
      const rule = { ...item, id: null, order: idx.nextOrder++ };
      if (!idx.rules.has(item.fromOp)) idx.rules.set(item.fromOp, []);
      idx.rules.get(item.fromOp).push(rule);
    }

    return idx;
  }
}
