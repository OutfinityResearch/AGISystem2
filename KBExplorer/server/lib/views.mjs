import { withPosition } from '../../../src/core/position.mjs';

export function buildFactLabel(session, fact) {
  const meta = fact?.metadata;
  if (meta?.operator && Array.isArray(meta?.args)) {
    try {
      return session.generateText(meta.operator, meta.args);
    } catch {
      return `${meta.operator} ${meta.args.join(' ')}`.trim();
    }
  }
  if (fact?.name) return String(fact.name);
  return `Fact #${fact?.id ?? '?'}`;
}

function metadataComplexity(meta) {
  if (!meta || typeof meta !== 'object') return 0;
  let score = 1;
  const op = typeof meta.operator === 'string' ? meta.operator : null;
  const args = Array.isArray(meta.args) ? meta.args : [];
  score += op ? 1 : 0;
  score += args.length;

  // Weight structured operators slightly higher.
  if (op === 'Implies' || op === 'And' || op === 'Or' || op === 'Exists' || op === 'ForAll' || op === 'Not') {
    score += 5;
  }

  if (meta.inner) score += metadataComplexity(meta.inner);
  if (meta.condition) score += metadataComplexity(meta.condition);
  if (meta.conclusion) score += metadataComplexity(meta.conclusion);
  if (meta.body) score += metadataComplexity(meta.body);
  if (Array.isArray(meta.parts)) {
    for (const p of meta.parts) score += metadataComplexity(p);
  }
  return score;
}

export function buildFactSummary(session, fact) {
  const operator = fact?.metadata?.operator ?? null;
  const args = Array.isArray(fact?.metadata?.args) ? fact.metadata.args : [];
  const name = fact?.name ?? null;
  const label = buildFactLabel(session, fact);
  const complexity = metadataComplexity(fact?.metadata || null);
  return { factId: fact.id, name, operator, args, label, complexity };
}

export function vectorValue(vec, { maxItems = 64, offset = 0 } = {}) {
  if (!vec) return null;
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const limit = Number.isFinite(maxItems) ? Math.max(1, Math.floor(maxItems)) : 64;

  // Dense-binary: Uint32Array
  if (vec?.data instanceof Uint32Array) {
    const u32 = vec.data;
    const n = Math.min(limit, Math.max(0, u32.length - start));
    const values = [];
    for (let i = 0; i < n; i++) {
      values.push(u32[start + i] >>> 0);
    }
    return { values, truncated: u32.length > start + n, total: u32.length, offset: start, limit };
  }

  // Metric-affine: Uint8Array
  if (vec?.data instanceof Uint8Array) {
    const u8 = vec.data;
    const n = Math.min(limit, Math.max(0, u8.length - start));
    const values = [];
    for (let i = 0; i < n; i++) values.push(u8[start + i]);
    return { values, truncated: u8.length > start + n, total: u8.length, offset: start, limit };
  }

  // Sparse polynomial: Set<bigint>
  if (vec?.exponents instanceof Set) {
    const arr = Array.from(vec.exponents);
    const n = Math.min(limit, Math.max(0, arr.length - start));
    const values = [];
    for (let i = 0; i < n; i++) values.push(`0x${arr[start + i].toString(16)}`);
    return { values, truncated: arr.length > start + n, total: arr.length, offset: start, limit };
  }

  // EXACT: bigint[] terms
  if (Array.isArray(vec?.terms) && vec.terms.every(t => typeof t === 'bigint')) {
    const terms = vec.terms;
    const n = Math.min(limit, Math.max(0, terms.length - start));
    const values = [];
    for (let i = 0; i < n; i++) values.push(`0x${terms[start + i].toString(16)}`);
    return { values, truncated: terms.length > start + n, total: terms.length, offset: start, limit };
  }

  // Fallback: serialize if possible and show its data payload.
  if (typeof vec.serialize === 'function') {
    try {
      const s = vec.serialize();
      const data = s?.data;
      const arr = Array.isArray(data) ? data : [data];
      const n = Math.min(limit, Math.max(0, arr.length - start));
      return { values: arr.slice(start, start + n), truncated: arr.length > start + n, total: arr.length, offset: start, limit };
    } catch {
      // ignore
    }
  }

  return null;
}

export function vectorItemCount(vec) {
  if (!vec) return 0;

  if (vec?.data instanceof Uint32Array) return vec.data.length;
  if (vec?.data instanceof Uint8Array) return vec.data.length;
  if (vec?.exponents instanceof Set) return vec.exponents.size;
  if (Array.isArray(vec?.terms) && vec.terms.every(t => typeof t === 'bigint')) return vec.terms.length;

  if (typeof vec.serialize === 'function') {
    try {
      const s = vec.serialize();
      const data = s?.data;
      if (Array.isArray(data)) return data.length;
      return data == null ? 0 : 1;
    } catch {
      return 0;
    }
  }

  return 0;
}

export function polynomialTermCount(vec) {
  if (!vec) return 0;
  if (vec?.exponents instanceof Set) return vec.exponents.size; // sparse-polynomial
  if (Array.isArray(vec?.terms) && vec.terms.every(t => typeof t === 'bigint')) return vec.terms.length; // exact
  return 0;
}

