import { json } from '../lib/http.mjs';
import { DEFAULT_PACKS, listAvailablePacks } from '../lib/packs.mjs';

export async function handlePacksApi(req, res, url) {
  if (req.method !== 'GET' || url.pathname !== '/api/packs') return false;
  const availablePacks = listAvailablePacks();
  json(res, 200, {
    ok: true,
    availablePacks,
    defaultPacks: DEFAULT_PACKS.filter(p => availablePacks.includes(p))
  });
  return true;
}
