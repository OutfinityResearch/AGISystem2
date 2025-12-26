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
import { REASONING_PRIORITY } from '../src/core/constants.mjs';
import { getStrategy, listStrategies } from '../src/hdc/facade.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BOOKS_DIR = path.join(PROJECT_ROOT, 'evals', 'saturation', 'books');

const FULL_CONFIGS = [
  { strategy: 'dense-binary', geometries: [128, 256, 512, 1024, 2048, 4096] },   // bits
  { strategy: 'sparse-polynomial', geometries: [1, 2, 3, 4, 5, 6] },             // k
  { strategy: 'metric-affine', geometries: [8, 16, 32, 64, 128, 256] },          // bytes
  { strategy: 'metric-affine-elastic', geometries: [8, 16, 32, 64, 128, 256] }   // bytes
];

const FAST_CONFIGS = [
  { strategy: 'dense-binary', geometries: [256] },           // bits
  { strategy: 'sparse-polynomial', geometries: [2] },        // k
  { strategy: 'metric-affine', geometries: [16] },           // bytes
  { strategy: 'metric-affine-elastic', geometries: [8] }     // bytes
];

const HUGE_CONFIGS = [
  { strategy: 'dense-binary', geometries: [1024, 2048] },      // bits
  { strategy: 'sparse-polynomial', geometries: [8, 16] },      // k
  { strategy: 'metric-affine', geometries: [64, 128] },        // bytes
  { strategy: 'metric-affine-elastic', geometries: [32, 64] }  // bytes
];

