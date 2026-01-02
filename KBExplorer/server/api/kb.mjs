import { json } from '../lib/http.mjs';
import { buildBundleView, buildFactSummary, vectorValue } from '../lib/views.mjs';

export async function handleKbApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/kb/facts') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const namedOnly = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('namedOnly') || '0').toLowerCase());
    const namedFirst = !['0', 'false', 'no', 'off'].includes(String(url.searchParams.get('namedFirst') || '1').toLowerCase());
    const limitRaw = Number(url.searchParams.get('limit') || 200);
    const offsetRaw = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 1000) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const allFacts = (session.kbFacts || []).map(f => {
      const summary = buildFactSummary(session, f);
      const hay = `${summary.factId} ${summary.name || ''} ${summary.operator || ''} ${(summary.args || []).join(' ')} ${summary.label}`.toLowerCase();
      return { ...summary, _hay: hay };
    }).filter(f => (namedOnly ? !!f.name : true));

    const filtered = q ? allFacts.filter(f => f._hay.includes(q)) : allFacts;
    filtered.sort((a, b) => {
      if (namedFirst) {
        const an = a.name ? 1 : 0;
        const bn = b.name ? 1 : 0;
        if (an !== bn) return bn - an;
      }
      if (a.complexity !== b.complexity) return b.complexity - a.complexity;
      return b.factId - a.factId;
    });

    const total = filtered.length;
    const facts = filtered.slice(offset, offset + limit).map(({ _hay, ...rest }) => rest);

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      kbFactCount: (session.kbFacts || []).length,
      total,
      offset,
      limit,
      facts
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/kb/bundle') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const kb = session.getKBBundle?.() || session.kb || null;
    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      kbFactCount: (session.kbFacts || []).length,
      kbVector: vectorValue(kb)
    });
    return true;
  }

  const bundleMatch = url.pathname.match(/^\/api\/kb\/facts\/(\d+)\/bundle$/);
  if (req.method === 'GET' && bundleMatch) {
    const found = ctx.store.requireUniverse(req, url);
    if (!found) {
      json(res, 404, { ok: false, error: 'Unknown session' });
      return true;
    }
    const factId = Number(bundleMatch[1]);
    const { session } = found.universe;
    const fact = (session.kbFacts || []).find(f => f.id === factId);
    if (!fact) {
      json(res, 404, { ok: false, error: 'Unknown fact' });
      return true;
    }

    const view = buildBundleView(session, fact);
    json(res, 200, { ok: true, ...view });
    return true;
  }

  const factTreeMatch = url.pathname.match(/^\/api\/kb\/facts\/(\d+)\/tree$/);
  if (req.method === 'GET' && factTreeMatch) {
    const found = ctx.store.requireUniverse(req, url);
    if (!found) {
      json(res, 404, { ok: false, error: 'Unknown session' });
      return true;
    }
    const factId = Number(factTreeMatch[1]);
    const { session } = found.universe;
    const fact = (session.kbFacts || []).find(f => f.id === factId);
    if (!fact) {
      json(res, 404, { ok: false, error: 'Unknown fact' });
      return true;
    }
    // Legacy endpoint kept for compatibility; use /bundle for the new KB explorer UI.
    const view = buildBundleView(session, fact);
    json(res, 200, { ok: true, tree: { kind: 'FACT', label: view.fact.label, children: view.bundle.items } });
    return true;
  }

  return false;
}
