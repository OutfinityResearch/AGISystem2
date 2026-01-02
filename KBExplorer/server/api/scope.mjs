import { json } from '../lib/http.mjs';
import { vectorValue } from '../lib/views.mjs';

export async function handleScopeApi(req, res, url, ctx) {
  if (req.method !== 'GET' || url.pathname !== '/api/scope/bindings') return false;

  const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
  const { session } = found.universe;
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
  const limitRaw = Number(url.searchParams.get('limit') || 500);
  const offsetRaw = Number(url.searchParams.get('offset') || 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 2000) : 500;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const names = session?.scope?.localNames?.() || [];
  const filtered = q ? names.filter(n => String(n).toLowerCase().includes(q)) : names;
  filtered.sort((a, b) => String(a).localeCompare(String(b)));
  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  const bindings = page.map((name) => {
    const vec = session?.scope?.get?.(name) || null;
    return { name: String(name), vectorValue: vectorValue(vec) };
  });

  json(res, 200, {
    ok: true,
    sessionId: found.sessionId,
    total,
    offset,
    limit,
    bindings
  });
  return true;
}
