import { kbNode } from './model.js';

export function buildTree({ state }) {
  state.kb.nodeIndex = new Map();

  const q = String(state?.kb?.q || '').trim();
  const isFiltered = !!q || state?.kb?.complexOnly === true;
  const countText = (filtered, total) => (isFiltered ? `${filtered}/${total}` : String(total));

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

  const kbBundleTerms = Number.isFinite(state?.kb?.kbBundleTerms) ? Number(state.kb.kbBundleTerms) : 0;
  const kbBundleNode = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'kb:bundle',
    kind: 'KB_BUNDLE',
    label: kbBundleTerms ? `KB bundle (${kbBundleTerms} terms)` : 'KB bundle',
    depth: 1,
    hasChildren: false,
    data: {}
  });

  const factsLabelCount = countText(
    Number.isFinite(state?.kb?.kbFactCountFiltered) ? Number(state.kb.kbFactCountFiltered) : (state.kb.kbTotal ?? 0),
    state.kb.kbFactCount ?? 0
  );
  const factsCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:facts',
    kind: 'CATEGORY',
    label: `Long-Term Memory (Facts) (${factsLabelCount})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'facts' }
  });

  const graphsLabelCount = countText(
    Number.isFinite(state?.kb?.graphCountFiltered) ? Number(state.kb.graphCountFiltered) : (state.kb.graphTotal ?? 0),
    state.kb.graphCount ?? 0
  );
  const graphsCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:graphs',
    kind: 'CATEGORY',
    label: `Procedural Memory (Graphs) (${graphsLabelCount})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'graphs' }
  });

  const vocabLabelCount = countText(
    Number.isFinite(state?.kb?.vocabCountFiltered) ? Number(state.kb.vocabCountFiltered) : (state.kb.vocabCount ?? 0),
    state.kb.vocabCount ?? 0
  );
  const vocabCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:vocab',
    kind: 'CATEGORY',
    label: `Lexicon (Symbols) (${vocabLabelCount})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'vocab' }
  });
  vocabCat.loaded = true;

  const layerLabel = (layer, baseLabel) => {
    const counts = state?.kb?.vocabLayerCounts?.[layer] || null;
    if (!counts) return `${baseLabel} (0)`;
    const total = Number.isFinite(counts.total) ? counts.total : 0;
    const filtered = Number.isFinite(counts.filtered) ? counts.filtered : 0;
    return `${baseLabel} (${countText(filtered, total)})`;
  };

  vocabCat.children = [
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:pos', kind: 'CATEGORY', label: layerLabel('Pos', 'Role/slot markers (PosN)'), depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'Pos', baseLabel: 'Role/slot markers (PosN)' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l0', kind: 'CATEGORY', label: layerLabel('L0', 'Primitives (___)'), depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L0', baseLabel: 'Primitives (___)' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l1', kind: 'CATEGORY', label: layerLabel('L1', 'Structural symbols (__)'), depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L1', baseLabel: 'Structural symbols (__)' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l2', kind: 'CATEGORY', label: layerLabel('L2', 'Semantic primitives (_)'), depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L2', baseLabel: 'Semantic primitives (_)' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:vocab:l3', kind: 'CATEGORY', label: layerLabel('L3', 'Domain symbols (no prefix)'), depth: 2, hasChildren: true, data: { category: 'vocabLayer', layer: 'L3', baseLabel: 'Domain symbols (no prefix)' } })
  ];

  const scopeLabelCount = countText(
    Number.isFinite(state?.kb?.scopeCountFiltered) ? Number(state.kb.scopeCountFiltered) : (state.kb.scopeTotal ?? 0),
    state.kb.scopeCount ?? 0
  );
  const scopeCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:scope',
    kind: 'CATEGORY',
    label: `Working Memory (Bindings) (${scopeLabelCount})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'scope' }
  });

  const urcCounts = (() => {
    if (!q) {
      return {
        artifacts: state.kb.urcArtifactCount ?? 0,
        evidence: state.kb.urcEvidenceCount ?? 0,
        provenance: state.kb.urcProvenanceCount ?? 0
      };
    }
    return {
      artifacts: state.kb.urcArtifactCountFiltered ?? 0,
      evidence: state.kb.urcEvidenceCountFiltered ?? 0,
      provenance: state.kb.urcProvenanceCountFiltered ?? 0
    };
  })();
  const urcCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:urc',
    kind: 'CATEGORY',
    label: `Reasoning (URC) (artifacts=${urcCounts.artifacts} evidence=${urcCounts.evidence} provenance=${urcCounts.provenance})`,
    depth: 1,
    hasChildren: true,
    data: { category: 'urc' }
  });
  urcCat.loaded = true;
  urcCat.children = [
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:urc:artifacts', kind: 'CATEGORY', label: 'Artifacts', depth: 2, hasChildren: true, data: { category: 'urcArtifacts' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:urc:evidence', kind: 'CATEGORY', label: 'Evidence', depth: 2, hasChildren: true, data: { category: 'urcEvidence' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'cat:urc:provenance', kind: 'CATEGORY', label: 'Provenance', depth: 2, hasChildren: true, data: { category: 'urcProvenance' } }),
    kbNode({ nodeIndex: state.kb.nodeIndex, id: 'urc:policyView', kind: 'URC_POLICY_VIEW', label: 'Policy: current view', depth: 2, hasChildren: false, data: {} })
  ];

  root.children = [kbBundleNode, factsCat, graphsCat, vocabCat, scopeCat, urcCat];
  state.kb.treeRoot = root;
}
