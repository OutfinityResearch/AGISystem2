import { json } from '../lib/http.mjs';
import { buildFactLabel, buildGraphList, findGraphDef, stringifyGraphDef, vectorValue } from '../lib/views.mjs';

export async function handleGraphsApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/graphs') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const limitRaw = Number(url.searchParams.get('limit') || 300);
    const offsetRaw = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 2000) : 300;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const all = buildGraphList(session);
    const filtered = q
      ? all.filter(g => `${g.name} ${(g.params || []).join(' ')}`.toLowerCase().includes(q))
      : all;

    // Complexity-first (do not expose the score in UI).
    filtered.sort((a, b) => {
      if (a.bodyLen !== b.bodyLen) return b.bodyLen - a.bodyLen;
      return a.name.localeCompare(b.name);
    });

    const total = filtered.length;
    const graphs = filtered.slice(offset, offset + limit);
    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      graphCount: all.length,
      total,
      offset,
      limit,
      graphs
    });
    return true;
  }

  const graphMatch = url.pathname.match(/^\/api\/graphs\/(.+)$/);
  if (req.method === 'GET' && graphMatch) {
    const found = ctx.store.requireUniverse(req, url);
    if (!found) {
      json(res, 404, { ok: false, error: 'Unknown session' });
      return true;
    }
    const { session } = found.universe;
    const name = decodeURIComponent(graphMatch[1] || '');
    const def = findGraphDef(session, name);
    if (!def) {
      json(res, 404, { ok: false, error: 'Unknown graph' });
      return true;
    }

    // If a KB fact exists with this name, surface it for cross-navigation.
    let kbFactId = null;
    let kbFactLabel = null;
    for (const f of session.kbFacts || []) {
      if (f?.name && String(f.name) === String(def.persistName || def.name)) {
        kbFactId = f.id;
        kbFactLabel = buildFactLabel(session, f);
        break;
      }
    }

    const graphDsl = stringifyGraphDef(def);
    const operatorVector = session.vocabulary?.getOrCreate?.(String(def.persistName || def.name));

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      name: String(def.persistName || def.name),
      params: Array.isArray(def.params) ? def.params : [],
      bodyLen: Array.isArray(def.body) ? def.body.length : 0,
      hasReturn: !!def.returnExpr,
      graphDsl,
      vectors: {
        operatorVector: vectorValue(operatorVector)
      },
      kbFactId,
      kbFactLabel,
      raw: def
    });
    return true;
  }

  return false;
}
