#!/usr/bin/env node
/**
 * Saturation Evaluation Runner
 *
 * Runs 10 “book” DSL files that build a hierarchical bundle
 * (idea-records -> microtheories -> chapters -> book)
 * and checks whether a “hidden idea” can still be retrieved from the final `@Book` representation.
 *
 * The goal is to compare saturation behavior across strategies/geometries.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session } from '../src/runtime/session.mjs';
import { bind, unbind, topKSimilar } from '../src/core/operations.mjs';
import { getPositionVector } from '../src/core/position.mjs';
import { getThresholds, REASONING_PRIORITY } from '../src/core/constants.mjs';
import { getStrategy, listStrategies } from '../src/hdc/facade.mjs';
import { ensureStresspediaBooks } from './saturation/ltools/gen-stresspedia-books.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BOOKS_DIR = path.join(PROJECT_ROOT, 'evals', 'saturation', 'books');
const STRESSPEDIA_BOOKS_DIR = path.join(PROJECT_ROOT, 'evals', 'saturation', 'stresspedia-books');

const FULL_CONFIGS = [
  { strategy: 'dense-binary', geometries: [128, 256, 512, 1024, 2048, 4096] },   // bits
  { strategy: 'sparse-polynomial', geometries: [1, 2, 3, 4, 5, 6] },             // k
  { strategy: 'metric-affine', geometries: [8, 16, 32, 64, 128, 256] },          // bytes
  { strategy: 'metric-affine-elastic', geometries: [8, 16, 32, 64, 128, 256] },  // bytes
  { strategy: 'exact', geometries: [256] }                                       // placeholder (bits ignored)
];

const FAST_CONFIGS = [
  { strategy: 'dense-binary', geometries: [256] },           // bits
  { strategy: 'sparse-polynomial', geometries: [2] },        // k
  { strategy: 'metric-affine', geometries: [16] },           // bytes
  { strategy: 'metric-affine-elastic', geometries: [8] },    // bytes
  { strategy: 'exact', geometries: [256] }                   // placeholder (bits ignored)
];

// Smallest “byte-equivalent” geometries (like runFastEval.mjs --small):
// dense=64b (8B), sparse=k1, metric=8B, ema=8B
const SMALL_CONFIGS = [
  { strategy: 'dense-binary', geometries: [64] },            // bits (8 bytes)
  { strategy: 'sparse-polynomial', geometries: [1] },        // k
  { strategy: 'metric-affine', geometries: [8] },            // bytes
  { strategy: 'metric-affine-elastic', geometries: [8] },    // bytes
  { strategy: 'exact', geometries: [256] }                   // placeholder (bits ignored)
];

const HUGE_CONFIGS = [
  { strategy: 'dense-binary', geometries: [1024, 2048] },      // bits
  { strategy: 'sparse-polynomial', geometries: [8, 16] },      // k
  { strategy: 'metric-affine', geometries: [64, 128] },        // bytes
  { strategy: 'metric-affine-elastic', geometries: [32, 64] }, // bytes
  { strategy: 'exact', geometries: [256] }                     // placeholder (bits ignored)
];

const EXTRA_HUGE_CONFIGS = [
  { strategy: 'dense-binary', geometries: [8192, 16384] },        // bits (32x, 64x vs fast)
  { strategy: 'sparse-polynomial', geometries: [64, 128] },       // k
  { strategy: 'metric-affine', geometries: [512, 1024] },         // bytes
  { strategy: 'metric-affine-elastic', geometries: [256, 512] },  // bytes
  { strategy: 'exact', geometries: [256] }                        // placeholder (bits ignored)
];
const DEFAULT_CANDIDATE_SET_SIZE = 10;
const DEFAULT_MIN_MARGIN = 0.02;

function minMarginForStrategy(strategyId) {
  // Metric-affine similarities have a higher random baseline (~0.665) and typically tighter spread,
  // so margins are smaller than dense-binary/sparse; use a smaller default margin gate there.
  if (strategyId === 'metric-affine' || strategyId === 'metric-affine-elastic') return 0.005;
  return DEFAULT_MIN_MARGIN;
}

function hdcMatchThreshold(strategyId) {
  return getThresholds(strategyId)?.HDC_MATCH ?? 0.75;
}

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function stripAnsi(text) {
  return String(text).replace(/\x1B\[[0-9;]*m/g, '');
}

function terminalWidth() {
  const n = Number(process.stdout?.columns);
  return Number.isFinite(n) && n > 0 ? n : 120;
}

function wrapByWidth(items, maxWidth, { sep = '  ' } = {}) {
  const lines = [];
  let line = '';
  for (const item of items) {
    const next = line ? `${line}${sep}${item}` : item;
    if (stripAnsi(next).length > maxWidth && line) {
      lines.push(line);
      line = item;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function padEndAnsi(text, width) {
  const raw = stripAnsi(text);
  if (raw.length >= width) return text;
  return text + ' '.repeat(width - raw.length);
}

function padStartAnsi(text, width) {
  const raw = stripAnsi(text);
  if (raw.length >= width) return text;
  return ' '.repeat(width - raw.length) + text;
}

function colorize(enabled, color, text) {
  if (!enabled) return String(text);
  return `${color}${text}${ANSI.reset}`;
}

function parseArg(name) {
  const arg = process.argv.slice(2).find(a => a.startsWith(`${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

function nowMs() {
  return performance.now();
}

function padLeft(s, n) {
  const str = String(s);
  return str.length >= n ? str : ' '.repeat(n - str.length) + str;
}

function fmtMs(ms) {
  return `${ms.toFixed(1)}ms`;
}

function parseSatQueries(content) {
  const lines = content.split('\n');
  const posLine = lines.find(l => l.trim().startsWith('# SAT_QUERY_POS'));
  const negLine = lines.find(l => l.trim().startsWith('# SAT_QUERY_NEG'));
  if (!posLine || !negLine) throw new Error('Missing SAT_QUERY_POS / SAT_QUERY_NEG markers');

  const parse = (line, prefix) => {
    const kv = new Map();
    for (const part of line.replace(prefix, '').trim().split(/\s+/g)) {
      const [k, ...rest] = part.split('=');
      if (!k || rest.length === 0) continue;
      kv.set(k.trim(), rest.join('=').trim());
    }
    return {
      op: kv.get('op'),
      book: kv.get('book'),
      key: kv.get('key'),
      expect: kv.get('expect')
    };
  };

  const pos = parse(posLine, '# SAT_QUERY_POS');
  const neg = parse(negLine, '# SAT_QUERY_NEG');
  if (!pos.op || !pos.book || !pos.key || !pos.expect) throw new Error('Invalid SAT_QUERY_POS marker');
  if (!neg.op || !neg.book || !neg.key || !neg.expect) throw new Error('Invalid SAT_QUERY_NEG marker');
  return { pos, neg };
}

function extractIdeaNames(content, { op, book }) {
  const ideas = new Set();
  const re = new RegExp(String.raw`^\s*@B\d{2}_R\d{4}(?::\S+)?\s+${op}\s+${book}\s+\S+\s+(\S+)\s*$`);
  for (const line of content.split('\n')) {
    const m = line.match(re);
    if (m) ideas.add(m[1]);
  }
  return Array.from(ideas);
}

function extractKeys(content, { op, book }) {
  const keys = new Set();
  const re = new RegExp(String.raw`^\s*@B\d{2}_R\d{4}(?::\S+)?\s+${op}\s+${book}\s+(\S+)\s+\S+\s*$`);
  for (const line of content.split('\n')) {
    const m = line.match(re);
    if (m) keys.add(m[1]);
  }
  return Array.from(keys);
}

function djb2(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let x = seed >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    return x / 0xFFFFFFFF;
  };
}

function pickDistinct(pool, count, rng, exclude = new Set()) {
  const picked = [];
  const seen = new Set(exclude);
  const n = pool.length;
  if (n === 0 || count <= 0) return picked;
  let guard = 0;
  while (picked.length < count && guard < count * 50) {
    guard++;
    const idx = Math.floor(rng() * n);
    const item = pool[idx];
    if (seen.has(item)) continue;
    seen.add(item);
    picked.push(item);
  }
  return picked;
}

function buildCandidatesForQuery(session, { ideaNames, bookPrefix, queryKey, expectName, size, mode }) {
  const rng = makeRng(djb2(`${bookPrefix}:${queryKey}:${expectName}:${size}`));

  const candidateNames = new Set();
  if (expectName && expectName !== 'none') candidateNames.add(expectName);

  // Candidate sets simulate a reverse-index narrowed cleanup set:
  // - POS queries should mostly compare within in-book ideas.
  // - NEG queries (missing key) should NOT be biased toward in-book ideas.
  const decoyPool = [];
  const decoyCount = Math.max(64, size * 4);
  for (let i = 1; i <= decoyCount; i++) {
    decoyPool.push(`${bookPrefix}_Decoy_${String(i).padStart(4, '0')}`);
  }

  const pool = mode === 'neg' ? decoyPool : ideaNames;
  const needed = Math.max(0, size - candidateNames.size);
  const picked = pickDistinct(pool, needed, rng, candidateNames);
  for (const name of picked) candidateNames.add(name);

  const candidates = new Map();
  for (const name of candidateNames) {
    const vec = session.scope?.has?.(name) ? session.scope.get(name) : session.vocabulary.getOrCreate(name);
    candidates.set(name, vec);
  }
  return candidates;
}

function buildCandidatesForKeyQuery(session, { keyNames, bookPrefix, queryIdea, expectKey, size, mode }) {
  const rng = makeRng(djb2(`${bookPrefix}:${queryIdea}:${expectKey}:${size}`));

  const candidateKeys = new Set();
  if (expectKey && expectKey !== 'none') candidateKeys.add(expectKey);

  const decoyPool = [];
  const decoyCount = Math.max(64, size * 4);
  for (let i = 1; i <= decoyCount; i++) {
    decoyPool.push(`${bookPrefix}_DecoyKey_${String(i).padStart(4, '0')}`);
  }

  const pool = mode === 'neg' ? decoyPool : keyNames;
  const needed = Math.max(0, size - candidateKeys.size);
  const picked = pickDistinct(pool, needed, rng, candidateKeys);
  for (const key of picked) candidateKeys.add(key);

  const candidates = new Map();
  for (const key of candidateKeys) {
    const vec = session.scope?.has?.(key) ? session.scope.get(key) : session.vocabulary.getOrCreate(key);
    candidates.set(key, vec);
  }
  return candidates;
}

function decodeIdeaFromBook(session, bookVec, query, candidates, options = {}) {
  const { strategyId, geometry, k = 25 } = options;
  const minMargin = minMarginForStrategy(strategyId);
  const hdcMatch = hdcMatchThreshold(strategyId);

  const opVec = session.scope.get(query.op) || session.vocabulary.getOrCreate(query.op);
  const bookIdVec = session.vocabulary.getOrCreate(query.book);
  const keyVec = session.vocabulary.getOrCreate(query.key);

  const pos1 = getPositionVector(1, geometry, strategyId, session);
  const pos2 = getPositionVector(2, geometry, strategyId, session);
  const pos3 = getPositionVector(3, geometry, strategyId, session);

  let partial = opVec;
  partial = bind(partial, bind(bookIdVec, pos1));
  partial = bind(partial, bind(keyVec, pos2));

  const simBefore = session.reasoningStats?.similarityChecks || 0;
  const answer = unbind(bookVec, partial);
  const ideaVec = unbind(answer, pos3);
  const ranked = topKSimilar(ideaVec, candidates, k, session);
  const simAfter = session.reasoningStats?.similarityChecks || 0;

  const top1 = ranked[0] || { name: null, similarity: -1 };
  const top2 = ranked[1] || { name: null, similarity: -1 };
  const margin = (top1?.similarity ?? 0) - (top2?.similarity ?? 0);

  const expectNone = query.expect === 'none';
  const expectedEntry = expectNone ? null : ranked.find(r => r.name === query.expect);
  const expectedRank = expectNone ? null : (ranked.findIndex(r => r.name === query.expect) + 1 || null);
  const expectedSim = expectedEntry ? expectedEntry.similarity : null;
  const correctTop1 = !expectNone && top1.name === query.expect;
  const marginOk = margin >= minMargin;
  const separationOk = (top1?.similarity ?? 0) > (top2?.similarity ?? -1);
  const confidenceOk = (top1?.similarity ?? 0) > 0;
  // POS: need correct top-1 and some separation.
  // NEG: we want no "confident" match (avoid hallucinating a decoy).
  const passed = expectNone
    ? ((top1?.similarity ?? 0) < hdcMatch)
    : (correctTop1 && separationOk && confidenceOk);

  return {
    passed,
    expectNone,
    correctTop1,
    marginOk,
    separationOk,
    confidenceOk,
    top1,
    top2,
    margin,
    expectedSim,
    expectedRank,
    minMargin,
    hdcMatch,
    similarityChecks: simAfter - simBefore,
    candidateCount: candidates.size
  };
}

function decodeKeyFromBook(session, bookVec, query, candidates, options = {}) {
  const { strategyId, geometry, k = 25 } = options;
  const hdcMatch = hdcMatchThreshold(strategyId);

  const opVec = session.scope.get(query.op) || session.vocabulary.getOrCreate(query.op);
  const bookIdVec = session.vocabulary.getOrCreate(query.book);
  const ideaVec = session.scope?.has?.(query.idea)
    ? session.scope.get(query.idea)
    : session.vocabulary.getOrCreate(query.idea);

  const pos1 = getPositionVector(1, geometry, strategyId, session);
  const pos2 = getPositionVector(2, geometry, strategyId, session);
  const pos3 = getPositionVector(3, geometry, strategyId, session);

  let partial = opVec;
  partial = bind(partial, bind(bookIdVec, pos1));
  partial = bind(partial, bind(ideaVec, pos3));

  const simBefore = session.reasoningStats?.similarityChecks || 0;
  const answer = unbind(bookVec, partial);
  const keyOutVec = unbind(answer, pos2);
  const ranked = topKSimilar(keyOutVec, candidates, k, session);
  const simAfter = session.reasoningStats?.similarityChecks || 0;

  const top1 = ranked[0] || { name: null, similarity: -1 };
  const top2 = ranked[1] || { name: null, similarity: -1 };
  const margin = (top1?.similarity ?? 0) - (top2?.similarity ?? 0);

  const expectNone = query.expect === 'none';
  const expectedEntry = expectNone ? null : ranked.find(r => r.name === query.expect);
  const expectedRank = expectNone ? null : (ranked.findIndex(r => r.name === query.expect) + 1 || null);
  const expectedSim = expectedEntry ? expectedEntry.similarity : null;
  const correctTop1 = !expectNone && top1.name === query.expect;
  const separationOk = (top1?.similarity ?? 0) > (top2?.similarity ?? -1);
  const confidenceOk = (top1?.similarity ?? 0) > 0;

  const passed = expectNone
    ? ((top1?.similarity ?? 0) < hdcMatch)
    : (correctTop1 && separationOk && confidenceOk);

  return {
    passed,
    expectNone,
    correctTop1,
    separationOk,
    confidenceOk,
    top1,
    top2,
    margin,
    expectedSim,
    expectedRank,
    hdcMatch,
    similarityChecks: simAfter - simBefore,
    candidateCount: candidates.size
  };
}

function discoverBooks(booksDir = BOOKS_DIR) {
  let entries = [];
  try {
    entries = readdirSync(booksDir);
  } catch {
    return [];
  }
  const files = entries
    .filter(f => /^book(?:[0-9]{2}|_.+)\.sys2$/.test(f))
    .sort((a, b) => {
      const an = a.match(/^book(\d{2})\.sys2$/)?.[1];
      const bn = b.match(/^book(\d{2})\.sys2$/)?.[1];
      const ai = an ? Number(an) : Number.POSITIVE_INFINITY;
      const bi = bn ? Number(bn) : Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
  return files.map(f => path.join(booksDir, f));
}

function configInfo({ strategyId, geometry, priority, exactUnbindMode = null }) {
  const pr = priority === REASONING_PRIORITY.HOLOGRAPHIC ? 'holo' : 'symb';
  let bytes = null;
  try {
    bytes = getStrategy(strategyId)?.properties?.bytesPerVector?.(geometry) ?? null;
  } catch {
    bytes = null;
  }

  let label;
  if (strategyId === 'exact') {
    const mode = String(exactUnbindMode || process.env.SYS2_EXACT_UNBIND_MODE || 'A').trim().toUpperCase();
    label = `exact(${mode})+${pr}`;
    return { label, bytes: null };
  }
  if (strategyId === 'dense-binary') {
    const denseBytes = bytes ?? (Number.isFinite(geometry) ? Math.round(geometry / 8) : null);
    label = denseBytes !== null ? `dense(${denseBytes}B)+${pr}` : `dense(${geometry})+${pr}`;
    return { label, bytes };
  }
  if (strategyId === 'sparse-polynomial') {
    label = `sparse(k${geometry})+${pr}`;
    return { label, bytes };
  }
  const short = strategyId
    .replace('metric-affine-elastic', 'metric-elastic')
    .replace('metric-affine', 'metric');
  label = bytes !== null ? `${short}(${bytes}B)+${pr}` : `${short}(${geometry})+${pr}`;
  return { label, bytes };
}

function configLabel(cfg) {
  return configInfo(cfg).label;
}

function abbreviateBookName(fullName, maxLen) {
  const name = String(fullName || '').trim();
  if (!name) return '';

  const mPlain = name.match(/^book(\d+)$/i);
  if (mPlain) return `b${mPlain[1]}`.slice(0, maxLen);

  const parts = name.split('_').filter(Boolean);
  if (parts.length === 0) return name.slice(0, maxLen);
  if (String(parts[0]).toLowerCase() === 'book') parts.shift();

  const abbrevPart = (p) => {
    const low = String(p).toLowerCase();
    if (low === 'stresspedia') return 'sp';
    const dm = String(p).match(/^(\d+)([A-Za-z].*)$/);
    if (dm) return `${dm[1]}${dm[2][0].toLowerCase()}`; // "10cap" -> "10c"
    if (/^\d+$/.test(p)) return p; // keep digits
    return String(p).slice(0, Math.min(3, String(p).length)).toLowerCase();
  };

  let out = parts.map(abbrevPart).join('_');
  if (out.length > maxLen) out = out.replaceAll('_', '');
  if (out.length > maxLen) out = out.slice(0, maxLen);
  return out || name.slice(0, maxLen);
}

function makeUniqueBookHeaders(bookNames, { maxLen }) {
  const used = new Map(); // abbrev -> count
  const mapping = new Map(); // full -> abbrev

  for (const full of bookNames) {
    const base = abbreviateBookName(full, maxLen);
    const current = used.get(base) || 0;
    used.set(base, current + 1);

    if (current === 0) {
      mapping.set(full, base);
      continue;
    }

    const suffix = String(current + 1);
    const trimmed = base.slice(0, Math.max(1, maxLen - suffix.length));
    mapping.set(full, `${trimmed}${suffix}`);
  }

  return mapping;
}

function fmtCellTime(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return 'n/a';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

function formatThresholds(thresholds) {
  if (!thresholds || typeof thresholds !== 'object') return 'n/a';
  const order = [
    'HDC_MATCH',
    'SIMILARITY',
    'VERIFICATION',
    'ANALOGY_MIN',
    'ANALOGY_MAX',
    'RULE_MATCH',
    'CONCLUSION_MATCH',
    'BUNDLE_COMMON_SCORE'
  ];
  const seen = new Set();
  const parts = [];
  const add = (key) => {
    if (!Object.prototype.hasOwnProperty.call(thresholds, key)) return;
    const val = thresholds[key];
    const fmt = typeof val === 'number' ? val.toFixed(3) : String(val);
    parts.push(`${key}=${fmt}`);
    seen.add(key);
  };
  for (const key of order) add(key);
  const remaining = Object.keys(thresholds).filter(k => !seen.has(k)).sort();
  for (const key of remaining) add(key);
  return parts.length ? parts.join(' ') : 'n/a';
}

function formatStrategyProps(strategy, geometry, bytes) {
  if (!strategy?.properties) return 'n/a';
  const props = strategy.properties;
  const parts = [];
  if (Number.isFinite(props.recommendedBundleCapacity)) {
    parts.push(`bundleRec=${props.recommendedBundleCapacity}`);
  }
  if (Number.isFinite(props.maxBundleCapacity)) {
    parts.push(`bundleMax=${props.maxBundleCapacity}`);
  }
  if (Number.isFinite(bytes)) {
    parts.push(`bytesPerVector=${bytes}B`);
  } else if (typeof props.bytesPerVector === 'function' && Number.isFinite(geometry)) {
    parts.push(`bytesPerVector=${props.bytesPerVector(geometry)}B`);
  }
  return parts.length ? parts.join(' ') : 'n/a';
}

function formatProofSteps(steps, limit = 2) {
  if (!Array.isArray(steps) || steps.length === 0) return 'none';
  const shown = steps.slice(0, limit).map(s => String(s).trim()).filter(Boolean);
  const extra = steps.length > shown.length ? ` (+${steps.length - shown.length})` : '';
  return `${shown.join(' ; ')}${extra}`;
}

function runQueryValidation(session, dsl, holeName = 'idea') {
  const result = session.query(dsl, { maxResults: 3 });
  const binding = result?.bindings?.get?.(holeName);
  const steps = binding?.steps || result?.allResults?.[0]?.steps || [];
  return {
    success: !!result?.success,
    answer: binding?.answer ?? null,
    method: binding?.method ?? (result?.allResults?.[0]?.method ?? null),
    similarity: Number.isFinite(binding?.similarity) ? binding.similarity : null,
    steps,
    resultCount: result?.allResults?.length ?? 0
  };
}

async function runOne(config, bookPath) {
  const { strategyId, geometry, priority, exactUnbindMode = null } = config;

  const t0 = nowMs();
  const session = new Session({
    hdcStrategy: strategyId,
    geometry,
    reasoningPriority: priority,
    ...(strategyId === 'exact' && exactUnbindMode ? { exactUnbindMode } : null)
  });
  const tSessionMs = nowMs() - t0;

  // Make `@_ Load "./evals/..."` paths in books resolve consistently regardless of CWD.
  if (session?.executor) session.executor.basePath = PROJECT_ROOT;

  const content = readFileSync(bookPath, 'utf8');
  const { pos, neg } = parseSatQueries(content);
  const ideaNames = extractIdeaNames(content, pos);
  const keyNames = extractKeys(content, pos);
  const bookPrefix = path.basename(bookPath, '.sys2').toUpperCase(); // BOOK01

  const tLearn0 = nowMs();
  session.loadCore({ includeIndex: true, corePath: path.join(PROJECT_ROOT, 'config', 'Packs', 'Kernel') });
  session.loadPack('tests_and_evals', { includeIndex: true, validate: false, packPath: path.join(PROJECT_ROOT, 'config', 'Packs', 'tests_and_evals') });
  const coreMs = nowMs() - tLearn0;

  const tLearn1 = nowMs();
  const learnRes = session.learn(content);
  const learnMs = nowMs() - tLearn1;

  if (!learnRes.success) {
    const stats = session.getReasoningStats();
    session.close();
    return {
      book: path.basename(bookPath),
      passed: false,
      error: learnRes.errors?.map(e => e.error || String(e)).join('; ') || 'learn failed',
      times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs: 0, queryMs: 0 },
      stats,
      details: null
    };
  }

  const bookVec = session.scope.get('Book');
  if (!bookVec) {
    const stats = session.getReasoningStats();
    session.close();
    return {
      book: path.basename(bookPath),
      passed: false,
      error: 'Missing book vector in scope: Book',
      times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs: 0, queryMs: 0 },
      stats,
      details: null
    };
  }

  const tHdc0 = nowMs();
  const posCandidates = buildCandidatesForQuery(session, {
    ideaNames,
    bookPrefix,
    queryKey: pos.key,
    expectName: pos.expect,
    size: DEFAULT_CANDIDATE_SET_SIZE,
    mode: 'pos'
  });
  const negCandidates = buildCandidatesForQuery(session, {
    ideaNames,
    bookPrefix,
    queryKey: neg.key,
    expectName: 'none',
    size: DEFAULT_CANDIDATE_SET_SIZE,
    mode: 'neg'
  });

  const posRes = decodeIdeaFromBook(session, bookVec, pos, posCandidates, { strategyId, geometry, k: DEFAULT_CANDIDATE_SET_SIZE });
  const negRes = decodeIdeaFromBook(session, bookVec, neg, negCandidates, { strategyId, geometry, k: DEFAULT_CANDIDATE_SET_SIZE });

  // Membership-style test: given an idea, can we recover a key? (Idea exists vs idea doesn't exist)
  const memIdeaPos = pos.expect;
  const memIdeaNeg = `${bookPrefix}_MissingIdea`;
  const memPosCandidates = buildCandidatesForKeyQuery(session, {
    keyNames,
    bookPrefix,
    queryIdea: memIdeaPos,
    expectKey: pos.key,
    size: DEFAULT_CANDIDATE_SET_SIZE,
    mode: 'pos'
  });
  const memNegCandidates = buildCandidatesForKeyQuery(session, {
    keyNames,
    bookPrefix,
    queryIdea: memIdeaNeg,
    expectKey: 'none',
    size: DEFAULT_CANDIDATE_SET_SIZE,
    mode: 'neg'
  });

  const memPosRes = decodeKeyFromBook(
    session,
    bookVec,
    { op: pos.op, book: pos.book, idea: memIdeaPos, expect: pos.key },
    memPosCandidates,
    { strategyId, geometry, k: DEFAULT_CANDIDATE_SET_SIZE }
  );
  const memNegRes = decodeKeyFromBook(
    session,
    bookVec,
    { op: pos.op, book: pos.book, idea: memIdeaNeg, expect: 'none' },
    memNegCandidates,
    { strategyId, geometry, k: DEFAULT_CANDIDATE_SET_SIZE }
  );
  const decodeMs = nowMs() - tHdc0;

  const tQuery0 = nowMs();
  const posQueryDsl = `@q ${pos.op} ${pos.book} ${pos.key} ?idea`;
  const negQueryDsl = `@q ${neg.op} ${neg.book} ${neg.key} ?idea`;
  const posQuery = runQueryValidation(session, posQueryDsl, 'idea');
  const negQuery = runQueryValidation(session, negQueryDsl, 'idea');

  const memPosQueryDsl = `@q ${pos.op} ${pos.book} ?key ${memIdeaPos}`;
  const memNegQueryDsl = `@q ${pos.op} ${pos.book} ?key ${memIdeaNeg}`;
  const memPosQuery = runQueryValidation(session, memPosQueryDsl, 'key');
  const memNegQuery = runQueryValidation(session, memNegQueryDsl, 'key');
  const queryMs = nowMs() - tQuery0;

  const stats = session.getReasoningStats();
  const exactStats = strategyId === 'exact' ? (session?.hdc?.strategy?._stats || null) : null;
  session.close();

  const hdcPassed = posRes.passed && negRes.passed;
  const queryPosPassed = posQuery.success && posQuery.answer === pos.expect;
  const queryNegPassed = !negQuery.success;
  const queryPassed = queryPosPassed && queryNegPassed;

  const hdcMemPassed = memPosRes.passed && memNegRes.passed;
  const queryMemPosPassed = memPosQuery.success && memPosQuery.answer === pos.key;
  const queryMemNegPassed = !memNegQuery.success;
  const queryMemPassed = queryMemPosPassed && queryMemNegPassed;

  const passed = hdcPassed;
  const error = passed ? null : 'hdc decode failed';
  return {
    book: path.basename(bookPath),
    passed,
    hdcPassed,
    queryPassed,
    queryPosPassed,
    queryNegPassed,
    hdcMemPassed,
    queryMemPassed,
    queryMemPosPassed,
    queryMemNegPassed,
    error,
    times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs, queryMs },
    stats,
    exactStats,
    details: {
      pos,
      neg,
      posRes,
      negRes,
      memPosRes,
      memNegRes,
      memIdeaPos,
      memIdeaNeg,
      memPosQueryDsl,
      memNegQueryDsl,
      memPosQuery,
      memNegQuery,
      ideas: ideaNames.length,
      posQueryDsl,
      negQueryDsl,
      posQuery,
      negQuery
    }
  };
}

async function main() {
  const args = process.argv.slice(2);
  const allowedFlags = new Set(['--full', '--huge', '--extra-huge', '--small', '--regenerate', '--details', '--no-color', '--help']);
  const allowedPrefixes = ['--strategies=', '--priority='];
  const unknownFlags = args.filter(a =>
    a.startsWith('-') &&
    !allowedFlags.has(a) &&
    !allowedPrefixes.some(p => a.startsWith(p))
  );
  if (unknownFlags.length > 0) {
    console.error(`Unknown option(s): ${unknownFlags.join(', ')}`);
    process.exit(1);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node evals/runSaturationEval.mjs [options]

Options:
  --help, -h        Show this help message
  --full            Run full geometry sweep
  --huge            Run huge geometry sweep
  --extra-huge      Run extra huge geometry sweep (skips sparse-polynomial)
  --small           Run smallest geometries (8-byte equivalents)
  --regenerate      Overwrite generated stresspedia books (evals/saturation/stresspedia-books/)
  --strategies=...  Comma-separated strategy list
  --priority=...    symbolicPriority or holographicPriority
  --details         Print per-book query details
  --no-color        Disable ANSI colors
`);
    process.exit(0);
  }

  const fullMode = hasFlag('--full');
  const hugeMode = hasFlag('--huge');
  const extraHugeMode = hasFlag('--extra-huge');
  const smallMode = hasFlag('--small');
  const regenerate = hasFlag('--regenerate');
  const details = hasFlag('--details');
  const noColor = hasFlag('--no-color');
  const useColor = process.stdout.isTTY && !noColor;
  const strategiesArg = parseArg('--strategies');
  const priorityArg = parseArg('--priority');

  if (smallMode && (fullMode || hugeMode || extraHugeMode)) {
    console.error('Cannot combine --small with --full/--huge/--extra-huge.');
    process.exit(1);
  }

  const priorities = priorityArg
    ? [priorityArg]
    : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

  const available = new Set(listStrategies());
  const requestedStrategies = strategiesArg
    ? new Set(strategiesArg.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const baseConfigs = extraHugeMode
    ? EXTRA_HUGE_CONFIGS
    : (hugeMode ? HUGE_CONFIGS : (fullMode ? FULL_CONFIGS : (smallMode ? SMALL_CONFIGS : FAST_CONFIGS)));

  let effectiveConfigs = baseConfigs;
  if (extraHugeMode) {
    const sparseRequested = !requestedStrategies || requestedStrategies.has('sparse-polynomial');
    if (sparseRequested) {
      console.log(colorize(useColor, ANSI.yellow, 'Warning: skipping sparse-polynomial for --extra-huge (too slow).'));
    }
    effectiveConfigs = baseConfigs.filter(c => c.strategy !== 'sparse-polynomial');
  }

  const configs = effectiveConfigs
    .filter(c => available.has(c.strategy))
    .filter(c => !requestedStrategies || requestedStrategies.has(c.strategy))
    .flatMap(c => priorities.flatMap(p => c.geometries.flatMap(g => {
      if (c.strategy !== 'exact') return [{ strategyId: c.strategy, geometry: g, priority: p }];
      return [
        { strategyId: c.strategy, geometry: g, priority: p, exactUnbindMode: 'A' },
        { strategyId: c.strategy, geometry: g, priority: p, exactUnbindMode: 'B' }
      ];
    })));

  if (configs.length === 0) {
    throw new Error('No configs selected after applying flags/filters.');
  }

  // Ensure domain-derived books exist (write only missing ones, unless --regenerate is provided).
  const regenResult = ensureStresspediaBooks({ outDir: STRESSPEDIA_BOOKS_DIR, regenerate });
  if (regenResult?.errors?.length) {
    for (const e of regenResult.errors) {
      process.stderr.write(`Warning: ${e}\n`);
    }
  }

  const books = [
    ...discoverBooks(BOOKS_DIR),
    ...discoverBooks(STRESSPEDIA_BOOKS_DIR)
  ];
  if (books.length === 0) {
    throw new Error('No books found. Ensure evals/saturation/books/ exists, or evals/stress/ exists for auto-generated stresspedia books.');
  }

  const intro = [
    '',
    `${ANSI.bold}AGISystem2 - Saturation Eval${ANSI.reset}`,
    '',
    `What this tests: build each book as hierarchical superposition (records -> microtheories -> chapters -> Book),`,
    `then attempt to decode an "idea" from the final @Book vector via unbinding + cleanup over a fixed candidate set.`,
    '',
    `Per book we run 2 queries:`,
    `  - POS: key exists; pass if expected idea is top-1 (margin is reported as a saturation signal)`,
    `  - NEG: key missing; pass if top1Sim < HDC_MATCH(strategy)`,
    '',
    `Candidate set size: ${DEFAULT_CANDIDATE_SET_SIZE} (reverse-index simulation: POS=in-book ideas, NEG=decoys)`,
    `Books: ${books.length} (${books.map(b => path.basename(b)).join(', ')})`,
    ''
  ].join('\n');
  console.log(useColor ? intro : stripAnsi(intro));

  const totalsByConfig = new Map();
  const byConfigDetails = new Map();

  for (let cfgIndex = 0; cfgIndex < configs.length; cfgIndex++) {
    const cfg = configs[cfgIndex];
    const { label, bytes } = configInfo(cfg);
    const cfgLabel = `${label} (${cfgIndex + 1}/${configs.length})`;
    console.log();
    console.log(`${ANSI.bold}Running:${ANSI.reset} ${cfgLabel}`);

    let hdcPass = 0;
    let queryPass = 0;
    let posPass = 0;
    let negPass = 0;
    let queryPosPass = 0;
    let queryNegPass = 0;
    let hdcMemPass = 0;
    let queryMemPass = 0;
    let totalLearn = 0;
    let totalDecode = 0;
    let totalQuery = 0;
    let totalSim = 0;
    let totalExactUnbindChecks = 0;
    let totalExactUnbindOutputs = 0;
    const posMargins = [];
    const negMargins = [];
    const perBook = [];

    for (const bookPath of books) {
      const res = await runOne(cfg, bookPath);
      const d = res.details;
      const posOk = d?.posRes?.passed ?? false;
      const negOk = d?.negRes?.passed ?? false;
      const simChecks = (d?.posRes?.similarityChecks ?? 0) + (d?.negRes?.similarityChecks ?? 0);
      const posMargin = d?.posRes?.margin ?? 0;
      const negMargin = d?.negRes?.margin ?? 0;

      if (res.hdcPassed) hdcPass++;
      if (res.queryPassed) queryPass++;
      if (posOk) posPass++;
      if (negOk) negPass++;
      if (res.queryPosPassed) queryPosPass++;
      if (res.queryNegPassed) queryNegPass++;
      if (res.hdcMemPassed) hdcMemPass++;
      if (res.queryMemPassed) queryMemPass++;
      totalLearn += res.times.learnMs;
      totalDecode += res.times.decodeMs;
      totalQuery += res.times.queryMs;
      totalSim += simChecks;
      if (res.exactStats) {
        totalExactUnbindChecks += res.exactStats.unbindChecks || 0;
        totalExactUnbindOutputs += res.exactStats.unbindOutTerms || 0;
      }
      posMargins.push(posMargin);
      negMargins.push(negMargin);

      const bookName = res.book.replace('.sys2', '');
      const status = res.passed ? colorize(useColor, ANSI.green, 'PASS') : colorize(useColor, ANSI.red, 'FAIL');
      const hdcTag = res.hdcPassed ? colorize(useColor, ANSI.green, 'HDC:PASS') : colorize(useColor, ANSI.red, 'HDC:FAIL');
      const qryTag = res.queryPassed ? colorize(useColor, ANSI.green, 'QRY:PASS') : colorize(useColor, ANSI.red, 'QRY:FAIL');
      const memHdcTag = res.hdcMemPassed ? colorize(useColor, ANSI.green, 'M-HDC:PASS') : colorize(useColor, ANSI.red, 'M-HDC:FAIL');
      const memQryTag = res.queryMemPassed ? colorize(useColor, ANSI.green, 'M-QRY:PASS') : colorize(useColor, ANSI.red, 'M-QRY:FAIL');
      const posTag = posOk ? colorize(useColor, ANSI.green, 'POS') : colorize(useColor, ANSI.red, 'POS');
      const negTag = negOk ? colorize(useColor, ANSI.green, 'NEG') : colorize(useColor, ANSI.red, 'NEG');
      const bookLine = `- ${bookName}: ${status} ${hdcTag}/${qryTag} ${memHdcTag}/${memQryTag} ${posTag}/${negTag} learn=${fmtMs(res.times.learnMs)} decode=${fmtMs(res.times.decodeMs)} query=${fmtMs(res.times.queryMs)}`;
      console.log(bookLine);

      perBook.push({
        book: res.book.replace('.sys2', ''),
        passed: res.passed,
        hdcPassed: res.hdcPassed,
        queryPassed: res.queryPassed,
        queryPosPassed: res.queryPosPassed,
        queryNegPassed: res.queryNegPassed,
        hdcMemPassed: res.hdcMemPassed,
        queryMemPassed: res.queryMemPassed,
        posOk,
        negOk,
        ideas: d?.ideas ?? 0,
        posQueryDsl: d?.posQueryDsl ?? null,
        negQueryDsl: d?.negQueryDsl ?? null,
        posQuery: d?.posQuery ?? null,
        negQuery: d?.negQuery ?? null,
        memPosQueryDsl: d?.memPosQueryDsl ?? null,
        memNegQueryDsl: d?.memNegQueryDsl ?? null,
        memPosQuery: d?.memPosQuery ?? null,
        memNegQuery: d?.memNegQuery ?? null,
        memPosOk: d?.memPosRes?.passed ?? false,
        memNegOk: d?.memNegRes?.passed ?? false,
        memIdeaPos: d?.memIdeaPos ?? null,
        memIdeaNeg: d?.memIdeaNeg ?? null,
        memExpectKey: d?.pos?.key ?? null,
        memPosTop1Key: d?.memPosRes?.top1?.name ?? null,
        memPosTop1Sim: d?.memPosRes?.top1?.similarity ?? 0,
        memPosMargin: d?.memPosRes?.margin ?? 0,
        memNegTop1Key: d?.memNegRes?.top1?.name ?? null,
        memNegTop1Sim: d?.memNegRes?.top1?.similarity ?? 0,
        memNegMargin: d?.memNegRes?.margin ?? 0,
        memHdcMatch: d?.memPosRes?.hdcMatch ?? null,
        posExpect: d?.pos?.expect ?? null,
        posTop1Name: d?.posRes?.top1?.name ?? null,
        posTop1: d?.posRes?.top1?.similarity ?? 0,
        posExpectSim: d?.posRes?.expectedSim ?? null,
        posMargin,
        posRank: d?.posRes?.expectedRank ?? null,
        negExpect: d?.neg?.expect ?? null,
        negTop1Name: d?.negRes?.top1?.name ?? null,
        negTop1: d?.negRes?.top1?.similarity ?? 0,
        negMargin,
        hdcMatch: d?.posRes?.hdcMatch ?? null,
        minMargin: d?.posRes?.minMargin ?? null,
        simChecks,
        exactUnbindChecks: res.exactStats?.unbindChecks ?? null,
        exactUnbindOutTerms: res.exactStats?.unbindOutTerms ?? null,
        learnMs: res.times.learnMs,
        decodeMs: res.times.decodeMs,
        queryMs: res.times.queryMs,
        error: res.error
      });
    }

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    totalsByConfig.set(label, {
      label,
      bytes,
      strategyId: cfg.strategyId,
      geometry: cfg.geometry,
      priority: cfg.priority,
      hdcPass,
      queryPass,
      posPass,
      negPass,
      queryPosPass,
      queryNegPass,
      hdcMemPass,
      queryMemPass,
      total: books.length,
      simChecks: totalSim,
      exactUnbindChecks: totalExactUnbindChecks,
      exactUnbindOutTerms: totalExactUnbindOutputs,
      learnMs: totalLearn,
      decodeMs: totalDecode,
      queryMs: totalQuery,
      avgPosMargin: avg(posMargins),
      avgNegMargin: avg(negMargins)
    });
    byConfigDetails.set(label, { perBook, meta: { ...cfg, label, bytes } });
  }

  // Summary table (configs as rows)
  const rows = Array.from(totalsByConfig.values())
    .sort((a, b) => (a.learnMs + a.decodeMs + a.queryMs) - (b.learnMs + b.decodeMs + b.queryMs));

  const bestHdcPass = Math.max(...rows.map(r => r.hdcPass));
  const bestQueryPass = Math.max(...rows.map(r => r.queryPass));
  const fastestMsRounded = Math.min(...rows.map(r => Math.round(r.learnMs + r.decodeMs + r.queryMs)));

  const headers = [
    { key: 'label', title: 'Config', align: 'left' },
    { key: 'hdc', title: 'HDC', align: 'right' },
    { key: 'qry', title: 'Query', align: 'right' },
    { key: 'hmem', title: 'HMem', align: 'right' },
    { key: 'qmem', title: 'QMem', align: 'right' },
    { key: 'pos', title: 'HPos', align: 'right' },
    { key: 'neg', title: 'HNeg', align: 'right' },
    { key: 'qpos', title: 'QPos', align: 'right' },
    { key: 'qneg', title: 'QNeg', align: 'right' },
    { key: 'mPos', title: 'AvgPosM', align: 'right' },
    { key: 'mNeg', title: 'AvgNegM', align: 'right' },
    { key: 'sim', title: 'SimChk', align: 'right' },
    { key: 'uChk', title: 'UnbChk', align: 'right' },
    { key: 'time', title: 'Total', align: 'right' }
  ];

  const formatted = rows.map(r => {
    const pct = Math.floor((r.pass / r.total) * 100);
    const timeMs = Math.round(r.learnMs + r.decodeMs + r.queryMs);
    const timeText = `${timeMs}ms`;

    const timeColored = timeMs === fastestMsRounded
      ? colorize(useColor, ANSI.cyan, timeText)
      : timeText;

    const labelColored = r.hdcPass === bestHdcPass
      ? colorize(useColor, ANSI.bold, r.label)
      : r.label;

    const marginColor = m => (m >= DEFAULT_MIN_MARGIN * 2)
      ? ANSI.green
      : (m >= DEFAULT_MIN_MARGIN ? ANSI.yellow : ANSI.red);

    const mPos = colorize(useColor, marginColor(r.avgPosMargin), r.avgPosMargin.toFixed(3));
    const negColor = r.avgNegMargin < DEFAULT_MIN_MARGIN / 2
      ? ANSI.green
      : (r.avgNegMargin < DEFAULT_MIN_MARGIN ? ANSI.yellow : ANSI.red);
    const mNeg = colorize(useColor, negColor, r.avgNegMargin.toFixed(3));

    return {
      label: labelColored,
      hdc: `${r.hdcPass}/${r.total}`,
      qry: `${r.queryPass}/${r.total}`,
      hmem: `${r.hdcMemPass}/${r.total}`,
      qmem: `${r.queryMemPass}/${r.total}`,
      pos: `${r.posPass}/${r.total}`,
      neg: `${r.negPass}/${r.total}`,
      qpos: `${r.queryPosPass}/${r.total}`,
      qneg: `${r.queryNegPass}/${r.total}`,
      mPos,
      mNeg,
      sim: r.simChecks >= 1000 ? `${(r.simChecks / 1000).toFixed(1)}K` : String(r.simChecks),
      uChk: Number.isFinite(r.exactUnbindChecks) && r.exactUnbindChecks > 0
        ? (r.exactUnbindChecks >= 1000 ? `${(r.exactUnbindChecks / 1000).toFixed(1)}K` : String(r.exactUnbindChecks))
        : '-',
      time: timeColored
    };
  });

  const colW = new Map();
  for (const h of headers) {
    const values = formatted.map(row => row[h.key]);
    const width = Math.max(stripAnsi(h.title).length, ...values.map(v => stripAnsi(v).length));
    colW.set(h.key, Math.min(80, width));
  }

  const line = () => {
    const totalW = headers.reduce((sum, h, idx) => sum + colW.get(h.key) + (idx === 0 ? 0 : 3), 0);
    return '─'.repeat(Math.max(16, totalW));
  };

  const printSummaryTable = () => {
    console.log(`${ANSI.bold}Summary${ANSI.reset}`);
    const headerLine = headers.map((h, idx) => {
      const w = colW.get(h.key);
      const cell = padEndAnsi(h.title, w);
      return idx === 0 ? cell : `│ ${cell}`;
    }).join(' ');
    console.log(useColor ? headerLine : stripAnsi(headerLine));
    console.log(useColor ? line() : stripAnsi(line()));

    for (const row of formatted) {
      const out = headers.map((h, idx) => {
        const w = colW.get(h.key);
        const v = row[h.key];
        const cell = h.align === 'right' ? padStartAnsi(v, w) : padEndAnsi(v, w);
        return idx === 0 ? cell : `│ ${cell}`;
      }).join(' ');
      console.log(useColor ? out : stripAnsi(out));
    }
    console.log(useColor ? line() : stripAnsi(line()));
  };

  const bestHdc = rows.filter(r => r.hdcPass === bestHdcPass);
  const bestQuery = rows.filter(r => r.queryPass === bestQueryPass);
  const fastest = rows.find(r => Math.round(r.learnMs + r.decodeMs + r.queryMs) === fastestMsRounded);

  if (details) {
    for (const cfg of rows) {
      const label = cfg.label;
      const bundle = byConfigDetails.get(label);
      const perBook = bundle?.perBook || [];
      const meta = bundle?.meta || {};
      const strategy = getStrategy(meta.strategyId);
      const thresholdLine = formatThresholds(getThresholds(meta.strategyId));
      const propLine = formatStrategyProps(strategy, meta.geometry, meta.bytes);
      console.log();
      console.log(`${ANSI.bold}Details:${ANSI.reset} ${label}`);
      console.log(`  strategy=${meta.strategyId ?? 'n/a'} geometry=${meta.geometry ?? 'n/a'} priority=${meta.priority ?? 'n/a'}`);
      console.log(`  properties: ${propLine}`);
      console.log(`  thresholds: ${thresholdLine}`);
      if (perBook.length === 0) {
        console.log(colorize(useColor, ANSI.yellow, '- No per-book data available'));
        continue;
      }
      const detailHeaders = [
        { key: 'book', title: 'Book', align: 'left' },
        { key: 'status', title: 'Status', align: 'left' },
        { key: 'pos', title: 'POS', align: 'left' },
        { key: 'posM', title: 'PosM', align: 'right' },
        { key: 'posTop', title: 'PosTop1', align: 'left' },
        { key: 'posExp', title: 'PosExp', align: 'left' },
        { key: 'posRank', title: 'PosRk', align: 'right' },
        { key: 'neg', title: 'NEG', align: 'left' },
        { key: 'negM', title: 'NegM', align: 'right' },
        { key: 'negTop', title: 'NegTop1', align: 'left' },
        { key: 'thr', title: 'Thr', align: 'right' },
        { key: 'err', title: 'Err', align: 'left' }
      ];

      const detailRows = perBook.map(b => {
        const status = b.passed ? colorize(useColor, ANSI.green, 'PASS') : colorize(useColor, ANSI.red, 'FAIL');
        const pos = b.posOk ? colorize(useColor, ANSI.green, 'POS') : colorize(useColor, ANSI.red, 'POS');
        const neg = b.negOk ? colorize(useColor, ANSI.green, 'NEG') : colorize(useColor, ANSI.red, 'NEG');
        const posTop = `${b.posTop1Name ?? '∅'}@${b.posTop1.toFixed(3)}`;
        const expSim = Number.isFinite(b.posExpectSim) ? b.posExpectSim.toFixed(3) : 'n/a';
        const posExp = b.posExpect ? `${b.posExpect}@${expSim}` : '∅';
        const negTop = `${b.negTop1Name ?? '∅'}@${b.negTop1.toFixed(3)}`;
        const thr = Number.isFinite(b.hdcMatch) ? b.hdcMatch.toFixed(3) : 'n/a';
        const posRank = b.posRank ?? '∅';
        return {
          book: b.book,
          status,
          pos,
          posM: b.posMargin.toFixed(3),
          posTop,
          posExp,
          posRank: String(posRank),
          neg,
          negM: b.negMargin.toFixed(3),
          negTop,
          thr,
          err: b.error || ''
        };
      });

      const detailColW = new Map();
      for (const h of detailHeaders) {
        const values = detailRows.map(row => row[h.key]);
        const width = Math.max(stripAnsi(h.title).length, ...values.map(v => stripAnsi(v).length));
        detailColW.set(h.key, Math.min(80, width));
      }

      const detailLine = () => {
        const totalW = detailHeaders.reduce((sum, h, idx) => sum + detailColW.get(h.key) + (idx === 0 ? 0 : 3), 0);
        return '─'.repeat(Math.max(16, totalW));
      };

      const detailHeaderLine = detailHeaders.map((h, idx) => {
        const w = detailColW.get(h.key);
        const cell = padEndAnsi(h.title, w);
        return idx === 0 ? cell : `│ ${cell}`;
      }).join(' ');
      console.log(useColor ? detailHeaderLine : stripAnsi(detailHeaderLine));
      console.log(useColor ? detailLine() : stripAnsi(detailLine()));

      for (const row of detailRows) {
        const out = detailHeaders.map((h, idx) => {
          const w = detailColW.get(h.key);
          const v = row[h.key];
          const cell = h.align === 'right' ? padStartAnsi(v, w) : padEndAnsi(v, w);
          return idx === 0 ? cell : `│ ${cell}`;
        }).join(' ');
        console.log(useColor ? out : stripAnsi(out));
      }

      // Idea membership (Idea -> Key) via holographic decode.
      console.log();
      console.log(`${ANSI.bold}Idea Membership (HDC):${ANSI.reset} decode key from (book, idea)`);

      const memHeaders = [
        { key: 'book', title: 'Book', align: 'left' },
        { key: 'mpos', title: 'M+', align: 'left' },
        { key: 'mposTop', title: 'Top1Key', align: 'left' },
        { key: 'mposExp', title: 'ExpectKey', align: 'left' },
        { key: 'mneg', title: 'M-', align: 'left' },
        { key: 'mnegTop', title: 'NegTop1', align: 'left' },
        { key: 'thr', title: 'Thr', align: 'right' }
      ];

      const memRows = perBook.map(b => {
        const mpos = b.memPosOk ? colorize(useColor, ANSI.green, 'PASS') : colorize(useColor, ANSI.red, 'FAIL');
        const mneg = b.memNegOk ? colorize(useColor, ANSI.green, 'PASS') : colorize(useColor, ANSI.red, 'FAIL');
        const mposTop = `${b.memPosTop1Key ?? '∅'}@${Number(b.memPosTop1Sim || 0).toFixed(3)}`;
        const mnegTop = `${b.memNegTop1Key ?? '∅'}@${Number(b.memNegTop1Sim || 0).toFixed(3)}`;
        const thr = Number.isFinite(b.memHdcMatch) ? Number(b.memHdcMatch).toFixed(3) : 'n/a';
        return {
          book: b.book,
          mpos,
          mposTop,
          mposExp: b.memExpectKey ?? '∅',
          mneg,
          mnegTop,
          thr
        };
      });

      const memColW = new Map();
      for (const h of memHeaders) {
        const values = memRows.map(row => row[h.key]);
        const width = Math.max(stripAnsi(h.title).length, ...values.map(v => stripAnsi(v).length));
        memColW.set(h.key, Math.min(80, width));
      }

      const memLine = () => {
        const totalW = memHeaders.reduce((sum, h, idx) => sum + memColW.get(h.key) + (idx === 0 ? 0 : 3), 0);
        return '─'.repeat(Math.max(16, totalW));
      };

      const memHeaderLine = memHeaders.map((h, idx) => {
        const w = memColW.get(h.key);
        const cell = padEndAnsi(h.title, w);
        return idx === 0 ? cell : `│ ${cell}`;
      }).join(' ');
      console.log(useColor ? memHeaderLine : stripAnsi(memHeaderLine));
      console.log(useColor ? memLine() : stripAnsi(memLine()));

      for (const row of memRows) {
        const out = memHeaders.map((h, idx) => {
          const w = memColW.get(h.key);
          const v = row[h.key];
          const cell = h.align === 'right' ? padStartAnsi(v, w) : padEndAnsi(v, w);
          return idx === 0 ? cell : `│ ${cell}`;
        }).join(' ');
        console.log(useColor ? out : stripAnsi(out));
      }

      console.log();
      console.log(`${ANSI.bold}Query Validation:${ANSI.reset}`);
      for (const b of perBook) {
        const posQ = b.posQuery;
        const negQ = b.negQuery;
        const posAns = posQ?.answer ?? '∅';
        const posMethod = posQ?.method ?? 'n/a';
        const posSim = Number.isFinite(posQ?.similarity) ? posQ.similarity.toFixed(3) : 'n/a';
        const posSteps = formatProofSteps(posQ?.steps, 2);
        const posLine = `- ${b.book} POS: ${b.posQueryDsl} -> ${posAns} (method=${posMethod} sim=${posSim}) steps=${posSteps}`;
        console.log(posLine);

        const negAns = negQ?.answer ?? '∅';
        const negMethod = negQ?.method ?? 'n/a';
        const negSim = Number.isFinite(negQ?.similarity) ? negQ.similarity.toFixed(3) : 'n/a';
        const negSteps = formatProofSteps(negQ?.steps, 2);
        const negLine = `  ${b.book} NEG: ${b.negQueryDsl} -> ${negAns} (method=${negMethod} sim=${negSim}) steps=${negSteps}`;
        console.log(negLine);
      }

      console.log();
      console.log(`${ANSI.bold}Idea Membership (Query):${ANSI.reset} query key from (book, idea)`);
      for (const b of perBook) {
        const posQ = b.memPosQuery;
        const negQ = b.memNegQuery;
        const posAns = posQ?.answer ?? '∅';
        const posMethod = posQ?.method ?? 'n/a';
        const posSim = Number.isFinite(posQ?.similarity) ? posQ.similarity.toFixed(3) : 'n/a';
        const posSteps = formatProofSteps(posQ?.steps, 2);
        const posLine = `- ${b.book} M+ : ${b.memPosQueryDsl} -> ${posAns} (method=${posMethod} sim=${posSim}) steps=${posSteps}`;
        console.log(posLine);

        const negAns = negQ?.answer ?? '∅';
        const negMethod = negQ?.method ?? 'n/a';
        const negSim = Number.isFinite(negQ?.similarity) ? negQ.similarity.toFixed(3) : 'n/a';
        const negSteps = formatProofSteps(negQ?.steps, 2);
        const negLine = `  ${b.book} M- : ${b.memNegQueryDsl} -> ${negAns} (method=${negMethod} sim=${negSim}) steps=${negSteps}`;
        console.log(negLine);
      }
    }
  }

  const bookNames = books.map(b => path.basename(b, '.sys2'));
  const formattedByLabel = new Map(formatted.map(row => [stripAnsi(row.label), row.label]));

  const maxHeaderLen = (() => {
    // Keep PASS/FAIL visible and fit within the current terminal width.
    const cols = terminalWidth();
    const bookCount = Math.max(1, bookNames.length);
    const reserved = 26; // Config + Time + separators buffer
    const per = Math.floor((cols - reserved) / bookCount);
    return Math.max(4, Math.min(8, per - 2));
  })();
  const bookHeaderMap = makeUniqueBookHeaders(bookNames, { maxLen: maxHeaderLen });
  const legendPairs = bookNames.map(full => `${bookHeaderMap.get(full) || full}=${full}`);

  const makeStatusHeaders = (timeTitle) => ([
    { key: 'label', title: 'Config', align: 'left' },
    ...bookNames.map(book => ({ key: book, title: bookHeaderMap.get(book) || book, align: 'left' })),
    { key: 'time', title: timeTitle, align: 'right' }
  ]);

  const buildStatusRows = (mode) => rows.map(r => {
    const bundle = byConfigDetails.get(r.label);
    const perBook = bundle?.perBook || [];
    const byBook = new Map(perBook.map(b => [b.book, b]));
    const timeMs = mode === 'query'
      ? Math.round(r.queryMs)
      : Math.round(r.learnMs + r.decodeMs);
    const row = {
      label: formattedByLabel.get(r.label) || r.label,
      time: `${timeMs}ms`,
      _timeMs: timeMs
    };
    for (const book of bookNames) {
      const res = byBook.get(book);
      if (!res) {
        row[book] = colorize(useColor, ANSI.gray, 'n/a');
        continue;
      }
      const ok = mode === 'hdc' ? res.hdcPassed : res.queryPassed;
      const cellMs = mode === 'query'
        ? res.queryMs
        : (res.learnMs + res.decodeMs);
      const text = fmtCellTime(cellMs);
      row[book] = ok
        ? colorize(useColor, ANSI.green, text)
        : colorize(useColor, ANSI.red, text);
    }
    return row;
  });

  const renderStatusTable = (title, rowsForTable, { sortByTime = false, timeTitle = 'Time' } = {}) => {
    const statusHeaders = makeStatusHeaders(timeTitle);
    const rowsToRender = sortByTime
      ? rowsForTable.slice().sort((a, b) => a._timeMs - b._timeMs)
      : rowsForTable;
    const statusColW = new Map();
    for (const h of statusHeaders) {
      const values = rowsToRender.map(row => row[h.key]);
      const width = Math.max(stripAnsi(h.title).length, ...values.map(v => stripAnsi(v).length));
      statusColW.set(h.key, Math.min(80, width));
    }

    const statusLine = () => {
      const totalW = statusHeaders.reduce((sum, h, idx) => sum + statusColW.get(h.key) + (idx === 0 ? 0 : 3), 0);
      return '─'.repeat(Math.max(16, totalW));
    };

    console.log();
    console.log(`${ANSI.bold}${title}${ANSI.reset}`);
    const legendLines = wrapByWidth(legendPairs, terminalWidth() - 2, { sep: '  ' });
    if (legendLines.length) {
      const first = `Legend: ${legendLines[0]}  green=pass red=fail`;
      console.log(useColor ? colorize(useColor, ANSI.dim, first) : first);
      for (const extra of legendLines.slice(1)) {
        const cont = `        ${extra}`;
        console.log(useColor ? colorize(useColor, ANSI.dim, cont) : cont);
      }
    }
    const statusHeaderLine = statusHeaders.map((h, idx) => {
      const w = statusColW.get(h.key);
      const cell = padEndAnsi(h.title, w);
      return idx === 0 ? cell : `│ ${cell}`;
    }).join(' ');
    console.log(useColor ? statusHeaderLine : stripAnsi(statusHeaderLine));
    console.log(useColor ? statusLine() : stripAnsi(statusLine()));

    for (const row of rowsToRender) {
      const out = statusHeaders.map((h, idx) => {
        const w = statusColW.get(h.key);
        const v = row[h.key];
        const cell = h.align === 'right' ? padStartAnsi(v, w) : padEndAnsi(v, w);
        return idx === 0 ? cell : `│ ${cell}`;
      }).join(' ');
      console.log(useColor ? out : stripAnsi(out));
    }
    console.log(useColor ? statusLine() : stripAnsi(statusLine()));
  };

  renderStatusTable('HDC time by Book', buildStatusRows('hdc'), { timeTitle: 'HDC' });
  renderStatusTable('Query time by Book', buildStatusRows('query'), { sortByTime: true, timeTitle: 'Query' });

  console.log();
  printSummaryTable();

  console.log();
  console.log(`${ANSI.bold}Conclusions${ANSI.reset}`);
  console.log(`- Best HDC pass rate: ${bestHdc.map(b => b.label).join(' | ')} (${bestHdcPass}/${books.length})`);
  console.log(`- Best Query pass rate: ${bestQuery.map(b => b.label).join(' | ')} (${bestQueryPass}/${books.length})`);
  console.log(`- Fastest: ${fastest?.label ?? 'n/a'} (${fastestMsRounded}ms total learn+decode+query)`);
  console.log(`- Tip: use \`--full\` or \`--huge\` to sweep larger geometries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
