#!/usr/bin/env node
/**
 * Suites Health Check
 *
 * Analyzes all evaluation suites and reports:
 * - Syntax errors in DSL
 * - Proof complexity metrics
 * - Correctness validation
 * - Potential issues and warnings
 * - (Optional) Execution review vs expected_nl/proof_nl
 * - (Optional) LLM critique for unclear or inconsistent cases
 *
 * Usage:
 *   node evals/fastEval/healthCheck.js
 *   node evals/fastEval/healthCheck.js --verbose
 *   node evals/fastEval/healthCheck.js suite01_foundations
 *   node evals/fastEval/healthCheck.js --review
 *   node evals/fastEval/healthCheck.js --review --llm --model=gpt-4o-mini
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { parse } from '../../src/parser/index.mjs';
import { NLTransformer } from '../../src/nlp/transformer.mjs';
import { Session } from '../../src/runtime/session.mjs';
import { beginTransaction, rollbackTransaction } from '../../src/runtime/session-transaction.mjs';
import { REASONING_PRIORITY } from '../../src/core/constants.mjs';
import fs from 'node:fs';
import path from 'path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { stdin as stdin, stdout as stdout } from 'node:process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const CONFIG_ROOT = path.join(PROJECT_ROOT, 'config');
const DOMAIN_ROOT = path.join(PROJECT_ROOT, 'evals', 'domains');
const CONFIG_SCOPES = new Set(['Core', 'Constraints', 'runtime']);

function parseDotEnvValue(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function loadDotEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/g)) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq <= 0) continue;
      const key = s.slice(0, eq).trim();
      const value = parseDotEnvValue(s.slice(eq + 1));
      if (!key) continue;
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // Best-effort only.
  }
}

function maybeLoadDotEnv() {
  if (process.env.OPENAI_API_KEY) return;
  loadDotEnvFile(path.join(PROJECT_ROOT, '.env'));
  loadDotEnvFile(path.join(os.homedir(), '.env'));
}

maybeLoadDotEnv();

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

  const verbose = flags.has('--verbose') || flags.has('-v');
  const noColor = flags.has('--no-color');
  const help = flags.has('--help') || flags.has('-h');

  const review = flags.has('--review');
  const llmEnabled =
    flags.has('--llm') ||
    flags.has('--with-llm') ||
    flags.has('--withllm');
  const llmDisabled = flags.has('--no-llm');
  const model = get('--model', process.env.OPENAI_MODEL || 'gpt-4o-mini');
  const baseUrl = get('--base-url', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
  const apiKey = process.env.OPENAI_API_KEY || null;
  const llmJobs = (() => {
    const raw = get('--llm-jobs', null);
    if (!raw) return 2;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();

  const actionsArg = get('--actions', 'prove,query');
  const actions = new Set(actionsArg.split(',').map(s => s.trim()).filter(Boolean));

  const maxCases = (() => {
    const raw = get('--max-cases', null);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const outPath = get('--out', null);

  const suites = args.filter(a => !a.startsWith('-'));

  return {
    verbose,
    noColor,
    help,
    suites,
    review,
    actions,
    maxCases,
    outPath,
    llm: {
      enabled: llmDisabled ? false : llmEnabled,
      disabled: llmDisabled,
      model,
      baseUrl,
      apiKey,
      jobs: llmJobs
    }
  };
}

const opts = parseArgs(process.argv);
const verbose = opts.verbose;
const specificSuites = opts.suites;
const useColor = !opts.noColor;

if (!useColor) {
  for (const k of Object.keys(C)) C[k] = '';
}

if (opts.help) {
  console.log(`
AGISystem2 - FastEval Health Check

Usage:
  node evals/fastEval/healthCheck.js [suiteFilter ...] [options]

Options:
  --verbose, -v              Show extra per-case context
	  --no-color                 Disable ANSI colors
	  --review                   Execute canonical DSL and compare output to expected_nl/proof_nl
	  --actions=LIST             Review actions (default: prove,query)
	  --max-cases=N              Cap reviewed cases across suites
	  --out=PATH                 Write a unified markdown report (optional)

	LLM (optional):
	  --llm                      Add an LLM critique section (requires OPENAI_API_KEY)
	  --with-llm                 Alias for --llm
	  --no-llm                   Disable LLM critique (also disables interactive prompt)
	  --model=NAME               LLM model (default: OPENAI_MODEL or gpt-4o-mini)
	  --base-url=URL             LLM base URL (default: OPENAI_BASE_URL or https://api.openai.com/v1)
	  --llm-jobs=N               LLM concurrency (default: 2)
	`);
	  process.exit(0);
	}

// Operators that indicate complex reasoning
const REASONING_OPERATORS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'
]);

// --- NL ⇄ DSL roundtrip (supported NL) ---

function collectStatementNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) collectStatementNodes(n, out);
    return out;
  }
  if (node.type === 'Program') return collectStatementNodes(node.statements || [], out);
  if (node.type === 'TheoryDeclaration') return collectStatementNodes(node.statements || [], out);
  if (node.type === 'GraphDeclaration') return collectStatementNodes(node.body || [], out);
  if (node.type === 'SolveBlock') return collectStatementNodes(node.declarations || [], out);
  if (node.type === 'RuleDeclaration') {
    out.push(node);
    return out;
  }
  if (node.type === 'ImportStatement') {
    out.push(node);
    return out;
  }
  if (node.type === 'Statement') {
    out.push(node);
    return out;
  }
  return out;
}

function getName(node) {
  if (!node) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'object') return node.name || node.value || null;
  return null;
}

function normalizeExprToProp(expr, env) {
  if (!expr || typeof expr !== 'object') return { kind: 'atom', value: String(expr ?? '') };

  if (expr.type === 'Identifier') return { kind: 'atom', value: expr.name };
  if (expr.type === 'Hole') return { kind: 'atom', value: `?${expr.name}` };
  if (expr.type === 'Literal') return { kind: 'atom', value: String(expr.value) };

  if (expr.type === 'Reference') {
    const resolved = env?.get?.(expr.name) || null;
    if (resolved) return normalizeStatementLikeToProp(resolved, env);
    return { kind: 'atom', value: `$${expr.name}` };
  }

  if (expr.type === 'Compound') return normalizeStatementLikeToProp(expr, env);

  if (expr.type === 'List') {
    const items = Array.isArray(expr.items) ? expr.items.map(i => normalizeExprToProp(i, env)) : [];
    return { kind: 'atom', value: `[${items.map(stringifyProp).join(', ')}]` };
  }

  return { kind: 'atom', value: String(expr.value ?? '') };
}

function flattenBool(op, props) {
  const out = [];
  for (const p of props) {
    if (p && p.kind === 'op' && p.op === op && Array.isArray(p.args)) out.push(...p.args);
    else out.push(p);
  }
  return out;
}

function normalizeStatementLikeToProp(node, env) {
  const operator = node?.type === 'Statement' ? node.operator : node.operator;
  const argsRaw = Array.isArray(node?.args) ? node.args : [];
  const op = getName(operator) || '';

  if (op === 'Not') {
    if (argsRaw.length === 1) {
      const inner = normalizeExprToProp(argsRaw[0], env);
      return { kind: 'op', op: 'Not', args: [inner] };
    }
    if (argsRaw.length >= 2) {
      const innerOp = getName(argsRaw[0]) || stringifyProp(normalizeExprToProp(argsRaw[0], env));
      const innerArgs = argsRaw.slice(1).map(a => normalizeExprToProp(a, env));
      const inner = { kind: 'op', op: innerOp, args: innerArgs };
      return { kind: 'op', op: 'Not', args: [inner] };
    }
  }

  if (op === 'Implies' && argsRaw.length === 2) {
    return {
      kind: 'op',
      op: 'Implies',
      args: [
        normalizeExprToProp(argsRaw[0], env),
        normalizeExprToProp(argsRaw[1], env)
      ]
    };
  }

  if ((op === 'And' || op === 'Or') && argsRaw.length >= 2) {
    const parts = argsRaw.map(a => normalizeExprToProp(a, env));
    return { kind: 'op', op, args: flattenBool(op, parts) };
  }

  // Default relation/proposition
  return { kind: 'op', op, args: argsRaw.map(a => normalizeExprToProp(a, env)) };
}

function stringifyProp(p) {
  if (!p) return '';
  if (p.kind === 'atom') return String(p.value ?? '');
  if (p.kind !== 'op') return String(p.value ?? '');

  if (p.op === 'Not' && Array.isArray(p.args) && p.args.length === 1) {
    return `Not(${stringifyProp(p.args[0])})`;
  }
  if (p.op === 'Implies' && Array.isArray(p.args) && p.args.length === 2) {
    return `Implies(${stringifyProp(p.args[0])})(${stringifyProp(p.args[1])})`;
  }
  if ((p.op === 'And' || p.op === 'Or') && Array.isArray(p.args) && p.args.length >= 2) {
    return `${p.op}(${p.args.map(stringifyProp).join(')(')})`;
  }

  const args = Array.isArray(p.args) ? p.args : [];
  const renderedArgs = args.map(a => {
    const s = stringifyProp(a);
    return a?.kind === 'op' ? `(${s})` : s;
  }).join(' ');
  return `${p.op} ${renderedArgs}`.trim();
}

function alphaNormalizeHolesInStatement(s) {
  const text = String(s || '');
  const map = new Map();
  let next = 1;
  return text.replace(/\?[A-Za-z_][A-Za-z0-9_]*/g, (m) => {
    if (!map.has(m)) map.set(m, `?v${next++}`);
    return map.get(m);
  });
}

