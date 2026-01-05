export function kbNode({ nodeIndex, id, kind, label, depth, hasChildren = false, data = {} }) {
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

export function kbIcon(kind) {
  if (kind === 'CATEGORY') return { cls: 'ico ico--file', text: '▦' };
  if (kind === 'ACTION') return { cls: 'ico ico--file', text: '→' };
  if (kind === 'GRAPH') return { cls: 'ico ico--verb', text: 'G' };
  if (kind === 'KB_BUNDLE') return { cls: 'ico ico--bundle', text: 'BNDL' };
  if (kind === 'SCOPE') return { cls: 'ico ico--file', text: '@' };
  if (kind === 'FACT') return { cls: 'ico ico--fact', text: 'FACT' };
  if (kind === 'BIND') return { cls: 'ico ico--bind', text: 'BIND' };
  if (kind === 'VERB') return { cls: 'ico ico--verb', text: 'V' };
  if (kind === 'ATOM') return { cls: 'ico ico--atom', text: '•' };
  if (kind === 'URC_ARTIFACT') return { cls: 'ico ico--file', text: 'A' };
  if (kind === 'URC_EVIDENCE') return { cls: 'ico ico--file', text: 'E' };
  if (kind === 'URC_PROVENANCE') return { cls: 'ico ico--file', text: 'P' };
  if (kind === 'URC_POLICY_VIEW') return { cls: 'ico ico--file', text: '✓' };
  return { cls: 'ico ico--file', text: '•' };
}

export function selectedNode({ state }) {
  const id = state.kb.selectedNodeId;
  if (!id) return null;
  return state.kb.nodeIndex.get(id) || null;
}
