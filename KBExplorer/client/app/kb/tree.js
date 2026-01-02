import { escapeHtml } from '../dom.js';

function kbNode({ nodeIndex, id, kind, label, depth, hasChildren = false, data = {} }) {
  const node = {
    id,
    kind,
    label,
    depth,
    hasChildren,
    expanded: false,
    loaded: false,
    loading: false,
    children: [],
    data
  };
  nodeIndex.set(id, node);
  return node;
}

function kbIcon(kind) {
  if (kind === 'CATEGORY') return { cls: 'ico ico--file', text: '▦' };
  if (kind === 'ACTION') return { cls: 'ico ico--file', text: '→' };
  if (kind === 'GRAPH') return { cls: 'ico ico--verb', text: 'G' };
  if (kind === 'KB_BUNDLE') return { cls: 'ico ico--bundle', text: '⊕' };
  if (kind === 'SCOPE') return { cls: 'ico ico--file', text: '@' };
  if (kind === 'FACT') return { cls: 'ico ico--fact', text: '⊕' };
  if (kind === 'BIND') return { cls: 'ico ico--bind', text: '⊗' };
  if (kind === 'VERB') return { cls: 'ico ico--verb', text: 'V' };
  if (kind === 'ATOM') return { cls: 'ico ico--atom', text: '•' };
  return { cls: 'ico ico--file', text: '•' };
}

export function selectedNode({ state }) {
  const id = state.kb.selectedNodeId;
  if (!id) return null;
  return state.kb.nodeIndex.get(id) || null;
}

async function ensureDefinitionLoaded(ctx, definitionFactId) {
  const { api, state } = ctx;
  const id = Number(definitionFactId);
  if (!Number.isFinite(id)) return null;
  if (!state.kb.definitionCache) state.kb.definitionCache = new Map();
  if (state.kb.definitionCache.has(id)) return state.kb.definitionCache.get(id);
  const res = await api(`/api/kb/facts/${id}/bundle`);
  state.kb.definitionCache.set(id, res);
  return res;
}

async function ensureDefinitionTreeLoaded(ctx, node) {
  const { state } = ctx;
  if (!node || (node.kind !== 'ATOM' && node.kind !== 'VERB')) return;
  if (node.loaded || node.loading) return;
  const defId = node?.data?.definitionFactId;
  if (typeof defId !== 'number' || !Number.isFinite(defId)) return;

  node.loading = true;
  try {
    const res = await ensureDefinitionLoaded(ctx, defId);
    node.data.definition = res;

    const op = res?.bundle?.operator?.label || res?.fact?.operator || '(operator)';
    const binds = Array.isArray(res?.bundle?.binds) ? [...res.bundle.binds] : [];
    binds.sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

    const opDefId = res?.bundle?.operator?.definitionFactId ?? null;
    const opDefLabel = res?.bundle?.operator?.definitionFactLabel ?? null;
    const opVecVal = res?.bundle?.operator?.vectorValue ?? res?.vectors?.operatorVector ?? null;

    const opNode = kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `${node.id}:def:verb:${op}`,
      kind: 'VERB',
      label: String(op),
      depth: node.depth + 1,
      hasChildren: !!(typeof opDefId === 'number' && Number.isFinite(opDefId)),
      data: {
        role: 'operator',
        value: String(op),
        definitionFactId: typeof opDefId === 'number' ? opDefId : null,
        definitionLabel: opDefLabel,
        vectorValue: opVecVal,
        graphDsl: res?.bundle?.operator?.graphDsl || null
      }
    });

    const children = [opNode];
    for (const b of binds) {
      const bindNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `${node.id}:def:bind:${b.position}:${b.arg}`,
        kind: 'BIND',
        label: `#${b.position}`,
        depth: node.depth + 1,
        hasChildren: true,
        data: {
          position: b.position,
          arg: b.arg,
          positionedVectorValue: b.positionedVectorValue ?? null
        }
      });

      const argNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `${node.id}:def:atom:${b.position}:${b.arg}`,
        kind: 'ATOM',
        label: b.arg,
        depth: node.depth + 2,
        hasChildren: typeof b.argFactId === 'number' && Number.isFinite(b.argFactId),
        data: {
          role: 'arg',
          value: b.arg,
          position: b.position,
          definitionFactId: typeof b.argFactId === 'number' ? b.argFactId : null,
          definitionLabel: b.argFactLabel ?? null,
          vectorValue: b.vectorValue ?? null
        }
      });

      bindNode.children = [argNode];
      bindNode.loaded = true;
      bindNode.expanded = true;

      children.push(bindNode);
    }

    node.children = children;
    node.loaded = true;
  } finally {
    node.loading = false;
  }
}

