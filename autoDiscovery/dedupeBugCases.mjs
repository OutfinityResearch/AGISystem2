#!/usr/bin/env node
/**
 * Bug case de-duplication utility.
 *
 * Removes duplicate JSON bug cases inside `autoDiscovery/bugCases/*` based on:
 * - source
 * - dataset label + choices
 * - input context_nl + question_nl (normalized)
 *
 * Usage:
 *   node autoDiscovery/dedupeBugCases.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'autoDiscovery', 'bugCases');

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function keyForCase(obj) {
  const source = String(obj?.source || '').trim();
  const label = String(obj?.dataset?.label ?? obj?.expected?.expected_proved ?? '').trim();
  const choices = Array.isArray(obj?.dataset?.choices) ? obj.dataset.choices.map(String).join('|') : '';
  const ctx = normalizeText(obj?.input?.context_nl);
  const q = normalizeText(obj?.input?.question_nl);
  return `${source}\u001f${label}\u001f${choices}\u001f${ctx}\u001f${q}`;
}

function listBugFolders() {
  if (!fs.existsSync(ROOT)) return [];
  return fs.readdirSync(ROOT)
    .map(name => path.join(ROOT, name))
    .filter(p => fs.statSync(p).isDirectory())
    .sort();
}

function listJsonCases(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f))
    .sort();
}

let deleted = 0;
let kept = 0;

for (const bugDir of listBugFolders()) {
  const seen = new Map(); // key -> firstPath
  for (const file of listJsonCases(bugDir)) {
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      kept++;
      continue;
    }

    const key = keyForCase(obj);
    if (!key || key.endsWith('\u001f\u001f')) {
      kept++;
      continue;
    }

    if (seen.has(key)) {
      fs.unlinkSync(file);
      deleted++;
      continue;
    }
    seen.set(key, file);
    kept++;
  }

  // Remove empty bug folder after deletions.
  const remaining = fs.readdirSync(bugDir).filter(f => f.endsWith('.json'));
  if (remaining.length === 0) {
    const report = path.join(bugDir, 'report.md');
    if (fs.existsSync(report)) fs.unlinkSync(report);
    fs.rmdirSync(bugDir);
  }
}

console.log(`dedupe complete: kept=${kept} deleted=${deleted}`);

