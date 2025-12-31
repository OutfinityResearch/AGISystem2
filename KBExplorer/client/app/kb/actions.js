import { buildTree, ensureFactLoaded, renderDetails, renderTree, selectedNode, setSelectedNode } from './tree.js';

export async function openSelectedDefinition(ctx) {
  const { state } = ctx;
  const node = selectedNode({ state });
  const defId = node?.data?.definitionFactId;
  if (!(typeof defId === 'number' && Number.isFinite(defId))) return;

  if (!state.kb.pinnedFactIds.includes(defId)) {
    state.kb.pinnedFactIds.unshift(defId);
  }

  buildTree({ state });

  const factNode = state.kb.nodeIndex.get(`fact:${defId}`) || null;
  if (!factNode) return;

  setSelectedNode(ctx, factNode);

  try {
    await ensureFactLoaded(ctx, factNode);
    factNode.expanded = true;
  } catch {
    // ignore
  }

  renderTree(ctx);
  renderDetails(ctx, factNode);
}