export function renderDetails({ $, state }, node) {
  const detailsEl = $('kbDetails');
  if (!node) {
    detailsEl.innerHTML = '<span class="muted">Select a node to see details.</span>';
    return;
  }

  const payload = {
    id: node.id,
    kind: node.kind,
    label: node.label,
    expanded: !!node.expanded,
    loaded: !!node.loaded,
    loading: !!node.loading,
    data: node.data || {}
  };

  const defn = buildDefinitionText({ state }, node) || '(none)';
  const formal = buildFormalDefinitionText({ state }, node) || '(none)';
  const vec = buildVectorText({ state }, node) || '(none)';

  const defBlock = `<div class="details__equation"><div class="details__sectionTitle">Definition</div><pre>${escapeHtml(defn)}</pre></div>`;
  const formalBlock = `<div class="details__equation"><div class="details__sectionTitle">Encoding</div><pre>${escapeHtml(formal)}</pre></div>`;
  const vecBlock = `<div class="details__equation"><div class="details__sectionTitle">Vector</div><pre>${escapeHtml(vec)}</pre></div>`;

  detailsEl.innerHTML =
    `${defBlock}${formalBlock}${vecBlock}` +
    `<div class="details__json"><div class="details__sectionTitle">Raw</div><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div>`;
}

function atom(name) {
  return `ATOM(${name})`;
}

function buildFactParts(node) {
  const meta = node?.data?.metadata;
  const op = meta?.operator ?? null;
  const args = Array.isArray(meta?.args) ? meta.args : [];
  return { op, args };
}

function formatStatementLine(op, args) {
  if (!op) return '';
  if (!Array.isArray(args)) return String(op);
  if (op === '___NewVector') {
    return `${op} ${args.map(a => JSON.stringify(String(a))).join(' ')}`.trim();
  }
  return `${op} ${args.map(a => String(a)).join(' ')}`.trim();
}

function formatStatementWithAt(name, statementDsl) {
  const line = String(statementDsl || '').trim();
  if (!line) return '';
  const n = name ? String(name).trim() : '';
  if (!n) return line;
  return `@:${n} ${line}`.trim();
}

function buildDefinitionText(_ctx, node) {
  if (!node) return '';

  if (node.kind === 'GRAPH') {
    return node?.data?.graphDsl ? String(node.data.graphDsl) : '';
  }

  if (node.kind === 'KB_BUNDLE') {
    return 'KB bundle (superposition of all facts in this session).';
  }

  if (node.kind === 'CATEGORY') {
    return '';
  }

  if (node.kind === 'ACTION') {
    return '';
  }

  if (node.kind === 'ATOM' || node.kind === 'VERB') {
    const def = node?.data?.definition || null;
    if (def?.statementDsl) return formatStatementWithAt(def?.fact?.name || null, def.statementDsl);
    const meta = def?.metadata || null;
    if (meta?.operator) return formatStatementWithAt(def?.fact?.name || null, formatStatementLine(meta.operator, meta.args));
    const graphDsl = node?.data?.graphDsl;
    return graphDsl ? String(graphDsl) : '';
  }

  if (node.kind === 'BIND') {
    const pos = node?.data?.position ?? null;
    const arg = node?.data?.arg ?? null;
    if (!Number.isFinite(Number(pos)) || !arg) return '';
    return `Pos${Number(pos)} ⊕ ${String(arg)}`;
  }

  if (node.kind === 'SCOPE') {
    const name = node?.data?.name || node.label;
    return name ? `@${String(name)}` : '';
  }

  if (node.kind !== 'FACT') return '';
  if (!node.loaded) return '';
  if (node?.data?.statementDsl) {
    const name = node?.data?.fact?.name || node?.data?.summary?.name || null;
    return formatStatementWithAt(name, node.data.statementDsl);
  }
  const meta = node?.data?.metadata || null;
  if (!meta?.operator) return '';
  const name = node?.data?.fact?.name || node?.data?.summary?.name || null;
  return formatStatementWithAt(name, formatStatementLine(meta.operator, meta.args));
}

