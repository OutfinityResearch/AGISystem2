import { json } from '../lib/http.mjs';

export async function handleUrcApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/urc/artifacts') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const artifacts = found.universe.session?.urc?.artifacts;
    const items = [];
    if (artifacts && typeof artifacts.values === 'function') {
      for (const a of artifacts.values()) {
        const textBody = String(a?.text || '');
        items.push({
          id: a?.id || null,
          format: a?.format || '',
          hash: a?.hash || '',
          at: a?.at || null,
          byteLength: Buffer.byteLength(textBody, 'utf8')
        });
      }
    }
    items.sort((x, y) => (y.at || 0) - (x.at || 0));
    json(res, 200, { ok: true, sessionId: found.sessionId, count: items.length, artifacts: items });
    return true;
  }

  const urcArtifactMatch = url.pathname.match(/^\/api\/urc\/artifacts\/([^/]+)$/);
  if (req.method === 'GET' && urcArtifactMatch) {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const artifactId = decodeURIComponent(urcArtifactMatch[1]);
    const artifact = found.universe.session?.urc?.artifacts?.get?.(artifactId) || null;
    if (!artifact) {
      json(res, 404, { ok: false, error: 'Unknown artifact' });
      return true;
    }
    json(res, 200, { ok: true, sessionId: found.sessionId, artifact });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/urc/evidence') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const evidenceStore = found.universe.session?.urc?.evidence;
    const items = [];
    if (evidenceStore && typeof evidenceStore.values === 'function') {
      for (const e of evidenceStore.values()) {
        items.push({
          id: e?.id || null,
          kind: e?.kind || '',
          method: e?.method || '',
          tool: e?.tool || '',
          status: e?.status || '',
          supports: e?.supports || '',
          artifactId: e?.artifactId || '',
          scope: e?.scope || '',
          at: e?.at || null
        });
      }
    }
    items.sort((x, y) => (y.at || 0) - (x.at || 0));
    json(res, 200, { ok: true, sessionId: found.sessionId, count: items.length, evidence: items });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/urc/provenance') {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const log = Array.isArray(found.universe.session?.provenanceLog) ? found.universe.session.provenanceLog : [];
    const items = log
      .map(e => ({
        id: e?.id || null,
        kind: e?.kind || '',
        at: e?.at || null,
        srcNl: e?.srcNl || null,
        srcDsl: e?.srcDsl || null,
        nlPreview: String(e?.nlText || '').slice(0, 200),
        dslPreview: String(e?.dslText || '').slice(0, 200),
        materialized: e?.materialized === true
      }))
      .sort((a, b) => (b.at || 0) - (a.at || 0));
    json(res, 200, { ok: true, sessionId: found.sessionId, count: items.length, provenance: items });
    return true;
  }

  const urcProvenanceMatch = url.pathname.match(/^\/api\/urc\/provenance\/([^/]+)$/);
  if (req.method === 'GET' && urcProvenanceMatch) {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const id = decodeURIComponent(urcProvenanceMatch[1]);
    const log = Array.isArray(found.universe.session?.provenanceLog) ? found.universe.session.provenanceLog : [];
    const entry = log.find(e => String(e?.id || '') === id) || null;
    if (!entry) {
      json(res, 404, { ok: false, error: 'Unknown provenance entry' });
      return true;
    }
    json(res, 200, { ok: true, sessionId: found.sessionId, entry });
    return true;
  }

  const urcEvidenceMatch = url.pathname.match(/^\/api\/urc\/evidence\/([^/]+)$/);
  if (req.method === 'GET' && urcEvidenceMatch) {
    const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
    const evidenceId = decodeURIComponent(urcEvidenceMatch[1]);
    const evidence = found.universe.session?.urc?.evidence?.get?.(evidenceId) || null;
    if (!evidence) {
      json(res, 404, { ok: false, error: 'Unknown evidence' });
      return true;
    }
    json(res, 200, { ok: true, sessionId: found.sessionId, evidence });
    return true;
  }

  return false;
}
