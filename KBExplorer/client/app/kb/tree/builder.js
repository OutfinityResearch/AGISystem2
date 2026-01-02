import { kbNode } from './model.js';

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

  const urcCat = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'cat:urc',
    kind: 'CATEGORY',
    label: `Reasoning (URC) (artifacts=${state.kb.urcArtifactCount ?? 0} evidence=${state.kb.urcEvidenceCount ?? 0} provenance=${state.kb.urcProvenanceCount ?? 0})`,
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
