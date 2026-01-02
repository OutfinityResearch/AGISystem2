import { json } from '../lib/http.mjs';

import { handleCommandApi } from './command.mjs';
import { handleGraphsApi } from './graphs.mjs';
import { handleKbApi } from './kb.mjs';
import { handlePacksApi } from './packs.mjs';
import { handlePolicyApi } from './policy.mjs';
import { handleScopeApi } from './scope.mjs';
import { handleSessionApi } from './sessions.mjs';
import { handleTheoryApi } from './theory.mjs';
import { handleUrcApi } from './urc.mjs';
import { handleVocabApi } from './vocab.mjs';

export async function handleApi(req, res, url, ctx) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { ok: true });
    return;
  }

  if (await handleSessionApi(req, res, url, ctx)) return;
  if (await handlePolicyApi(req, res, url, ctx)) return;
  if (await handleUrcApi(req, res, url, ctx)) return;
  if (await handlePacksApi(req, res, url, ctx)) return;
  if (await handleKbApi(req, res, url, ctx)) return;
  if (await handleScopeApi(req, res, url, ctx)) return;
  if (await handleVocabApi(req, res, url, ctx)) return;
  if (await handleGraphsApi(req, res, url, ctx)) return;
  if (await handleTheoryApi(req, res, url, ctx)) return;
  if (await handleCommandApi(req, res, url, ctx)) return;

  json(res, 404, { ok: false, error: 'Not found' });
}
