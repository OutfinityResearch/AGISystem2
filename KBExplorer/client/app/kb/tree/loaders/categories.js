import { kbNode } from '../model.js';

function normalizeQuery(state) {
  const q = String(state?.kb?.q || '').trim();
  return q ? q.toLowerCase() : '';
}

function matchesQuery(q, ...fields) {
  if (!q) return true;
  for (const f of fields) {
    if (f == null) continue;
    const s = String(f).toLowerCase();
    if (s.includes(q)) return true;
  }
  return false;
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
    params.set('complexOnly', state.kb.complexOnly ? '1' : '0');
    params.set('namedFirst', '1');
    const res = await api(`/api/kb/facts?${params.toString()}`);
    state.kb.kbTotal = res.total ?? 0;
    state.kb.kbOffset = res.offset ?? state.kb.kbOffset;
    state.kb.kbLimit = res.limit ?? state.kb.kbLimit;
    state.kb.facts = res.facts || [];

    const isFactsFiltered = !!String(state?.kb?.q || '').trim() || state?.kb?.complexOnly === true;
    const total = state.kb.kbFactCount ?? res.kbFactCount ?? 0;
    categoryNode.label = `Long-Term Memory (Facts) (${isFactsFiltered ? `${state.kb.kbTotal}/${total}` : total})`;

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
    params.set('complexOnly', state.kb.complexOnly ? '1' : '0');
    const res = await api(`/api/graphs?${params.toString()}`);
    state.kb.graphTotal = res.total ?? 0;
    state.kb.graphOffset = res.offset ?? state.kb.graphOffset;
    state.kb.graphLimit = res.limit ?? state.kb.graphLimit;
    state.kb.graphs = res.graphs || [];

    const isGraphsFiltered = !!String(state?.kb?.q || '').trim() || state?.kb?.complexOnly === true;
    const total = state.kb.graphCount ?? res.graphCount ?? 0;
    categoryNode.label = `Procedural Memory (Graphs) (${isGraphsFiltered ? `${state.kb.graphTotal}/${total}` : total})`;

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
    params.set('complexOnly', state.kb.complexOnly ? '1' : '0');
    const res = await api(`/api/scope/bindings?${params.toString()}`);
    state.kb.scopeTotal = res.total ?? 0;
    state.kb.scopeOffset = res.offset ?? state.kb.scopeOffset;
    state.kb.scopeLimit = res.limit ?? state.kb.scopeLimit;
    state.kb.scope = res.bindings || [];

    const isScopeFiltered = !!String(state?.kb?.q || '').trim() || state?.kb?.complexOnly === true;
    const total = state.kb.scopeCount ?? 0;
    categoryNode.label = `Working Memory (Bindings) (${isScopeFiltered ? `${state.kb.scopeTotal}/${total}` : total})`;

    const kids = state.kb.scope.map(b => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `scope:${b.name}`,
      kind: 'SCOPE',
      label: b.name,
      depth: categoryNode.depth + 1,
      hasChildren: false,
      data: { name: b.name, vectorValue: b.vectorValue || null, source: b.source || null }
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
    params.set('complexOnly', state.kb.complexOnly ? '1' : '0');
    const res = await api(`/api/vocab/atoms?${params.toString()}`);
    state.kb.vocab[layer].total = res.total ?? 0;
    state.kb.vocab[layer].offset = res.offset ?? state.kb.vocab[layer].offset;
    state.kb.vocab[layer].limit = res.limit ?? state.kb.vocab[layer].limit;
    state.kb.vocab[layer].atoms = res.atoms || [];

    if (categoryNode?.data?.baseLabel) {
      const q2 = String(state?.kb?.q || '').trim();
      const isFiltered = !!q2 || state?.kb?.complexOnly === true;
      const counts = state?.kb?.vocabLayerCounts?.[layer] || null;
      const total = Number.isFinite(counts?.total) ? counts.total : state.kb.vocab[layer].total;
      const filtered = Number.isFinite(counts?.filtered) ? counts.filtered : state.kb.vocab[layer].total;
      categoryNode.label = `${categoryNode.data.baseLabel} (${isFiltered ? `${filtered}/${total}` : total})`;
    }

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

async function ensureUrcArtifactsLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'urcArtifacts') return;
  categoryNode.loading = true;
  try {
    const res = await api('/api/urc/artifacts');
    const all = Array.isArray(res.artifacts) ? res.artifacts : [];
    const q = normalizeQuery(state);
    const filtered = all.filter(a => matchesQuery(q, a.id, a.format, a.hash));

    state.kb.urc.artifacts.total = filtered.length;
    state.kb.urc.artifacts.items = filtered;

    const offset = state.kb.urc.artifacts.offset || 0;
    const limit = state.kb.urc.artifacts.limit || 200;
    const slice = filtered.slice(offset, offset + limit);

    const kids = slice.map(a => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `urc:artifact:${String(a.id)}`,
      kind: 'URC_ARTIFACT',
      label: `${a.format || 'artifact'} • ${String(a.id).slice(0, 64)}`,
      depth: categoryNode.depth + 1,
      hasChildren: false,
      data: { artifactId: a.id, summary: a }
    }));

    if ((offset + limit) < filtered.length) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:urc:artifacts:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'urcArtifactsMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureUrcEvidenceLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'urcEvidence') return;
  categoryNode.loading = true;
  try {
    const res = await api('/api/urc/evidence');
    const all = Array.isArray(res.evidence) ? res.evidence : [];
    const q = normalizeQuery(state);
    const filtered = all.filter(e => matchesQuery(q, e.id, e.kind, e.status, e.method, e.tool, e.supports, e.artifactId, e.scope));

    state.kb.urc.evidence.total = filtered.length;
    state.kb.urc.evidence.items = filtered;

    const offset = state.kb.urc.evidence.offset || 0;
    const limit = state.kb.urc.evidence.limit || 200;
    const slice = filtered.slice(offset, offset + limit);

    const kids = slice.map(e => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `urc:evidence:${String(e.id)}`,
      kind: 'URC_EVIDENCE',
      label: `${e.kind || 'evidence'} • ${e.status || ''} • ${String(e.id).slice(0, 48)}`,
      depth: categoryNode.depth + 1,
      hasChildren: false,
      data: { evidenceId: e.id, summary: e }
    }));

    if ((offset + limit) < filtered.length) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:urc:evidence:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'urcEvidenceMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

