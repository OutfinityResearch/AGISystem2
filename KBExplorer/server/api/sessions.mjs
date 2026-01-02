import { json, readJson } from '../lib/http.mjs';
import { resetSessionUniverse } from '../lib/universe.mjs';
import { buildFactLabel, buildGraphList, classifyLayer, isPositionToken, polynomialTermCount } from '../lib/views.mjs';

export async function handleSessionApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/session/stats') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const { session } = found.universe;
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const complexOnly = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('complexOnly') || '0').toLowerCase());
    const kbFactCount = (session.kbFacts || []).length;
    const graphsAll = buildGraphList(session);
    const graphCount = graphsAll.length;
    const vocabCount = session?.vocabulary?.size ?? 0;
    const scopeNames = session?.scope?.localNames?.() || [];
    const urcArtifactCount = session?.urc?.artifacts?.size ?? 0;
    const urcEvidenceCount = session?.urc?.evidence?.size ?? 0;
    const urcProvenanceCount = Array.isArray(session?.provenanceLog) ? session.provenanceLog.length : 0;

    const kbBundle = session.getKBBundle?.() || session.kb || null;
    const kbBundleTerms = polynomialTermCount(kbBundle);

    const factPolyTerms = new Map();
    for (const f of session.kbFacts || []) {
      if (!f?.name) continue;
      factPolyTerms.set(String(f.name), polynomialTermCount(f.vector));
    }

    const kbFactCountFiltered = (session.kbFacts || []).filter((f) => {
      if (complexOnly && polynomialTermCount(f?.vector) < 2) return false;
      if (!q) return true;
      const meta = f?.metadata || null;
      const op = meta?.operator ? String(meta.operator) : '';
      const args = Array.isArray(meta?.args) ? meta.args.join(' ') : '';
      const name = f?.name ? String(f.name) : '';
      const label = buildFactLabel(session, f);
      const hay = `${f?.id ?? ''} ${name} ${op} ${args} ${label}`.toLowerCase();
      return hay.includes(q);
    }).length;

    const graphCountFiltered = graphsAll.filter((g) => {
      if (q) {
        const hay = `${String(g.name || '')} ${(g.params || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (!complexOnly) return true;
      const name = String(g?.persistName || g?.name || '');
      return (factPolyTerms.get(name) || 0) >= 2;
    }).length;

    const vocabNames = session?.vocabulary?.names?.() || [];
    const vocabLayerCounts = {
      Pos: { total: 0, filtered: 0 },
      L0: { total: 0, filtered: 0 },
      L1: { total: 0, filtered: 0 },
      L2: { total: 0, filtered: 0 },
      L3: { total: 0, filtered: 0 },
      All: { total: vocabNames.length, filtered: 0 }
    };
    let vocabCountFiltered = 0;
    for (const n of vocabNames) {
      const name = String(n);
      const layer = isPositionToken(name) ? 'Pos' : classifyLayer(name);
      if (vocabLayerCounts[layer]) vocabLayerCounts[layer].total++;

      if (q && !name.toLowerCase().includes(q)) continue;
      if (complexOnly) {
        const defTerms = factPolyTerms.get(name);
        if (Number.isFinite(defTerms)) {
          if (Number(defTerms) < 2) continue;
        } else {
          const vec = session?.vocabulary?.get?.(name) || null;
          if (polynomialTermCount(vec) < 2) continue;
        }
      }

      vocabCountFiltered++;
      vocabLayerCounts.All.filtered++;
      if (vocabLayerCounts[layer]) vocabLayerCounts[layer].filtered++;
    }

    const scopeCountFiltered = scopeNames.filter((n) => {
      const name = String(n);
      if (q && !name.toLowerCase().includes(q)) return false;
      if (!complexOnly) return true;
      const vec = session?.scope?.get?.(name) || null;
      return polynomialTermCount(vec) >= 2;
    }).length;

    const urcArtifactCountFiltered = (() => {
      if (!q) return urcArtifactCount;
      const items = session?.urc?.artifacts ? Array.from(session.urc.artifacts.values()) : [];
      return items.filter((a) => {
        const id = a?.id ? String(a.id) : '';
        const fmt = a?.format ? String(a.format) : '';
        const hash = a?.hash ? String(a.hash) : '';
        return `${id} ${fmt} ${hash}`.toLowerCase().includes(q);
      }).length;
    })();
    const urcEvidenceCountFiltered = (() => {
      if (!q) return urcEvidenceCount;
      const items = session?.urc?.evidence ? Array.from(session.urc.evidence.values()) : [];
      return items.filter((e) => {
        const id = e?.id ? String(e.id) : '';
        const kind = e?.kind ? String(e.kind) : '';
        const status = e?.status ? String(e.status) : '';
        const tool = e?.tool ? String(e.tool) : '';
        const method = e?.method ? String(e.method) : '';
        const supports = e?.supports ? String(e.supports) : '';
        return `${id} ${kind} ${status} ${tool} ${method} ${supports}`.toLowerCase().includes(q);
      }).length;
    })();
    const urcProvenanceCountFiltered = (() => {
      if (!q) return urcProvenanceCount;
      const items = Array.isArray(session?.provenanceLog) ? session.provenanceLog : [];
      return items.filter((p) => {
        const id = p?.id ? String(p.id) : '';
        const kind = p?.kind ? String(p.kind) : '';
        const nl = p?.nlText ? String(p.nlText) : '';
        const dsl = p?.dslText ? String(p.dslText) : '';
        return `${id} ${kind} ${nl} ${dsl}`.toLowerCase().includes(q);
      }).length;
    })();

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      loadedPacks: Array.isArray(found.universe.loadedPacks) ? found.universe.loadedPacks : [],
      kbFactCount,
      kbFactCountFiltered,
      graphCount,
      graphCountFiltered,
      vocabCount,
      vocabCountFiltered,
      vocabLayerCounts,
      scopeCount: Array.isArray(scopeNames) ? scopeNames.length : 0,
      scopeCountFiltered,
      urcArtifactCount,
      urcArtifactCountFiltered,
      urcEvidenceCount,
      urcEvidenceCountFiltered,
      urcProvenanceCount,
      urcProvenanceCountFiltered,
      kbBundleTerms
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
