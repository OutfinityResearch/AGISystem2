export function createState() {
  return {
    sessionId: null,
    uiTab: 'chat',
    config: {
      hdcStrategy: 'exact',
      reasoningPriority: 'symbolicPriority',
      urcMaterializeFacts: false,
      packs: null
    },
    kb: {
      q: '',
      kbOffset: 0,
      kbLimit: 200,
      kbTotal: 0,
      facts: [],
      graphOffset: 0,
      graphLimit: 200,
      graphTotal: 0,
      graphs: [],
      vocab: {
        Pos: { offset: 0, limit: 400, total: 0, atoms: [] },
        L0: { offset: 0, limit: 400, total: 0, atoms: [] },
        L1: { offset: 0, limit: 400, total: 0, atoms: [] },
        L2: { offset: 0, limit: 400, total: 0, atoms: [] },
        L3: { offset: 0, limit: 400, total: 0, atoms: [] }
      },
      scopeOffset: 0,
      scopeLimit: 400,
      scopeTotal: 0,
      scope: [],
      urc: {
        artifacts: { offset: 0, limit: 200, total: 0, items: [] },
        evidence: { offset: 0, limit: 200, total: 0, items: [] },
        provenance: { offset: 0, limit: 200, total: 0, items: [] },
        policyView: null
      },
      complexOnly: false,
      kbFactCount: 0,
      kbFactCountFiltered: 0,
      kbBundleTerms: 0,
      graphCount: 0,
      graphCountFiltered: 0,
      vocabCount: 0,
      vocabCountFiltered: 0,
      vocabLayerCounts: {
        Pos: { total: 0, filtered: 0 },
        L0: { total: 0, filtered: 0 },
        L1: { total: 0, filtered: 0 },
        L2: { total: 0, filtered: 0 },
        L3: { total: 0, filtered: 0 },
        All: { total: 0, filtered: 0 }
      },
      scopeCount: 0,
      scopeCountFiltered: 0,
      urcArtifactCount: 0,
      urcArtifactCountFiltered: 0,
      urcEvidenceCount: 0,
      urcEvidenceCountFiltered: 0,
      urcProvenanceCount: 0,
      urcProvenanceCountFiltered: 0,
      treeRoot: null,
      nodeIndex: new Map(),
      pinnedFactIds: [],
      selectedNodeId: null
    },
    load: {
      abortController: null,
      loading: false
    }
  };
}
