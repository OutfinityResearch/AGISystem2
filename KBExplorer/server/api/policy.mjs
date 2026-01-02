import { json } from '../lib/http.mjs';

export async function handlePolicyApi(req, res, url, ctx) {
  if (req.method !== 'GET' || url.pathname !== '/api/policy/view') return false;

  const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
  const { session } = found.universe;
  const view = session.materializePolicyView?.({}) || null;
  if (!view?.success) {
    json(res, 200, { ok: true, sessionId: found.sessionId, view: null });
    return true;
  }
  const normalizedView = {
    newerWins: view?.policy?.newerWins ?? true,
    policy: view.policy || null,
    warnings: view.warnings || [],
    currentFactIds: Array.from(view.currentFactIds || []).sort((a, b) => a - b),
    supersedes: view.supersedes || [],
    negates: view.negates || [],
    materializedFactLines: Array.isArray(view.materializedFactLines) ? view.materializedFactLines : [],
    materializedAtKbVersion: view.materializedAtKbVersion ?? null
  };
  json(res, 200, {
    ok: true,
    sessionId: found.sessionId,
    view: normalizedView,
    ...normalizedView
  });
  return true;
}
