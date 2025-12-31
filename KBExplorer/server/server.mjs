import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session, translateNL2DSL } from '../../src/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.resolve(__dirname, '../client');

function json(res, status, payload) {
  const body = JSON.stringify(payload ?? null);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

function getHeader(req, name) {
  const raw = req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

async function readJson(req, { maxBytes = 1_000_000 } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

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

function sanitizeMode(mode) {
  const m = String(mode || '').trim();
  if (m === 'learn' || m === 'query' || m === 'prove' || m === 'abduce' || m === 'findAll') return m;
  return null;
}

function sanitizeInputMode(inputMode) {
  const m = String(inputMode || '').trim().toLowerCase();
  if (m === 'nl' || m === 'dsl') return m;
  return null;
}

function containsFileOps(dsl) {
  const s = String(dsl || '');
  // Best-effort guard: block 'Load'/'Unload' tokens (ignores comment parsing for v0.1).
  return /\bLoad\b/.test(s) || /\bUnload\b/.test(s);
}

function buildFactLabel(session, fact) {
  const meta = fact?.metadata;
  if (meta?.operator && Array.isArray(meta?.args)) {
    try {
      return session.generateText(meta.operator, meta.args);
    } catch {
      return `${meta.operator} ${meta.args.join(' ')}`.trim();
    }
  }
  if (fact?.name) return String(fact.name);
  return `Fact #${fact?.id ?? '?'}`;
}

function metadataComplexity(meta) {
  if (!meta || typeof meta !== 'object') return 0;
  let score = 1;
  const op = typeof meta.operator === 'string' ? meta.operator : null;
  const args = Array.isArray(meta.args) ? meta.args : [];
  score += op ? 1 : 0;
  score += args.length;

  // Weight structured operators slightly higher.
  if (op === 'Implies' || op === 'And' || op === 'Or' || op === 'Exists' || op === 'ForAll' || op === 'Not') {
    score += 5;
  }

  if (meta.inner) score += metadataComplexity(meta.inner);
  if (meta.condition) score += metadataComplexity(meta.condition);
  if (meta.conclusion) score += metadataComplexity(meta.conclusion);
  if (meta.body) score += metadataComplexity(meta.body);
  if (Array.isArray(meta.parts)) {
    for (const p of meta.parts) score += metadataComplexity(p);
  }
  return score;
}

function buildFactSummary(session, fact) {
  const operator = fact?.metadata?.operator ?? null;
  const args = Array.isArray(fact?.metadata?.args) ? fact.metadata.args : [];
  const name = fact?.name ?? null;
  const label = buildFactLabel(session, fact);
  const complexity = metadataComplexity(fact?.metadata || null);
  return { factId: fact.id, name, operator, args, label, complexity };
}

function buildBundleView(session, fact) {
  const summary = buildFactSummary(session, fact);
  const meta = fact?.metadata || {};
  const op = meta?.operator ?? null;
  const args = Array.isArray(meta?.args) ? meta.args : [];

  const nameIndex = new Map();
  for (const f of session.kbFacts || []) {
    if (f?.name) nameIndex.set(String(f.name), f);
  }

  const operatorItem = {
    kind: 'ATOM',
    role: 'operator',
    label: op ? String(op) : '(unknown operator)',
    hasChildren: false
  };

  const binds = [];
  for (let i = 0; i < args.length; i++) {
    const position = i + 1;
    const posName = `Pos${position}`;
    const arg = String(args[i] ?? '');
    const argFact = nameIndex.get(arg) || null;
    const argFactId = argFact?.id ?? null;
    const argFactLabel = argFact ? buildFactLabel(session, argFact) : null;
    const argComplexity = argFact ? metadataComplexity(argFact?.metadata || null) : 0;

    binds.push({
      kind: 'BIND',
      position,
      posName,
      arg,
      label: `${posName}: ${arg}`,
      argFactId,
      argFactLabel,
      argComplexity,
      hasChildren: !!argFactId
    });
  }

  // For readability: keep BINDs ordered by position, but show more complex args earlier when same position count isn't meaningful.
  // (Position order is still preserved as primary key.)
  binds.sort((a, b) => a.position - b.position);

  return {
    fact: summary,
    metadata: meta || null,
    dsl: (summary.operator && Array.isArray(summary.args)) ? `${summary.operator} ${summary.args.join(' ')}`.trim() : '',
    bundle: {
      operator: operatorItem,
      binds,
      items: [operatorItem, ...binds]
    }
  };
}

function getSessionIdFromRequest(req, url) {
  const headerId = getHeader(req, 'x-session-id');
  if (headerId) return headerId;
  const q = url?.searchParams?.get('sessionId');
  if (q) return q;
  return null;
}

function newSessionUniverse(options, sessionOptions) {
  const defaultSessionOptions = {
    // KBExplorer is an interactive tool; Core should be available even under `node --test`.
    autoLoadCore: true,
    coreIncludeIndex: true
  };
  const resolvedSessionOptions = { ...defaultSessionOptions, ...(options?.sessionOptions || {}), ...(sessionOptions || {}) };
  return {
    sessionOptions: resolvedSessionOptions,
    session: new Session(resolvedSessionOptions),
    chat: [],
    createdAt: Date.now(),
    lastUsedAt: Date.now()
  };
}

export function createKBExplorerServer(options = {}) {
  const sessions = new Map();
  const allowFileOps = options.allowFileOps ?? (process.env.KBEXPLORER_ALLOW_FILE_OPS === '1');

  function getOrCreateUniverse(req, res, url) {
    const sid = getSessionIdFromRequest(req, url);
    if (sid && sessions.has(sid)) {
      const u = sessions.get(sid);
      u.lastUsedAt = Date.now();
      return { sessionId: sid, universe: u };
    }
    const sessionId = randomUUID();
    const universe = newSessionUniverse(options, null);
    sessions.set(sessionId, universe);
    return { sessionId, universe };
  }

  function requireUniverse(req, url) {
    const sid = getSessionIdFromRequest(req, url);
    if (!sid || !sessions.has(sid)) {
      return null;
    }
    const u = sessions.get(sid);
    u.lastUsedAt = Date.now();
    return { sessionId: sid, universe: u };
  }

  async function serveClientAsset(req, res, urlPath) {
    const safePath = urlPath === '/' ? '/index.html' : urlPath;
    if (!isSafeClientPath(safePath)) {
      return text(res, 400, 'Bad path');
    }
    const fullPath = path.join(CLIENT_DIR, safePath);
    try {
      const body = await readFile(fullPath);
      res.writeHead(200, { 'content-type': contentTypeFor(fullPath) });
      res.end(body);
    } catch {
      return text(res, 404, 'Not found');
    }
  }

  async function handleApi(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/session/new') {
      let payload = null;
      try {
        payload = await readJson(req);
      } catch (e) {
        return json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
      }
      const sessionOptions = (payload && typeof payload === 'object') ? payload.sessionOptions : null;
      const sessionId = randomUUID();
      const universe = newSessionUniverse(options, sessionOptions);
      sessions.set(sessionId, universe);
      return json(res, 200, { ok: true, sessionId });
    }

    if (req.method === 'POST' && url.pathname === '/api/session/reset') {
      const found = requireUniverse(req, url);
      if (!found) return json(res, 404, { ok: false, error: 'Unknown session' });
      let payload = null;
      try {
        payload = await readJson(req);
      } catch {
        // ignore (empty body is fine)
      }
      const sessionOptions = (payload && typeof payload === 'object') ? payload.sessionOptions : null;
      try {
        found.universe.session.close();
      } catch {
        // ignore
      }
      const resolved = { ...(found.universe.sessionOptions || {}), ...(sessionOptions || {}) };
      found.universe.sessionOptions = resolved;
      found.universe.session = new Session(resolved);
      found.universe.chat = [];
      return json(res, 200, { ok: true, sessionId: found.sessionId });
    }

    if (req.method === 'GET' && url.pathname === '/api/kb/facts') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const namedOnly = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('namedOnly') || '0').toLowerCase());
      const namedFirst = !['0', 'false', 'no', 'off'].includes(String(url.searchParams.get('namedFirst') || '1').toLowerCase());
      const limitRaw = Number(url.searchParams.get('limit') || 200);
      const offsetRaw = Number(url.searchParams.get('offset') || 0);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 1000) : 200;
      const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

      const allFacts = (session.kbFacts || []).map(f => {
        const summary = buildFactSummary(session, f);
        const hay = `${summary.factId} ${summary.name || ''} ${summary.operator || ''} ${(summary.args || []).join(' ')} ${summary.label}`.toLowerCase();
        return { ...summary, _hay: hay };
      }).filter(f => (namedOnly ? !!f.name : true));

      const filtered = q ? allFacts.filter(f => f._hay.includes(q)) : allFacts;
      filtered.sort((a, b) => {
        if (namedFirst) {
          const an = a.name ? 1 : 0;
          const bn = b.name ? 1 : 0;
          if (an !== bn) return bn - an;
        }
        if (a.complexity !== b.complexity) return b.complexity - a.complexity;
        return b.factId - a.factId;
      });

      const total = filtered.length;
      const facts = filtered.slice(offset, offset + limit).map(({ _hay, ...rest }) => rest);

      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        kbFactCount: (session.kbFacts || []).length,
        total,
        offset,
        limit,
        facts
      });
    }

    const bundleMatch = url.pathname.match(/^\/api\/kb\/facts\/(\d+)\/bundle$/);
    if (req.method === 'GET' && bundleMatch) {
      const found = requireUniverse(req, url);
      if (!found) return json(res, 404, { ok: false, error: 'Unknown session' });
      const factId = Number(bundleMatch[1]);
      const { session } = found.universe;
      const fact = (session.kbFacts || []).find(f => f.id === factId);
      if (!fact) return json(res, 404, { ok: false, error: 'Unknown fact' });

      const view = buildBundleView(session, fact);
      return json(res, 200, { ok: true, ...view });
    }

    const factTreeMatch = url.pathname.match(/^\/api\/kb\/facts\/(\d+)\/tree$/);
    if (req.method === 'GET' && factTreeMatch) {
      const found = requireUniverse(req, url);
      if (!found) return json(res, 404, { ok: false, error: 'Unknown session' });
      const factId = Number(factTreeMatch[1]);
      const { session } = found.universe;
      const fact = (session.kbFacts || []).find(f => f.id === factId);
      if (!fact) return json(res, 404, { ok: false, error: 'Unknown fact' });
      // Legacy endpoint kept for compatibility; use /bundle for the new KB explorer UI.
      const view = buildBundleView(session, fact);
      return json(res, 200, { ok: true, tree: { kind: 'FACT', label: view.fact.label, children: view.bundle.items } });
    }

    if (req.method === 'POST' && url.pathname === '/api/theory/ingest') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      let payload;
      try {
        payload = await readJson(req);
      } catch (e) {
        return json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
      }
      const filename = String(payload?.filename || 'theory.sys2');
      const textBody = String(payload?.text || '');
      if (!textBody.trim()) return json(res, 400, { ok: false, error: 'Empty theory text' });
      if (!allowFileOps && containsFileOps(textBody)) {
        return json(res, 400, { ok: false, error: 'Load/Unload is disabled in KBExplorer by default' });
      }
      try {
        const result = session.learn(textBody);
        return json(res, 200, {
          ok: true,
          filename,
          sessionId: found.sessionId,
          learn: result,
          dump: session.dump()
        });
      } catch (e) {
        return json(res, 500, { ok: false, filename, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/command') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      let payload;
      try {
        payload = await readJson(req);
      } catch (e) {
        return json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
      }

      const mode = sanitizeMode(payload?.mode);
      const inputMode = sanitizeInputMode(payload?.inputMode);
      const textIn = String(payload?.text || '');
      if (!mode) return json(res, 400, { ok: false, error: 'Invalid mode' });
      if (!inputMode) return json(res, 400, { ok: false, error: 'Invalid inputMode' });
      if (!textIn.trim()) return json(res, 400, { ok: false, error: 'Empty input' });

      let dsl = textIn;
      let translation = null;
      if (inputMode === 'nl') {
        const isQuestion = mode !== 'learn';
        const tr = translateNL2DSL(textIn, { source: 'generic', isQuestion });
        translation = tr;
        if (!tr?.success) {
          return json(res, 200, {
            ok: false,
            mode,
            inputMode,
            text: textIn,
            dsl: '',
            translation: tr,
            errors: tr?.errors || [{ error: 'Translation failed' }]
          });
        }
        dsl = tr.dsl || '';
      }

      if (!allowFileOps && containsFileOps(dsl)) {
        return json(res, 400, { ok: false, error: 'Load/Unload is disabled in KBExplorer by default' });
      }

      try {
        let result;
        if (mode === 'learn') result = session.learn(dsl);
        else if (mode === 'query') result = session.query(dsl);
        else if (mode === 'prove') result = session.prove(dsl);
        else if (mode === 'abduce') result = session.abduce(dsl);
        else if (mode === 'findAll') result = session.findAll(dsl);

        let rendered = '';
        if (mode === 'prove') {
          const elaborated = session.elaborate(result);
          rendered = elaborated?.text || session.formatResult(result, 'prove');
        } else {
          rendered = session.formatResult(result, 'query');
        }

        found.universe.chat.push({
          at: Date.now(),
          mode,
          inputMode,
          text: textIn,
          dsl,
          ok: true
        });

        return json(res, 200, {
          ok: true,
          sessionId: found.sessionId,
          mode,
          inputMode,
          text: textIn,
          dsl,
          translation,
          result,
          rendered,
          dump: session.dump()
        });
      } catch (e) {
        return json(res, 500, {
          ok: false,
          sessionId: found.sessionId,
          mode,
          inputMode,
          text: textIn,
          dsl,
          translation,
          error: e?.message || String(e)
        });
      }
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname.startsWith('/api/')) {
        return await handleApi(req, res, url);
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
    sessions,
    close: () => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  };
}
