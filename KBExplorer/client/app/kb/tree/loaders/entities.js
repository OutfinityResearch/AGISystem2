import { kbNode } from '../model.js';

export async function ensureKbBundleLoaded(ctx, kbBundleNode) {
  const { api } = ctx;
  if (!kbBundleNode || kbBundleNode.kind !== 'KB_BUNDLE') return;
  if (kbBundleNode.loaded || kbBundleNode.loading) return;
  kbBundleNode.loading = true;
  try {
    const res = await api('/api/kb/bundle?offset=0&limit=256');
    kbBundleNode.data.vectorValue = res.kbVector || null;
    kbBundleNode.loaded = true;
  } finally {
    kbBundleNode.loading = false;
  }
}

export async function ensureUrcArtifactLoaded(ctx, artifactNode) {
  const { api } = ctx;
  if (!artifactNode || artifactNode.kind !== 'URC_ARTIFACT') return;
  if (artifactNode.loaded || artifactNode.loading) return;
  const id = artifactNode?.data?.artifactId || null;
  if (!id) return;
  artifactNode.loading = true;
  try {
    const res = await api(`/api/urc/artifacts/${encodeURIComponent(String(id))}`);
    artifactNode.data.artifact = res.artifact || null;
    artifactNode.loaded = true;
  } finally {
    artifactNode.loading = false;
  }
}

export async function ensureUrcEvidenceLoaded(ctx, evidenceNode) {
  const { api } = ctx;
  if (!evidenceNode || evidenceNode.kind !== 'URC_EVIDENCE') return;
  if (evidenceNode.loaded || evidenceNode.loading) return;
  const id = evidenceNode?.data?.evidenceId || null;
  if (!id) return;
  evidenceNode.loading = true;
  try {
    const res = await api(`/api/urc/evidence/${encodeURIComponent(String(id))}`);
    evidenceNode.data.evidence = res.evidence || null;
    evidenceNode.loaded = true;
  } finally {
    evidenceNode.loading = false;
  }
}

export async function ensureUrcProvenanceLoaded(ctx, provenanceNode) {
  const { api } = ctx;
  if (!provenanceNode || provenanceNode.kind !== 'URC_PROVENANCE') return;
  if (provenanceNode.loaded || provenanceNode.loading) return;
  const id = provenanceNode?.data?.provenanceId || null;
  if (!id) return;
  provenanceNode.loading = true;
  try {
    const res = await api(`/api/urc/provenance/${encodeURIComponent(String(id))}`);
    provenanceNode.data.entry = res.entry || null;
    provenanceNode.loaded = true;
  } finally {
    provenanceNode.loading = false;
  }
}

export async function ensureUrcPolicyViewLoaded(ctx, policyNode) {
  const { api } = ctx;
  if (!policyNode || policyNode.kind !== 'URC_POLICY_VIEW') return;
  if (policyNode.loaded || policyNode.loading) return;
  policyNode.loading = true;
  try {
    const res = await api('/api/policy/view');
    policyNode.data.policyView = res.view || res || null;
    policyNode.loaded = true;
  } finally {
    policyNode.loading = false;
  }
}

export async function ensureGraphLoaded(ctx, graphNode) {
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
    graphNode.data.kbFactVectorItems = res.kbFactVectorItems ?? null;
    graphNode.data.source = res.source || null;
    graphNode.loaded = true;

    const hasKbFact = typeof graphNode.data.kbFactId === 'number' && Number.isFinite(graphNode.data.kbFactId);
    const includeKbFact = hasKbFact && (!state?.kb?.complexOnly || Number(graphNode.data.kbFactVectorItems || 0) >= 2);
    if (includeKbFact) {
      graphNode.hasChildren = true;
      graphNode.children = [
        kbNode({
          nodeIndex: state.kb.nodeIndex,
          id: `graph:${String(name)}:fact:${graphNode.data.kbFactId}`,
          kind: 'FACT',
          label: graphNode.data.kbFactLabel || `Fact#${graphNode.data.kbFactId}`,
          depth: graphNode.depth + 1,
          hasChildren: true,
          data: {
            factId: graphNode.data.kbFactId,
            summary: {
              factId: graphNode.data.kbFactId,
              name: null,
              operator: null,
              args: [],
              label: graphNode.data.kbFactLabel || '',
              complexity: 0
            }
          }
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

export async function ensureVocabAtomLoaded(ctx, atomNode) {
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
    atomNode.data.kbFactVectorItems = res.kbFactVectorItems ?? null;
    atomNode.data.hasGraph = !!res.hasGraph;
    atomNode.data.source = res.source || null;
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
    const hasKbFact = typeof atomNode.data.kbFactId === 'number' && Number.isFinite(atomNode.data.kbFactId);
    const includeKbFact = hasKbFact && (!state?.kb?.complexOnly || Number(atomNode.data.kbFactVectorItems || 0) >= 2);
    if (includeKbFact) {
      kids.push(kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `vocab:${String(name)}:fact:${atomNode.data.kbFactId}`,
        kind: 'FACT',
        label: atomNode.data.kbFactLabel || `Fact#${atomNode.data.kbFactId}`,
        depth: atomNode.depth + 1,
        hasChildren: true,
        data: {
          factId: atomNode.data.kbFactId,
          summary: {
            factId: atomNode.data.kbFactId,
            name: String(name),
            operator: null,
            args: [],
            label: atomNode.data.kbFactLabel || '',
            complexity: 0
          }
        }
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
    factNode.data.source = res.source || res.metadata?.source || null;
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
        source: res.bundle?.operator?.source || null,
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
          source: b.source || null,
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