function formatFormalFromMeta(meta) {
  const op = meta?.operator ?? null;
  const args = Array.isArray(meta?.args) ? meta.args : [];
  if (!op) return '';
  if (args.length === 0) return String(op);
  const taggedArgs = args.map((a, i) => `(Pos${i + 1} ⊕ ${String(a)})`);
  return [String(op), ...taggedArgs].join(' ⊕ ');
}

function buildFormalDefinitionText(_ctx, node) {
  if (!node) return '';

  if (node.kind === 'BIND') {
    const pos = node?.data?.position ?? null;
    const arg = node?.data?.arg ?? null;
    if (!Number.isFinite(Number(pos)) || !arg) return '';
    return `Pos${Number(pos)} ⊕ ${String(arg)}`;
  }

  if (node.kind === 'ATOM' || node.kind === 'VERB') {
    const meta = node?.data?.definition?.metadata || null;
    if (meta) return formatFormalFromMeta(meta);
    return '';
  }

  if (node.kind !== 'FACT') return '';
  if (!node.loaded) return '';
  return formatFormalFromMeta(node?.data?.metadata || null);
}

function formatVectorLine(label, vv) {
  if (!vv?.values) return '';
  const suffix = vv.truncated ? ` … (truncated, total=${vv.total})` : '';
  return `${label}: ${JSON.stringify(vv.values)}${suffix}`;
}

function buildVectorText(_ctx, node) {
  if (!node) return '';

  // Show exactly one vector: the selected node's own vector representation.
  let vv = null;
  if (node.kind === 'FACT') vv = node?.data?.factVectorValue || null;
  else if (node.kind === 'BIND') vv = node?.data?.positionedVectorValue || null;
  else if (node.kind === 'GRAPH') vv = node?.data?.vectorValue || null;
  else if (node.kind === 'KB_BUNDLE') vv = node?.data?.vectorValue || null;
  else if (node.kind === 'SCOPE') vv = node?.data?.vectorValue || null;
  else vv = node?.data?.vectorValue || null;

  if (!vv?.values) return '';
  const suffix = vv.truncated ? `\n… (truncated, total=${vv.total})` : '';
  return `${JSON.stringify(vv.values, null, 2)}${suffix}`;
}

export function setSelectedNode(ctx, node) {
  const { state } = ctx;
  state.kb.selectedNodeId = node?.id || null;
  renderTree(ctx);
  renderDetails(ctx, node || null);
}

async function ensureKbBundleLoaded(ctx, kbBundleNode) {
  const { api } = ctx;
  if (!kbBundleNode || kbBundleNode.kind !== 'KB_BUNDLE') return;
  if (kbBundleNode.loaded || kbBundleNode.loading) return;
  kbBundleNode.loading = true;
  try {
    const res = await api('/api/kb/bundle');
    kbBundleNode.data.vectorValue = res.kbVector || null;
    kbBundleNode.loaded = true;
  } finally {
    kbBundleNode.loading = false;
  }
}

