#!/usr/bin/env node
/**
 * Analyze current bugCases and print a categorized summary.
 *
 * No network, no git; purely filesystem + JSON inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import { readJsonFileSafe } from '../libs/json.mjs';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'bugCases');

function listBugDirs() {
  if (!fs.existsSync(ROOT)) return [];
  return fs.readdirSync(ROOT)
    .filter(d => d.startsWith('BUG'))
    .map(d => path.join(ROOT, d))
    .filter(p => fs.statSync(p).isDirectory());
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

function inc(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, n = 8) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function detectShape(bugCase) {
  const q = String(bugCase?.translation?.questionDsl || '').trim();
  const hasGoal = /^@goal\b/i.test(q) || /^@g\b/i.test(q);
  const hasHole = q.includes('?');
  const isNot = /\bNot\s*\(/.test(q);
  const isExists = /\bExists\b/.test(q);
  const isImplies = /\bImplies\b/.test(q);
  const ctx = String(bugCase?.translation?.contextDsl || '');
  const ctxImplies = (ctx.match(/\bImplies\b/g) || []).length;
  return { hasGoal, hasHole, isNot, isExists, isImplies, ctxImplies };
}

function main() {
  const bugDirs = listBugDirs();
  if (bugDirs.length === 0) {
    console.log('No bugCases folders found.');
    process.exit(0);
  }

  const global = {
    total: 0,
    byBug: new Map(),
    bySource: new Map(),
    byFailureReason: new Map(),
    byExecutionReason: new Map(),
    byShape: new Map()
  };

  const perBug = new Map();

  for (const bugDir of bugDirs) {
    const bugId = path.basename(bugDir);
    const files = listJsonFiles(bugDir);
    const stats = {
      total: 0,
      bySource: new Map(),
      byFailureReason: new Map(),
      byExecutionReason: new Map(),
      byQuestionShape: new Map()
    };

    for (const file of files) {
      const data = readJsonFileSafe(file);
      if (!data) continue;
      stats.total++;
      global.total++;

      inc(stats.bySource, String(data.source || 'unknown'));
      inc(global.bySource, String(data.source || 'unknown'));

      inc(stats.byFailureReason, String(data?.failure?.reason || 'unknown'));
      inc(global.byFailureReason, String(data?.failure?.reason || 'unknown'));

      const execReason =
        data?.execution?.proveResult?.reason ||
        data?.execution?.proveResult?.error ||
        data?.failure?.details ||
        'unknown';
      inc(stats.byExecutionReason, String(execReason));
      inc(global.byExecutionReason, String(execReason));

      const shape = detectShape(data);
      const shapeKey = [
        shape.hasHole ? 'query' : 'prove',
        shape.isNot ? 'Not' : 'pos',
        shape.isExists ? 'Exists' : 'noExists',
        `ctxImplies:${shape.ctxImplies >= 4 ? '4+' : String(shape.ctxImplies)}`
      ].join(' ');
      inc(stats.byQuestionShape, shapeKey);
      inc(global.byShape, shapeKey);
    }

    perBug.set(bugId, stats);
    global.byBug.set(bugId, stats.total);
  }

  console.log('\nBugCases summary\n');
  console.log(`Total cases: ${global.total}`);
  console.log('\nBy bug folder:');
  for (const [bugId, count] of topEntries(global.byBug, 50)) {
    console.log(`- ${bugId}: ${count}`);
  }

  console.log('\nTop sources:');
  for (const [k, v] of topEntries(global.bySource, 20)) console.log(`- ${k}: ${v}`);

  console.log('\nTop failure reasons (case-level):');
  for (const [k, v] of topEntries(global.byFailureReason, 20)) console.log(`- ${k}: ${v}`);

  console.log('\nTop execution reasons (engine-level, noisy):');
  for (const [k, v] of topEntries(global.byExecutionReason, 20)) console.log(`- ${k}: ${v}`);

  console.log('\nTop question shapes:');
  for (const [k, v] of topEntries(global.byShape, 20)) console.log(`- ${k}: ${v}`);

  console.log('\nPer-bug breakdown:');
  for (const [bugId, stats] of [...perBug.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`\n== ${bugId} (${stats.total}) ==`);
    console.log('Sources:');
    for (const [k, v] of topEntries(stats.bySource, 10)) console.log(`  - ${k}: ${v}`);
    console.log('Failure reasons:');
    for (const [k, v] of topEntries(stats.byFailureReason, 10)) console.log(`  - ${k}: ${v}`);
    console.log('Question shapes:');
    for (const [k, v] of topEntries(stats.byQuestionShape, 8)) console.log(`  - ${k}: ${v}`);
  }
}

main();
