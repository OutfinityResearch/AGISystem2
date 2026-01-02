import { json, readJson } from '../lib/http.mjs';
import { resetSessionUniverse } from '../lib/universe.mjs';
import { buildGraphList } from '../lib/views.mjs';

export async function handleSessionApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/session/stats') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const kbFactCount = (session.kbFacts || []).length;
    const graphCount = buildGraphList(session).length;
    const vocabCount = session?.vocabulary?.size ?? 0;
    const scopeNames = session?.scope?.localNames?.() || [];
    const urcArtifactCount = session?.urc?.artifacts?.size ?? 0;
    const urcEvidenceCount = session?.urc?.evidence?.size ?? 0;
    const urcProvenanceCount = Array.isArray(session?.provenanceLog) ? session.provenanceLog.length : 0;
    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      loadedPacks: Array.isArray(found.universe.loadedPacks) ? found.universe.loadedPacks : [],
      kbFactCount,
      graphCount,
      vocabCount,
      scopeCount: Array.isArray(scopeNames) ? scopeNames.length : 0,
      urcArtifactCount,
      urcEvidenceCount,
      urcProvenanceCount
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/session/new') {
    let payload = null;
    try {
      payload = await readJson(req);
    } catch (e) {
      json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
      return true;
    }
    const sessionOptions = (payload && typeof payload === 'object') ? payload.sessionOptions : null;
    const packs = (payload && typeof payload === 'object') ? payload.packs : null;
    const created = ctx.store.createNewSession(sessionOptions, packs);
    json(res, 200, {
      ok: true,
      sessionId: created.sessionId,
      coreLoad: created.universe.coreLoad || null,
      loadedPacks: created.universe.loadedPacks || [],
      warnings: created.universe.warnings || [],
      dump: created.universe.session.dump()
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/session/reset') {
    const found = ctx.store.requireUniverse(req, url);
    if (!found) {
      json(res, 404, { ok: false, error: 'Unknown session' });
      return true;
    }
    let payload = null;
    try {
      payload = await readJson(req);
    } catch {
      // ignore (empty body is fine)
    }
    const sessionOptions = (payload && typeof payload === 'object') ? payload.sessionOptions : null;
    const packs = (payload && typeof payload === 'object') ? payload.packs : null;

    const reset = resetSessionUniverse(found.universe, ctx.options, sessionOptions, packs);

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      coreLoad: reset.coreLoad || null,
      loadedPacks: reset.loadedPacks || [],
      warnings: reset.warnings || [],
      dump: reset.session.dump()
    });
    return true;
  }

  return false;
}
