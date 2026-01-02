export function createState() {
  return {
    sessionId: null,
    uiTab: 'chat',
    config: {
      hdcStrategy: 'exact',
      reasoningPriority: 'symbolicPriority',
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
      namedOnly: false,
      kbFactCount: 0,
      graphCount: 0,
      vocabCount: 0,
      scopeCount: 0,
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
