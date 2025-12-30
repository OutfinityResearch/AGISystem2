/**
 * FastEval NL→DSL Translation Runner
 *
 * Purpose:
 * - Run the NLTransformer on FastEval cases (prove/query by default).
 * - Compare generated DSL to the suite's canonical DSL (input_dsl/query_dsl).
 * - Optionally execute the generated DSL in an isolated transaction and compare the produced NL output
 *   against expected_nl/proof_nl (this approximates "does the NL actually translate correctly?").
 *
 * Notes:
 * - FastEval itself does NOT use generated DSL for prove/query (it uses canonical input_dsl).
 *   This script exists to audit translation quality directly.
 */

import os from 'node:os';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

import { NLTransformer } from '../src/nlp/transformer.mjs';
import { Session } from '../src/runtime/session.mjs';
import { beginTransaction, rollbackTransaction } from '../src/runtime/session-transaction.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

import { discoverSuites, loadSuite } from './fastEval/lib/loader.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(PROJECT_ROOT, 'config');
const DOMAIN_ROOT = join(PROJECT_ROOT, 'evals', 'domains');
const CONFIG_SCOPES = new Set(['Core', 'Constraints', 'runtime']);

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

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

  const actionsArg = get('--actions', 'prove,query');
  const actions = new Set(actionsArg.split(',').map(s => s.trim()).filter(Boolean));

  const limit = (() => {
    const raw = get('--limit', null);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const jobs = (() => {
    const raw = get('--jobs', null);
    if (!raw) return Math.max(1, Math.min(6, os.cpus().length));
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();

  const execute = flags.has('--execute-generated');
  const showDsl = flags.has('--show-dsl');
  const details = flags.has('--details');
  const noColor = flags.has('--no-color');

  return { suites, actions, limit, jobs, execute, showDsl, details, noColor };
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function normalizeDsl(dsl) {
  return String(dsl || '')
    .split('\n')
    .map(l => l.replace(/#.*$/g, '').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDslForComparison(dsl) {
  return String(dsl || '')
    .split('\n')
    .map(line => {
      const l = line.replace(/#.*$/g, '').trim();
      // Ignore destination labels like "@goal:goal" or "@f1" for comparison.
      return l.replace(/^@[A-Za-z0-9_]+(?::[A-Za-z0-9_]+)?\s+/, '');
    })
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonEmptyLine(dsl) {
  return String(dsl || '')
    .split('\n')
    .map(l => l.replace(/#.*$/g, '').trim())
    .find(Boolean) || '';
}

function stripDestinationPrefix(line) {
  return String(line || '').replace(/^@[A-Za-z0-9_]+(?::[A-Za-z0-9_]+)?\s+/, '').trim();
}

function adaptGeneratedDslForAction(action, genDsl) {
  const line = firstNonEmptyLine(genDsl);
  const stmt = stripDestinationPrefix(line);
  if (!stmt) return '';
  if (stmt.startsWith('@goal') || stmt.startsWith('@q')) return stmt;

  if (action === 'prove' || action === 'elaborate') {
    const isNeg = stmt.startsWith('Not ') || stmt.startsWith('Not(');
    const prefix = isNeg ? '@goal:goal ' : '@goal ';
    return `${prefix}${stmt}`;
  }
  if (action === 'query' || action === 'listSolutions') {
    return `@q ${stmt}`;
  }
  return stmt;
}

function normalizeEvalNl(nl, action) {
  let s = String(nl || '').trim();
  if (!s) return s;

  // Strip common suite prefixes (these are meta-instructions, not factual statements).
  s = s.replace(/^(prove|query|learn)\s*:\s*/i, '').trim();

  // Drop trailing explanatory parentheses / provenance for translation purposes.
  // Example: "Alex is not a vumpus (from ...)." -> "Alex is not a vumpus."
  const cutMarkers = [' (', ' via ', ' from ', ' because ', ' but ', ' however '];
  let cutAt = -1;
  for (const m of cutMarkers) {
    const idx = s.toLowerCase().indexOf(m.trim());
    if (idx > 0) {
      cutAt = cutAt === -1 ? idx : Math.min(cutAt, idx);
    }
  }
  const paren = s.indexOf('(');
  if (paren > 0) cutAt = cutAt === -1 ? paren : Math.min(cutAt, paren);
  if (cutAt > 0) s = s.slice(0, cutAt).trim();

  // Replace common unicode operators that the lexer will reject.
  s = s.replaceAll('→', '->');
  s = s.replaceAll('∧', 'and');
  s = s.replaceAll('∨', 'or');

  // Convert common question forms into declarative forms that NLTransformer understands.
  // "Is Rex a Dog?" -> "Rex is a Dog."
  // "Can Opus fly?" -> "Opus can fly."
  const q = s.replace(/[?]+$/g, '').trim();
  const mIsA = q.match(/^is\s+(\w+)\s+(?:an?\s+)?(\w+)$/i);
  if (mIsA) s = `${mIsA[1]} is a ${mIsA[2]}`;
  const mCan = q.match(/^can\s+(\w+)\s+(\w+)$/i);
  if (mCan) s = `${mCan[1]} can ${mCan[2]}`;

  // Remove stray punctuation that often breaks regex patterns.
  s = s.replace(/[\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

  // Ensure a sentence terminator for the sentence splitter.
  if (!/[.!?]$/.test(s)) s = `${s}.`;

  return s;
}

function directQueryDslFromNl(normalizedNl) {
  const q = String(normalizedNl || '').trim().replace(/[?!.]+$/g, '').trim();
  const mWhatIsA = q.match(/^what\s+is\s+(?:an?\s+)?(\w+)$/i);
  if (mWhatIsA) {
    const type = mWhatIsA[1];
    return `@q isA ?x ${type}`;
  }
  return null;
}

function shortSnippet(text, max = 140) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function coerceTranslationText(result) {
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object') {
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    const proofText = typeof result.proofText === 'string' ? result.proofText.trim() : '';
    if (text && proofText) return `${text} Proof: ${proofText}`;
    if (text) return text;
  }
  return String(result ?? '').trim();
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\bisa\b/g, 'is a')
    .replace(/\bhasa\b/g, 'has a')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(a|an|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function proofIncludes(expectedProofNl, actualText) {
  if (expectedProofNl === undefined || expectedProofNl === null) return true;
  const proofIdx = String(actualText || '').toLowerCase().indexOf('proof:');
  const proofText = proofIdx >= 0 ? String(actualText).slice(proofIdx + 'proof:'.length).trim() : String(actualText || '');
  const normProof = normalizeText(proofText);

  if (Array.isArray(expectedProofNl)) {
    return expectedProofNl
      .filter(Boolean)
      .every(piece => normProof.includes(normalizeText(String(piece))));
  }
  return normProof.includes(normalizeText(String(expectedProofNl)));
}

function outputMatches(testCase, actualText) {
  const expected = testCase.expected_nl;
  if (!expected) return true;
  const actualNorm = normalizeText(actualText);
  const mainOk = Array.isArray(expected)
    ? expected.every(entry => actualNorm.includes(normalizeText(String(entry))))
    : actualNorm.includes(normalizeText(String(expected)));
  const proofOk = proofIncludes(testCase.proof_nl, actualText) ||
    (testCase.alternative_proof_nl ? proofIncludes(testCase.alternative_proof_nl, actualText) : false);
  return mainOk && proofOk;
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function buildSession(suite, { geometry = 256, exactUnbindMode = 'B', reasoningPriority = REASONING_PRIORITY.HOLOGRAPHIC } = {}) {
  const session = new Session({
    geometry,
    hdcStrategy: 'exact',
    exactUnbindMode,
    reasoningPriority,
    ...(suite?.sessionOptions || {})
  });

  // Core stack (same mechanism as FastEval runner; includes validation + Constraints)
  try {
    const corePath = join(CONFIG_ROOT, 'Core');
    const prevBasePath = session?.executor?.basePath;
    if (session?.executor) session.executor.basePath = corePath;
    try {
      session.loadCore({
        corePath,
        includeIndex: true,
        validate: true,
        throwOnValidationError: false
      });
    } finally {
      if (session?.executor) session.executor.basePath = prevBasePath;
    }
  } catch {
    // Best-effort: translation audit can proceed even if Core validation emits warnings.
  }

  // Suite-local .sys2 files
  for (const content of suite?.suiteTheories || []) session.learn(content);

  // Declared theories referenced by suite cases.mjs
  const resolveConfigTheoryPath = (entry) => {
    if (!entry || typeof entry !== 'string') return null;
    if (path.isAbsolute(entry)) return entry;
    const cleaned = entry.replace(/^[.][/]/, '');
    if (cleaned.includes('/')) {
      const top = cleaned.split('/')[0];
      if (CONFIG_SCOPES.has(top)) return join(CONFIG_ROOT, cleaned);
      return join(DOMAIN_ROOT, cleaned);
    }
    return join(CONFIG_ROOT, 'Core', cleaned);
  };

  for (const entry of suite?.declaredTheories || []) {
    const fullPath = resolveConfigTheoryPath(entry);
    if (!fullPath || !fs.existsSync(fullPath)) continue;
    try {
      session.learn(fs.readFileSync(fullPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  return session;
}

function executeAction(session, action, dsl) {
  const trimmed = String(dsl || '').trim();
  if (action === 'learn') return session.learn(trimmed);
  if (action === 'query') return session.query(trimmed);
  if (action === 'prove') return session.prove(trimmed);
  if (action === 'solve') return session.learn(trimmed);
  if (action === 'elaborate') return session.prove(trimmed);
  if (action === 'listSolutions') return session.query(trimmed);
  return session.query(trimmed);
}

async function main() {
  const opts = parseArgs(process.argv);
  const useColor = !opts.noColor;

  if (opts.suites.length === 0) {
    console.log(`\n${COLORS.bold}FastEval NL→DSL Translation Runner${COLORS.reset}`);
    console.log('Usage:');
    console.log('  node evals/runFastEvalNLTranslate.mjs [suiteFilter ...] [options]');
    console.log('\nOptions:');
    console.log('  --suites=a,b,c           Comma-separated suite names');
    console.log('  --actions=prove,query    Which actions to translate (default: prove,query)');
    console.log('  --execute-generated      Execute generated DSL in an isolated transaction and compare to expected_nl/proof_nl');
    console.log('  --show-dsl               Print generated DSL (mismatches only unless --details)');
    console.log('  --details                Print per-case details');
    console.log('  --limit=N                Stop after N translatable cases (across suites)');
    console.log('  --jobs=N                 Parallelism for translation only (default: min(6, cpus))');
    console.log('  --no-color               Disable ANSI colors');
    process.exit(0);
  }

  const available = await discoverSuites();
  const selected = available.filter(s => opts.suites.some(f => s.includes(f)));
  if (selected.length === 0) {
    console.error(`${useColor ? COLORS.red : ''}No matching suites for: ${opts.suites.join(', ')}${useColor ? COLORS.reset : ''}`);
    process.exit(1);
  }

  const transformer = new NLTransformer({ dslPreserveOperators: true });
  let totalCases = 0;
  let translated = 0;
  let dslSame = 0;
  let dslDiff = 0;
  let genExecPass = 0;
  let genExecFail = 0;

  console.log(`${useColor ? COLORS.bold : ''}\nFastEval NL→DSL Translation Runner${useColor ? COLORS.reset : ''}`);
  console.log(`${useColor ? COLORS.dim : ''}Suites: ${selected.join(', ')} | Actions: ${[...opts.actions].join(', ')}${useColor ? COLORS.reset : ''}`);
  console.log(`${useColor ? COLORS.dim : ''}Mode: compare generated DSL to canonical DSL${opts.execute ? ' + execute generated' : ''}${useColor ? COLORS.reset : ''}\n`);

  for (const suiteName of selected) {
    const suite = await loadSuite(suiteName);
    const steps = suite.cases || [];

    const session = buildSession(suite);
    let suiteTranslatable = 0;
    let suiteDiff = 0;
    let suiteExecFail = 0;

    const indices = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== 'object') continue;
      if (!opts.actions.has(step.action)) continue;
      if (!step.input_nl || !String(step.input_nl).trim()) continue;
      if (!step.input_dsl && !step.query_dsl) continue;
      indices.push(i);
    }

    // Translate in parallel (translation only), but execute suite sequentially for canonical state.
    const translations = await runWithConcurrency(indices, opts.jobs, async (i) => {
      const step = steps[i];
      const rawNl = String(step.input_nl || '').trim();
      const nl = normalizeEvalNl(rawNl, step.action);
      const direct = step.action === 'query' ? directQueryDslFromNl(nl) : null;
      const gen = direct ? { success: true, dsl: direct, parsed: [], errors: [] } : transformer.transform(nl);
      return { i, nl, rawNl, gen };
    });
    const byIndex = new Map(translations.map(t => [t.i, t]));

    console.log(`${useColor ? COLORS.cyan : ''}${suiteName}${useColor ? COLORS.reset : ''} (${suite.name})`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== 'object') continue;

      // Progress canonical state for ALL steps (learn/prove/query/etc.)
      const canonicalDsl = step.query_dsl || step.input_dsl || '';
      if (canonicalDsl && step.action) {
        try {
          executeAction(session, step.action, canonicalDsl);
        } catch {
          // Keep going: this script is primarily a translation audit.
        }
      }

      const t = byIndex.get(i);
      if (!t) continue;
      if (opts.limit && translated >= opts.limit) break;

      translated++;
      suiteTranslatable++;
      totalCases++;

      const genOk = !!t.gen?.success && String(t.gen?.dsl || '').trim().length > 0;
      const genDslRaw = genOk ? String(t.gen.dsl) : '';
      const genDsl = genOk ? adaptGeneratedDslForAction(step.action, genDslRaw) : '';
      const same = genOk && normalizeDslForComparison(genDsl) === normalizeDslForComparison(canonicalDsl);
      if (same) dslSame++;
      else dslDiff++;
      if (!same) suiteDiff++;

      let execOk = null;
      let execText = null;
      if (opts.execute && genOk) {
        const snap = beginTransaction(session);
        try {
          const rr = executeAction(session, step.action, genDsl);
          const described = session.describeResult({
            action: step.action,
            reasoningResult: rr,
            queryDsl: genDsl
          });
          execText = coerceTranslationText(described);
          execOk = outputMatches(step, execText);
        } catch (e) {
          execText = `ERROR: ${e?.message || String(e)}`;
          execOk = false;
        } finally {
          rollbackTransaction(session, snap);
        }

        if (execOk) genExecPass++;
        else {
          genExecFail++;
          suiteExecFail++;
        }
      }

      const shouldPrint = opts.details || !same || (opts.execute && execOk === false);
      if (shouldPrint) {
        const status = same
          ? `${useColor ? COLORS.green : ''}DSL=OK${useColor ? COLORS.reset : ''}`
          : `${useColor ? COLORS.yellow : ''}DSL≠CANON${useColor ? COLORS.reset : ''}`;
        const execStatus = !opts.execute
          ? ''
          : (execOk ? ` ${useColor ? COLORS.green : ''}GEN=PASS${useColor ? COLORS.reset : ''}` : ` ${useColor ? COLORS.red : ''}GEN=FAIL${useColor ? COLORS.reset : ''}`);
        console.log(`  ${String(i + 1).padStart(3)} ${status}${execStatus} ${step.action} ${useColor ? COLORS.dim : ''}${shortSnippet(t.rawNl)}${useColor ? COLORS.reset : ''}`);

        if (opts.showDsl && (!same || opts.details)) {
          console.log(`      ${useColor ? COLORS.dim : ''}NL:${useColor ? COLORS.reset : ''} ${shortSnippet(t.nl, 240)}`);
          console.log(`      ${useColor ? COLORS.dim : ''}GEN:${useColor ? COLORS.reset : ''} ${shortSnippet(genDsl, 240)}`);
          console.log(`      ${useColor ? COLORS.dim : ''}CAN:${useColor ? COLORS.reset : ''} ${shortSnippet(canonicalDsl, 240)}`);
        }
        if (opts.execute && execOk === false) {
          console.log(`      ${useColor ? COLORS.dim : ''}OUT:${useColor ? COLORS.reset : ''} ${shortSnippet(execText, 260)}`);
          if (step.expected_nl) console.log(`      ${useColor ? COLORS.dim : ''}EXP:${useColor ? COLORS.reset : ''} ${shortSnippet(step.expected_nl, 260)}`);
        }
      }
    }

    console.log(`  ${useColor ? COLORS.dim : ''}Suite summary:${useColor ? COLORS.reset : ''} translatable=${suiteTranslatable} dslDiff=${suiteDiff}${opts.execute ? ` genFail=${suiteExecFail}` : ''}\n`);
    session.close();
    if (opts.limit && translated >= opts.limit) break;
  }

  console.log(`${useColor ? COLORS.bold : ''}Totals${useColor ? COLORS.reset : ''}`);
  console.log(`- Cases translated: ${totalCases}`);
  console.log(`- DSL identical:    ${dslSame}`);
  console.log(`- DSL differs:      ${dslDiff}`);
  if (opts.execute) {
    console.log(`- Generated exec:   ${genExecPass} pass, ${genExecFail} fail`);
  }
  console.log(`${useColor ? COLORS.dim : ''}Tip: add --execute-generated to measure whether generated DSL actually produces expected results.${useColor ? COLORS.reset : ''}`);
}

main().catch(err => {
  console.error(stripAnsi(err?.stack || err?.message || String(err)));
  process.exit(1);
});