async function ensureGraphLoaded(ctx, graphNode) {
  const { api, state } = ctx;
  if (!graphNode || graphNode.kind !== 'GRAPH') return;
  if (graphNode.loaded || graphNode.loading) return;
  const name = graphNode?.data?.name || graphNode.label;
  if (!name) return;
  graphNode.loading = true;
  try {
    const res = await api(`/api/graphs/${encodeURIComponent(String(name))}`);
    graphNode.data.name = res.name || String(name);
    graphNode.data.graphDsl = res.graphDsl || '';
    graphNode.data.vectorValue = res.vectors?.operatorVector || null;
    graphNode.data.kbFactId = res.kbFactId ?? null;
    graphNode.data.kbFactLabel = res.kbFactLabel ?? null;
    graphNode.loaded = true;

    if (typeof graphNode.data.kbFactId === 'number' && Number.isFinite(graphNode.data.kbFactId)) {
      graphNode.hasChildren = true;
      graphNode.children = [
        kbNode({
          nodeIndex: state.kb.nodeIndex,
          id: `graph:${String(name)}:fact:${graphNode.data.kbFactId}`,
          kind: 'FACT',
          label: graphNode.data.kbFactLabel || `Fact#${graphNode.data.kbFactId}`,
          depth: graphNode.depth + 1,
          hasChildren: true,
          data: { factId: graphNode.data.kbFactId, summary: { factId: graphNode.data.kbFactId, name: null, operator: null, args: [], label: graphNode.data.kbFactLabel || '', complexity: 0 } }
        })
      ];
    } else {
      graphNode.hasChildren = false;
      graphNode.children = [];
    }
  } finally {
    graphNode.loading = false;
  }
}

async function ensureVocabAtomLoaded(ctx, atomNode) {
  const { api, state } = ctx;
  if (!atomNode || atomNode.kind !== 'ATOM') return;
  if (atomNode.loaded || atomNode.loading) return;
  if (atomNode.data?.source !== 'vocab') return;
  const name = atomNode?.data?.name || atomNode.label;
  if (!name) return;
  atomNode.loading = true;
  try {
    const res = await api(`/api/vocab/atoms/${encodeURIComponent(String(name))}`);
    atomNode.data.vectorValue = res.vectors?.atomVector || null;
    atomNode.data.kbFactId = res.kbFactId ?? null;
    atomNode.data.kbFactLabel = res.kbFactLabel ?? null;
    atomNode.data.hasGraph = !!res.hasGraph;
    atomNode.loaded = true;

    const kids = [];
    if (atomNode.data.hasGraph) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `vocab:${String(name)}:graph`,
        kind: 'GRAPH',
        label: String(name),
        depth: atomNode.depth + 1,
        hasChildren: true,
        data: { name: String(name) }
      }));
    }
    if (typeof atomNode.data.kbFactId === 'number' && Number.isFinite(atomNode.data.kbFactId)) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `vocab:${String(name)}:fact:${atomNode.data.kbFactId}`,
        kind: 'FACT',
        label: atomNode.data.kbFactLabel || `Fact#${atomNode.data.kbFactId}`,
        depth: atomNode.depth + 1,
        hasChildren: true,
        data: { factId: atomNode.data.kbFactId, summary: { factId: atomNode.data.kbFactId, name: String(name), operator: null, args: [], label: atomNode.data.kbFactLabel || '', complexity: 0 } }
      }));
    }
    atomNode.children = kids;
    atomNode.hasChildren = kids.length > 0;
  } finally {
    atomNode.loading = false;
  }
}