function normalizeDslToStatements(dsl, { onlyPersistent = false } = {}) {
  const trimmed = String(dsl || '').trim();
  if (!trimmed) return [];

  let ast;
  try {
    ast = parse(trimmed);
  } catch {
    return [];
  }

  const nodes = collectStatementNodes(ast, []);
  const env = new Map();

  for (const n of nodes) {
    if (n?.type === 'Statement' && n.destination) env.set(n.destination, n);
  }

  const out = [];
  for (const n of nodes) {
    if (n?.type !== 'Statement') continue;

    const op = getName(n.operator) || '';
    if (!op) continue;
    if (op === 'Load' || op === 'Unload' || op === 'Set') continue;
    if (op.startsWith('__')) continue;

    const shouldPersist = !n.destination || Boolean(n.persistName);
    if (onlyPersistent && !shouldPersist) continue;

    out.push(alphaNormalizeHolesInStatement(stringifyProp(normalizeStatementLikeToProp(n, env))));
  }

  return out;
}

// --- Optional review / execution checks (ported from evals/runFastEvalReview.mjs) ---

function normalizeTextForMatch(text) {
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
  const normProof = normalizeTextForMatch(proofText);

  if (Array.isArray(expectedProofNl)) {
    return expectedProofNl
      .filter(Boolean)
      .every(piece => normProof.includes(normalizeTextForMatch(String(piece))));
  }
  return normProof.includes(normalizeTextForMatch(String(expectedProofNl)));
}

