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
      namedOnly: false,
      kbFactCount: 0,
      graphCount: 0,
      vocabCount: 0,
      scopeCount: 0,
      urcArtifactCount: 0,
      urcEvidenceCount: 0,
      urcProvenanceCount: 0,
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