export async function ensureFactLoaded(ctx, factNode) {
  const { api, state } = ctx;
  if (!factNode || factNode.kind !== 'FACT') return;
  if (factNode.loaded || factNode.loading) return;
  factNode.loading = true;
  try {
    const res = await api(`/api/kb/facts/${factNode.data.factId}/bundle`);
    factNode.data.fact = res.fact;
    factNode.data.metadata = res.metadata || null;
    factNode.data.factDsl = res.dsl || '';
    factNode.data.statementDsl = res.statementDsl || '';
    factNode.data.factVectorValue = res.vectors?.factVector || null;
    factNode.data.operatorVectorValue = res.vectors?.operatorVector || null;
    factNode.data.bundle = res.bundle || null;
    factNode.data.binds = Array.isArray(res.bundle?.binds) ? res.bundle.binds : [];

    const op = res.bundle?.operator?.label || res.fact?.operator || '(operator)';
    const binds = Array.isArray(res.bundle?.binds) ? [...res.bundle.binds] : [];
    binds.sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

    const opDefId = res.bundle?.operator?.definitionFactId ?? null;
    const opDefLabel = res.bundle?.operator?.definitionFactLabel ?? null;
    const opVecVal = res.bundle?.operator?.vectorValue ?? res.vectors?.operatorVector ?? null;

    const opNode = kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `atom:${factNode.data.factId}:operator:${op}`,
      kind: 'VERB',
      label: String(op),
      depth: factNode.depth + 1,
      hasChildren: !!(typeof opDefId === 'number' && Number.isFinite(opDefId)),
      data: {
        role: 'operator',
        value: String(op),
        definitionFactId: typeof opDefId === 'number' ? opDefId : null,
        definitionLabel: opDefLabel,
        vectorValue: opVecVal,
        graphDsl: res.bundle?.operator?.graphDsl || null
      }
    });

    const children = [opNode];
    for (const b of binds) {
      const bindNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `bind:${factNode.data.factId}:arg:${b.position}:${b.arg}`,
        kind: 'BIND',
        label: `#${b.position}`,
        depth: factNode.depth + 1,
        hasChildren: true,
        data: {
          position: b.position,
          arg: b.arg,
          positionedVectorValue: b.positionedVectorValue ?? null
        }
      });

      const argNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `atom:${factNode.data.factId}:arg:${b.position}:${b.arg}`,
        kind: 'ATOM',
        label: b.arg,
        depth: factNode.depth + 2,
        hasChildren: typeof b.argFactId === 'number' && Number.isFinite(b.argFactId),
        data: {
          role: 'arg',
          value: b.arg,
          position: b.position,
          definitionFactId: typeof b.argFactId === 'number' ? b.argFactId : null,
          definitionLabel: b.argFactLabel ?? null,
          vectorValue: b.vectorValue ?? null
        }
      });

      bindNode.children = [argNode];
      bindNode.loaded = true;
      bindNode.expanded = true;

      children.push(bindNode);
    }

    factNode.children = children;
    factNode.loaded = true;
  } finally {
    factNode.loading = false;
  }
}

