/**
 * Generate "Supported English" for FastEval cases, derived from canonical DSL.
 *
 * This helps answer: "What English does our NL→DSL translator *really* support?"
 * We derive a canonical, parseable English form from DSL (using Session DSL→NL),
 * and we report where we cannot confidently generate a good NL form.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session } from '../src/runtime/session.mjs';
import { discoverSuites, loadSuite } from './fastEval/lib/loader.mjs';

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('-')));
  const get = (name, fallback = null) => {
    const hit = args.find(a => a.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : fallback;
  };
  const suiteFilters = args.filter(a => !a.startsWith('-'));
  const suitesArg = get('--suites', null);
  const suites = suitesArg
    ? suitesArg.split(',').map(s => s.trim()).filter(Boolean)
    : suiteFilters;
  return {
    suites,
    out: get('--out', 'evals/fastEvalSupportedNL.md'),
    includeLearn: flags.has('--include-learn')
  };
}

function markdownEscape(s) {
  return String(s || '').replace(/\|/g, '\\|');
}

function short(s, max = 120) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizeQueryNl(typeWord) {
  const w = String(typeWord || '').trim();
  if (!w) return null;
  return `What is a ${w}?`;
}

function extractSimpleIsAQuery(dsl) {
  const line = String(dsl || '')
    .split('\n')
    .map(l => l.replace(/#.*$/g, '').trim())
    .find(Boolean) || '';
  const stripped = line.replace(/^@[A-Za-z0-9_]+(?::[A-Za-z0-9_]+)?\s+/, '');
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 4 && parts[0] === 'isA' && parts[1].startsWith('?')) {
    return { hole: parts[1], type: parts[3] };
  }
  return null;
}

async function main() {
  const opts = parseArgs(process.argv);

  const available = await discoverSuites();
  const selected = opts.suites.length
    ? available.filter(s => opts.suites.some(f => s.includes(f)))
    : available;

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

  const out = [];
  out.push(`# FastEval Supported English\n\n`);
  out.push(`Generated at: ${new Date().toISOString()}\n\n`);
  out.push(`This file is generated from canonical DSL, not from existing suite prose.\n`);
  out.push(`It shows the English subset we can realistically standardize on.\n\n`);

  out.push(`## Summary\n\n`);
  out.push(`| Suite | Cases | Supported NL |\n`);
  out.push(`|---|---:|---:|\n`);

  const details = [];

  for (const suiteName of selected) {
    const suite = await loadSuite(suiteName);
    const steps = suite.cases || [];

    let considered = 0;
    let supported = 0;

    const lines = [];
    lines.push(`\n## ${suiteName} - ${suite.name}\n\n`);
    if (suite.description) lines.push(`${suite.description}\n\n`);
    lines.push(`| # | action | NL (original) | NL (supported) |\n`);
    lines.push(`|---:|---|---|---|\n`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== 'object') continue;
      if (!opts.includeLearn && step.action === 'learn') continue;

      const dsl = step.query_dsl || step.input_dsl || '';
      if (!dsl) continue;

      if (step.action !== 'prove' && step.action !== 'query' && (opts.includeLearn ? step.action !== 'learn' : true)) {
        continue;
      }

      considered++;

      let nlSupported = null;
      if (step.action === 'query') {
        const q = extractSimpleIsAQuery(dsl);
        nlSupported = q ? normalizeQueryNl(q.type) : null;
      }

      if (!nlSupported) {
        const res = session.describeDsl(dsl, { includeDeclarations: false, includeMeta: false, style: 'parseable' });
        nlSupported = res.success && Array.isArray(res.lines) && res.lines.length > 0 ? res.lines[0] : null;
      }

      if (nlSupported) supported++;
      const orig = step.input_nl ? short(step.input_nl, 140) : '';
      const sup = nlSupported ? short(nlSupported, 140) : '(unavailable)';

      lines.push(`| ${i + 1} | ${markdownEscape(step.action)} | ${markdownEscape(orig)} | ${markdownEscape(sup)} |\n`);
    }

    out.push(`| ${markdownEscape(suiteName)} | ${considered} | ${supported} |\n`);
    details.push(lines.join(''));
  }

  out.push(`\n`);
  out.push(details.join(''));

  const outPath = path.isAbsolute(opts.out) ? opts.out : path.join(PROJECT_ROOT, opts.out);
  fs.writeFileSync(outPath, out.join(''), 'utf8');

  session.close();
  console.log(`Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
