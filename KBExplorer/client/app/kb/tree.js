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
  if (kind === 'BUNDLE') return { cls: 'ico ico--bundle', text: '+' };
  if (kind === 'BIND') return { cls: 'ico ico--bind', text: '×' };
  if (kind === 'FACT') return { cls: 'ico ico--fact', text: 'ƒ' };
  return { cls: 'ico ico--file', text: '•' };
}

function flattenTree(node, out = []) {
  if (!node) return out;
  if (node.id !== 'root') out.push(node);
  if (node.expanded && Array.isArray(node.children)) {
    for (const c of node.children) flattenTree(c, out);
  }
  return out;
}

export function selectedNode({ state }) {
  const id = state.kb.selectedNodeId;
  if (!id) return null;
  return state.kb.nodeIndex.get(id) || null;
}

export function renderDetails({ $, state }, node) {
  const detailsEl = $('kbDetails');
  if (!node) {
    detailsEl.innerHTML = '<span class="muted">Select a node to see details.</span>';
    $('openDefinitionBtn').disabled = true;
    return;
  }

  const payload = { id: node.id, kind: node.kind, label: node.label, ...node.data };
  detailsEl.innerHTML = `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
  const defId = node?.data?.definitionFactId ?? null;
  $('openDefinitionBtn').disabled = !(typeof defId === 'number' && Number.isFinite(defId));
}

export function setSelectedNode(ctx, node) {
  const { state } = ctx;
  state.kb.selectedNodeId = node?.id || null;
  renderTree(ctx);
  renderDetails(ctx, node || null);
}

export async function ensureFactLoaded(ctx, factNode) {
  const { api, state } = ctx;
  if (!factNode || factNode.kind !== 'FACT') return;
  if (factNode.loaded || factNode.loading) return;
  factNode.loading = true;
  try {
    const res = await api(`/api/kb/facts/${factNode.data.factId}/bundle`);
    factNode.data.bundle = res.bundle;
    factNode.data.fact = res.fact;
    factNode.data.metadata = res.metadata || null;
    factNode.data.dsl = res.dsl || '';

    const op = res.bundle?.operator?.label || res.fact?.operator || '(operator)';
    const binds = Array.isArray(res.bundle?.binds) ? [...res.bundle.binds] : [];
    binds.sort((a, b) => {
      const ac = Number(a.argComplexity || 0);
      const bc = Number(b.argComplexity || 0);
      if (ac !== bc) return bc - ac;
      return Number(a.position || 0) - Number(b.position || 0);
    });

    const bundleNode = kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `bundle:${factNode.data.factId}`,
      kind: 'BUNDLE',
      label: 'BUNDLE',
      depth: factNode.depth + 1,
      hasChildren: true,
      data: { factId: factNode.data.factId, operator: String(op), bindCount: binds.length }
    });
    bundleNode.expanded = true;
    bundleNode.loaded = true;

    const opNode = kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `atom:${factNode.data.factId}:operator:${op}`,
      kind: 'ATOM',
      label: String(op),
      depth: bundleNode.depth + 1,
      hasChildren: false,
      data: { role: 'operator', value: String(op) }
    });

    bundleNode.children = [opNode];
    for (const b of binds) {
      const bindNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `bind:${factNode.data.factId}:${b.position}:${b.arg}`,
        kind: 'BIND',
        label: `${b.posName}: ${b.arg}`,
        depth: bundleNode.depth + 1,
        hasChildren: true,
        data: {
          position: b.position,
          posName: b.posName,
          arg: b.arg,
          argFactId: b.argFactId ?? null,
          argFactLabel: b.argFactLabel ?? null,
          argComplexity: b.argComplexity ?? 0
        }
      });

      const posNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `atom:${factNode.data.factId}:pos:${b.posName}`,
        kind: 'ATOM',
        label: b.posName,
        depth: bindNode.depth + 1,
        hasChildren: false,
        data: { role: 'pos', value: b.posName }
      });

      const argNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `atom:${factNode.data.factId}:arg:${b.arg}`,
        kind: 'ATOM',
        label: b.arg,
        depth: bindNode.depth + 1,
        hasChildren: false,
        data: {
          role: 'arg',
          value: b.arg,
          definitionFactId: typeof b.argFactId === 'number' ? b.argFactId : null,
          definitionLabel: b.argFactLabel ?? null
        }
      });

      bindNode.children = [posNode, argNode];
      bindNode.loaded = true;
      bindNode.expanded = false;
      bundleNode.children.push(bindNode);
    }

    factNode.children = [bundleNode];
    factNode.loaded = true;
  } finally {
    factNode.loading = false;
  }
}

export function buildTree({ state }) {
  state.kb.nodeIndex = new Map();

  const root = kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: 'root',
    kind: 'ROOT',
    label: 'KB',
    depth: 0,
    hasChildren: true,
    data: {}
  });
  root.expanded = true;
  root.loaded = true;

  const pinned = (state.kb.pinnedFactIds || []).filter(Boolean);
  const pinnedSet = new Set(pinned);

  const facts = [...(state.kb.facts || [])];
  const pinnedFacts = facts.filter(f => pinnedSet.has(f.factId));
  const normalFacts = facts.filter(f => !pinnedSet.has(f.factId));
  const missingPinned = pinned.filter(id => !facts.some(f => f.factId === id));

  const pinnedNodes = pinnedFacts.map(f => kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: `fact:${f.factId}`,
    kind: 'FACT',
    label: f.name || `#${f.factId}`,
    depth: 1,
    hasChildren: true,
    data: { factId: f.factId, summary: f, pinned: true }
  }));

  for (const id of missingPinned) {
    pinnedNodes.unshift(kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `fact:${id}`,
      kind: 'FACT',
      label: `#${id}`,
      depth: 1,
      hasChildren: true,
      data: { factId: id, summary: { factId: id, name: null, operator: null, args: [], label: `#${id}`, complexity: 0 }, pinned: true, stub: true }
    }));
  }

  const factNodes = normalFacts.map(f => kbNode({
    nodeIndex: state.kb.nodeIndex,
    id: `fact:${f.factId}`,
    kind: 'FACT',
    label: f.name || `#${f.factId}`,
    depth: 1,
    hasChildren: true,
    data: { factId: f.factId, summary: f }
  }));

  root.children = [...pinnedNodes, ...factNodes];
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

  const nodes = flattenTree(state.kb.treeRoot, []);
  for (const node of nodes) {
    const row = document.createElement('div');
    row.className = 'tree__row' + (node.id === state.kb.selectedNodeId ? ' tree__row--active' : '');
    row.style.paddingLeft = `${node.depth * 18}px`;

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
      const c = node?.data?.summary?.complexity;
      meta.textContent = typeof c === 'number' ? `c=${c}` : '';
    } else if (node.kind === 'BIND') {
      const ac = node?.data?.argComplexity;
      meta.textContent = typeof ac === 'number' && ac > 0 ? `c=${ac}` : '';
    } else if (node.kind === 'ATOM') {
      meta.textContent = node?.data?.definitionFactId ? 'defined' : '';
    }

    row.appendChild(twisty);
    row.appendChild(icon);
    row.appendChild(label);
    if (meta.textContent) row.appendChild(meta);

    row.addEventListener('click', () => setSelectedNode(ctx, node));
    treeEl.appendChild(row);
  }
}

export async function toggleNode(ctx, node) {
  if (!node.hasChildren) return;
  if (node.kind === 'FACT' && !node.loaded) {
    await ensureFactLoaded(ctx, node);
  }
  node.expanded = !node.expanded;
  renderTree(ctx);
}

