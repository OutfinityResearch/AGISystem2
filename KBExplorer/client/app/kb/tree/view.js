import { renderDetails } from './details.js';
import { loaders } from './loaders.js';
import { kbIcon, selectedNode } from './model.js';

export function setSelectedNode(ctx, node) {
  const { state } = ctx;
  state.kb.selectedNodeId = node?.id || null;
  renderTree(ctx);
  renderDetails(ctx, node || null);
}

export function renderTree(ctx) {
  const { $, state } = ctx;
  const treeEl = $('kbTree');
  treeEl.innerHTML = '';

  if (!state.kb.treeRoot) {
    treeEl.innerHTML = '<span class="muted">No data.</span>';
    return;
  }

  function renderNode(node) {
    const container = document.createElement('div');
    container.className = 'tree__node';

    const row = document.createElement('div');
    row.className = 'tree__row' + (node.id === state.kb.selectedNodeId ? ' tree__row--active' : '');

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
    } else if (node.kind === 'ATOM' || node.kind === 'VERB') {
      const parts = [];
      if (node?.data?.definitionFactId) parts.push('defined');
      if (node?.data?.source === 'vocab' && node?.data?.layer) parts.push(String(node.data.layer));
      meta.textContent = parts.join(' ');
    } else if (node.kind === 'GRAPH') {
      meta.textContent = '';
    }

    row.appendChild(twisty);
    row.appendChild(icon);
    row.appendChild(label);
    if (meta.textContent) row.appendChild(meta);

    row.addEventListener('click', async () => {
      setSelectedNode(ctx, node);

      if (node.kind === 'ACTION') {
        await loaders.handleAction(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'KB_BUNDLE' && !node.loaded) {
        await loaders.ensureKbBundleLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'CATEGORY' && !node.loaded) {
        await loaders.ensureCategoryLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'URC_ARTIFACT' && !node.loaded) {
        await loaders.ensureUrcArtifactLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'URC_EVIDENCE' && !node.loaded) {
        await loaders.ensureUrcEvidenceLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'URC_PROVENANCE' && !node.loaded) {
        await loaders.ensureUrcProvenanceLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'URC_POLICY_VIEW' && !node.loaded) {
        await loaders.ensureUrcPolicyViewLoaded(ctx, node);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'GRAPH' && !node.loaded) {
        await loaders.ensureGraphLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'ATOM' && node?.data?.source === 'vocab' && !node.loaded) {
        await loaders.ensureVocabAtomLoaded(ctx, node);
        renderTree(ctx);
        renderDetails(ctx, selectedNode({ state }));
        return;
      }

      if (node.kind === 'FACT' && !node.loaded) {
        try {
          await loaders.ensureFactLoaded(ctx, node);
        } finally {
          renderTree(ctx);
          renderDetails(ctx, selectedNode({ state }));
        }
      }

      if ((node.kind === 'ATOM' || node.kind === 'VERB') && node.hasChildren && !node.loaded) {
        try {
          await loaders.ensureDefinitionTreeLoaded(ctx, node);
        } finally {
          renderTree(ctx);
          renderDetails(ctx, selectedNode({ state }));
        }
      }

      const defId = node?.data?.definitionFactId;
      if (typeof defId === 'number' && Number.isFinite(defId)) {
        try {
          node.data.definition = await loaders.ensureDefinitionLoaded(ctx, defId);
        } catch {
          node.data.definition = null;
        }
        renderDetails(ctx, selectedNode({ state }));
      }
    });
    container.appendChild(row);

    if (node.expanded && Array.isArray(node.children) && node.children.length) {
      const kids = document.createElement('div');
      kids.className = 'tree__children';
      for (const c of node.children) {
        kids.appendChild(renderNode(c));
      }
      container.appendChild(kids);
    }

    return container;
  }

  // Render top-level children of the root (not the root itself).
  for (const c of state.kb.treeRoot.children || []) {
    treeEl.appendChild(renderNode(c));
  }
}

export async function toggleNode(ctx, node) {
  if (!node.hasChildren) return;
  if (node.kind === 'FACT' && !node.loaded) await loaders.ensureFactLoaded(ctx, node);
  if (node.kind === 'CATEGORY' && !node.loaded) await loaders.ensureCategoryLoaded(ctx, node);
  if (node.kind === 'GRAPH' && !node.loaded) await loaders.ensureGraphLoaded(ctx, node);
  if (node.kind === 'ATOM' && node?.data?.source === 'vocab' && !node.loaded) await loaders.ensureVocabAtomLoaded(ctx, node);
  if ((node.kind === 'ATOM' || node.kind === 'VERB') && node?.data?.definitionFactId && !node.loaded) await loaders.ensureDefinitionTreeLoaded(ctx, node);
  node.expanded = !node.expanded;
  renderTree(ctx);
  if (node.id === ctx?.state?.kb?.selectedNodeId) {
    renderDetails(ctx, selectedNode({ state: ctx.state }));
  }
}
