import http from 'node:http';

import { handleApi } from './api/router.mjs';
import { createClientAssetHandler } from './lib/clientAssets.mjs';
import { json, text } from './lib/http.mjs';
import { CLIENT_DIR } from './lib/paths.mjs';
import { createUniverseStore } from './lib/universeStore.mjs';

export function createKBExplorerServer(options = {}) {
  const allowFileOps = options.allowFileOps ?? (process.env.KBEXPLORER_ALLOW_FILE_OPS !== '0');
  const store = createUniverseStore(options);
  const serveClientAsset = createClientAssetHandler({ clientDir: CLIENT_DIR });

  const ctx = { options, allowFileOps, store };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname.startsWith('/api/')) {
        return await handleApi(req, res, url, ctx);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return text(res, 405, 'Method Not Allowed');
      }

      if (req.method === 'HEAD') {
        res.writeHead(200);
        return res.end();
      }

      return await serveClientAsset(req, res, url.pathname);
    } catch (e) {
      return json(res, 500, { ok: false, error: e?.message || String(e) });
    }
  });

  return {
    server,
    sessions: store.sessions,
    close: () => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  };
}