export function stringifyGraphDef(graphDef) {
  if (!graphDef) return '';
  const params = Array.isArray(graphDef.params) ? graphDef.params : [];

  let head = 'graph';
  if (graphDef.name && graphDef.persistName) head = `@${graphDef.name}:${graphDef.persistName} graph`;
  else if (graphDef.name) head = `@${graphDef.name} graph`;
  else if (graphDef.persistName) head = `@:${graphDef.persistName} graph`;

  const lines = [];
  const header = `${head}${params.length ? ` ${params.join(' ')}` : ''}`;
  const headerComment = typeof graphDef?.source?.comment === 'string' && graphDef.source.comment.trim()
    ? graphDef.source.comment.trim()
    : null;
  lines.push(headerComment ? `${header}  # ${headerComment}` : header);

  const body = Array.isArray(graphDef.body) ? graphDef.body : [];
  for (const stmt of body) {
    const raw = typeof stmt?.toString === 'function' ? stmt.toString() : String(stmt || '');
    if (!raw.trim()) continue;
    const c = typeof stmt?.comment === 'string' && stmt.comment.trim() ? stmt.comment.trim() : null;
    lines.push(c ? `    ${raw}  # ${c}` : `    ${raw}`);
  }

  if (graphDef.returnExpr) {
    const raw = typeof graphDef.returnExpr?.toString === 'function'
      ? graphDef.returnExpr.toString()
      : String(graphDef.returnExpr);
    if (raw.trim()) {
      const c = typeof graphDef.returnComment === 'string' && graphDef.returnComment.trim() ? graphDef.returnComment.trim() : null;
      lines.push(c ? `    return ${raw}  # ${c}` : `    return ${raw}`);
    }
  }

  lines.push('end');
  return lines.join('\n');
}

export function buildGraphList(session) {
  const graphs = session?.graphs;
  if (!graphs || typeof graphs.get !== 'function') return [];

  // Deduplicate by graph object identity first.
  const unique = new Set();
  const out = [];
  for (const [, def] of graphs.entries()) {
    if (!def || typeof def !== 'object') continue;
    if (unique.has(def)) continue;
    unique.add(def);

    const name = String(def.persistName || def.name || '');
    if (!name) continue;

    const bodyLen = Array.isArray(def.body) ? def.body.length : 0;
    out.push({
      name,
      params: Array.isArray(def.params) ? def.params : [],
      bodyLen,
      hasReturn: !!def.returnExpr
    });
  }
  return out;
}

export function findGraphDef(session, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  return session?.graphs?.get?.(n) || null;
}

export function classifyLayer(name) {
  const n = String(name || '');
  if (n.startsWith('___')) return 'L0';
  if (n.startsWith('__')) return 'L1';
  if (n.startsWith('_')) return 'L2';
  return 'L3';
}

export function isPositionToken(name) {
  const n = String(name || '');
  return /^Pos\d+$/.test(n) || /^__Pos\d+__$/.test(n) || /^__POS_\d+__$/.test(n);
}

export function buildBundleView(session, fact) {
  const summary = buildFactSummary(session, fact);
  const meta = fact?.metadata || {};
  const op = meta?.operator ?? null;
  const args = Array.isArray(meta?.args) ? meta.args : [];

  const nameIndex = new Map();
  for (const f of session.kbFacts || []) {
    if (f?.name) nameIndex.set(String(f.name), f);
  }

  const factVector = vectorValue(fact?.vector) || null;
  const operatorFact = op ? (nameIndex.get(String(op)) || null) : null;
  const operatorVector = op ? session.vocabulary?.getOrCreate?.(String(op)) : null;
  const operatorGraph = op ? (session.graphs?.get?.(String(op)) || null) : null;
  const operatorSource = operatorFact?.metadata?.source || session?.vocabulary?.getSource?.(String(op)) || null;
  const operatorItem = {
    kind: 'VERB',
    role: 'operator',
    label: op ? String(op) : '(unknown operator)',
    definitionFactId: operatorFact?.id ?? null,
    definitionFactLabel: operatorFact ? buildFactLabel(session, operatorFact) : null,
    source: operatorSource,
    vectorValue: vectorValue(operatorVector),
    graphDsl: operatorGraph ? stringifyGraphDef(operatorGraph) : null,
    hasChildren: false
  };

  const binds = [];
  for (let i = 0; i < args.length; i++) {
    const position = i + 1;
    const arg = String(args[i] ?? '');
    const argFact = nameIndex.get(arg) || null;
    const argFactId = argFact?.id ?? null;
    const argFactLabel = argFact ? buildFactLabel(session, argFact) : null;
    const argComplexity = argFact ? metadataComplexity(argFact?.metadata || null) : 0;
    const argVector = session.vocabulary?.getOrCreate?.(arg) || null;
    const positionedVector = argVector ? withPosition(position, argVector, session) : null;
    const argSource = argFact?.metadata?.source || session?.vocabulary?.getSource?.(arg) || null;

    binds.push({
      kind: 'BIND',
      position,
      arg,
      label: `#${position}: ${arg}`,
      argFactId,
      argFactLabel,
      argComplexity,
      source: argSource,
      vectorValue: vectorValue(argVector),
      positionedVectorValue: vectorValue(positionedVector),
      hasChildren: !!argFactId
    });
  }

  // For readability: keep BINDs ordered by position, but show more complex args earlier when same position count isn't meaningful.
  // (Position order is still preserved as primary key.)
  binds.sort((a, b) => a.position - b.position);

  const statementDsl = (() => {
    if (!op) return '';
    if (!Array.isArray(args)) return String(op);
    if (op === '___NewVector') {
      // Core uses literals; show them quoted for fidelity.
      return `${op} ${args.map(a => JSON.stringify(String(a))).join(' ')}`.trim();
    }
    return `${op} ${args.map(a => String(a)).join(' ')}`.trim();
  })();

  return {
    fact: summary,
    metadata: meta || null,
    source: meta?.source || null,
    dsl: (summary.operator && Array.isArray(summary.args)) ? `${summary.operator} ${summary.args.join(' ')}`.trim() : '',
    statementDsl,
    vectors: {
      factVector: factVector || null,
      operatorVector: operatorItem.vectorValue || null
    },
    bundle: {
      operator: operatorItem,
      binds,
      items: [operatorItem, ...binds]
    }
  };
}
