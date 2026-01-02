import { kbNode } from '../model.js';

export async function ensureDefinitionLoaded(ctx, definitionFactId) {
  const { api, state } = ctx;
  const id = Number(definitionFactId);
  if (!Number.isFinite(id)) return null;
  if (!state.kb.definitionCache) state.kb.definitionCache = new Map();
  if (state.kb.definitionCache.has(id)) return state.kb.definitionCache.get(id);
  const res = await api(`/api/kb/facts/${id}/bundle`);
  state.kb.definitionCache.set(id, res);
  return res;
}

export async function ensureDefinitionTreeLoaded(ctx, node) {
  const { state } = ctx;
  if (!node || (node.kind !== 'ATOM' && node.kind !== 'VERB')) return;
  if (node.loaded || node.loading) return;
  const defId = node?.data?.definitionFactId;
  if (typeof defId !== 'number' || !Number.isFinite(defId)) return;

  node.loading = true;
  try {
    const res = await ensureDefinitionLoaded(ctx, defId);
    node.data.definition = res;

    const op = res?.bundle?.operator?.label || res?.fact?.operator || '(operator)';
    const binds = Array.isArray(res?.bundle?.binds) ? [...res.bundle.binds] : [];
    binds.sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

    const opDefId = res?.bundle?.operator?.definitionFactId ?? null;
    const opDefLabel = res?.bundle?.operator?.definitionFactLabel ?? null;
    const opVecVal = res?.bundle?.operator?.vectorValue ?? res?.vectors?.operatorVector ?? null;

    const opNode = kbNode({
      nodeIndex: state.kb.nodeIndex,
      id: `${node.id}:def:verb:${op}`,
      kind: 'VERB',
      label: String(op),
      depth: node.depth + 1,
      hasChildren: !!(typeof opDefId === 'number' && Number.isFinite(opDefId)),
      data: {
        role: 'operator',
        value: String(op),
        definitionFactId: typeof opDefId === 'number' ? opDefId : null,
        definitionLabel: opDefLabel,
        source: res?.bundle?.operator?.source || null,
        vectorValue: opVecVal,
        graphDsl: res?.bundle?.operator?.graphDsl || null
      }
    });

    const children = [opNode];
    for (const b of binds) {
      const bindNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `${node.id}:def:bind:${b.position}:${b.arg}`,
        kind: 'BIND',
        label: `#${b.position}`,
        depth: node.depth + 1,
        hasChildren: true,
        data: {
          position: b.position,
          arg: b.arg,
          positionedVectorValue: b.positionedVectorValue ?? null
        }
      });

      const argNode = kbNode({
        nodeIndex: state.kb.nodeIndex,
        id: `${node.id}:def:atom:${b.position}:${b.arg}`,
        kind: 'ATOM',
        label: b.arg,
        depth: node.depth + 2,
        hasChildren: typeof b.argFactId === 'number' && Number.isFinite(b.argFactId),
        data: {
          role: 'arg',
          value: b.arg,
          position: b.position,
          definitionFactId: typeof b.argFactId === 'number' ? b.argFactId : null,
          definitionLabel: b.argFactLabel ?? null,
          source: b.source || null,
          vectorValue: b.vectorValue ?? null
        }
      });

      bindNode.children = [argNode];
      bindNode.loaded = true;
      bindNode.expanded = true;

      children.push(bindNode);
    }

    node.children = children;
    node.loaded = true;
  } finally {
    node.loading = false;
  }
}
