import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { text } from './http.mjs';

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function isSafeClientPath(urlPath) {
  if (!urlPath.startsWith('/')) return false;
  if (urlPath.includes('..')) return false;
  return true;
}

export function createClientAssetHandler({ clientDir }) {
  return async function serveClientAsset(req, res, urlPath) {
    const safePath = urlPath === '/' ? '/index.html' : urlPath;
    if (!isSafeClientPath(safePath)) {
      return text(res, 400, 'Bad path');
    }
    const fullPath = path.join(clientDir, safePath);
    try {
      const body = await readFile(fullPath);
      res.writeHead(200, { 'content-type': contentTypeFor(fullPath) });
      res.end(body);
    } catch {
      return text(res, 404, 'Not found');
    }
  };
}

