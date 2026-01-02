import { json, readJson } from '../lib/http.mjs';
import { containsFileOps } from '../lib/dsl.mjs';

export async function handleTheoryApi(req, res, url, ctx) {
  if (req.method !== 'POST' || url.pathname !== '/api/theory/ingest') return false;

  const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
  const { session } = found.universe;
  let payload;
  try {
    payload = await readJson(req);
  } catch (e) {
    json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
    return true;
  }
  const filename = String(payload?.filename || 'theory.sys2');
  const textBody = String(payload?.text || '');
  if (!textBody.trim()) {
    json(res, 400, { ok: false, error: 'Empty theory text' });
    return true;
  }
  if (!ctx.allowFileOps && containsFileOps(textBody)) {
    json(res, 400, { ok: false, error: 'Load/Unload is disabled (KBEXPLORER_ALLOW_FILE_OPS=0)' });
    return true;
  }
  try {
    const result = session.learn(textBody);
    json(res, 200, {
      ok: true,
      filename,
      sessionId: found.sessionId,
      learn: result,
      dump: session.dump()
    });
    return true;
  } catch (e) {
    json(res, 500, { ok: false, filename, error: e?.message || String(e) });
    return true;
  }
}