async function ensureKbFactsLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'facts') return;
  categoryNode.loading = true;
  try {
    const params = new URLSearchParams();
    const q = String(state.kb.q || '').trim();
    if (q) params.set('q', q);
    params.set('offset', String(state.kb.kbOffset));
    params.set('limit', String(state.kb.kbLimit));
    params.set('namedOnly', state.kb.namedOnly ? '1' : '0');
    params.set('namedFirst', '1');
    const res = await api(`/api/kb/facts?${params.toString()}`);
    state.kb.kbTotal = res.total ?? 0;
    state.kb.kbOffset = res.offset ?? state.kb.kbOffset;
    state.kb.kbLimit = res.limit ?? state.kb.kbLimit;
    state.kb.facts = res.facts || [];

    const kids = state.kb.facts.map(f => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `fact:${f.factId}`,
      kind: 'FACT',
      label: f.name || f.label || `#${f.factId}`,
      depth: categoryNode.depth + 1,
      hasChildren: true,
      data: { factId: f.factId, summary: f }
    }));

    if ((state.kb.kbOffset + state.kb.kbLimit) < state.kb.kbTotal) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:facts:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'factsMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureGraphsLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'graphs') return;
  categoryNode.loading = true;
  try {
    const params = new URLSearchParams();
    const q = String(state.kb.q || '').trim();
    if (q) params.set('q', q);
    params.set('offset', String(state.kb.graphOffset));
    params.set('limit', String(state.kb.graphLimit));
    const res = await api(`/api/graphs?${params.toString()}`);
    state.kb.graphTotal = res.total ?? 0;
    state.kb.graphOffset = res.offset ?? state.kb.graphOffset;
    state.kb.graphLimit = res.limit ?? state.kb.graphLimit;
    state.kb.graphs = res.graphs || [];

    const kids = state.kb.graphs.map(g => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `graph:${g.name}`,
      kind: 'GRAPH',
      label: g.name,
      depth: categoryNode.depth + 1,
      hasChildren: true,
      data: { name: g.name }
    }));

    if ((state.kb.graphOffset + state.kb.graphLimit) < state.kb.graphTotal) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:graphs:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'graphsMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureScopeLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'scope') return;
  categoryNode.loading = true;
  try {
    const params = new URLSearchParams();
    const q = String(state.kb.q || '').trim();
    if (q) params.set('q', q);
    params.set('offset', String(state.kb.scopeOffset));
    params.set('limit', String(state.kb.scopeLimit));
    const res = await api(`/api/scope/bindings?${params.toString()}`);
    state.kb.scopeTotal = res.total ?? 0;
    state.kb.scopeOffset = res.offset ?? state.kb.scopeOffset;
    state.kb.scopeLimit = res.limit ?? state.kb.scopeLimit;
    state.kb.scope = res.bindings || [];

    const kids = state.kb.scope.map(b => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `scope:${b.name}`,
      kind: 'SCOPE',
      label: b.name,
      depth: categoryNode.depth + 1,
      hasChildren: false,
      data: { name: b.name, vectorValue: b.vectorValue || null }
    }));

    if ((state.kb.scopeOffset + state.kb.scopeLimit) < state.kb.scopeTotal) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:scope:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'scopeMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureVocabLayerLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'vocabLayer') return;
  const layer = String(categoryNode.data.layer || '');
  if (!layer) return;
  categoryNode.loading = true;
  try {
    const params = new URLSearchParams();
    const q = String(state.kb.q || '').trim();
    if (q) params.set('q', q);
    params.set('layer', layer);
    params.set('offset', String(state.kb.vocab[layer].offset));
    params.set('limit', String(state.kb.vocab[layer].limit));
    const res = await api(`/api/vocab/atoms?${params.toString()}`);
    state.kb.vocab[layer].total = res.total ?? 0;
    state.kb.vocab[layer].offset = res.offset ?? state.kb.vocab[layer].offset;
    state.kb.vocab[layer].limit = res.limit ?? state.kb.vocab[layer].limit;
    state.kb.vocab[layer].atoms = res.atoms || [];

    const kids = state.kb.vocab[layer].atoms.map(a => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `vocab:${a.name}`,
      kind: 'ATOM',
      label: a.name,
      depth: categoryNode.depth + 1,
      hasChildren: !!a.hasGraph,
      data: { source: 'vocab', name: a.name, layer: a.layer, isPosition: !!a.isPosition }
    }));

    if ((state.kb.vocab[layer].offset + state.kb.vocab[layer].limit) < state.kb.vocab[layer].total) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `action:vocab:${layer}:more`,
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'vocabMore', layer }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureCategoryLoaded(ctx, node) {
  if (!node || node.kind !== 'CATEGORY') return;
  const cat = node.data.category;
  if (cat === 'facts') return ensureKbFactsLoaded(ctx, node);
  if (cat === 'graphs') return ensureGraphsLoaded(ctx, node);
  if (cat === 'scope') return ensureScopeLoaded(ctx, node);
  if (cat === 'vocabLayer') return ensureVocabLayerLoaded(ctx, node);
}

