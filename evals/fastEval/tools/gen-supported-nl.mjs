#!/usr/bin/env node
/**
 * Generate `evals/fastEval/supported-nl.generated.mjs` from canonical DSL.
 *
 * Goal:
 * - Provide a deterministic, NLTransformer-targeted English form ("supported NL")
 * - Keep suite case files stable (avoid huge diffs)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session } from '../../../src/runtime/session.mjs';
import { discoverSuites, loadSuite } from '../lib/loader.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const OUT_PATH = path.join(PROJECT_ROOT, 'evals', 'fastEval', 'supported-nl.generated.mjs');

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (name, fallback = null) => {
    const hit = args.find(a => a.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : fallback;
  };
  const suitesArg = get('--suites', null);
  const suites = suitesArg
    ? suitesArg.split(',').map(s => s.trim()).filter(Boolean)
    : args.filter(a => !a.startsWith('-'));
  return { suites };
}

function jsString(s) {
  return JSON.stringify(String(s ?? ''));
}

function printHeader() {
  const now = new Date().toISOString();
  return [
    '// GENERATED FILE - DO NOT EDIT BY HAND',
    `// Generated at: ${now}`,
    '// Generator: node evals/fastEval/tools/gen-supported-nl.mjs',
    '',
    'export const supportedNL = {'
  ].join('\n');
}

function printFooter() {
  return [
    '};',
    '',
    'export default { supportedNL };',
    ''
  ].join('\n');
}

function shouldGenerateForCase(c) {
  if (!c || typeof c !== 'object') return false;
  if (!c.input_dsl && !c.query_dsl) return false;
  return ['learn', 'prove', 'query', 'listSolutions'].includes(c.action);
}

function supportedNlForCase(session, c) {
  if (!c || typeof c !== 'object') return null;

  if (c.action === 'listSolutions') {
    const dest = String(c.input_dsl || '').trim();
    if (!dest) return null;
    return `List solutions for ${dest}.`;
  }

  const dsl = String(c.query_dsl || c.input_dsl || '').trim();
  if (!dsl) return null;

  const res = session.describeDsl(dsl, {
    includeDeclarations: false,
    includeMeta: c.action !== 'learn',
    style: 'parseable'
  });
  if (!res?.success || !Array.isArray(res.lines) || res.lines.length === 0) return null;

  if (c.action === 'learn') {
    // Keep per-statement lines to avoid gigantic strings in this generated file.
    return res.lines;
  }

  // query/prove: use first line (one sentence)
  return res.lines[0] || null;
}

async function main() {
  const opts = parseArgs(process.argv);

  const discovered = await discoverSuites();
  const selected = opts.suites.length
    ? discovered.filter(s => opts.suites.some(f => s.includes(f)))
    : discovered;

  if (selected.length === 0) {
    console.error(`No matching suites for: ${opts.suites.join(', ')}`);
    process.exit(1);
  }

  const session = new Session({ geometry: 256, hdcStrategy: 'exact', exactUnbindMode: 'B' });
  session.loadCore({
    corePath: path.join(PROJECT_ROOT, 'config', 'Core'),
    includeIndex: true,
    validate: true,
    throwOnValidationError: false
  });

  const chunks = [];
  chunks.push(printHeader());

  for (const suiteName of selected) {
    const suite = await loadSuite(suiteName);
    const steps = suite.cases || [];

    const perCase = new Array(steps.length).fill(null);

    for (let i = 0; i < steps.length; i++) {
      const c = steps[i];
      if (!shouldGenerateForCase(c)) continue;
      const value = supportedNlForCase(session, c);
      if (!value) continue;
      perCase[i] = value;
    }

    // Only output suites that have at least one generated entry.
    if (!perCase.some(v => v !== null)) continue;

    chunks.push(`  ${jsString(suiteName)}: [`);
    for (let i = 0; i < perCase.length; i++) {
      const v = perCase[i];
      if (v === null) {
        chunks.push('    null,');
        continue;
      }
      if (Array.isArray(v)) {
        const arr = v.map(jsString).join(', ');
        chunks.push(`    [${arr}],`);
        continue;
      }
      chunks.push(`    ${jsString(v)},`);
    }
    chunks.push('  ],');
  }

  chunks.push(printFooter());
  fs.writeFileSync(OUT_PATH, chunks.join('\n') + '\n', 'utf8');

  session.close();
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