const EXTRA_HUGE_CONFIGS = [
  { strategy: 'dense-binary', geometries: [8192, 16384] },        // bits (32x, 64x vs fast)
  { strategy: 'sparse-polynomial', geometries: [64, 128] },       // k
  { strategy: 'metric-affine', geometries: [512, 1024] },         // bytes
  { strategy: 'metric-affine-elastic', geometries: [256, 512] }   // bytes
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
  try {
    const t = getStrategy(strategyId)?.thresholds;
    return typeof t?.HDC_MATCH === 'number' ? t.HDC_MATCH : 0.75;
  } catch {
    return 0.75;
  }
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
    candidates.set(name, session.vocabulary.getOrCreate(name));
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

  const pos1 = getPositionVector(1, geometry, strategyId);
  const pos2 = getPositionVector(2, geometry, strategyId);
  const pos3 = getPositionVector(3, geometry, strategyId);

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
  // POS: need correct top-1 and some separation.
  // NEG: we want no "confident" match (avoid hallucinating a decoy).
  const passed = expectNone
    ? ((top1?.similarity ?? 0) < hdcMatch)
    : correctTop1;

  return {
    passed,
    expectNone,
    correctTop1,
    marginOk,
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

function discoverBooks() {
  const files = readdirSync(BOOKS_DIR)
    .filter(f => /^book[0-9]{2}\.sys2$/.test(f))
    .sort();
  return files.map(f => path.join(BOOKS_DIR, f));
}

function configInfo({ strategyId, geometry, priority }) {
  const pr = priority === REASONING_PRIORITY.HOLOGRAPHIC ? 'holo' : 'symb';
  let bytes = null;
  try {
    bytes = getStrategy(strategyId)?.properties?.bytesPerVector?.(geometry) ?? null;
  } catch {
    bytes = null;
  }

  let label;
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
  const { strategyId, geometry, priority } = config;

  const t0 = nowMs();
  const session = new Session({ hdcStrategy: strategyId, geometry, reasoningPriority: priority });
  const tSessionMs = nowMs() - t0;

  const content = readFileSync(bookPath, 'utf8');
  const { pos, neg } = parseSatQueries(content);
  const ideaNames = extractIdeaNames(content, pos);
  const bookPrefix = path.basename(bookPath, '.sys2').toUpperCase(); // BOOK01

  const tLearn0 = nowMs();
  session.loadCore({ includeIndex: false });
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
      times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs: 0 },
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
      times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs: 0 },
      stats,
      details: null
    };
  }

  const tQ0 = nowMs();
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
  const decodeMs = nowMs() - tQ0;

  const posQueryDsl = `@q ${pos.op} ${pos.book} ${pos.key} ?idea`;
  const negQueryDsl = `@q ${neg.op} ${neg.book} ${neg.key} ?idea`;
  const posQuery = runQueryValidation(session, posQueryDsl, 'idea');
  const negQuery = runQueryValidation(session, negQueryDsl, 'idea');

  const stats = session.getReasoningStats();
  session.close();

  const hdcPassed = posRes.passed && negRes.passed;
  const queryPosPassed = posQuery.success && posQuery.answer === pos.expect;
  const queryNegPassed = !negQuery.success;
  const queryPassed = queryPosPassed && queryNegPassed;
  const passed = hdcPassed;
  const error = passed ? null : 'hdc decode failed';
  return {
    book: path.basename(bookPath),
    passed,
    hdcPassed,
    queryPassed,
    queryPosPassed,
    queryNegPassed,
    error,
    times: { sessionMs: tSessionMs, coreMs, learnMs, decodeMs },
    stats,
    details: {
      pos,
      neg,
      posRes,
      negRes,
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
  const allowedFlags = new Set(['--full', '--huge', '--extra-huge', '--details', '--no-color', '--help']);
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
  --strategies=...  Comma-separated strategy list
  --priority=...    symbolicPriority or holographicPriority
  --no-color        Disable ANSI colors
`);
    process.exit(0);
  }

  const fullMode = hasFlag('--full');
  const hugeMode = hasFlag('--huge');
  const extraHugeMode = hasFlag('--extra-huge');
  const details = true;
  const noColor = hasFlag('--no-color');
  const useColor = process.stdout.isTTY && !noColor;
  const strategiesArg = parseArg('--strategies');
  const priorityArg = parseArg('--priority');

  const priorities = priorityArg
    ? [priorityArg]
    : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

  const available = new Set(listStrategies());
  const requestedStrategies = strategiesArg
    ? new Set(strategiesArg.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const baseConfigs = extraHugeMode
    ? EXTRA_HUGE_CONFIGS
    : (hugeMode ? HUGE_CONFIGS : (fullMode ? FULL_CONFIGS : FAST_CONFIGS));

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
    .flatMap(c => priorities.flatMap(p => c.geometries.map(g => ({ strategyId: c.strategy, geometry: g, priority: p }))));

  if (configs.length === 0) {
    throw new Error('No configs selected after applying flags/filters.');
  }

  const books = discoverBooks();
  if (books.length === 0) {
    throw new Error(`No books found in ${BOOKS_DIR}. Add at least one book*.sys2 file.`);
  }
  if (books.length !== 10) {
    const msg = `Note: expected 10 books for the full suite; found ${books.length}. Running with available books.\n`;
    process.stderr.write(msg);
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
    let totalLearn = 0;
    let totalDecode = 0;
    let totalSim = 0;
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
      totalLearn += res.times.learnMs;
      totalDecode += res.times.decodeMs;
      totalSim += simChecks;
      posMargins.push(posMargin);
      negMargins.push(negMargin);

      const bookName = res.book.replace('.sys2', '');
      const status = res.passed ? colorize(useColor, ANSI.green, 'PASS') : colorize(useColor, ANSI.red, 'FAIL');
      const hdcTag = res.hdcPassed ? colorize(useColor, ANSI.green, 'HDC:PASS') : colorize(useColor, ANSI.red, 'HDC:FAIL');
      const qryTag = res.queryPassed ? colorize(useColor, ANSI.green, 'QRY:PASS') : colorize(useColor, ANSI.red, 'QRY:FAIL');
      const posTag = posOk ? colorize(useColor, ANSI.green, 'POS') : colorize(useColor, ANSI.red, 'POS');
      const negTag = negOk ? colorize(useColor, ANSI.green, 'NEG') : colorize(useColor, ANSI.red, 'NEG');
      const bookLine = `- ${bookName}: ${status} ${hdcTag}/${qryTag} ${posTag}/${negTag} learn=${fmtMs(res.times.learnMs)} decode=${fmtMs(res.times.decodeMs)}`;
      console.log(bookLine);

      perBook.push({
        book: res.book.replace('.sys2', ''),
        passed: res.passed,
        hdcPassed: res.hdcPassed,
        queryPassed: res.queryPassed,
        queryPosPassed: res.queryPosPassed,
        queryNegPassed: res.queryNegPassed,
        posOk,
        negOk,
        ideas: d?.ideas ?? 0,
        posQueryDsl: d?.posQueryDsl ?? null,
        negQueryDsl: d?.negQueryDsl ?? null,
        posQuery: d?.posQuery ?? null,
        negQuery: d?.negQuery ?? null,
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
        learnMs: res.times.learnMs,
        decodeMs: res.times.decodeMs,
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
      total: books.length,
      simChecks: totalSim,
      learnMs: totalLearn,
      decodeMs: totalDecode,
      avgPosMargin: avg(posMargins),
      avgNegMargin: avg(negMargins)
    });
    byConfigDetails.set(label, { perBook, meta: { ...cfg, label, bytes } });
  }

  // Summary table (configs as rows)
  const rows = Array.from(totalsByConfig.values())
    .sort((a, b) => (a.learnMs + a.decodeMs) - (b.learnMs + b.decodeMs));

  const bestHdcPass = Math.max(...rows.map(r => r.hdcPass));
  const bestQueryPass = Math.max(...rows.map(r => r.queryPass));
  const fastestMsRounded = Math.min(...rows.map(r => Math.round(r.learnMs + r.decodeMs)));

  const headers = [
    { key: 'label', title: 'Config', align: 'left' },
    { key: 'hdc', title: 'HDC', align: 'right' },
    { key: 'qry', title: 'Query', align: 'right' },
    { key: 'pos', title: 'HPos', align: 'right' },
    { key: 'neg', title: 'HNeg', align: 'right' },
    { key: 'qpos', title: 'QPos', align: 'right' },
    { key: 'qneg', title: 'QNeg', align: 'right' },
    { key: 'mPos', title: 'AvgPosM', align: 'right' },
    { key: 'mNeg', title: 'AvgNegM', align: 'right' },
    { key: 'sim', title: 'SimChk', align: 'right' },
    { key: 'time', title: 'Time', align: 'right' }
  ];

  const formatted = rows.map(r => {
    const pct = Math.floor((r.pass / r.total) * 100);
    const timeMs = Math.round(r.learnMs + r.decodeMs);
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
      pos: `${r.posPass}/${r.total}`,
      neg: `${r.negPass}/${r.total}`,
      qpos: `${r.queryPosPass}/${r.total}`,
      qneg: `${r.queryNegPass}/${r.total}`,
      mPos,
      mNeg,
      sim: r.simChecks >= 1000 ? `${(r.simChecks / 1000).toFixed(1)}K` : String(r.simChecks),
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
  const fastest = rows.find(r => Math.round(r.learnMs + r.decodeMs) === fastestMsRounded);

  if (details) {
    for (const cfg of rows) {
      const label = cfg.label;
      const bundle = byConfigDetails.get(label);
      const perBook = bundle?.perBook || [];
      const meta = bundle?.meta || {};
      const strategy = getStrategy(meta.strategyId);
      const thresholdLine = formatThresholds(strategy?.thresholds);
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
    }
  }

  const bookNames = books.map(b => path.basename(b, '.sys2'));
  const formattedByLabel = new Map(formatted.map(row => [stripAnsi(row.label), row.label]));
  const statusHeaders = [
    { key: 'label', title: 'Config', align: 'left' },
    ...bookNames.map(book => ({ key: book, title: book, align: 'left' })),
    { key: 'time', title: 'Time', align: 'right' }
  ];

  const buildStatusRows = (mode) => rows.map(r => {
    const bundle = byConfigDetails.get(r.label);
    const perBook = bundle?.perBook || [];
    const byBook = new Map(perBook.map(b => [b.book, b]));
    const timeMs = Math.round(r.learnMs + r.decodeMs);
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
      row[book] = ok
        ? colorize(useColor, ANSI.green, 'PASS')
        : colorize(useColor, ANSI.red, 'FAIL');
    }
    return row;
  });

  const renderStatusTable = (title, rowsForTable, sortByTime = false) => {
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

  renderStatusTable('Per-Book Results (HDC)', buildStatusRows('hdc'));
  renderStatusTable('Per-Book Results (Query)', buildStatusRows('query'), true);

  console.log();
  printSummaryTable();

  console.log();
  console.log(`${ANSI.bold}Conclusions${ANSI.reset}`);
  console.log(`- Best HDC pass rate: ${bestHdc.map(b => b.label).join(' | ')} (${bestHdcPass}/${books.length})`);
  console.log(`- Best Query pass rate: ${bestQuery.map(b => b.label).join(' | ')} (${bestQueryPass}/${books.length})`);
  console.log(`- Fastest: ${fastest?.label ?? 'n/a'} (${fastestMsRounded}ms total learn+decode)`);
  console.log(`- Tip: use \`--full\` or \`--huge\` to sweep larger geometries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