function outputMatches(testCase, actualText) {
  const expected = testCase.expected_nl;
  if (!expected) return true;
  const actualNorm = normalizeTextForMatch(actualText);
  const mainOk = Array.isArray(expected)
    ? expected.every(entry => actualNorm.includes(normalizeTextForMatch(String(entry))))
    : actualNorm.includes(normalizeTextForMatch(String(expected)));
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
  const kernelCandidate = path.join(CONFIG_ROOT, 'Packs', 'Kernel', cleaned);
  if (fs.existsSync(kernelCandidate)) return kernelCandidate;
  return path.join(CONFIG_ROOT, 'Packs', cleaned);
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
  const corePath = path.join(CONFIG_ROOT, 'Packs', 'Kernel');
  const prevBasePath = session?.executor?.basePath;
  if (session?.executor) session.executor.basePath = corePath;
  try {
    session.loadCore({
      corePath,
      includeIndex: true,
      validate: true,
      throwOnValidationError: false
    });
    session.loadPack('tests_and_evals', {
      packPath: path.join(CONFIG_ROOT, 'Packs', 'tests_and_evals'),
      includeIndex: true,
      validate: false
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

function executeAction(session, testCase) {
  const action = testCase?.action;
  const dsl = String(testCase?.query_dsl || testCase?.input_dsl || '').trim();
  if (!dsl) return null;

  if (action === 'learn') return session.learn(dsl);
  if (action === 'prove' || action === 'elaborate') return session.prove(dsl);
  if (action === 'query') return session.query(dsl);

  if (action === 'listSolutions') {
    const destination = dsl;
    const solutions = session.kbFacts.filter(f =>
      f.metadata?.operator === 'cspSolution' &&
      f.metadata?.solutionRelation === destination
    );
    const maxSolutionsRaw =
      testCase.maxSolutions ??
      testCase.max_solutions ??
      testCase.max_results ??
      testCase.maxResults ??
      null;
    const maxSolutions = Number.isFinite(maxSolutionsRaw) ? Math.max(1, maxSolutionsRaw) : null;
    const shown = maxSolutions !== null ? solutions.slice(0, maxSolutions) : solutions;
    return {
      success: solutions.length > 0,
      destination,
      solutionCount: solutions.length,
      shownCount: shown.length,
      truncated: shown.length < solutions.length,
      solutions: shown.map((sol, i) => ({
        index: i + 1,
        facts: sol.metadata?.facts || [],
        assignments: sol.metadata?.assignments || []
      }))
    };
  }

  // Default fallback
  return session.query(dsl);
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

function describeAction(session, action, reasoningResult, queryDsl) {
  const described = session.describeResult({ action, reasoningResult, queryDsl: queryDsl || '' });
  return coerceTranslationText(described);
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
  s = s.replaceAll('→', '->');
  s = s.replaceAll('∧', 'and');
  s = s.replaceAll('∨', 'or');
  s = s.replace(/[\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/[.!?]$/.test(s)) s = `${s}.`;
  return s;
}

function directQueryDslFromNl(normalizedNl) {
  const q = String(normalizedNl || '').trim().replace(/[?!.]+$/g, '').trim();
  const mWhatIsA = q.match(/^what\s+is\s+(?:an?\s+)?(\w+)$/i);
  if (mWhatIsA) return `@q isA ?x ${mWhatIsA[1]}`;
  return null;
}

function shortSnippet(text, max = 160) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
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
  const text = await res.text();
  if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  const content = json?.choices?.[0]?.message?.content || '';
  return { text: String(content || '').trim(), parsed: extractJsonObject(content) };
}

/**
 * Get color based on percentage thresholds
 * <20% = red (severe), 20-80% = yellow (warning), ≥80% = green (OK)
 */
function getPctColor(pct) {
  if (pct < 20) return C.red;
  if (pct < 80) return C.yellow;
  return C.green;
}

/**
 * Get operator name from AST node
 */
function getOperatorName(operator) {
  if (!operator) return null;
  if (typeof operator === 'string') return operator;
  return operator.name || operator.value || null;
}

/**
 * Validate DSL syntax
 */
function validateDSLSyntax(dsl) {
  const issues = [];
  if (!dsl || typeof dsl !== 'string' || !dsl.trim()) {
    issues.push({ type: 'error', msg: 'Empty or invalid DSL' });
    return issues;
  }

  try {
    const ast = parse(dsl.trim());
    if (!ast.statements || ast.statements.length === 0) {
      issues.push({ type: 'warning', msg: 'DSL parses but produces no statements' });
    }
  } catch (err) {
    issues.push({ type: 'error', msg: `Parse error: ${err.message}` });
  }

  return issues;
}

/**
 * Validate expected_nl/proof_nl for formatting issues
 * Returns array of issues found
 */
function validateExpectedNl(testCase) {
  const issues = [];
  const expectedNl = testCase?.expected_nl;
  const proofNl = testCase?.proof_nl;
  const altProofNl = testCase?.alternative_proof_nl;
  const action = testCase?.action;
  const inputDsl = testCase?.input_dsl;
  const requiresProof = action === 'query' || action === 'prove';
  const expectedText = Array.isArray(expectedNl) ? expectedNl.join(' ') : expectedNl;
  const proofMissing = proofNl === undefined ||
    proofNl === null ||
    (typeof proofNl === 'string' && proofNl.trim().length === 0) ||
    (Array.isArray(proofNl) && proofNl.filter(p => typeof p === 'string' && p.trim().length > 0).length === 0);
  let proofLen = 0;

  function countQueryAnswers(text) {
    if (Array.isArray(text)) return text.length;
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (/^No results\b/i.test(trimmed) || /^No valid\b/i.test(trimmed)) return 1;
    return trimmed
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .length;
  }

  if (!expectedNl) {
    if (requiresProof) {
      issues.push({
        type: 'error',
        msg: `Missing expected_nl for ${action} action`
      });
    }
    return issues;
  }

  if (requiresProof && proofMissing) {
    issues.push({
      type: 'error',
      msg: `Missing proof_nl for ${action} action`
    });
  }

  if (action === 'query') {
    if (!Array.isArray(expectedNl)) {
      issues.push({
        type: 'error',
        msg: 'expected_nl must be an array for query actions (one answer per entry)'
      });
    } else if (expectedNl.some(entry => typeof entry !== 'string' || entry.trim().length === 0)) {
      issues.push({
        type: 'error',
        msg: 'expected_nl entries must be non-empty strings for query actions'
      });
    }
  }

  if (action === 'query' && proofNl !== undefined && proofNl !== null && !Array.isArray(proofNl)) {
    issues.push({
      type: 'error',
      msg: 'proof_nl must be an array for query actions (one proof per answer)'
    });
  } else if (action === 'query' && Array.isArray(proofNl)) {
    const answerCount = countQueryAnswers(expectedNl);
    if (answerCount > 0 && proofNl.length !== answerCount) {
      issues.push({
        type: 'error',
        msg: `proof_nl length (${proofNl.length}) does not match number of answers (${answerCount})`
      });
    }
  }

  if (requiresProof) {
    const expectedChecks = Array.isArray(expectedNl) ? expectedNl : [expectedNl];
    if (expectedChecks.some(entry => /\b(Proof|Search):/i.test(String(entry)))) {
      issues.push({
        type: 'error',
        msg: 'expected_nl should contain only the answer; move proof/search details to proof_nl'
      });
    }
  }

  // Validate proof_nl shape (string or string[])
  if (proofNl !== undefined && proofNl !== null) {
    const okShape = typeof proofNl === 'string' || (Array.isArray(proofNl) && proofNl.every(p => typeof p === 'string'));
    if (!okShape) {
      issues.push({
        type: 'error',
        msg: 'Invalid proof_nl type - must be a string or array of strings'
      });
    } else {
      const proofText = Array.isArray(proofNl) ? proofNl.join(' ') : proofNl;
      proofLen = typeof proofText === 'string' ? proofText.trim().length : 0;
      if (proofLen > 0 && proofLen < 10) {
        issues.push({
          type: 'warning',
          msg: 'proof_nl is present but very short - consider adding more proof detail'
        });
      }
      if (/\bProof:/i.test(proofText)) {
        issues.push({
          type: 'warning',
          msg: 'proof_nl should not include the "Proof:" label (runner adds/locates it in output); keep only proof content'
        });
      }
    }
  }

  // Validate alternative_proof_nl shape (string or string[])
  if (altProofNl !== undefined && altProofNl !== null) {
    const okShape = typeof altProofNl === 'string' || (Array.isArray(altProofNl) && altProofNl.every(p => typeof p === 'string'));
    if (!okShape) {
      issues.push({
        type: 'error',
        msg: 'Invalid alternative_proof_nl type - must be a string or array of strings'
      });
    } else {
      if (action === 'query' && !Array.isArray(altProofNl)) {
        issues.push({
          type: 'error',
          msg: 'alternative_proof_nl must be an array for query actions (one proof per answer)'
        });
      } else if (action === 'query' && Array.isArray(altProofNl)) {
        const answerCount = countQueryAnswers(expectedNl);
        if (answerCount > 0 && altProofNl.length !== answerCount) {
          issues.push({
            type: 'error',
            msg: `alternative_proof_nl length (${altProofNl.length}) does not match number of answers (${answerCount})`
          });
        }
      } else if (action === 'prove' && Array.isArray(altProofNl)) {
        issues.push({
          type: 'error',
          msg: 'alternative_proof_nl must be a string for prove actions'
        });
      }

      const altText = Array.isArray(altProofNl) ? altProofNl.join(' ') : altProofNl;
      const altLen = typeof altText === 'string' ? altText.trim().length : 0;
      // alternative_proof_nl is a fallback matcher; it's fine to be short if proof_nl is already detailed.
      if (altLen > 0 && altLen < 10 && proofLen < 10) {
        issues.push({
          type: 'warning',
          msg: 'alternative_proof_nl is present but very short - consider adding more proof detail'
        });
      }
      if (/\bProof:/i.test(altText)) {
        issues.push({
          type: 'warning',
          msg: 'alternative_proof_nl should not include the "Proof:" label; keep only proof content'
        });
      }
    }
  }

  // Check for multiple "Proof:" occurrences
  // For query actions, multiple Proof: is OK (one per result)
  // For prove actions, should have single proof
  const proofCount = (typeof expectedText === 'string' ? (expectedText.match(/\bProof:/gi) || []).length : 0);
  if (proofCount > 1 && action !== 'query') {
    issues.push({
      type: 'error',
      msg: `Multiple "Proof:" occurrences (${proofCount}) - should have single proof section`
    });
  }

  // Check for repeated pattern like "X can Y. Proof: ... X can Y. Proof: ..."
  const repeatedProofPattern = /(\w+\s+can\s+\w+)\.\s*Proof:.*?\1\.\s*Proof:/i;
  if (typeof expectedText === 'string' && repeatedProofPattern.test(expectedText)) {
    issues.push({
      type: 'error',
      msg: 'Repeated answer+proof pattern detected - consolidate into single response'
    });
  }

  void inputDsl;

  return issues;
}

/**
 * Check if DSL contains macro definitions (complex expansion)
 */
function hasMacroDefinition(inputDsl) {
  if (!inputDsl) return false;
  // Macro definitions look like: @Name:macroName graph|rule|...
  return /@\w+:\w+\s+(graph|rule|macro)/i.test(inputDsl);
}

function hasSolveBlock(inputDsl) {
  if (!inputDsl) return false;
  return /@\w+\s+solve\s+/i.test(inputDsl);
}

/**
 * Count facts in learn DSL (only for non-macro DSLs)
 */
function countLearnFacts(inputDsl) {
  if (!inputDsl) return 0;
  const lines = inputDsl.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      if (l.startsWith('#')) return false;
      if (l.startsWith('@_')) return false;
      if (l.startsWith('@goal ') || l.startsWith('@goal\t') || l === '@goal') return false;
      if (l.startsWith('@q ') || l.startsWith('@q\t') || l === '@q') return false;
      return true;
    });
  return lines.length;
}

/**
 * Validate learn action - check fact count consistency
 */
function validateLearnAction(testCase) {
  const issues = [];
  if (testCase.action !== 'learn') return issues;

  const inputDsl = testCase.input_dsl || '';
  const expectedNl = testCase.expected_nl || '';

  // Skip fact count validation for macro-containing DSLs (complex expansion)
  if (hasMacroDefinition(inputDsl)) {
    return issues; // Macro expansion is non-trivial, skip count check
  }

  const factCount = countLearnFacts(inputDsl);

  // Check if expected_nl mentions a number that doesn't match
  const numberMatch = expectedNl.match(/(\d+)\s*(facts?|statements?|assertions?|rules?)/i);
  if (numberMatch) {
    const declaredCount = parseInt(numberMatch[1], 10);
    if (declaredCount !== factCount) {
      issues.push({
        type: 'warning',
        msg: `Fact count mismatch: expected_nl says ${declaredCount}, but input_dsl has ${factCount} facts`
      });
    }
  }

  // Check if input_nl mentions a count
  const inputNl = testCase.input_nl || '';
  const inputNumberMatch = inputNl.match(/(\d+)\s*(facts?|statements?|items?|things?)/i);
  if (inputNumberMatch) {
    const declaredCount = parseInt(inputNumberMatch[1], 10);
    if (declaredCount !== factCount) {
      issues.push({
        type: 'warning',
        msg: `Fact count mismatch: input_nl says ${declaredCount}, but input_dsl has ${factCount} facts`
      });
    }
  }

  // Warn if learn has no expected_nl (should confirm what was learned)
  // Skip this suggestion for solve blocks, where output can be dynamic or bulky.
  if ((!expectedNl || expectedNl.trim() === '') && !hasSolveBlock(inputDsl)) {
    issues.push({
      type: 'info',
      msg: `Learn action has no expected_nl - consider adding confirmation message`
    });
  }

  return issues;
}

/**
 * Extract learned facts from DSL
 */
function extractLearnedFacts(dsl) {
  const facts = [];
  if (!dsl) return facts;

  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  for (const line of lines) {
    if (line.startsWith('@_') || line.startsWith('@goal') || line.startsWith('@q')) continue;

    if (line.startsWith('@') && !line.startsWith('@_')) {
      const match = line.match(/^@\w+\s+(.+)$/);
      if (match) facts.push(match[1]);
    } else {
      facts.push(line);
    }
  }

  return facts;
}

/**
 * Check if goal is directly in learned facts
 */
function checkDirectFactMatch(goal, learnedFacts) {
  if (!goal || !learnedFacts.length) return false;

  const goalMatch = goal.match(/^@(?:goal|q)\s+(\w+)\s+(.+)$/);
  if (!goalMatch) return false;

  const [, goalOp, goalArgs] = goalMatch;
  const goalArgList = goalArgs.split(/\s+/).filter(a => !a.startsWith('?'));

  for (const fact of learnedFacts) {
    const factMatch = fact.match(/^(\w+)\s+(.+)$/);
    if (!factMatch) continue;

    const [, factOp, factArgs] = factMatch;
    if (factOp !== goalOp) continue;

    const factArgList = factArgs.split(/\s+/);
    if (goalArgList.length === factArgList.length &&
        goalArgList.every((arg, i) => arg === factArgList[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Estimate transitive chain length
 */
function estimateTransitiveChain(goal, learnedFacts) {
  const result = { isTransitive: false, estimatedLength: 0 };

  const goalMatch = goal.match(/^@(?:goal|q)\s+isA\s+(\w+)\s+(\w+)$/);
  if (!goalMatch) return result;

  const [, subject, target] = goalMatch;

  const isaGraph = new Map();
  for (const fact of learnedFacts) {
    const factMatch = fact.match(/^isA\s+(\w+)\s+(\w+)$/);
    if (factMatch) {
      const [, from, to] = factMatch;
      if (!isaGraph.has(from)) isaGraph.set(from, []);
      isaGraph.get(from).push(to);
    }
  }

  // BFS to find path
  const visited = new Set();
  const queue = [[subject, 0]];

  while (queue.length > 0) {
    const [current, depth] = queue.shift();
    if (current === target) {
      result.isTransitive = true;
      result.estimatedLength = depth;
      return result;
    }
    if (visited.has(current)) continue;
    visited.add(current);

    for (const next of isaGraph.get(current) || []) {
      queue.push([next, depth + 1]);
    }
  }

  return result;
}

/**
 * Extract goal from DSL
 */
function extractGoal(dsl) {
  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    if (line.startsWith('@goal') || line.startsWith('@q')) return line;
  }
  return lines[lines.length - 1] || null;
}

/**
 * Analyze proof complexity
 */
function analyzeProofComplexity(testCase, learnedFacts) {
  const metrics = {
    action: testCase.action,
    isTrivialLookup: false,
    estimatedChainLength: 0,
    reasoningType: 'unknown',
    warnings: []
  };

  const dsl = testCase.input_dsl?.trim() || '';

  if (testCase.action === 'learn') {
    metrics.reasoningType = 'learning';
    return metrics;
  }

  if (testCase.action === 'query' || testCase.action === 'prove') {
    const goal = extractGoal(dsl);

    if (goal) {
      if (checkDirectFactMatch(goal, learnedFacts)) {
        metrics.isTrivialLookup = true;
        metrics.reasoningType = 'direct_lookup';
        metrics.warnings.push('Goal may be directly in KB');
      } else {
        const transitiveInfo = estimateTransitiveChain(goal, learnedFacts);
        if (transitiveInfo.isTransitive) {
          metrics.estimatedChainLength = transitiveInfo.estimatedLength;
          metrics.reasoningType = transitiveInfo.estimatedLength <= 2 ? 'shallow_transitive' : 'deep_transitive';
        } else {
          // Check for rule-based reasoning
          try {
            const ast = parse(dsl);
            for (const stmt of ast.statements || []) {
              const opName = getOperatorName(stmt.operator);
              if (opName && REASONING_OPERATORS.has(opName)) {
                metrics.reasoningType = 'rule_inference';
                metrics.estimatedChainLength = 3;
                break;
              }
            }
          } catch (e) { /* ignore */ }

          if (metrics.reasoningType === 'unknown') {
            metrics.reasoningType = 'symbolic_search';
            metrics.estimatedChainLength = 2;
          }
        }
      }
    }
  }

  return metrics;
}

/**
 * Count steps from expected_nl + proof_nl (best-effort heuristic)
 */
function countStepsFromExpected(expected) {
  if (!expected) return 0;
  const expectedNl = typeof expected === 'string' ? expected : expected.expected_nl;
  const proofNl = typeof expected === 'string' ? undefined : expected.proof_nl;

  const combined = [
    expectedNl || '',
    Array.isArray(proofNl) ? proofNl.join(' ') : (proofNl || '')
  ].join(' ');

  const cleaned = combined.replace(/\b(Proof|Search|Answer):/gi, ' ').trim();
  if (!cleaned) return 0;

  return cleaned.split(/[.?!;]+/).map(s => s.trim()).filter(s => s.length > 3).length;
}

/**
 * Analyze a single suite
 */
async function analyzeSuite(suite) {
  const analysis = {
    name: suite.name,
    suiteName: suite.suiteName,
    caseCount: suite.cases.length,
    actionCounts: { learn: 0, query: 0, prove: 0 },
    syntaxErrors: [],
    formatErrors: [],  // expected_nl format issues
    nlRoundtripErrors: [],
    nlRoundtripSkipped: [],
    reviewIssues: [],
    trivialCases: [],
    complexityMetrics: [],
    expectedNls: [],
    cases: suite.cases
  };

  let allLearnedFacts = [];
  const transformer = new NLTransformer({ strict: true, dslPreserveOperators: true });

  for (let i = 0; i < suite.cases.length; i++) {
    const testCase = suite.cases[i];
    const caseNum = i + 1;
    const caseInfo = `Case ${caseNum}: ${testCase.input_nl?.substring(0, 40) || 'No description'}`;

    // Count actions
    if (testCase.action) {
      analysis.actionCounts[testCase.action] = (analysis.actionCounts[testCase.action] || 0) + 1;
    }

    // Validate DSL syntax
    for (const issue of validateDSLSyntax(testCase.input_dsl)) {
      if (issue.type === 'error') {
        analysis.syntaxErrors.push({ case: caseNum, caseInfo, ...issue });
      }
    }

    // Validate expected_nl/proof_nl format
    for (const issue of validateExpectedNl(testCase)) {
      analysis.formatErrors.push({ case: caseNum, caseInfo, ...issue });
    }

    // Validate learn actions
    for (const issue of validateLearnAction(testCase)) {
      analysis.formatErrors.push({ case: caseNum, caseInfo, ...issue });
    }

    // Validate generated NL roundtrip (NLTransformer ↔ canonical DSL)
    if (['learn', 'query', 'prove'].includes(testCase.action) && (testCase.input_dsl || testCase.query_dsl)) {
      const canonicalDsl = String(testCase.query_dsl || testCase.input_dsl || '').trim();

      // Current NLTransformer does not support NL→DSL for solve blocks (planning/CSP); skip as "unsupported"
      // but keep it visible to the user as a separate counter.
      if (testCase.action === 'learn' && /\bsolve\b/i.test(canonicalDsl)) {
        analysis.nlRoundtripSkipped.push({
          case: caseNum,
          caseInfo,
          type: 'skip',
          msg: 'Skipped NL roundtrip for solve blocks (not supported by NLTransformer yet)'
        });
        continue;
      }

      const generatedNl = testCase.input_nl;
      if (!generatedNl || typeof generatedNl !== 'string' || generatedNl.trim().length === 0) {
        analysis.nlRoundtripErrors.push({
          case: caseNum,
          caseInfo,
          type: 'error',
          msg: 'Missing input_nl (generated from DSL)'
        });
      } else {
        const tr = transformer.transform(generatedNl);
        if (!tr.success) {
          const msg = (tr.errors || []).map(e => `${e.sentence}: ${e.error}`).slice(0, 2).join(' | ') || 'NL→DSL parse failed';
          analysis.nlRoundtripErrors.push({ case: caseNum, caseInfo, type: 'error', msg: `Generated NL does not parse: ${msg}` });
        } else {
          const generated = normalizeDslToStatements(tr.dsl, { onlyPersistent: testCase.action === 'learn' });
          const expected = normalizeDslToStatements(canonicalDsl, { onlyPersistent: testCase.action === 'learn' });

          if (testCase.action === 'learn') {
            const a = new Set(expected);
            const b = new Set(generated);
            const missing = [...a].filter(x => !b.has(x));
            const extra = [...b].filter(x => !a.has(x));
            if (missing.length > 0 || extra.length > 0) {
              analysis.nlRoundtripErrors.push({
                case: caseNum,
                caseInfo,
                type: 'error',
                msg: `Generated NL roundtrip mismatch (learn): missing=${missing.length}, extra=${extra.length}`
              });
            }
          } else {
            const exp = expected[expected.length - 1] || '';
            const got = generated[generated.length - 1] || '';
            if (!exp || !got || exp !== got) {
              analysis.nlRoundtripErrors.push({
                case: caseNum,
                caseInfo,
                type: 'error',
                msg: `Generated NL roundtrip mismatch: expected "${exp}", got "${got}"`
              });
            }
          }
        }
      }
    }

    // Collect learned facts
    if (testCase.action === 'learn') {
      allLearnedFacts = allLearnedFacts.concat(extractLearnedFacts(testCase.input_dsl));
    }

    // Analyze complexity
    const complexity = analyzeProofComplexity(testCase, allLearnedFacts);
    complexity.caseNum = caseNum;
    analysis.complexityMetrics.push(complexity);
    analysis.expectedNls.push({ expected_nl: testCase.expected_nl || '', proof_nl: testCase.proof_nl });

    if (complexity.isTrivialLookup) {
      analysis.trivialCases.push({ case: caseNum, caseInfo });
    }
  }

  return analysis;
}

/**
 * Print suite analysis report
 */
function printSuiteReport(analysis, verbose) {
  console.log();
  console.log(`${C.bold}${C.blue}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bold}Suite: ${analysis.name} (${analysis.suiteName})${C.reset}`);
  console.log(`${C.blue}${'═'.repeat(70)}${C.reset}`);

  console.log();
  console.log(`${C.cyan}Summary:${C.reset}`);
  console.log(`  Cases: ${analysis.caseCount} (L:${analysis.actionCounts.learn} Q:${analysis.actionCounts.query} P:${analysis.actionCounts.prove})`);

  const errColor = analysis.syntaxErrors.length > 0 ? C.red : C.green;
  console.log(`  Syntax Errors: ${errColor}${analysis.syntaxErrors.length}${C.reset}`);

  const fmtColor = analysis.formatErrors.length > 0 ? C.red : C.green;
  console.log(`  Format Errors: ${fmtColor}${analysis.formatErrors.length}${C.reset}`);

  const nlColor = analysis.nlRoundtripErrors.length > 0 ? C.red : C.green;
  console.log(`  NL Roundtrip Errors: ${nlColor}${analysis.nlRoundtripErrors.length}${C.reset}`);
  if (analysis.nlRoundtripSkipped.length > 0) {
    console.log(`  NL Roundtrip Skipped: ${C.yellow}${analysis.nlRoundtripSkipped.length}${C.reset}`);
  }
  if (opts.review) {
    const reviewColor = analysis.reviewIssues.length > 0 ? C.red : C.green;
    console.log(`  Review Issues: ${reviewColor}${analysis.reviewIssues.length}${C.reset}`);
  }

  // Print syntax errors
  if (analysis.syntaxErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Syntax Errors:${C.reset}`);
    for (const err of analysis.syntaxErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
    }
  }

  // Print format errors (expected_nl/proof_nl, Proof: occurrences, etc.)
  if (analysis.formatErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Format Errors (expected_nl/proof_nl):${C.reset}`);
    for (const err of analysis.formatErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
      if (verbose) console.log(`    ${C.dim}${err.caseInfo}${C.reset}`);
    }
  }

  if (analysis.nlRoundtripErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Supported NL Roundtrip Errors:${C.reset}`);
    for (const err of analysis.nlRoundtripErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
      if (verbose) console.log(`    ${C.dim}${err.caseInfo}${C.reset}`);
    }
  }

  // Print trivial cases
  if (verbose && analysis.trivialCases.length > 0) {
    console.log();
    console.log(`${C.yellow}⚠ Trivial Cases:${C.reset}`);
    for (const tc of analysis.trivialCases) {
      console.log(`  Case ${tc.case}: ${C.dim}${tc.caseInfo}${C.reset}`);
    }
  }
}

/**
 * Print global summary with correctness table
 */
function printGlobalSummary(allAnalyses) {
  console.log();
  console.log(`${C.bold}${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}GLOBAL HEALTH CHECK SUMMARY${C.reset}`);
  console.log(`${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log();

  // Correctness Table
  console.log(`${C.bold}${C.cyan}Correctness by Suite:${C.reset}`);
  console.log();

  const maxSuiteLen = Math.max(12, ...allAnalyses.map(a => a.suiteName.length));
  const header = opts.review
    ? `${'Suite'.padEnd(maxSuiteLen)}  Cases  SynErr  FmtErr  NLErr  RevErr  Health`
    : `${'Suite'.padEnd(maxSuiteLen)}  Cases  SynErr  FmtErr  NLErr  Health`;
  console.log(`${C.bold}${header}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(header.length + 5)}${C.reset}`);

  let totalCases = 0, totalSynErr = 0, totalFmtErr = 0, totalNlErr = 0, totalRevErr = 0;

  for (const analysis of allAnalyses) {
    const cases = analysis.caseCount;
    const synErr = analysis.syntaxErrors.length;
    const fmtErr = analysis.formatErrors.length;
    const nlErr = analysis.nlRoundtripErrors.length;
    const revErr = opts.review ? analysis.reviewIssues.length : 0;
    const errTotal = synErr + fmtErr + nlErr + revErr;
    const healthPct = cases > 0 ? Math.round(((cases - errTotal) / cases) * 100) : 100;
    const healthColor = getPctColor(healthPct);

    totalCases += cases;
    totalSynErr += synErr;
    totalFmtErr += fmtErr;
    totalNlErr += nlErr;
    totalRevErr += revErr;

    const synColor = synErr > 0 ? C.red : C.green;
    const fmtColor = fmtErr > 0 ? C.red : C.green;
    const nlColor = nlErr > 0 ? C.red : C.green;
    const revColor = revErr > 0 ? C.red : C.green;

    const base =
      `${analysis.suiteName.padEnd(maxSuiteLen)}  ` +
      `${String(cases).padStart(5)}  ` +
      `${synColor}${String(synErr).padStart(6)}${C.reset}  ` +
      `${fmtColor}${String(fmtErr).padStart(6)}${C.reset}  ` +
      `${nlColor}${String(nlErr).padStart(5)}${C.reset}  `;
    const mid = opts.review ? `${revColor}${String(revErr).padStart(6)}${C.reset}  ` : '';
    console.log(`${base}${mid}${healthColor}${String(healthPct).padStart(5)}%${C.reset}`);
  }

  console.log(`${C.dim}${'─'.repeat(header.length + 5)}${C.reset}`);

  const totalErrTotal = totalSynErr + totalFmtErr + totalNlErr + totalRevErr;
  const totalHealthPct = totalCases > 0 ? Math.round(((totalCases - totalErrTotal) / totalCases) * 100) : 100;
  const totalHealthColor = getPctColor(totalHealthPct);
  const totalSynColor = totalSynErr > 0 ? C.red : C.green;
  const totalFmtColor = totalFmtErr > 0 ? C.red : C.green;
  const totalNlColor = totalNlErr > 0 ? C.red : C.green;
  const totalRevColor = totalRevErr > 0 ? C.red : C.green;

  const totalBase =
    `${C.bold}` +
    `${'TOTAL'.padEnd(maxSuiteLen)}  ` +
    `${String(totalCases).padStart(5)}  ` +
    `${totalSynColor}${String(totalSynErr).padStart(6)}${C.reset}  ` +
    `${totalFmtColor}${String(totalFmtErr).padStart(6)}${C.reset}  ` +
    `${totalNlColor}${String(totalNlErr).padStart(5)}${C.reset}  `;
  const totalMid = opts.review ? `${totalRevColor}${String(totalRevErr).padStart(6)}${C.reset}  ` : '';
  console.log(`${totalBase}${totalMid}${totalHealthColor}${String(totalHealthPct).padStart(5)}%${C.reset}`);

  // Complexity Table
  console.log();
  console.log(`${C.bold}${C.cyan}Proof Complexity Distribution:${C.reset}`);
  console.log();

  let proveShallow = 0, proveNormal = 0, proveDeep = 0, totalProve = 0;

  for (const analysis of allAnalyses) {
    for (let i = 0; i < analysis.complexityMetrics.length; i++) {
      const m = analysis.complexityMetrics[i];
      if (m.action === 'prove') {
        totalProve++;
        const steps = countStepsFromExpected(analysis.expectedNls[i]);
        if (steps < 5) proveShallow++;
        else if (steps <= 10) proveNormal++;
        else proveDeep++;
      }
    }
  }

  const pctShallow = totalProve > 0 ? Math.round((proveShallow / totalProve) * 100) : 0;
  const pctNormal = totalProve > 0 ? Math.round((proveNormal / totalProve) * 100) : 0;
  const pctDeep = totalProve > 0 ? Math.round((proveDeep / totalProve) * 100) : 0;

  console.log(`  Shallow (<5 steps):  ${getPctColor(100 - pctShallow)}${proveShallow}${C.reset} (${pctShallow}%)`);
  console.log(`  Normal (5-10 steps): ${C.green}${proveNormal}${C.reset} (${pctNormal}%)`);
  console.log(`  Deep (>10 steps):    ${C.cyan}${proveDeep}${C.reset} (${pctDeep}%)`);

  // Overall health score
  console.log();
  const healthScore = totalHealthPct;
  const healthColor = getPctColor(healthScore);
  console.log(`${C.bold}Overall Health: ${healthColor}${healthScore}%${C.reset}`);

  if (totalSynErr > 0 || totalFmtErr > 0 || totalNlErr > 0 || (opts.review && totalRevErr > 0)) {
    console.log();
    console.log(`${C.cyan}Recommendations:${C.reset}`);
    if (totalSynErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalSynErr} syntax error(s)`);
    }
    if (totalFmtErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalFmtErr} format error(s) (multiple Proof:, etc.)`);
    }
    if (totalNlErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalNlErr} supported NL roundtrip error(s)`);
    }
    if (opts.review && totalRevErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalRevErr} review issue(s) (execution mismatch / proof clarity / translation divergence)`);
    }

    // Detailed actionable list for agents
    console.log();
    console.log(`${C.bold}${C.yellow}═══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.yellow}ACTIONABLE FIX LIST (for automated fixing)${C.reset}`);
    console.log(`${C.yellow}═══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log();

    let fixIndex = 1;

    for (const analysis of allAnalyses) {
      const hasIssues =
        analysis.syntaxErrors.length > 0 ||
        analysis.formatErrors.length > 0 ||
        analysis.nlRoundtripErrors.length > 0 ||
        (opts.review && analysis.reviewIssues.length > 0);
      if (!hasIssues) continue;

      // Syntax errors
      for (const err of analysis.syntaxErrors) {
        const testCase = analysis.cases[err.case - 1];
        console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${C.red}SYNTAX ERROR${C.reset}`);
        console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
        console.log(`  File:  ${C.dim}evals/fastEval/${analysis.suiteName}/cases.mjs${C.reset}`);
        console.log(`  Case:  ${err.case}`);
        console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
        console.log(`  Error: ${C.red}${err.msg}${C.reset}`);
        console.log(`  Action: Fix the input_dsl syntax in case ${err.case}`);
        console.log();
        fixIndex++;
      }

      // Format errors
      for (const err of analysis.formatErrors) {
        const testCase = analysis.cases[err.case - 1];
        const typeColor = err.type === 'error' ? C.red : err.type === 'warning' ? C.yellow : C.cyan;
        const typeLabel = err.type.toUpperCase();

        console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${typeColor}${typeLabel}${C.reset}`);
        console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
        console.log(`  File:  ${C.dim}evals/fastEval/${analysis.suiteName}/cases.mjs${C.reset}`);
        console.log(`  Case:  ${err.case}`);
        console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
        console.log(`  Issue: ${typeColor}${err.msg}${C.reset}`);

        if (testCase?.expected_nl) {
          const expectedText = Array.isArray(testCase.expected_nl)
            ? testCase.expected_nl.join(' ')
            : String(testCase.expected_nl);
          const truncated = expectedText.length > 120
            ? expectedText.substring(0, 120) + '...'
            : expectedText;
          console.log(`  Current expected_nl: "${C.dim}${truncated}${C.reset}"`);
        }
        if (testCase?.proof_nl !== undefined && testCase?.proof_nl !== null) {
          const proofText = Array.isArray(testCase.proof_nl) ? testCase.proof_nl.join(' ') : String(testCase.proof_nl);
          const truncatedProof = proofText.length > 120 ? proofText.substring(0, 120) + '...' : proofText;
          console.log(`  Current proof_nl:    "${C.dim}${truncatedProof}${C.reset}"`);
        }

        // Provide specific action based on error type
        let action = '';
        if (err.msg.includes('Multiple "Proof:"')) {
          action = 'Consolidate multiple "Proof:" sections into a single proof';
        } else if (err.msg.includes('Missing proof expectation') || err.msg.includes('Missing "Proof:"')) {
          action = 'Add proof expectations via proof_nl (preferred) or a "Proof:" section inside expected_nl';
        } else if (err.msg.includes('Missing expected_nl')) {
          action = 'Add expected_nl with expected response';
        } else if (err.msg.includes('Fact count mismatch')) {
          action = 'Correct the fact count in input_nl or expected_nl to match input_dsl';
        } else if (err.msg.includes('no expected_nl')) {
          action = 'Add expected_nl confirming what facts were learned';
        } else if (err.msg.includes('Repeated answer+proof')) {
          action = 'Consolidate repeated answer+proof patterns into single response';
        } else if (err.msg.includes('Both expected_nl and proof_nl')) {
          action = 'Move proof expectations to proof_nl and keep expected_nl as the main answer only';
        } else if (err.msg.includes('Invalid proof_nl type')) {
          action = 'Set proof_nl to a string or an array of strings';
        } else {
          action = 'Review and fix the issue';
        }
        console.log(`  Action: ${action}`);
        console.log();
        fixIndex++;
      }

      // NL roundtrip errors (generated NL does not parse or mismatches DSL)
      for (const err of analysis.nlRoundtripErrors) {
        const testCase = analysis.cases[err.case - 1];
        console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${C.red}NL ROUNDTRIP${C.reset}`);
        console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
        console.log(`  File:  ${C.dim}evals/fastEval/${analysis.suiteName}/cases.mjs${C.reset}`);
        console.log(`  Case:  ${err.case}`);
        console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
        console.log(`  Issue: ${C.red}${err.msg}${C.reset}`);
        console.log(`  Action: Fix NL→DSL patterns or adjust generated NL rendering so input_nl roundtrips to the canonical DSL`);
        console.log();
        fixIndex++;
      }

      // Review issues (execution mismatch / proof clarity / translation divergence)
      if (opts.review) {
        for (const ri of analysis.reviewIssues) {
          const testCase = analysis.cases[ri.case - 1];
          console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${C.red}REVIEW${C.reset}`);
          console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
          console.log(`  File:  ${C.dim}evals/fastEval/${analysis.suiteName}/cases.mjs${C.reset}`);
          console.log(`  Case:  ${ri.case}`);
          console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
          console.log(`  Issue: ${C.red}${ri.kind}${C.reset} - ${ri.note}`);
          if (ri.actual) console.log(`  Actual: "${C.dim}${shortSnippet(ri.actual, 180)}${C.reset}"`);
          if (ri.expected) console.log(`  Expected: "${C.dim}${shortSnippet(Array.isArray(ri.expected) ? ri.expected.join(' ') : ri.expected, 180)}${C.reset}"`);
          if (ri.genDsl) console.log(`  GenDSL: "${C.dim}${shortSnippet(ri.genDsl, 180)}${C.reset}"`);
          if (ri.canonicalDsl) console.log(`  CanonDSL: "${C.dim}${shortSnippet(ri.canonicalDsl, 180)}${C.reset}"`);

          let action = 'Review and fix the issue';
          if (ri.kind === 'expected_mismatch') action = 'Update expected_nl/proof_nl to match canonical output, or fix reasoning/translator output if expectations are correct';
          else if (ri.kind === 'translation_error') action = 'Fix NLTransformer so input_nl translates to valid DSL for this case';
          else if (ri.kind === 'nl_dsl_mismatch') action = 'Fix input_nl or NLTransformer so NL intent maps to the canonical DSL and reproduces expected output';
          else if (ri.kind === 'proof_clarity') action = 'Improve proof rendering (engine output) to avoid internal traces and produce clear stepwise proofs';
          console.log(`  Action: ${action}`);
          console.log();
          fixIndex++;
        }
      }
    }

    // Summary prompt for agent
    if (fixIndex > 1) {
      console.log(`${C.bold}${C.magenta}─── AGENT PROMPT ───${C.reset}`);
      console.log();
      console.log(`${C.dim}Copy the prompt below to fix all issues:${C.reset}`);
      console.log();
      console.log(`${C.green}Fix the following ${fixIndex - 1} issue(s) in fastEval test cases:${C.reset}`);
      console.log();

      for (const analysis of allAnalyses) {
        for (const err of analysis.formatErrors) {
          const testCase = analysis.cases[err.case - 1];
          console.log(`- ${analysis.suiteName} case ${err.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${err.msg}`);
        }
        for (const err of analysis.syntaxErrors) {
          const testCase = analysis.cases[err.case - 1];
          console.log(`- ${analysis.suiteName} case ${err.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${err.msg}`);
        }
        for (const err of analysis.nlRoundtripErrors) {
          const testCase = analysis.cases[err.case - 1];
          console.log(`- ${analysis.suiteName} case ${err.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${err.msg}`);
        }
        if (opts.review) {
          for (const ri of analysis.reviewIssues) {
            const testCase = analysis.cases[ri.case - 1];
            console.log(`- ${analysis.suiteName} case ${ri.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${ri.kind} - ${ri.note}`);
          }
        }
      }
      console.log();
      console.log(`${C.dim}For format errors with multiple "Proof:" occurrences: consolidate into a single answer with one "Proof:" section.${C.reset}`);
      console.log();
    }
  }

  console.log();
}

function fixHintFromMsg(msg) {
  const s = String(msg || '');
  if (s.includes('Multiple "Proof:"')) return 'Consolidate to a single "Proof:" section.';
  if (s.includes('Missing proof expectation') || s.includes('Missing "Proof:"')) return 'Add a short stepwise proof in `proof_nl`.';
  if (s.includes('Missing expected_nl') || s.includes('no expected_nl')) return 'Add `expected_nl` confirming the learn/query/prove result.';
  if (s.includes('Fact count mismatch')) return 'Update the fact count in `expected_nl` to match `input_dsl`.';
  if (s.includes('proof_nl is present but very short')) return 'Expand `proof_nl` with clear stepwise reasoning.';
  if (s.includes('Repeated answer+proof')) return 'Remove repeated answer+proof; keep a single answer and a single proof.';
  if (s.includes('Both expected_nl and proof_nl')) return 'Keep the answer in `expected_nl`, and keep proof steps only in `proof_nl`.';
  if (s.includes('Invalid proof_nl type')) return 'Set `proof_nl` to a string or array of strings.';
  return 'Fix the case artifacts for consistency.';
}

function severityRank(sev) {
  if (sev === 'error') return 3;
  if (sev === 'warning') return 2;
  return 1;
}

function severityColor(sev) {
  if (sev === 'error') return C.red;
  if (sev === 'warning') return C.yellow;
  return C.cyan;
}

function severityLabel(sev) {
  if (sev === 'error') return 'ERROR';
  if (sev === 'warning') return 'WARN';
  return 'INFO';
}

function collectFindings(allAnalyses) {
  const findings = [];
  for (const analysis of allAnalyses) {
    const file = `evals/fastEval/${analysis.suiteName}/cases.mjs`;

    for (const err of analysis.syntaxErrors) {
      const testCase = analysis.cases[err.case - 1];
      findings.push({
        severity: 'error',
        suiteName: analysis.suiteName,
        suiteTitle: analysis.name,
        file,
        caseIndex: err.case,
        action: testCase?.action || null,
        input_nl: testCase?.input_nl || '',
        kind: 'syntax',
        msg: err.msg,
        fix: 'Fix DSL syntax in `input_dsl`.'
      });
    }

    for (const err of analysis.formatErrors) {
      const testCase = analysis.cases[err.case - 1];
      const sev = err.type === 'error' ? 'error' : err.type === 'warning' ? 'warning' : 'info';
      findings.push({
        severity: sev,
        suiteName: analysis.suiteName,
        suiteTitle: analysis.name,
        file,
        caseIndex: err.case,
        action: testCase?.action || null,
        input_nl: testCase?.input_nl || '',
        kind: 'format',
        msg: err.msg,
        fix: fixHintFromMsg(err.msg)
      });
    }

    for (const err of analysis.nlRoundtripErrors) {
      const testCase = analysis.cases[err.case - 1];
      findings.push({
        severity: 'error',
        suiteName: analysis.suiteName,
        suiteTitle: analysis.name,
        file,
        caseIndex: err.case,
        action: testCase?.action || null,
        input_nl: testCase?.input_nl || '',
        kind: 'nl_roundtrip',
        msg: err.msg,
        fix: 'Make `input_nl` roundtrip stable (DSL2NL / NLTransformer).'
      });
    }

    if (opts.review) {
      for (const ri of analysis.reviewIssues) {
        const testCase = analysis.cases[ri.case - 1];
        findings.push({
          severity: ri.severity === 'high' ? 'error' : 'warning',
          suiteName: analysis.suiteName,
          suiteTitle: analysis.name,
          file,
          caseIndex: ri.case,
          action: testCase?.action || null,
          input_nl: testCase?.input_nl || '',
          kind: `review_${ri.kind || 'issue'}`,
          msg: ri.note,
          fix: 'Make `input_nl` / canonical DSL / expected_nl / proof_nl consistent.',
          details: ri
        });
      }
    }
  }
  return findings;
}

function groupFindings(findings) {
  const groups = new Map();
  for (const f of findings) {
    const key = `${f.suiteName}#${f.caseIndex}`;
    const g = groups.get(key) || {
      suiteName: f.suiteName,
      suiteTitle: f.suiteTitle,
      file: f.file,
      caseIndex: f.caseIndex,
      action: f.action,
      input_nl: f.input_nl,
      maxSeverity: 'info',
      items: [],
      fixes: new Set()
    };
    if (severityRank(f.severity) > severityRank(g.maxSeverity)) g.maxSeverity = f.severity;
    g.items.push({ kind: f.kind, msg: f.msg, severity: f.severity });
    g.fixes.add(f.fix);
    if (!g.input_nl && f.input_nl) g.input_nl = f.input_nl;
    groups.set(key, g);
  }
  return Array.from(groups.values()).sort((a, b) => {
    const s = severityRank(b.maxSeverity) - severityRank(a.maxSeverity);
    if (s !== 0) return s;
    const bySuite = a.suiteName.localeCompare(b.suiteName);
    if (bySuite !== 0) return bySuite;
    return a.caseIndex - b.caseIndex;
  });
}

function printFindingsOnly(groups, { llmByKey = new Map() } = {}) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const g of groups) counts[g.maxSeverity] = (counts[g.maxSeverity] || 0) + 1;

  const total = groups.length;
  console.log(`Findings: ${total} (errors: ${counts.error}, warnings: ${counts.warning}, info: ${counts.info})`);
  if (total === 0) return;
  console.log();

  let n = 1;
  for (const g of groups) {
    const key = `${g.suiteName}#${g.caseIndex}`;
    const llm = llmByKey.get(key) || null;
    const sev = `${severityColor(g.maxSeverity)}${severityLabel(g.maxSeverity)}${C.reset}`;
    const where = `${C.cyan}${g.suiteName}${C.reset}#${g.caseIndex} ${C.dim}${g.file}${C.reset}`;
    const input = g.input_nl ? ` — "${shortSnippet(g.input_nl, 90)}"` : '';

    console.log(`[${String(n).padStart(2)}] ${sev} ${where}${input}`);
    for (const it of g.items) {
      console.log(`     - ${it.kind}: ${stripAnsi(it.msg)}`);
    }
    const fixText = Array.from(g.fixes.values()).join(' ');
    if (fixText) console.log(`     Fix: ${fixText}`);
    if (llm?.summary) console.log(`     LLM: ${stripAnsi(llm.summary)}`);
    if (llm?.suggestions && typeof llm.suggestions === 'object') {
      const keys = Object.keys(llm.suggestions).filter(k => llm.suggestions[k]);
      if (keys.length > 0) console.log(`     LLM suggests: ${keys.join(', ')}`);
    }
    console.log();
    n++;
  }
}

function buildLlmRequestsFromGroups(groups, allAnalyses) {
  const analysisBySuite = new Map(allAnalyses.map(a => [a.suiteName, a]));
  const reqs = [];
  for (const g of groups) {
    const analysis = analysisBySuite.get(g.suiteName);
    const step = analysis?.cases?.[g.caseIndex - 1] || null;
    if (!step) continue;

    const canonicalDsl = String(step.query_dsl || step.input_dsl || '').trim() || null;
    const reviewActual = analysis?.reviewIssues?.find(x => x.case === g.caseIndex && x.actual)?.actual || null;

    reqs.push({
      suiteName: g.suiteName,
      suiteTitle: g.suiteTitle,
      caseIndex: g.caseIndex,
      payload: {
        suite: g.suiteName,
        suiteTitle: g.suiteTitle,
        caseIndex: g.caseIndex,
        action: step.action || null,
        input_nl: step.input_nl || null,
        canonical_dsl: canonicalDsl,
        canonical_output: reviewActual,
        expected_nl: step.expected_nl || null,
        proof_nl: step.proof_nl || null,
        issues: g.items.map(x => ({ kind: x.kind, note: x.msg }))
      }
    });
  }
  return reqs;
}

/**
 * Main
 */
async function main() {
  let suiteNames = await discoverSuites();

  if (specificSuites.length > 0) {
    suiteNames = suiteNames.filter(s => specificSuites.some(spec => s.includes(spec)));
  }

  if (suiteNames.length === 0) {
    console.log(`${C.red}No suites found.${C.reset}`);
    process.exit(1);
  }

  if (!opts.llm.enabled && !opts.llm.disabled && !process.env.CI && stdin.isTTY && stdout.isTTY) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const ans = String(await rl.question('Enable LLM checks? (y/N) ')).trim().toLowerCase();
      const yes = ans === 'y' || ans === 'yes';
      if (yes) {
        opts.llm.enabled = true;
        opts.llm.apiKey = process.env.OPENAI_API_KEY || null;
        if (!opts.llm.apiKey) {
          console.log(`${C.yellow}OPENAI_API_KEY is missing; continuing without LLM checks.${C.reset}`);
          opts.llm.enabled = false;
        }
      }
    } finally {
      rl.close();
    }
  }

  if (opts.llm.enabled) {
    if (!opts.llm.apiKey) {
      console.log(`${C.yellow}LLM checks requested but OPENAI_API_KEY is missing; continuing without LLM checks.${C.reset}`);
      opts.llm.enabled = false;
    } else {
      console.log(`Using LLM checks: ${opts.llm.model}`);
    }
  }

  const allAnalyses = [];

  for (const suiteName of suiteNames) {
    try {
      const suite = await loadSuite(suiteName);
      const analysis = await analyzeSuite(suite);

      if (opts.review) {
        const session = buildSession(suite, { exactUnbindMode: 'B', reasoningPriority: REASONING_PRIORITY.HOLOGRAPHIC });
        const reviewTransformer = new NLTransformer({ dslPreserveOperators: true });

        let reviewed = 0;
        for (let i = 0; i < (suite.cases || []).length; i++) {
          const step = suite.cases[i];
          if (!step || typeof step !== 'object') continue;

          // Progress canonical state (always).
          const canonicalDsl = String(step.query_dsl || step.input_dsl || '').trim();
          let canonicalResult = null;
          let canonicalText = null;
          try {
            canonicalResult = executeAction(session, step);
            canonicalText = canonicalResult ? describeAction(session, step.action, canonicalResult, canonicalDsl) : null;
          } catch (e) {
            canonicalText = `ERROR: ${e?.message || String(e)}`;
          }

          // Review filters (only for selected actions; still progress state above).
          if (!opts.actions.has(step.action)) continue;
          if (!step.input_nl || !String(step.input_nl).trim()) continue;
          if (!canonicalDsl) continue;

          reviewed++;
          if (opts.maxCases && reviewed > opts.maxCases) break;

          // Translation generation
          const normalizedNl = normalizeEvalNl(String(step.input_nl).trim());
          const direct = step.action === 'query' ? directQueryDslFromNl(normalizedNl) : null;
          const gen = direct ? { success: true, dsl: direct, parsed: [], errors: [] } : reviewTransformer.transform(normalizedNl);
          const genOk = !!gen?.success && String(gen?.dsl || '').trim().length > 0;
          const genDslRaw = genOk ? String(gen.dsl).trim() : '';
          const genDsl = genOk ? adaptGeneratedDslForAction(step.action, genDslRaw) : '';
          const sameDsl = genOk && normalizeDslForComparison(genDsl) === normalizeDslForComparison(canonicalDsl);
          if (!genOk) {
            analysis.reviewIssues.push({
              case: i + 1,
              kind: 'translation_error',
              severity: 'high',
              note: gen?.errors?.map(e => e.error).join('; ') || 'Transformer produced no DSL'
            });
          } else if (!sameDsl) {
            // Execute generated DSL in an isolated transaction to see if it still matches expected output.
            const snap = beginTransaction(session);
            let genText = null;
            let genMatches = null;
            try {
              const rr = (() => {
                const patched = { ...step };
                if (step.action === 'prove') patched.input_dsl = genDsl;
                else if (step.action === 'query') patched.query_dsl = genDsl;
                else patched.input_dsl = genDsl;
                return executeAction(session, patched);
              })();
              genText = rr ? describeAction(session, step.action, rr, genDsl) : null;
              genMatches = genText ? outputMatches(step, genText) : false;
            } catch (e) {
              genText = `ERROR: ${e?.message || String(e)}`;
              genMatches = false;
            } finally {
              rollbackTransaction(session, snap);
            }
            if (!genMatches) {
              analysis.reviewIssues.push({
                case: i + 1,
                kind: 'nl_dsl_mismatch',
                severity: 'high',
                note: 'Generated DSL differs from canonical DSL and does not reproduce expected output.',
                genDsl,
                canonicalDsl,
                actual: genText
              });
            }
          }

          // Expected output mismatch (canonical)
          if (canonicalText && !outputMatches(step, canonicalText)) {
            analysis.reviewIssues.push({
              case: i + 1,
              kind: 'expected_mismatch',
              severity: 'high',
              note: 'Canonical DSL output does not match expected_nl/proof_nl.',
              actual: canonicalText,
              expected: step.expected_nl
            });
          }

          // Proof clarity (canonical output)
          if (typeof canonicalText === 'string' && (step.action === 'prove' || step.action === 'query')) {
            const lint = lintProofClarity(canonicalText);
            if (lint.length > 0) {
              analysis.reviewIssues.push({
                case: i + 1,
                kind: 'proof_clarity',
                severity: lint.includes('missing_proof_prefix') ? 'high' : 'medium',
                note: `Proof clarity issues: ${lint.join(', ')}`,
                actual: canonicalText
              });
            }
          }

          // LLM critique requests are gathered after suite analysis (so we can include
          // syntax/format/NL-roundtrip issues too, not only review issues).
        }

        session.close();
      }

      allAnalyses.push(analysis);
      if (verbose) printSuiteReport(analysis, verbose);
    } catch (err) {
      console.log(`${C.red}Error loading suite ${suiteName}: ${stripAnsi(err.message)}${C.reset}`);
    }
  }

  const findings = collectFindings(allAnalyses);
  const groups = groupFindings(findings);

  let llmByKey = new Map();
  if (opts.llm.enabled && opts.llm.apiKey && groups.length > 0) {
    const llmRequests = buildLlmRequestsFromGroups(groups, allAnalyses);
    const system = [
      'You are reviewing a reasoning evaluation suite case.',
      'You will be given: NL intent, canonical DSL (may be null), canonical engine output (may be null), expected_nl/proof_nl, and a list of detected issues.',
      'Return a single JSON object with these keys:',
      '- verdict: one of ["ok","needs_fix"]',
      '- categories: array of strings from ["translation","expected","proof","format","syntax"]',
      '- summary: 1-2 sentences',
      '- suggestions: object with optional keys input_nl, expected_nl, proof_nl, canonical_dsl',
      'Rules:',
      '- Only suggest changes that improve clarity and consistency.',
      '- Keep suggestions minimal and actionable.',
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

    llmByKey = new Map();
    for (const c of critiques) {
      const k = `${c.suiteName}#${c.caseIndex}`;
      const j = c.critiqueJson || null;
      if (!j) continue;
      llmByKey.set(k, { summary: j.summary || null, suggestions: j.suggestions || null });
    }

    if (opts.outPath) {
      const p = path.isAbsolute(opts.outPath) ? opts.outPath : path.join(PROJECT_ROOT, opts.outPath);
      const out = [];
      out.push(`# FastEval HealthCheck\n\n`);
      out.push(`Generated at: ${new Date().toISOString()}\n\n`);
      out.push(`Suites scanned: ${suiteNames.length}\n\n`);
      out.push(`Review: ${opts.review ? 'enabled' : 'disabled'}\n\n`);
      out.push(`LLM: ${opts.llm.model}\n\n`);
      out.push(`## Findings\n\n`);
      for (const g of groups) {
        const key = `${g.suiteName}#${g.caseIndex}`;
        const llm = llmByKey.get(key) || null;
        out.push(`- ${g.suiteName}#${g.caseIndex} (${g.file})\n`);
        for (const it of g.items) out.push(`  - ${it.kind}: ${it.msg}\n`);
        out.push(`  - Fix: ${Array.from(g.fixes.values()).join(' ')}\n`);
        if (llm?.summary) out.push(`  - LLM: ${llm.summary}\n`);
      }
      fs.writeFileSync(p, out.join(''), 'utf8');
    }
  } else if (opts.outPath) {
    const p = path.isAbsolute(opts.outPath) ? opts.outPath : path.join(PROJECT_ROOT, opts.outPath);
    const out = [];
    out.push(`# FastEval HealthCheck\n\n`);
    out.push(`Generated at: ${new Date().toISOString()}\n\n`);
    out.push(`Suites scanned: ${suiteNames.length}\n\n`);
    out.push(`Review: ${opts.review ? 'enabled' : 'disabled'}\n\n`);
    out.push(`## Findings\n\n`);
    if (groups.length === 0) out.push(`- None\n`);
    else {
      for (const g of groups) {
        out.push(`- ${g.suiteName}#${g.caseIndex} (${g.file})\n`);
        for (const it of g.items) out.push(`  - ${it.kind}: ${it.msg}\n`);
        out.push(`  - Fix: ${Array.from(g.fixes.values()).join(' ')}\n`);
      }
    }
    fs.writeFileSync(p, out.join(''), 'utf8');
  }

  printFindingsOnly(groups, { llmByKey });
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  if (verbose) console.error(err.stack);
  process.exit(1);
});
