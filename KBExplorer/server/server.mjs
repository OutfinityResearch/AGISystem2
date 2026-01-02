import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session, translateNL2DSL } from '../../src/index.mjs';
import { withPosition } from '../../src/core/position.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.resolve(__dirname, '../client');
const CORE_DIR = path.resolve(__dirname, '../../config/Core');

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

const ALLOWED_HDC_STRATEGIES = new Set([
  'dense-binary',
  'exact',
  'sparse-polynomial',
  'metric-affine',
  'metric-affine-elastic'
]);

const ALLOWED_REASONING_PRIORITIES = new Set([
  'symbolicPriority',
  'holographicPriority'
]);

function sanitizeSessionOptions(sessionOptions) {
  if (!sessionOptions || typeof sessionOptions !== 'object') return {};
  const out = {};

  if (typeof sessionOptions.hdcStrategy === 'string' && ALLOWED_HDC_STRATEGIES.has(sessionOptions.hdcStrategy)) {
    out.hdcStrategy = sessionOptions.hdcStrategy;
  }
  if (typeof sessionOptions.reasoningPriority === 'string' && ALLOWED_REASONING_PRIORITIES.has(sessionOptions.reasoningPriority)) {
    out.reasoningPriority = sessionOptions.reasoningPriority;
  }

  // Keep the rest server-owned for now (geometry, strict modes, etc.).
  return out;
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

function firstDslStatementLine(dsl) {
  const lines = String(dsl || '').split('\n').map(l => l.trim()).filter(Boolean);
  // Prefer a concrete statement line over declarations/comments.
  for (const l of lines) {
    if (l.startsWith('#')) continue;
    if (l.startsWith('//')) continue;
    // Operator declaration lines typically look like: @x:x __Relation
    if (/^@[^\s]+:[^\s]+\s+__/.test(l)) continue;
    return l;
  }
  return lines[0] || '';
}

function tryTranslateKbExplorerDirective(text, { mode }) {
  if (mode !== 'learn') return null;
  const raw = String(text || '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Planning directive (NL-ish):
  // "Solve planning: goal: Alice is at the park. maxDepth: 3. as: plan"
  if (lower.startsWith('solve planning') || lower.startsWith('plan:') || lower.startsWith('solve plan')) {
    const maxDepthMatch = raw.match(/\bmax\s*depth\s*[:=]?\s*(\d+)\b/i) || raw.match(/\bmaxDepth\s*[:=]?\s*(\d+)\b/i);
    const maxDepth = maxDepthMatch ? Number(maxDepthMatch[1]) : 4;

    const asMatch = raw.match(/\bas\s*[:=]?\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const planName = asMatch ? asMatch[1] : 'plan';

    const goalMatch =
      raw.match(/\bgoal\s*[:=]\s*(.+?)(?:\.\s*|;\s*|$)/i) ||
      raw.match(/\bgoal\s+is\s+(.+?)(?:\.\s*|;\s*|$)/i);
    if (!goalMatch) return null;

    const goalText = String(goalMatch[1] || '').trim();
    if (!goalText) return null;

    // Allow either DSL ("at Alice Park") or NL ("Alice is in the kitchen.").
    let goalDsl = goalText;
    if (!/^[A-Za-z_][A-Za-z0-9_'-]*\s+/.test(goalText) || /[.?!]$/.test(goalText)) {
      const tr = translateNL2DSL(goalText, { source: 'generic', isQuestion: false });
      if (!tr?.success) return null;
      goalDsl = firstDslStatementLine(tr.dsl);
    }

    const dsl = [
      `@goal ${goalDsl}`,
      `@${planName} solve planning [`,
      `  (goal goal),`,
      `  (maxDepth ${Number.isFinite(maxDepth) ? maxDepth : 4})`,
      `]`
    ].join('\n');

    return {
      dsl,
      translation: {
        success: true,
        type: 'kbexplorer_directive',
        directive: 'solve_planning',
        errors: [],
        warnings: []
      }
    };
  }

  // Wedding seating directive (NL-ish):
  // "Solve wedding seating: variables from Guest, domain from Table, noConflict conflictsWith, as seating"
  if (lower.startsWith('solve weddingseating') || lower.startsWith('solve wedding seating')) {
    const variablesMatch =
      raw.match(/\bvariables\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\bguests\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const domainMatch =
      raw.match(/\bdomain\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\btables\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const conflictMatch =
      raw.match(/\bno\\s*conflict\\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\bconflict\\s*relation\\s*[:=]?\\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const asMatch = raw.match(/\bas\\s*[:=]?\\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);

    const relName = asMatch ? asMatch[1] : 'seating';
    const variables = variablesMatch ? variablesMatch[1] : null;
    const domain = domainMatch ? domainMatch[1] : null;
    const conflict = conflictMatch ? conflictMatch[1] : 'conflictsWith';

    if (!variables || !domain) return null;

    const dsl = `@${relName} solve WeddingSeating [ (variablesFrom ${variables}), (domainFrom ${domain}), (noConflict ${conflict}) ]`;
    return {
      dsl,
      translation: {
        success: true,
        type: 'kbexplorer_directive',
        directive: 'solve_wedding_seating',
        errors: [],
        warnings: []
      }
    };
  }

  return null;
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

function vectorValue(vec, { maxItems = 64 } = {}) {
  if (!vec) return null;

  // Dense-binary: Uint32Array
  if (vec?.data instanceof Uint32Array) {
    const u32 = vec.data;
    const n = Math.min(maxItems, u32.length);
    const values = [];
    for (let i = 0; i < n; i++) {
      values.push(u32[i] >>> 0);
    }
    return { values, truncated: u32.length > n, total: u32.length };
  }

  // Metric-affine: Uint8Array
  if (vec?.data instanceof Uint8Array) {
    const u8 = vec.data;
    const n = Math.min(maxItems, u8.length);
    const values = [];
    for (let i = 0; i < n; i++) values.push(u8[i]);
    return { values, truncated: u8.length > n, total: u8.length };
  }

  // Sparse polynomial: Set<bigint>
  if (vec?.exponents instanceof Set) {
    const arr = Array.from(vec.exponents);
    const n = Math.min(maxItems, arr.length);
    const values = [];
    for (let i = 0; i < n; i++) values.push(`0x${arr[i].toString(16)}`);
    return { values, truncated: arr.length > n, total: arr.length };
  }

  // EXACT: bigint[] terms
  if (Array.isArray(vec?.terms) && vec.terms.every(t => typeof t === 'bigint')) {
    const terms = vec.terms;
    const n = Math.min(maxItems, terms.length);
    const values = [];
    for (let i = 0; i < n; i++) values.push(`0x${terms[i].toString(16)}`);
    return { values, truncated: terms.length > n, total: terms.length };
  }

  // Fallback: serialize if possible and show its data payload.
  if (typeof vec.serialize === 'function') {
    try {
      const s = vec.serialize();
      const data = s?.data;
      const arr = Array.isArray(data) ? data : [data];
      const n = Math.min(maxItems, arr.length);
      return { values: arr.slice(0, n), truncated: arr.length > n, total: arr.length };
    } catch {
      // ignore
    }
  }

  return null;
}

function stringifyGraphDef(graphDef) {
  if (!graphDef) return '';
  const params = Array.isArray(graphDef.params) ? graphDef.params : [];

  let head = 'graph';
  if (graphDef.name && graphDef.persistName) head = `@${graphDef.name}:${graphDef.persistName} graph`;
  else if (graphDef.name) head = `@${graphDef.name} graph`;
  else if (graphDef.persistName) head = `@:${graphDef.persistName} graph`;

  const lines = [];
  lines.push(`${head}${params.length ? ` ${params.join(' ')}` : ''}`);

  const body = Array.isArray(graphDef.body) ? graphDef.body : [];
  for (const stmt of body) {
    const raw = typeof stmt?.toString === 'function' ? stmt.toString() : String(stmt || '');
    if (raw.trim()) lines.push(`    ${raw}`);
  }

  if (graphDef.returnExpr) {
    const raw = typeof graphDef.returnExpr?.toString === 'function'
      ? graphDef.returnExpr.toString()
      : String(graphDef.returnExpr);
    if (raw.trim()) lines.push(`    return ${raw}`);
  }

  lines.push('end');
  return lines.join('\n');
}

function buildGraphList(session) {
  const graphs = session?.graphs;
  if (!graphs || typeof graphs.get !== 'function') return [];

  // Deduplicate by graph object identity first.
  const unique = new Set();
  const out = [];
  for (const [, def] of graphs.entries()) {
    if (!def || typeof def !== 'object') continue;
    if (unique.has(def)) continue;
    unique.add(def);

    const name = String(def.persistName || def.name || '');
    if (!name) continue;

    const bodyLen = Array.isArray(def.body) ? def.body.length : 0;
    out.push({
      name,
      params: Array.isArray(def.params) ? def.params : [],
      bodyLen,
      hasReturn: !!def.returnExpr
    });
  }
  return out;
}

function findGraphDef(session, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  return session?.graphs?.get?.(n) || null;
}

function classifyLayer(name) {
  const n = String(name || '');
  if (n.startsWith('___')) return 'L0';
  if (n.startsWith('__')) return 'L1';
  if (n.startsWith('_')) return 'L2';
  return 'L3';
}

function isPositionToken(name) {
  const n = String(name || '');
  return /^Pos\d+$/.test(n) || /^__Pos\d+__$/.test(n) || /^__POS_\d+__$/.test(n);
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

  const factVector = vectorValue(fact?.vector) || null;
  const operatorFact = op ? (nameIndex.get(String(op)) || null) : null;
  const operatorVector = op ? session.vocabulary?.getOrCreate?.(String(op)) : null;
  const operatorGraph = op ? (session.graphs?.get?.(String(op)) || null) : null;
  const operatorItem = {
    kind: 'VERB',
    role: 'operator',
    label: op ? String(op) : '(unknown operator)',
    definitionFactId: operatorFact?.id ?? null,
    definitionFactLabel: operatorFact ? buildFactLabel(session, operatorFact) : null,
    vectorValue: vectorValue(operatorVector),
    graphDsl: operatorGraph ? stringifyGraphDef(operatorGraph) : null,
    hasChildren: false
  };

  const binds = [];
  for (let i = 0; i < args.length; i++) {
    const position = i + 1;
    const arg = String(args[i] ?? '');
    const argFact = nameIndex.get(arg) || null;
    const argFactId = argFact?.id ?? null;
    const argFactLabel = argFact ? buildFactLabel(session, argFact) : null;
    const argComplexity = argFact ? metadataComplexity(argFact?.metadata || null) : 0;
    const argVector = session.vocabulary?.getOrCreate?.(arg) || null;
    const positionedVector = argVector ? withPosition(position, argVector, session) : null;

    binds.push({
      kind: 'BIND',
      position,
      arg,
      label: `#${position}: ${arg}`,
      argFactId,
      argFactLabel,
      argComplexity,
      vectorValue: vectorValue(argVector),
      positionedVectorValue: vectorValue(positionedVector),
      hasChildren: !!argFactId
    });
  }

  // For readability: keep BINDs ordered by position, but show more complex args earlier when same position count isn't meaningful.
  // (Position order is still preserved as primary key.)
  binds.sort((a, b) => a.position - b.position);

  const statementDsl = (() => {
    if (!op) return '';
    if (!Array.isArray(args)) return String(op);
    if (op === '___NewVector') {
      // Core uses literals; show them quoted for fidelity.
      return `${op} ${args.map(a => JSON.stringify(String(a))).join(' ')}`.trim();
    }
    return `${op} ${args.map(a => String(a)).join(' ')}`.trim();
  })();

  return {
    fact: summary,
    metadata: meta || null,
    dsl: (summary.operator && Array.isArray(summary.args)) ? `${summary.operator} ${summary.args.join(' ')}`.trim() : '',
    statementDsl,
    vectors: {
      factVector: factVector || null,
      operatorVector: operatorItem.vectorValue || null
    },
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
  const resolvedSessionOptions = {
    ...(options?.sessionOptions || {}),
    ...(sanitizeSessionOptions(sessionOptions) || {})
  };

  const warnings = [];
  let session = null;
  try {
    session = new Session(resolvedSessionOptions);
  } catch (e) {
    warnings.push(`Failed to create session with requested options; falling back to defaults: ${e?.message || String(e)}`);
    session = new Session({});
  }

  const coreLoad = session.loadCore({ includeIndex: true, corePath: CORE_DIR });
  if (!coreLoad?.success) {
    warnings.push('Core load reported errors (KBExplorer will still run, but NL→DSL and reasoning may be degraded).');
  }

  return {
    sessionOptions: resolvedSessionOptions,
    coreLoad,
    warnings,
    session,
    chat: [],
    createdAt: Date.now(),
    lastUsedAt: Date.now()
  };
}

export function createKBExplorerServer(options = {}) {
  const sessions = new Map();
  // Research-first default: allow DSL Load/Unload unless explicitly disabled.
  const allowFileOps = options.allowFileOps ?? (process.env.KBEXPLORER_ALLOW_FILE_OPS !== '0');

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

    if (req.method === 'GET' && url.pathname === '/api/session/stats') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      const kbFactCount = (session.kbFacts || []).length;
      const graphCount = buildGraphList(session).length;
      const vocabCount = session?.vocabulary?.size ?? 0;
      const scopeNames = session?.scope?.localNames?.() || [];
      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        kbFactCount,
        graphCount,
        vocabCount,
        scopeCount: Array.isArray(scopeNames) ? scopeNames.length : 0
      });
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
      return json(res, 200, {
        ok: true,
        sessionId,
        coreLoad: universe.coreLoad || null,
        warnings: universe.warnings || [],
        dump: universe.session.dump()
      });
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
      const resolved = {
        ...(found.universe.sessionOptions || {}),
        ...(sanitizeSessionOptions(sessionOptions) || {})
      };
      found.universe.sessionOptions = resolved;

      let session = null;
      const warnings = [];
      try {
        session = new Session(resolved);
      } catch (e) {
        warnings.push(`Failed to create session with requested options; falling back to defaults: ${e?.message || String(e)}`);
        session = new Session({});
      }

      const coreLoad = session.loadCore({ includeIndex: true, corePath: CORE_DIR });
      if (!coreLoad?.success) warnings.push('Core load reported errors.');

      found.universe.session = session;
      found.universe.coreLoad = coreLoad;
      found.universe.warnings = warnings;
      found.universe.chat = [];
      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        coreLoad: coreLoad || null,
        warnings,
        dump: session.dump()
      });
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

    if (req.method === 'GET' && url.pathname === '/api/kb/bundle') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      const kb = session.getKBBundle?.() || session.kb || null;
      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        kbFactCount: (session.kbFacts || []).length,
        kbVector: vectorValue(kb)
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

    if (req.method === 'GET' && url.pathname === '/api/scope/bindings') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
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

      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        total,
        offset,
        limit,
        bindings
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/vocab/atoms') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const layer = String(url.searchParams.get('layer') || '').trim(); // L0/L1/L2/L3/Pos/All
      const limitRaw = Number(url.searchParams.get('limit') || 800);
      const offsetRaw = Number(url.searchParams.get('offset') || 0);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 5000) : 800;
      const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

      const names = session?.vocabulary?.names?.() || [];
      const filtered = names.filter((n) => {
        const name = String(n);
        if (q && !name.toLowerCase().includes(q)) return false;
        if (!layer || layer.toLowerCase() === 'all') return true;
        if (layer.toLowerCase() === 'pos') return isPositionToken(name);
        return classifyLayer(name).toLowerCase() === layer.toLowerCase();
      });

      filtered.sort((a, b) => {
        // More "complex" names first (length), then alpha.
        const al = String(a).length;
        const bl = String(b).length;
        if (al !== bl) return bl - al;
        return String(a).localeCompare(String(b));
      });

      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      const atoms = page.map((name) => ({
        name: String(name),
        layer: isPositionToken(name) ? 'Pos' : classifyLayer(name),
        isPosition: isPositionToken(name),
        hasGraph: !!findGraphDef(session, name)
      }));

      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        total,
        offset,
        limit,
        atoms
      });
    }

    const vocabAtomMatch = url.pathname.match(/^\/api\/vocab\/atoms\/(.+)$/);
    if (req.method === 'GET' && vocabAtomMatch) {
      const found = requireUniverse(req, url);
      if (!found) return json(res, 404, { ok: false, error: 'Unknown session' });
      const { session } = found.universe;
      const name = decodeURIComponent(vocabAtomMatch[1] || '');
      const vec = session?.vocabulary?.getOrCreate?.(String(name));
      const graph = findGraphDef(session, name);

      let kbFactId = null;
      let kbFactLabel = null;
      for (const f of session.kbFacts || []) {
        if (f?.name && String(f.name) === String(name)) {
          kbFactId = f.id;
          kbFactLabel = buildFactLabel(session, f);
          break;
        }
      }

      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        name: String(name),
        layer: isPositionToken(name) ? 'Pos' : classifyLayer(name),
        isPosition: isPositionToken(name),
        vectors: { atomVector: vectorValue(vec) },
        hasGraph: !!graph,
        graphDsl: graph ? stringifyGraphDef(graph) : null,
        kbFactId,
        kbFactLabel
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/graphs') {
      const found = requireUniverse(req, url) ?? getOrCreateUniverse(req, res, url);
      const { session } = found.universe;
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const limitRaw = Number(url.searchParams.get('limit') || 300);
      const offsetRaw = Number(url.searchParams.get('offset') || 0);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 2000) : 300;
      const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

      const all = buildGraphList(session);
      const filtered = q
        ? all.filter(g => `${g.name} ${(g.params || []).join(' ')}`.toLowerCase().includes(q))
        : all;

      // Complexity-first (do not expose the score in UI).
      filtered.sort((a, b) => {
        if (a.bodyLen !== b.bodyLen) return b.bodyLen - a.bodyLen;
        return a.name.localeCompare(b.name);
      });

      const total = filtered.length;
      const graphs = filtered.slice(offset, offset + limit);
      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        graphCount: all.length,
        total,
        offset,
        limit,
        graphs
      });
    }

    const graphMatch = url.pathname.match(/^\/api\/graphs\/(.+)$/);
    if (req.method === 'GET' && graphMatch) {
      const found = requireUniverse(req, url);
      if (!found) return json(res, 404, { ok: false, error: 'Unknown session' });
      const { session } = found.universe;
      const name = decodeURIComponent(graphMatch[1] || '');
      const def = findGraphDef(session, name);
      if (!def) return json(res, 404, { ok: false, error: 'Unknown graph' });

      // If a KB fact exists with this name, surface it for cross-navigation.
      let kbFactId = null;
      let kbFactLabel = null;
      for (const f of session.kbFacts || []) {
        if (f?.name && String(f.name) === String(def.persistName || def.name)) {
          kbFactId = f.id;
          kbFactLabel = buildFactLabel(session, f);
          break;
        }
      }

      const graphDsl = stringifyGraphDef(def);
      const operatorVector = session.vocabulary?.getOrCreate?.(String(def.persistName || def.name));

      return json(res, 200, {
        ok: true,
        sessionId: found.sessionId,
        name: String(def.persistName || def.name),
        params: Array.isArray(def.params) ? def.params : [],
        bodyLen: Array.isArray(def.body) ? def.body.length : 0,
        hasReturn: !!def.returnExpr,
        graphDsl,
        vectors: {
          operatorVector: vectorValue(operatorVector)
        },
        kbFactId,
        kbFactLabel,
        raw: def
      });
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
        return json(res, 400, { ok: false, error: 'Load/Unload is disabled (KBEXPLORER_ALLOW_FILE_OPS=0)' });
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
        const directive = tryTranslateKbExplorerDirective(textIn, { mode });
        if (directive) {
          translation = directive.translation;
          dsl = directive.dsl;
        } else {
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
      }

      if (!allowFileOps && containsFileOps(dsl)) {
        return json(res, 400, { ok: false, error: 'Load/Unload is disabled (KBEXPLORER_ALLOW_FILE_OPS=0)' });
      }

      try {
        let result;
        if (mode === 'learn') result = session.learn(dsl);
        else if (mode === 'query') result = session.query(dsl);
        else if (mode === 'prove') result = session.prove(dsl);
        else if (mode === 'abduce') result = session.abduce(dsl);
        else if (mode === 'findAll') result = session.findAll(dsl);

        let rendered = '';
        if (mode === 'learn') {
          const facts = typeof result?.facts === 'number' ? result.facts : null;
          rendered = result?.success
            ? `Learned${facts === null ? '' : ` ${facts}`} fact${facts === 1 ? '' : 's'}.`
            : `Learn failed.`;
          if (result?.solveResult) {
            const sr = result.solveResult;
            if (sr.problemType && String(sr.problemType).toLowerCase() === 'planning') {
              rendered += ` Planning: ${sr.success ? 'success' : 'failed'}.`;
              if (Array.isArray(sr.plan)) rendered += ` Plan: ${sr.plan.join(' → ') || '(empty)'}.`;
              if (sr.error) rendered += ` Error: ${sr.error}`;
            } else {
              rendered += ` Solve: ${sr.success ? 'success' : 'failed'}.`;
              if (typeof sr.solutionCount === 'number') rendered += ` Solutions: ${sr.solutionCount}.`;
              if (sr.error) rendered += ` Error: ${sr.error}`;
            }
          }
          if (Array.isArray(result?.warnings) && result.warnings.length > 0) {
            rendered += ` Warnings: ${result.warnings.join(' | ')}`;
          }
          if (Array.isArray(result?.errors) && result.errors.length > 0 && !result.success) {
            rendered += ` Errors: ${result.errors.join(' | ')}`;
          }
        } else if (mode === 'prove') {
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