async function handleAction(ctx, node) {
  const { state } = ctx;
  const action = node?.data?.action;
  if (action === 'factsMore') {
    state.kb.kbOffset = state.kb.kbOffset + state.kb.kbLimit;
    const cat = state.kb.nodeIndex.get('cat:facts');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureKbFactsLoaded(ctx, cat);
    return;
  }
  if (action === 'graphsMore') {
    state.kb.graphOffset = state.kb.graphOffset + state.kb.graphLimit;
    const cat = state.kb.nodeIndex.get('cat:graphs');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureGraphsLoaded(ctx, cat);
    return;
  }
  if (action === 'scopeMore') {
    state.kb.scopeOffset = state.kb.scopeOffset + state.kb.scopeLimit;
    const cat = state.kb.nodeIndex.get('cat:scope');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureScopeLoaded(ctx, cat);
    return;
  }
  if (action === 'vocabMore') {
    const layer = String(node?.data?.layer || '');
    if (!layer || !state.kb.vocab?.[layer]) return;
    state.kb.vocab[layer].offset = state.kb.vocab[layer].offset + state.kb.vocab[layer].limit;
    const id = layer === 'Pos'
      ? 'cat:vocab:pos'
      : (layer === 'L0' ? 'cat:vocab:l0' : (layer === 'L1' ? 'cat:vocab:l1' : (layer === 'L2' ? 'cat:vocab:l2' : 'cat:vocab:l3')));
    const cat = state.kb.nodeIndex.get(id);
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureVocabLayerLoaded(ctx, cat);
  }
}

export function buildTree({ state }) {
  state.kb.nodeIndex = new Map();

  const root = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'root',
    kind: 'ROOT',
    label: 'Session',
    depth: 0,
    hasChildren: true,
    data: {}
  });
  root.expanded = true;
  root.loaded = true;

  const kbBundleNode = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'kb:bundle',
    kind: 'KB_BUNDLE',
    label: 'KB bundle',
    depth: 1,
    hasChildren: false,
    data: {}
  });

  const factsCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:facts',
    kind: 'CATEGORY',
    label: `Long-Term Memory (Facts) (${state.kb.kbFactCount ?? 0})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'facts' }
  });

  const graphsCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:graphs',
    kind: 'CATEGORY',
    label: `Procedural Memory (Graphs) (${state.kb.graphCount ?? 0})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'graphs' }
  });

  const vocabCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:vocab',
    kind: 'CATEGORY',
    label: `Lexicon (Symbols) (${state.kb.vocabCount ?? 0})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'vocab' }
  });
  vocabCat.loaded = true;
  vocabCat.children = [
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:pos', kind: 'CATEGORY', label: 'Role/slot markers (PosN)', depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'Pos' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l0', kind: 'CATEGORY', label: 'Primitives (___)', depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L0' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l1', kind: 'CATEGORY', label: 'Structural symbols (__)', depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L1' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l2', kind: 'CATEGORY', label: 'Semantic primitives (_)', depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L2' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l3', kind: 'CATEGORY', label: 'Domain symbols (no prefix)', depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L3' } })
  ];

  const scopeCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:scope',
    kind: 'CATEGORY',
    label: `Working Memory (Bindings) (${state.kb.scopeCount ?? 0})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'scope' }
  });

  root.children = [kbBundleNode, factsCat, graphsCat, vocabCat, scopeCat];
  state.kb.treeRoot = root;
}

