/**
 * FastEval Review Runner (LLM-assisted optional)
 *
 * Goals:
 * - Audit NL→DSL translation quality for FastEval cases (prove/query by default).
 * - Check whether expected_nl / proof_nl align with the engine's current output.
 * - Flag unclear proofs and suggest improvements (optionally via an LLM).
 *
 * This is intentionally separate from runFastEval:
 * - runFastEval validates the system end-to-end using canonical DSL for prove/query.
 * - this tool focuses on *translation* and *explanation quality*.
 */

import os from 'node:os';
import fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NLTransformer } from '../src/nlp/transformer.mjs';
import { Session } from '../src/runtime/session.mjs';
import { beginTransaction, rollbackTransaction } from '../src/runtime/session-transaction.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

import { discoverSuites, loadSuite } from './fastEval/lib/loader.mjs';

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_ROOT = path.join(PROJECT_ROOT, 'config');
const DOMAIN_ROOT = path.join(PROJECT_ROOT, 'evals', 'domains');
const CONFIG_SCOPES = new Set(['Core', 'Constraints', 'runtime']);

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
}

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

  const maxCases = (() => {
    const raw = get('--max-cases', null);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const outPath = get('--out', 'evals/fastEvalReview.md');
  const noColor = flags.has('--no-color');
  const includePassed = flags.has('--include-passed');
  const details = flags.has('--details');

  const llmEnabled = flags.has('--llm');
  const model = get('--model', process.env.OPENAI_MODEL || 'gpt-4o-mini');
  const baseUrl = get('--base-url', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
  const apiKey = process.env.OPENAI_API_KEY || null;
  const llmJobs = (() => {
    const raw = get('--llm-jobs', null);
    if (!raw) return 2;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();

  return {
    suites,
    actions,
    maxCases,
    outPath,
    noColor,
    includePassed,
    details,
    llm: {
      enabled: llmEnabled,
      model,
      baseUrl,
      apiKey,
      jobs: llmJobs
    }
  };
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

function normalizeEvalNl(nl) {
  let s = String(nl || '').trim();
  if (!s) return s;
  s = s.replace(/^(prove|query|learn)\s*:\s*/i, '').trim();

  const paren = s.indexOf('(');
  if (paren > 0) s = s.slice(0, paren).trim();

  // Common unicode operators in suite prose.
  s = s.replaceAll('→', '->');
  s = s.replaceAll('∧', 'and');
  s = s.replaceAll('∨', 'or');

  // Convert common question forms into declarative forms that NLTransformer understands.
  const q = s.replace(/[?]+$/g, '').trim();
  const mIsA = q.match(/^is\s+(\w+)\s+(?:an?\s+)?(\w+)$/i);
  if (mIsA) s = `${mIsA[1]} is a ${mIsA[2]}`;
  const mCan = q.match(/^can\s+(\w+)\s+(\w+)$/i);
  if (mCan) s = `${mCan[1]} can ${mCan[2]}`;

  s = s.replace(/[\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
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

function shortSnippet(text, max = 160) {
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

function lintProofClarity(text) {
  const t = String(text || '');
  const lower = t.toLowerCase();
  const issues = [];
  if (!lower.includes('proof:')) issues.push('missing_proof_prefix');
  const proofIdx = lower.indexOf('proof:');
  if (proofIdx >= 0) {
    const body = t.slice(proofIdx + 'proof:'.length).trim();
    if (body.length < 50) issues.push('proof_too_short');
    if (/\bsearch:\b/i.test(body)) issues.push('internal_search_trace');
    if (/\b@goal:goal\b/i.test(body)) issues.push('dsl_internal_leak');
  }
  if (/\bNot\(\(/.test(t)) issues.push('dsl_not_rendering');
  return issues;
}

function resolveConfigTheoryPath(entry) {
  if (!entry || typeof entry !== 'string') return null;
  if (path.isAbsolute(entry)) return entry;
  const cleaned = entry.replace(/^[.][/]/, '');
  if (cleaned.includes('/')) {
    const top = cleaned.split('/')[0];
    if (CONFIG_SCOPES.has(top)) return path.join(CONFIG_ROOT, cleaned);
    return path.join(DOMAIN_ROOT, cleaned);
  }
  return path.join(CONFIG_ROOT, 'Core', cleaned);
}

function buildSession(suite, { geometry = 256, exactUnbindMode = 'B', reasoningPriority = REASONING_PRIORITY.HOLOGRAPHIC } = {}) {
  const session = new Session({
    geometry,
    hdcStrategy: 'exact',
    exactUnbindMode,
    reasoningPriority,
    ...(suite?.sessionOptions || {})
  });

  // Load Core stack
  const corePath = path.join(CONFIG_ROOT, 'Core');
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

  // Declared theories
  for (const entry of suite?.declaredTheories || []) {
    const fullPath = resolveConfigTheoryPath(entry);
    if (!fullPath || !fs.existsSync(fullPath)) continue;
    session.learn(fs.readFileSync(fullPath, 'utf8'));
  }

  // Suite-local .sys2 files
  for (const content of suite?.suiteTheories || []) session.learn(content);

  return session;
}

function executeAction(session, action, dsl) {
  const trimmed = String(dsl || '').trim();
  if (!trimmed) return null;
  if (action === 'learn') return session.learn(trimmed);
  if (action === 'query') return session.query(trimmed);
  if (action === 'prove') return session.prove(trimmed);
  if (action === 'solve') return session.learn(trimmed);
  if (action === 'elaborate') return session.prove(trimmed);
  if (action === 'listSolutions') return session.query(trimmed);
  return session.query(trimmed);
}

function describeAction(session, action, reasoningResult, queryDsl) {
  const described = session.describeResult({ action, reasoningResult, queryDsl: queryDsl || '' });
  return coerceTranslationText(described);
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

function extractJsonObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function openaiJson({ apiKey, baseUrl, model, system, user }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const url = `${String(baseUrl || '').replace(/\/+$/, '')}/chat/completions`;
  const payload = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 400)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? '';
  const parsed = extractJsonObject(text);
  return { text, parsed };
}

function markdownEscape(s) {
  return String(s || '').replace(/\|/g, '\\|');
}

async function main() {
  const opts = parseArgs(process.argv);
  const useColor = !opts.noColor;

  if (opts.suites.length === 0) {
    console.log(`\n${C.bold}FastEval Review Runner${C.reset}`);
    console.log('Usage:');
    console.log('  node evals/runFastEvalReview.mjs [suiteFilter ...] [options]');
    console.log('\nOptions:');
    console.log('  --suites=a,b,c           Comma-separated suite names');
    console.log('  --actions=prove,query    Which actions to review (default: prove,query)');
    console.log('  --max-cases=N            Stop after N reviewed cases (across suites)');
    console.log('  --out=PATH               Write a Markdown report (default: evals/fastEvalReview.md)');
    console.log('  --details                Include more raw artifacts in the report');
    console.log('  --include-passed         Include cases with no detected issues');
    console.log('  --llm                    Add an LLM critique section per case (requires OPENAI_API_KEY)');
    console.log('  --model=NAME             LLM model (default: OPENAI_MODEL or gpt-4o-mini)');
    console.log('  --base-url=URL           LLM base URL (default: OPENAI_BASE_URL or https://api.openai.com/v1)');
    console.log('  --llm-jobs=N             LLM concurrency (default: 2)');
    console.log('  --no-color               Disable ANSI colors');
    process.exit(0);
  }

  const available = await discoverSuites();
  const selected = available.filter(s => opts.suites.some(f => s.includes(f)));
  if (selected.length === 0) {
    console.error(`${useColor ? C.red : ''}No matching suites for: ${opts.suites.join(', ')}${useColor ? C.reset : ''}`);
    process.exit(1);
  }

  if (opts.llm.enabled && !opts.llm.apiKey) {
    console.error(`${useColor ? C.red : ''}--llm was set but OPENAI_API_KEY is missing.${useColor ? C.reset : ''}`);
    process.exit(1);
  }

  const transformer = new NLTransformer();

  const report = [];
  report.push(`# FastEval Review\n`);
  report.push(`Generated at: ${new Date().toISOString()}\n`);
  report.push(`Suites: ${selected.join(', ')}\n`);
  report.push(`Actions reviewed: ${[...opts.actions].join(', ')}\n`);
  report.push(`LLM critique: ${opts.llm.enabled ? `enabled (model=${opts.llm.model})` : 'disabled'}\n`);

  const suiteSummaries = [];
  const llmRequests = [];

  let reviewed = 0;
  let issuesTotal = 0;

  console.log(`${useColor ? C.bold : ''}\nFastEval Review Runner${useColor ? C.reset : ''}`);
  console.log(`${useColor ? C.dim : ''}Suites: ${selected.join(', ')} | Actions: ${[...opts.actions].join(', ')}${useColor ? C.reset : ''}`);
  console.log(`${useColor ? C.dim : ''}Report: ${opts.outPath}${useColor ? C.reset : ''}\n`);

  for (const suiteName of selected) {
    const suite = await loadSuite(suiteName);
    const session = buildSession(suite);
    const steps = suite.cases || [];

    let suiteReviewed = 0;
    let suiteIssues = 0;
    let suiteTranslationIssues = 0;
    let suiteExpectationMismatches = 0;
    let suiteProofClarityIssues = 0;

    report.push(`\n## ${suiteName} - ${suite.name}\n`);
    report.push(`${suite.description || ''}\n`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== 'object') continue;

      // Progress canonical state (always)
      const canonicalDsl = step.query_dsl || step.input_dsl || '';
      let canonicalResult = null;
      let canonicalText = null;
      try {
        canonicalResult = executeAction(session, step.action, canonicalDsl);
        canonicalText = canonicalResult ? describeAction(session, step.action, canonicalResult, canonicalDsl) : null;
      } catch (e) {
        canonicalText = `ERROR: ${e?.message || String(e)}`;
      }

      if (!opts.actions.has(step.action)) continue;
      if (!step.input_nl || !String(step.input_nl).trim()) continue;
      if (!canonicalDsl) continue;

      reviewed++;
      suiteReviewed++;
      if (opts.maxCases && reviewed > opts.maxCases) break;

      const issues = [];

      // Translation generation
      const normalizedNl = normalizeEvalNl(String(step.input_nl).trim());
      const direct = step.action === 'query' ? directQueryDslFromNl(normalizedNl) : null;
      const gen = direct ? { success: true, dsl: direct, parsed: [], errors: [] } : transformer.transform(normalizedNl);
      const genOk = !!gen?.success && String(gen?.dsl || '').trim().length > 0;
      const genDslRaw = genOk ? String(gen.dsl).trim() : '';
      const genDsl = genOk ? adaptGeneratedDslForAction(step.action, genDslRaw) : '';
      const sameDsl = genOk && normalizeDslForComparison(genDsl) === normalizeDslForComparison(canonicalDsl);
      if (!genOk) {
        issues.push({ kind: 'translation_error', severity: 'high', note: gen?.errors?.map(e => e.error).join('; ') || 'Transformer produced no DSL' });
        suiteTranslationIssues++;
      } else if (!sameDsl) {
        // Execute generated DSL in an isolated transaction to see if it still matches expected output.
        const snap = beginTransaction(session);
        let genText = null;
        let genMatches = null;
        try {
          const rr = executeAction(session, step.action, genDsl);
          genText = rr ? describeAction(session, step.action, rr, genDsl) : null;
          genMatches = genText ? outputMatches(step, genText) : false;
        } catch (e) {
          genText = `ERROR: ${e?.message || String(e)}`;
          genMatches = false;
        } finally {
          rollbackTransaction(session, snap);
        }
        if (!genMatches) {
          issues.push({
            kind: 'nl_dsl_mismatch',
            severity: 'high',
            note: 'Generated DSL differs from canonical DSL and does not reproduce expected output.',
            genDsl,
            canonicalDsl,
            genText
          });
          suiteTranslationIssues++;
        } else {
          issues.push({
            kind: 'nl_dsl_diverges_but_works',
            severity: 'low',
            note: 'Generated DSL differs from canonical DSL, but still reproduces expected output.',
            genDsl
          });
        }
      }

      // Expected output mismatch (canonical)
      if (canonicalText && !outputMatches(step, canonicalText)) {
        issues.push({
          kind: 'expected_mismatch',
          severity: 'high',
          note: 'Canonical DSL output does not match expected_nl/proof_nl.',
          actual: canonicalText,
          expected: step.expected_nl
        });
        suiteExpectationMismatches++;
      }

      // Proof clarity (canonical output)
      if (typeof canonicalText === 'string' && (step.action === 'prove' || step.action === 'query')) {
        const lint = lintProofClarity(canonicalText);
        if (lint.length > 0) {
          issues.push({
            kind: 'proof_clarity',
            severity: lint.includes('missing_proof_prefix') ? 'high' : 'medium',
            note: `Proof clarity issues: ${lint.join(', ')}`,
            lint,
            actual: canonicalText
          });
          suiteProofClarityIssues++;
        }
      }

      const hasIssues = issues.length > 0;
      if (hasIssues) {
        issuesTotal += issues.length;
        suiteIssues += issues.length;
      }

      if (!hasIssues && !opts.includePassed) continue;

      const title = `Case ${i + 1} (${step.action})`;
      report.push(`\n### ${title}\n`);
      report.push(`- NL: ${markdownEscape(shortSnippet(step.input_nl, 600))}\n`);
      report.push(`- NL (normalized for translation): ${markdownEscape(shortSnippet(normalizedNl, 300))}\n`);
      if (opts.details) {
        report.push(`- Canonical DSL: \`${markdownEscape(shortSnippet(canonicalDsl, 400))}\`\n`);
        report.push(`- Canonical output: ${markdownEscape(shortSnippet(canonicalText, 900))}\n`);
      }

      if (!hasIssues) {
        report.push(`- Status: OK\n`);
        continue;
      }

      report.push(`- Issues:\n`);
      for (const issue of issues) {
        report.push(`  - [${issue.severity}] ${issue.kind}: ${markdownEscape(issue.note)}\n`);
      }

      if (opts.llm.enabled) {
        const payload = {
          suite: suiteName,
          suiteTitle: suite.name,
          caseIndex: i + 1,
          action: step.action,
          input_nl: step.input_nl,
          canonical_dsl: canonicalDsl,
          generated_dsl: genDsl || null,
          canonical_output: canonicalText || null,
          expected_nl: step.expected_nl || null,
          proof_nl: step.proof_nl || null
        };
        llmRequests.push({ suiteName, caseIndex: i + 1, payload });
      }
    }

    suiteSummaries.push({
      suiteName,
      title: suite.name,
      reviewed: suiteReviewed,
      issues: suiteIssues,
      translation: suiteTranslationIssues,
      expected: suiteExpectationMismatches,
      proof: suiteProofClarityIssues
    });

    session.close();
    if (opts.maxCases && reviewed > opts.maxCases) break;
  }

  // LLM critique (only for cases we already wrote into the report)
  if (opts.llm.enabled && llmRequests.length > 0) {
    report.push(`\n## LLM Critique\n`);
    report.push(`${opts.llm.model} via ${opts.llm.baseUrl}\n`);

    const system = [
      'You are reviewing a reasoning evaluation suite.',
      'You will be given: NL intent, canonical DSL, generated DSL (optional), canonical engine output, and expected_nl/proof_nl.',
      'Return a single JSON object with these keys:',
      '- verdict: one of ["ok","needs_fix"]',
      '- categories: array of strings from ["translation","expected","proof"]',
      '- summary: 1-2 sentences',
      '- suggestions: object with optional keys input_nl, expected_nl, proof_nl, canonical_dsl',
      'Rules:',
      '- Only suggest changes that improve clarity and consistency.',
      '- If you suggest proof_nl, keep it short and stepwise (facts/rules/inference/therefore).',
      '- Do not invent new facts; stay within the provided artifacts.',
      '- Output MUST be valid JSON.'
    ].join('\n');

    const critiques = await runWithConcurrency(llmRequests, opts.llm.jobs, async (item) => {
      const user = `Artifact:\n${JSON.stringify(item.payload, null, 2)}`;
      const { text, parsed } = await openaiJson({
        apiKey: opts.llm.apiKey,
        baseUrl: opts.llm.baseUrl,
        model: opts.llm.model,
        system,
        user
      });
      return { ...item, critiqueText: text, critiqueJson: parsed };
    });

    for (const c of critiques) {
      report.push(`\n### ${c.suiteName} Case ${c.caseIndex}\n`);
      if (c.critiqueJson) {
        report.push('```json\n');
        report.push(`${JSON.stringify(c.critiqueJson, null, 2)}\n`);
        report.push('```\n');
      } else {
        report.push(`${markdownEscape(shortSnippet(c.critiqueText, 1200))}\n`);
      }
    }
  }

  // Summary table
  report.push(`\n## Summary\n`);
  report.push(`Reviewed cases: ${reviewed}\n`);
  report.push(`Total issues: ${issuesTotal}\n`);
  report.push(`\n| Suite | Reviewed | Issues | Translation | Expected | Proof |\n`);
  report.push(`|---|---:|---:|---:|---:|---:|\n`);
  for (const s of suiteSummaries) {
    report.push(`| ${markdownEscape(s.suiteName)} | ${s.reviewed} | ${s.issues} | ${s.translation} | ${s.expected} | ${s.proof} |\n`);
  }

  // Write report
  const outPath = path.isAbsolute(opts.outPath) ? opts.outPath : path.join(PROJECT_ROOT, opts.outPath);
  fs.writeFileSync(outPath, report.join(''), 'utf8');

  console.log(`${useColor ? C.green : ''}Wrote:${useColor ? C.reset : ''} ${outPath}`);
  console.log(`${useColor ? C.dim : ''}Reviewed: ${reviewed} | Issues: ${issuesTotal} | LLM critiques: ${opts.llm.enabled ? llmRequests.length : 0}${useColor ? C.reset : ''}`);
}

main().catch(err => {
  console.error(stripAnsi(err?.stack || err?.message || String(err)));
  process.exit(1);
});
