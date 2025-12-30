#!/usr/bin/env node
/**
 * Lightweight profiler for Session theory loading.
 *
 * Goal: explain why certain HDC strategies/configs are slow by measuring:
 * - DSL validation time (session.checkDSL)
 * - KB insertion time (session.addToKB)
 * - contradiction checks time (session.checkContradiction)
 * - HDC strategy op timings (createFromName/bind/bundle/similarity/topKSimilar/unbind)
 *
 * This script intentionally avoids touching evalSuite or evals/runStressCheck.js.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { Session } from '../src/runtime/session.mjs';
import { initHDC } from '../src/hdc/facade.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');
const DOMAIN_ROOT = join(ROOT, 'evals', 'domains');
const STRESS_ROOT = join(ROOT, 'evals', 'stress');

const CONFIG_ORDER = [
  'Core',
  'Constraints'
];

const DOMAIN_ORDER = [
  'Anthropology',
  'Biology',
  'Geography',
  'History',
  'Law',
  'Literature',
  'Math',
  'Medicine',
  'Philosophy',
  'Physics',
  'Psychology',
  'Sociology'
];

const STRESS_ORDER = [
  'anthropology.sys2',
  'biology.sys2',
  'geography.sys2',
  'history.sys2',
  'law.sys2',
  'literature.sys2',
  'logic.sys2',
  'math.sys2',
  'medicine.sys2',
  'psychics.sys2',
  'psychology.sys2',
  'sociology.sys2'
];

const DEFAULT_GEOMETRY = {
  'dense-binary': 32768,
  'sparse-polynomial': 4,
  'metric-affine': 32
};

function getArgValue(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function parseList(value) {
  if (!value) return null;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '0ms';
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds - minutes * 60;
  if (minutes < 60) return `${minutes}m${remSeconds.toFixed(1)}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes - hours * 60;
  return `${hours}h${remMinutes}m`;
}

function pad(text, width) {
  return String(text).padEnd(width);
}

function formatTable(rows, headers) {
  const widths = headers.map(h => h.length);
  for (const row of rows) {
    row.forEach((cell, i) => { widths[i] = Math.max(widths[i], String(cell).length); });
  }
  const lines = [];
  lines.push(headers.map((h, i) => pad(h, widths[i])).join(' | '));
  lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('-|-'));
  for (const row of rows) {
    lines.push(row.map((c, i) => pad(c, widths[i])).join(' | '));
  }
  return lines.join('\n');
}

async function loadIndexOrder(dirPath) {
  const indexPath = join(dirPath, 'index.sys2');
  if (!existsSync(indexPath)) return null;
  const content = await readFile(indexPath, 'utf8');
  const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
  const files = [];
  let match;
  while ((match = loadRegex.exec(content)) !== null) {
    files.push(match[1].replace('./', ''));
  }
  return files.length > 0 ? files : null;
}

async function listSys2Files(dirPath) {
  const entries = await readdir(dirPath);
  return entries.filter(f => f.endsWith('.sys2') && f !== 'index.sys2').sort();
}

async function buildConfigPlan() {
  const plan = [];
  for (const dirName of CONFIG_ORDER) {
    const dirPath = join(CONFIG_ROOT, dirName);
    if (!existsSync(dirPath)) continue;
    const files = (await loadIndexOrder(dirPath)) || (await listSys2Files(dirPath));
    for (const file of files) {
      plan.push(join(dirPath, file));
    }
  }
  for (const dirName of DOMAIN_ORDER) {
    const dirPath = join(DOMAIN_ROOT, dirName);
    if (!existsSync(dirPath)) continue;
    const files = (await loadIndexOrder(dirPath)) || (await listSys2Files(dirPath));
    for (const file of files) {
      plan.push(join(dirPath, file));
    }
  }
  return plan;
}

async function buildStressPlan() {
  const plan = [];
  for (const file of STRESS_ORDER) {
    const filePath = join(STRESS_ROOT, file);
    if (existsSync(filePath)) plan.push(filePath);
  }
  return plan;
}

function createOpStats() {
  return { calls: Object.create(null), ms: Object.create(null) };
}

function addTiming(stats, opName, dt) {
  stats.calls[opName] = (stats.calls[opName] || 0) + 1;
  stats.ms[opName] = (stats.ms[opName] || 0) + dt;
}

function instrumentObjectMethods(obj, methodNames, stats) {
  const originals = new Map();
  for (const name of methodNames) {
    const fn = obj?.[name];
    if (typeof fn !== 'function') continue;
    if (originals.has(name)) continue;
    originals.set(name, fn);
    obj[name] = (...args) => {
      const t0 = performance.now();
      try {
        return fn(...args);
      } finally {
        addTiming(stats, name, performance.now() - t0);
      }
    };
  }
  return () => {
    for (const [name, fn] of originals) obj[name] = fn;
  };
}

async function profileLoad({ strategyId, reasoningPriority, geometry, includeStress }) {
  const hdcStrategy = initHDC(strategyId);
  const hdcStats = createOpStats();
  const restoreHdc = instrumentObjectMethods(
    hdcStrategy,
    ['createFromName', 'bind', 'bindAll', 'bundle', 'similarity', 'topKSimilar', 'unbind', 'clone'],
    hdcStats
  );

  const session = new Session({
    hdcStrategy: strategyId,
    reasoningPriority,
    geometry,
    reasoningProfile: 'theoryDriven',
    rejectContradictions: true
  });

  const sessionStats = createOpStats();
  const restoreSession = instrumentObjectMethods(
    session,
    ['checkDSL', 'addToKB', 'checkContradiction'],
    sessionStats
  );

  const plan = await buildConfigPlan();
  const stressPlan = includeStress ? await buildStressPlan() : [];
  const allFiles = [...plan, ...stressPlan];

  const perFile = [];
  const t0 = performance.now();
  for (const filePath of allFiles) {
    const content = await readFile(filePath, 'utf8');
    const f0 = performance.now();
    const result = session.learn(content);
    const dt = performance.now() - f0;
    perFile.push({
      file: relative(ROOT, filePath) || filePath,
      ms: dt,
      ok: !!result?.success,
      facts: Number(result?.facts || 0),
      errors: Array.isArray(result?.errors) ? result.errors.length : 0
    });
  }
  const totalMs = performance.now() - t0;

  restoreSession();
  restoreHdc();

  return { totalMs, perFile, sessionStats, hdcStats };
}

function topOps(stats, topN = 6) {
  const rows = Object.entries(stats.ms)
    .map(([op, ms]) => ({ op, ms, calls: stats.calls[op] || 0 }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, topN);
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
    console.log(`
Usage:
  node scripts/profileSessionLoad.js [options]

Options:
  --combo STRATEGY/PRIORITY    Run a single config (e.g. dense-binary/holographicPriority)
  --strategy LIST              Comma-separated strategies (dense-binary,sparse-polynomial,metric-affine)
  --priority LIST              Comma-separated priorities (symbolicPriority,holographicPriority)
  --full                       Run all 3×2 combinations
  --no-stress                  Only load base config/ (skip evals/stress)
  --dense-geometry N           Override dense-binary geometry (default: ${DEFAULT_GEOMETRY['dense-binary']})
  --sparse-k N                 Override sparse-polynomial k (default: ${DEFAULT_GEOMETRY['sparse-polynomial']})
  --metric-dim N               Override metric-affine dims (default: ${DEFAULT_GEOMETRY['metric-affine']})
  --per-file                   Print per-file timings
`.trim());
    return;
  }

  const combo = getArgValue(args, '--combo');
  const full = hasFlag(args, '--full');
  const perFile = hasFlag(args, '--per-file');
  const includeStress = !hasFlag(args, '--no-stress');

  const denseGeometry = Number(getArgValue(args, '--dense-geometry') || DEFAULT_GEOMETRY['dense-binary']);
  const sparseK = Number(getArgValue(args, '--sparse-k') || DEFAULT_GEOMETRY['sparse-polynomial']);
  const metricDim = Number(getArgValue(args, '--metric-dim') || getArgValue(args, '--metric-dimensions') || DEFAULT_GEOMETRY['metric-affine']);

  let combos = [];
  if (combo) {
    const [strategyId, reasoningPriority] = combo.split('/');
    combos = [{ strategyId, reasoningPriority }];
  } else if (full) {
    combos = [
      { strategyId: 'dense-binary', reasoningPriority: 'symbolicPriority' },
      { strategyId: 'dense-binary', reasoningPriority: 'holographicPriority' },
      { strategyId: 'sparse-polynomial', reasoningPriority: 'symbolicPriority' },
      { strategyId: 'sparse-polynomial', reasoningPriority: 'holographicPriority' },
      { strategyId: 'metric-affine', reasoningPriority: 'symbolicPriority' },
      { strategyId: 'metric-affine', reasoningPriority: 'holographicPriority' }
    ];
  } else {
    const strategies = parseList(getArgValue(args, '--strategy') || getArgValue(args, '--strategies')) || ['dense-binary'];
    const priorities = parseList(getArgValue(args, '--priority') || getArgValue(args, '--priorities')) || ['holographicPriority'];
    for (const strategyId of strategies) {
      for (const reasoningPriority of priorities) {
        combos.push({ strategyId, reasoningPriority });
      }
    }
  }

  const results = [];
  for (const { strategyId, reasoningPriority } of combos) {
    const geometry =
      strategyId === 'sparse-polynomial' ? sparseK :
      strategyId === 'metric-affine' ? metricDim :
      denseGeometry;

    const label = `${strategyId}/${reasoningPriority}`;
    const prof = await profileLoad({ strategyId, reasoningPriority, geometry, includeStress });

    results.push({
      run: label,
      duration: formatDuration(prof.totalMs),
      totalMs: prof.totalMs,
      sessionStats: prof.sessionStats,
      hdcStats: prof.hdcStats,
      perFile: prof.perFile
    });

    const topSession = topOps(prof.sessionStats, 3)
      .map(r => `${r.op} ${formatDuration(r.ms)} (${r.calls})`)
      .join(', ') || 'n/a';
    const topHdc = topOps(prof.hdcStats, 3)
      .map(r => `${r.op} ${formatDuration(r.ms)} (${r.calls})`)
      .join(', ') || 'n/a';

    console.log(`\n[${label}] total ${formatDuration(prof.totalMs)} | top session: ${topSession} | top hdc: ${topHdc}`);

    if (perFile) {
      const rows = prof.perFile.map(f => ([
        f.ok ? 'OK' : 'FAIL',
        formatDuration(f.ms),
        String(f.facts),
        String(f.errors),
        f.file
      ]));
      console.log(formatTable(rows, ['ok', 'time', 'facts', 'errors', 'file']));
    }
  }

  const summaryRows = results
    .sort((a, b) => a.totalMs - b.totalMs)
    .map(r => ([r.run, r.duration]));
  console.log('\n=== Summary (fastest first) ===');
  console.log(formatTable(summaryRows, ['run', 'duration']));
}

main().catch(err => {
  console.error('profileSessionLoad failed:', err?.message || err);
  process.exitCode = 1;
});