export function renderTree(ctx) {
  const { $, state } = ctx;
  const treeEl = $('kbTree');
  treeEl.innerHTML = '';

  if (!state.kb.treeRoot) {
    treeEl.innerHTML = '<span class="muted">No data.</span>';
    return;
  }

  function renderNode(node) {
    const container = document.createElement('div');
    container.className = 'tree__node';

    const row = document.createElement('div');
    row.className = 'tree__row' + (node.id === state.kb.selectedNodeId ? ' tree__row--active' : '');

    const twisty = document.createElement('div');
    twisty.className = 'tree__twisty';
    twisty.textContent = node.hasChildren ? (node.expanded ? '▾' : '▸') : '';
    if (node.hasChildren) {
      twisty.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleNode(ctx, node);
      });
    }

    const icon = document.createElement('div');
    const ico = kbIcon(node.kind);
    icon.className = ico.cls;
    icon.textContent = ico.text;

    const label = document.createElement('div');
    label.className = 'tree__label';
    label.textContent = node.label;

    const meta = document.createElement('div');
    meta.className = 'tree__meta';
    if (node.kind === 'FACT') {
    } else if (node.kind === 'ATOM' || node.kind === 'VERB') {
      const parts = [];
      if (node?.data?.definitionFactId) parts.push('defined');
      if (node?.data?.source === 'vocab' && node?.data?.layer) parts.push(String(node.data.layer));
      meta.textContent = parts.join(' ');
    } else if (node.kind === 'GRAPH') {
      meta.textContent = '';
    }

    row.appendChild(twisty);
    row.appendChild(icon);
    row.appendChild(label);
    if (meta.textContent) row.appendChild(meta);

    row.addEventListener('click', async () => {
      setSelectedNode(ctx, node);

      if (node.kind === 'ACTION') {
        await handleAction(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'KB_BUNDLE' && !node.loaded) {
        await ensureKbBundleLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'CATEGORY' && !node.loaded) {
        await ensureCategoryLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'GRAPH' && !node.loaded) {
        await ensureGraphLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'ATOM' && node?.data?.source === 'vocab' && !node.loaded) {
        await ensureVocabAtomLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'FACT' && !node.loaded) {
        try {
          await ensureFactLoaded(ctx, node);
        } finally {
          renderTree(ctx);
          renderDetails(ctx, selectedNode({ state }));
        }
      }

      if ((node.kind === 'ATOM' || node.kind === 'VERB') && node.hasChildren && !node.loaded) {
        try {
          await ensureDefinitionTreeLoaded(ctx, node);
        } finally {
          renderTree(ctx);
          renderDetails(ctx, selectedNode({ state }));
        }
      }

      const defId = node?.data?.definitionFactId;
      if (typeof defId === 'number' && Number.isFinite(defId)) {
        try {
          node.data.definition = await ensureDefinitionLoaded(ctx, defId);
        } catch {
          node.data.definition = null;
        }
        renderDetails(ctx, selectedNode({ state }));
      }
    });
    container.appendChild(row);

    if (node.expanded && Array.isArray(node.children) && node.children.length) {
      const kids = document.createElement('div');
      kids.className = 'tree__children';
      for (const c of node.children) {
        kids.appendChild(renderNode(c));
      }
      container.appendChild(kids);
    }

    return container;
  }

  // Render top-level children of the root (not the root itself).
  for (const c of state.kb.treeRoot.children || []) {
    treeEl.appendChild(renderNode(c));
  }
}

export async function toggleNode(ctx, node) {
  if (!node.hasChildren) return;
  if (node.kind === 'FACT' && !node.loaded) await ensureFactLoaded(ctx, node);
  if (node.kind === 'CATEGORY' && !node.loaded) await ensureCategoryLoaded(ctx, node);
  if (node.kind === 'GRAPH' && !node.loaded) await ensureGraphLoaded(ctx, node);
  if (node.kind === 'ATOM' && node?.data?.source === 'vocab' && !node.loaded) await ensureVocabAtomLoaded(ctx, node);
  if ((node.kind === 'ATOM' || node.kind === 'VERB') && node?.data?.definitionFactId && !node.loaded) await ensureDefinitionTreeLoaded(ctx, node);
  node.expanded = !node.expanded;
  renderTree(ctx);
  if (node.id === ctx?.state?.kb?.selectedNodeId) {
    renderDetails(ctx, selectedNode({ state: ctx.state }));
  }
}