async function ensureUrcProvenanceLoaded(ctx, categoryNode) {
  const { api, state } = ctx;
  if (!categoryNode || categoryNode.kind !== 'CATEGORY') return;
  if (categoryNode.loaded || categoryNode.loading) return;
  if (categoryNode.data.category !== 'urcProvenance') return;
  categoryNode.loading = true;
  try {
    const res = await api('/api/urc/provenance');
    const all = Array.isArray(res.provenance) ? res.provenance : [];
    const q = normalizeQuery(state);
    const filtered = all.filter(p => matchesQuery(q, p.id, p.kind, p.nlPreview, p.dslPreview, p.srcNl, p.srcDsl));

    state.kb.urc.provenance.total = filtered.length;
    state.kb.urc.provenance.items = filtered;

    const offset = state.kb.urc.provenance.offset || 0;
    const limit = state.kb.urc.provenance.limit || 200;
    const slice = filtered.slice(offset, offset + limit);

    const kids = slice.map(p => kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `urc:provenance:${String(p.id)}`,
      kind: 'URC_PROVENANCE',
      label: `${p.kind || 'entry'} • ${String(p.id).slice(0, 48)}`,
      depth: categoryNode.depth + 1,
      hasChildren: false,
      data: { provenanceId: p.id, summary: p }
    }));

    if ((offset + limit) < filtered.length) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: 'action:urc:provenance:more',
        kind: 'ACTION',
        label: 'Load more…',
        depth: categoryNode.depth + 1,
        hasChildren: false,
        data: { action: 'urcProvenanceMore' }
      }));
    }

    categoryNode.children = kids;
    categoryNode.loaded = true;
  } finally {
    categoryNode.loading = false;
  }
}

export async function ensureCategoryLoaded(ctx, node) {
  if (!node || node.kind !== 'CATEGORY') return;
  const cat = node.data.category;
  if (cat === 'facts') return ensureKbFactsLoaded(ctx, node);
  if (cat === 'graphs') return ensureGraphsLoaded(ctx, node);
  if (cat === 'scope') return ensureScopeLoaded(ctx, node);
  if (cat === 'vocabLayer') return ensureVocabLayerLoaded(ctx, node);
  if (cat === 'urcArtifacts') return ensureUrcArtifactsLoaded(ctx, node);
  if (cat === 'urcEvidence') return ensureUrcEvidenceLoaded(ctx, node);
  if (cat === 'urcProvenance') return ensureUrcProvenanceLoaded(ctx, node);
}

export async function handleAction(ctx, node) {
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

  if (action === 'urcArtifactsMore') {
    state.kb.urc.artifacts.offset = (state.kb.urc.artifacts.offset || 0) + (state.kb.urc.artifacts.limit || 200);
    const cat = state.kb.nodeIndex.get('cat:urc:artifacts');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureUrcArtifactsLoaded(ctx, cat);
  }

  if (action === 'urcEvidenceMore') {
    state.kb.urc.evidence.offset = (state.kb.urc.evidence.offset || 0) + (state.kb.urc.evidence.limit || 200);
    const cat = state.kb.nodeIndex.get('cat:urc:evidence');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureUrcEvidenceLoaded(ctx, cat);
  }

  if (action === 'urcProvenanceMore') {
    state.kb.urc.provenance.offset = (state.kb.urc.provenance.offset || 0) + (state.kb.urc.provenance.limit || 200);
    const cat = state.kb.nodeIndex.get('cat:urc:provenance');
    if (cat) { cat.loaded = false; cat.children = []; }
    if (cat) await ensureUrcProvenanceLoaded(ctx, cat);
  }
}
