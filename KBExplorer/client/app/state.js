export function createState() {
  return {
    sessionId: null,
    uiTab: 'chat',
    config: {
      hdcStrategy: 'dense-binary',
      reasoningPriority: 'symbolicPriority'
    },
    kb: {
      q: '',
      offset: 0,
      limit: 200,
      total: 0,
      facts: [],
      namedOnly: true,
      kbFactCount: 0,
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

