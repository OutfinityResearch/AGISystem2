import { json } from '../lib/http.mjs';
import { buildFactLabel, classifyLayer, findGraphDef, isPositionToken, polynomialTermCount, stringifyGraphDef, vectorItemCount, vectorValue } from '../lib/views.mjs';

export async function handleVocabApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/vocab/atoms') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const layer = String(url.searchParams.get('layer') || '').trim(); // L0/L1/L2/L3/Pos/All
    const complexOnly = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('complexOnly') || '0').toLowerCase());
    const limitRaw = Number(url.searchParams.get('limit') || 800);
    const offsetRaw = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 5000) : 800;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const names = session?.vocabulary?.names?.() || [];

    const factPolyTerms = new Map();
    for (const f of session.kbFacts || []) {
      if (!f?.name) continue;
      const name = String(f.name);
      if (!factPolyTerms.has(name)) {
        factPolyTerms.set(name, polynomialTermCount(f?.vector));
      }
    }

    const filtered = names.filter((n) => {
      const name = String(n);
      if (q && !name.toLowerCase().includes(q)) return false;
      if (!layer || layer.toLowerCase() === 'all') return true;
      if (layer.toLowerCase() === 'pos') return isPositionToken(name);
      return classifyLayer(name).toLowerCase() === layer.toLowerCase();
    }).filter((n) => {
      if (!complexOnly) return true;
      const name = String(n);
      const defTerms = factPolyTerms.get(name);
      if (Number.isFinite(defTerms)) return Number(defTerms) >= 2;
      const vec = session?.vocabulary?.get?.(name) || null;
      return polynomialTermCount(vec) >= 2;
    });

    filtered.sort((a, b) => {
      // More "complex" names first (length), then alpha.
      const al = String(a).length;
      const bl = String(b).length;
      if (al !== bl) return bl - al;
      return String(a).localeCompare(String(b));
    });

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);
    const atoms = page.map((name) => ({
      name: String(name),
      layer: isPositionToken(name) ? 'Pos' : classifyLayer(name),
      isPosition: isPositionToken(name),
      hasGraph: !!findGraphDef(session, name)
    }));

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      total,
      offset,
      limit,
      atoms
    });
    return true;
  }

  const vocabAtomMatch = url.pathname.match(/^\/api\/vocab\/atoms\/(.+)$/);
  if (req.method === 'GET' && vocabAtomMatch) {
    const found = ctx.store.requireUniverse(req, url);
    if (!found) {
      json(res, 404, { ok: false, error: 'Unknown session' });
      return true;
    }
    const { session } = found.universe;
    const name = decodeURIComponent(vocabAtomMatch[1] || '');
    const vec = session?.vocabulary?.getOrCreate?.(String(name));
    const graph = findGraphDef(session, name);

    let kbFactId = null;
    let kbFactLabel = null;
    let kbFactSource = null;
    let kbFactVectorItems = null;
    for (const f of session.kbFacts || []) {
      if (f?.name && String(f.name) === String(name)) {
        kbFactId = f.id;
        kbFactLabel = buildFactLabel(session, f);
        kbFactSource = f?.metadata?.source || null;
        kbFactVectorItems = polynomialTermCount(f?.vector);
        break;
      }
    }

    const vocabSource = session?.vocabulary?.getSource?.(String(name)) || null;

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      name: String(name),
      layer: isPositionToken(name) ? 'Pos' : classifyLayer(name),
      isPosition: isPositionToken(name),
      vectors: { atomVector: vectorValue(vec) },
      hasGraph: !!graph,
      graphDsl: graph ? stringifyGraphDef(graph) : null,
      kbFactId,
      kbFactLabel,
      kbFactVectorItems,
      source: kbFactSource || vocabSource
    });
    return true;
  }

  return false;
}
