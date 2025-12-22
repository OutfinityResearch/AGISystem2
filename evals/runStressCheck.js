import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { Session } from '../src/runtime/session.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');
const STRESS_ROOT = join(ROOT, 'evals', 'stress');

const CONFIG_ORDER = [
  'Core',
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

const BOOTSTRAP_OPERATORS = [
  // L0 HDC Primitives
  '___NewVector',
  '___Bind',
  '___Bundle',
  '___BundlePositioned',
  '___GetType',
  '___Similarity',
  '___MostSimilar',
  '___Extend',
  // L1 Type Markers
  '__Entity',
  '__Abstract',
  '__Event',
  '__Action',
  '__State',
  '__Property',
  '__Relation',
  '__TransitiveRelation',
  '__SymmetricRelation',
  '__ReflexiveRelation',
  '__InheritableProperty',
  '__Category',
  // L1 Structural Operators
  '__Role',
  '__Pair',
  '__Triple',
  '__Bundle',
  '__Sequence',
  // L1 Special
  'inverseRelation',
  'contradictsSameArgs'
];

const HDC_STRATEGIES = [
  'dense-binary',
  'sparse-polynomial',
  'metric-affine'
];

const REASONING_PRIORITIES = [
  'symbolicPriority',
  'holographicPriority'
];

const ERROR_TYPES = [
  'syntax',
  'dependency',
  'contradiction',
  'load',
  'superficial',
  'unknown'
];

const ERROR_LABELS = {
  syntax: 'syntax',
  dependency: 'missing-deps',
  contradiction: 'contradiction',
  load: 'load',
  superficial: 'superficial',
  unknown: 'other'
};

const ARGV = process.argv.slice(2);
const IS_WORKER = ARGV.includes('--worker');
const REPORT_FILES = ARGV.includes('--report-files');

// Detect superficial Left/Right definitions
function detectSuperficialDefinitions(content) {
  const superficial = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match operator definitions: @name:name graph ...
    const opMatch = line.match(/^@(\w+):(\w+)\s+graph/);
    if (opMatch) {
      const opName = opMatch[1];
      // Check next ~10 lines for Left/Right pattern
      let hasLeftRole = false;
      let hasRightRole = false;

      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].includes('@left __Role Left')) hasLeftRole = true;
        if (lines[j].includes('@right __Role Right')) hasRightRole = true;
        if (lines[j].match(/^end\s*$/)) break;
      }

      if (hasLeftRole && hasRightRole) {
        superficial.push(`Operator '${opName}' at line ${i + 1}: uses superficial Left/Right roles`);
      }
    }
  }

  return superficial;
}
// Workers have piped stdio, but parent displays to TTY - enable colors for workers
const IS_TTY = IS_WORKER || process.stdout.isTTY || process.stderr.isTTY;
let logLine = (...args) => console.log(...args);

// ANSI color codes for TTY output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

function colorize(text, ...codes) {
  if (!IS_TTY) return text;
  return codes.join('') + text + COLORS.reset;
}

function getArgValue(name) {
  const idx = ARGV.indexOf(name);
  if (idx === -1) return null;
  const value = ARGV[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
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

async function loadIndexOrder(dirPath) {
  const indexPath = join(dirPath, 'index.sys2');
  if (!existsSync(indexPath)) return null;
  const content = await readFile(indexPath, 'utf8');
  const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
  const files = [];
  let match;
  while ((match = loadRegex.exec(content)) !== null) {
    const filename = match[1].replace('./', '');
    files.push(filename);
  }
  return files.length > 0 ? files : null;
}

async function listSys2Files(dirPath, { includeIndex = false } = {}) {
  const entries = await readdir(dirPath);
  return entries
    .filter(f => f.endsWith('.sys2') && (includeIndex || f !== 'index.sys2'))
    .sort();
}

function formatRelPath(filePath) {
  return relative(ROOT, filePath) || filePath;
}

function sanitizeMessage(message) {
  if (!message) return '';
  return String(message).replace(/\s+/g, ' ').trim();
}

function splitValidationErrors(message) {
  if (!message) return [];
  const prefix = 'DSL validation failed:';
  if (!message.startsWith(prefix)) return [message];
  const rest = message.slice(prefix.length).trim();
  if (!rest) return [];
  return rest.split(';').map(part => part.trim()).filter(Boolean);
}

function classifyError(error) {
  if (!error) return 'unknown';
  if (error.name === 'ParseError' || error.name === 'LexerError') return 'syntax';
  const msg = String(error.message || error);
  if (msg.startsWith('Parse error') || msg.startsWith('Lexer error')) return 'syntax';
  if (msg.startsWith('DSL validation failed')) return 'dependency';
  if (msg.includes('Contradiction rejected')) return 'contradiction';
  if (msg.startsWith('Load failed')) return 'load';
  return 'unknown';
}

function extractMissingDepToken(message) {
  if (!message) return null;
  const unknownOp = message.match(/Unknown operator '([^']+)'/);
  if (unknownOp) return unknownOp[1];
  const undefRef = message.match(/Undefined reference '\$([^']+)'/);
  if (undefRef) return `$${undefRef[1]}`;
  return null;
}

function ensureReport(fileReports, filePath) {
  if (!fileReports.has(filePath)) {
    const entry = {};
    for (const type of ERROR_TYPES) entry[type] = [];
    fileReports.set(filePath, entry);
  }
  return fileReports.get(filePath);
}

function recordIssue(fileReports, filePath, type, label, message) {
  const entry = ensureReport(fileReports, filePath);
  const safeType = ERROR_TYPES.includes(type) ? type : 'unknown';
  entry[safeType].push({ label, message: sanitizeMessage(message) });
}

function logProgressStart(label, progress, relPath, prevInfo) {
  if (!progress) return;
  const { phase, index, total } = progress;
  const prefix = phase ? `${phase} ` : '';
  let prevText = '';
  if (prevInfo && prevInfo.file) {
    const statusColor = prevInfo.issues > 0 ? COLORS.red : COLORS.green;
    const status = prevInfo.issues > 0 ? `ISSUES ${prevInfo.issues}` : 'OK';
    prevText = ` ${COLORS.dim}|${COLORS.reset} prev: ${COLORS.dim}${prevInfo.file}${COLORS.reset} ${statusColor}${status}${COLORS.reset} ${COLORS.cyan}${formatDuration(prevInfo.durationMs)}${COLORS.reset}`;
  }
  const labelColored = `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset}`;
  const progressColored = `${COLORS.magenta}${prefix}${index}/${total}${COLORS.reset}`;
  const fileColored = `${COLORS.yellow}${COLORS.bold}→ ${relPath}${COLORS.reset}`;
  const line = `${labelColored} ${progressColored} ${fileColored}${prevText}`;
  logLine(line);
}

function logProgress(label, progress, relPath, durationMs, localCounts) {
  if (!progress) return;
  const { phase, index, total } = progress;
  const prefix = phase ? `${phase} ` : '';
  const issueTotal = ERROR_TYPES.reduce((sum, type) => sum + (localCounts[type] || 0), 0);
  if (issueTotal === 0) {
    logLine(
      `[${label}] ${prefix}${index}/${total} ${relPath} OK (0 issues) ${formatDuration(durationMs)}`
    );
    return;
  }
  const details = [
    `${ERROR_LABELS.syntax} ${localCounts.syntax || 0}`,
    `${ERROR_LABELS.dependency} ${localCounts.dependency || 0}`,
    `${ERROR_LABELS.contradiction} ${localCounts.contradiction || 0}`,
    `${ERROR_LABELS.load} ${localCounts.load || 0}`,
    `${ERROR_LABELS.unknown} ${localCounts.unknown || 0}`
  ].join(', ');
  logLine(
    `[${label}] ${prefix}${index}/${total} ${relPath} ISSUES ${issueTotal} (${details}) ${formatDuration(durationMs)}`
  );
}

async function checkAndLoad(session, filePath, report, label, fileReports, progress, prevInfo) {
  const relPath = formatRelPath(filePath);

  // Log start of processing
  logProgressStart(label, progress, relPath, prevInfo);

  const localCounts = {
    syntax: 0,
    dependency: 0,
    contradiction: 0,
    load: 0,
    unknown: 0
  };
  const localMissingDeps = new Set();

  const addIssue = (kind, message) => {
    recordIssue(fileReports, filePath, kind, label, message);
    const safeKind = ERROR_TYPES.includes(kind) ? kind : 'unknown';
    if (safeKind === 'dependency') {
      const token = extractMissingDepToken(message);
      if (token) {
        localMissingDeps.add(token);
      } else {
        localMissingDeps.add(message);
      }
    } else {
      localCounts[safeKind] += 1;
    }
    report.errorCounts[safeKind] = (report.errorCounts[safeKind] || 0) + 1;
    if (safeKind === 'dependency') {
      if (!report.uniqueMissingDeps) report.uniqueMissingDeps = new Set();
      for (const dep of localMissingDeps) report.uniqueMissingDeps.add(dep);
    }
  };

  const start = performance.now();
  const content = await readFile(filePath, 'utf8');

  // Detect superficial definitions
  const superficialDefs = detectSuperficialDefinitions(content);
  for (const msg of superficialDefs) {
    addIssue('superficial', msg);
  }

  try {
    session.checkDSL(content, { mode: 'learn', allowHoles: true, allowNewOperators: false });
  } catch (error) {
    const duration = performance.now() - start;
    const kind = classifyError(error);
    const message = sanitizeMessage(error.message || String(error));
    const messages = splitValidationErrors(message);
    if (messages.length === 0) {
      addIssue(kind, message);
    } else {
      for (const msg of messages) {
        addIssue(kind, msg);
      }
    }
    report.totalIssueCount += 1;
    report.totalMs += duration;
    localCounts.dependency = localMissingDeps.size;
    const issueTotal = ERROR_TYPES.reduce((sum, type) => sum + (localCounts[type] || 0), 0);
    if (!IS_WORKER) logProgress(label, progress, relPath, duration, localCounts);
    return { file: relPath, durationMs: duration, issues: issueTotal };
  }

  try {
    const result = session.learn(content);
    const duration = performance.now() - start;
    if (!result?.success) {
      const errors = Array.isArray(result.errors) ? result.errors : [];
      if (errors.length === 0) {
        addIssue('unknown', 'Unknown load failure');
      } else {
        for (const err of errors) {
          const msg = sanitizeMessage(err);
          const kind = classifyError({ message: msg });
          addIssue(kind, msg);
        }
      }
      report.totalIssueCount += 1;
      report.totalMs += duration;
      localCounts.dependency = localMissingDeps.size;
      const issueTotal = ERROR_TYPES.reduce((sum, type) => sum + (localCounts[type] || 0), 0);
      if (!IS_WORKER) logProgress(label, progress, relPath, duration, localCounts);
      return { file: relPath, durationMs: duration, issues: issueTotal };
    }
    report.loadedCount += 1;
    report.totalMs += duration;
    localCounts.dependency = localMissingDeps.size;
    if (!IS_WORKER) logProgress(label, progress, relPath, duration, localCounts);
    return { file: relPath, durationMs: duration, issues: 0 };
  } catch (error) {
    const duration = performance.now() - start;
    const msg = sanitizeMessage(error.message || String(error));
    const kind = classifyError({ message: msg });
    addIssue(kind, msg);
    report.totalIssueCount += 1;
    report.totalMs += duration;
    localCounts.dependency = localMissingDeps.size;
    const issueTotal = ERROR_TYPES.reduce((sum, type) => sum + (localCounts[type] || 0), 0);
    if (!IS_WORKER) logProgress(label, progress, relPath, duration, localCounts);
    return { file: relPath, durationMs: duration, issues: issueTotal };
  }
}

async function buildConfigPlan() {
  const plan = [];
  for (const dirName of CONFIG_ORDER) {
    const dirPath = join(CONFIG_ROOT, dirName);
    if (!existsSync(dirPath)) continue;
    let files = null;
    if (dirName !== 'Core') {
      files = await loadIndexOrder(dirPath);
    }
    if (!files) {
      files = await listSys2Files(dirPath);
    }
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
    if (existsSync(filePath)) {
      plan.push(filePath);
    }
  }
  return plan;
}

function createReport() {
  return {
    loadedCount: 0,
    totalMs: 0,
    totalIssueCount: 0,
    uniqueMissingDeps: new Set(),
    errorCounts: {
      syntax: 0,
      dependency: 0,
      contradiction: 0,
      load: 0,
      unknown: 0
    }
  };
}

async function runCombination(strategyId, reasoningPriority, basePlan, stressPlan, fileReports) {
  const label = `${strategyId}/${reasoningPriority}`;

  const session = new Session({
    hdcStrategy: strategyId,
    reasoningPriority,
    reasoningProfile: 'theoryDriven',
    rejectContradictions: true
  });

  for (const op of BOOTSTRAP_OPERATORS) {
    session.declaredOperators.add(op);
  }

  const baseReport = createReport();
  const stressReport = createReport();
  const start = performance.now();
  const baseTotal = basePlan.length;
  let prevInfo = null;
  for (let i = 0; i < basePlan.length; i++) {
    const filePath = basePlan[i];
    prevInfo = await checkAndLoad(session, filePath, baseReport, label, fileReports, {
      phase: 'base',
      index: i + 1,
      total: baseTotal
    }, prevInfo);
  }
  const stressTotal = stressPlan.length;
  for (let i = 0; i < stressPlan.length; i++) {
    const filePath = stressPlan[i];
    prevInfo = await checkAndLoad(session, filePath, stressReport, label, fileReports, {
      phase: 'stress',
      index: i + 1,
      total: stressTotal
    }, prevInfo);
  }
  const totalMs = performance.now() - start;
  return { label, baseReport, stressReport, totalMs };
}

function buildCombos() {
  const comboArg = getArgValue('--combo');
  if (comboArg) {
    const [strategyId, reasoningPriority] = comboArg.split('/');
    if (strategyId && reasoningPriority) {
      return [{ strategyId, reasoningPriority }];
    }
  }

  const fullRun = ARGV.includes('--full');
  const strategies = parseList(getArgValue('--strategy') || getArgValue('--strategies'));
  const priorities = parseList(getArgValue('--priority') || getArgValue('--priorities'));

  if (!strategies && !priorities && !fullRun) {
    return [{ strategyId: 'dense-binary', reasoningPriority: 'holographicPriority' }];
  }

  const strategyList = strategies || (fullRun ? HDC_STRATEGIES : ['dense-binary']);
  const priorityList = priorities || (fullRun ? REASONING_PRIORITIES : ['holographicPriority']);

  const combos = [];
  for (const strategyId of strategyList) {
    for (const reasoningPriority of priorityList) {
      combos.push({ strategyId, reasoningPriority });
    }
  }
  return combos;
}

function mergeFileReports(target, source) {
  if (!source) return;
  for (const [filePath, issues] of Object.entries(source)) {
    if (!target.has(filePath)) {
      const entry = {};
      for (const type of ERROR_TYPES) entry[type] = [];
      target.set(filePath, entry);
    }
    const existing = target.get(filePath);
    for (const type of ERROR_TYPES) {
      if (Array.isArray(issues[type]) && issues[type].length > 0) {
        existing[type].push(...issues[type]);
      }
    }
  }
}

function formatSummaryTable(rows, headers) {
  const widths = headers.map(h => h.length);
  for (const row of rows) {
    row.forEach((cell, idx) => {
      if (cell.length > widths[idx]) widths[idx] = cell.length;
    });
  }
  const pad = (text, width) => text.padEnd(width);
  const lines = [];
  lines.push(headers.map((h, i) => pad(h, widths[i])).join(' | '));
  lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('-|-'));
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join(' | '));
  }
  return lines.join('\n');
}

async function runWorker() {
  logLine = (...args) => console.error(...args);
  const combos = buildCombos();
  if (combos.length !== 1) {
    console.error('Worker expects a single combo');
    process.exitCode = 1;
    return;
  }
  const { strategyId, reasoningPriority } = combos[0];
  const basePlan = await buildConfigPlan();
  const stressPlan = await buildStressPlan();
  const fileReports = new Map();
  const result = await runCombination(strategyId, reasoningPriority, basePlan, stressPlan, fileReports);
  const fileReportObj = REPORT_FILES ? Object.fromEntries([...fileReports.entries()]) : null;
  const serializeReport = (report) => ({
    loadedCount: report.loadedCount,
    totalMs: report.totalMs,
    totalIssueCount: report.totalIssueCount,
    errorCounts: report.errorCounts,
    uniqueMissingDepsCount: report.uniqueMissingDeps ? report.uniqueMissingDeps.size : 0
  });
  const payload = {
    label: result.label,
    totalMs: result.totalMs,
    baseReport: serializeReport(result.baseReport),
    stressReport: serializeReport(result.stressReport),
    fileReports: fileReportObj,
    baseTotal: basePlan.length,
    stressTotal: stressPlan.length
  };
  process.stdout.write(JSON.stringify(payload));
}

async function runParallel(combos) {
  const scriptPath = fileURLToPath(import.meta.url);
  const numWorkers = combos.length;
  const useInPlace = IS_TTY && numWorkers > 1;

  // Create label to index mapping
  const labelToIdx = new Map();
  for (let i = 0; i < numWorkers; i++) {
    const label = `${combos[i].strategyId}/${combos[i].reasoningPriority}`;
    labelToIdx.set(label, i);
  }

  // Track last line content for each worker to avoid rewriting identical content
  const workerLines = new Array(numWorkers).fill('');

  // Initialize display lines
  if (useInPlace) {
    console.log(`${COLORS.bold}${COLORS.bgBlue} Parallel Execution (${numWorkers} workers) ${COLORS.reset}\n`);
    for (let i = 0; i < numWorkers; i++) {
      const label = `${combos[i].strategyId}/${combos[i].reasoningPriority}`;
      workerLines[i] = `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.dim}starting...${COLORS.reset}`;
      console.log(workerLines[i]);
    }
  }

  function updateLine(workerIdx, text) {
    if (!useInPlace) {
      // Fallback: just print new lines
      console.log(text);
      return;
    }
    // Skip if content is the same
    if (workerLines[workerIdx] === text) return;
    workerLines[workerIdx] = text;

    // Move cursor up, clear line, write, move back down
    const linesUp = numWorkers - workerIdx;
    process.stdout.write(`\x1b[${linesUp}A\x1b[2K${text}\x1b[${linesUp}B\x1b[G`);
  }

  function handleStderr(chunk) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      // Parse label from line: [label] ... (skip ANSI codes at start)
      // ANSI codes look like \x1b[...m
      const match = line.match(/(?:\x1b\[[0-9;]*m)*\[([^\]]+)\]/);
      if (match) {
        const label = match[1];
        const idx = labelToIdx.get(label);
        if (idx !== undefined) {
          updateLine(idx, line);
        }
      }
    }
  }

  const results = [];
  for (let i = 0; i < numWorkers; i++) {
    const combo = combos[i];
    results.push(new Promise((resolve, reject) => {
      const args = [
        scriptPath,
        '--worker',
        '--strategy',
        combo.strategyId,
        '--priority',
        combo.reasoningPriority
      ];
      if (i === 0) args.push('--report-files');
      const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      child.stdout.on('data', chunk => { stdout += chunk.toString(); });
      child.stderr.on('data', handleStderr);
      child.on('error', reject);
      child.on('close', code => {
        if (code !== 0) {
          const label = `${combo.strategyId}/${combo.reasoningPriority}`;
          updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.red}${COLORS.bold}✗ failed${COLORS.reset}`);
          reject(new Error(`Worker failed: ${combo.strategyId}/${combo.reasoningPriority}`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          const label = `${combo.strategyId}/${combo.reasoningPriority}`;
          updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.green}${COLORS.bold}✓ done${COLORS.reset} ${COLORS.dim}(${formatDuration(parsed.totalMs)})${COLORS.reset}`);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    }));
  }
  const allResults = await Promise.all(results);
  // Move to a new line after the parallel display
  if (useInPlace) {
    console.log('');
  }
  return allResults;
}

function formatErrorSection(title, items) {
  if (!items || items.length === 0) return '';
  const lines = [`## ${title}`, ''];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.label}::${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- [${item.label}] ${item.message}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function writeErrorFiles(fileReports, basePlan, stressPlan) {
  const allFiles = [...basePlan, ...stressPlan];
  const created = [];
  const overwritten = [];
  const deleted = [];

  for (const filePath of allFiles) {
    const relPath = formatRelPath(filePath);
    const report = fileReports.get(filePath);
    const errorFilePath = `${filePath}.errors`;

    const sections = [];
    const header = `# Errors for ${relPath}\n`;
    sections.push(header);
    if (report) {
      sections.push(formatErrorSection('Syntax Errors', report.syntax));
      sections.push(formatErrorSection('Missing Dependencies', report.dependency));
      sections.push(formatErrorSection('Contradiction Errors', report.contradiction));
      sections.push(formatErrorSection('Load Errors', report.load));
      sections.push(formatErrorSection('Superficial Definitions', report.superficial));
      sections.push(formatErrorSection('Other Errors', report.unknown));
    }
    const content = sections.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    const hasIssues = report && ERROR_TYPES.some(type => report[type]?.length > 0);

    if (!hasIssues) {
      if (existsSync(errorFilePath)) {
        await unlink(errorFilePath);
        deleted.push(formatRelPath(errorFilePath));
      }
      continue;
    }

    if (existsSync(errorFilePath)) {
      const prev = await readFile(errorFilePath, 'utf8');
      if (prev !== content) {
        await writeFile(errorFilePath, content, 'utf8');
        overwritten.push(formatRelPath(errorFilePath));
      }
    } else {
      await writeFile(errorFilePath, content, 'utf8');
      created.push(formatRelPath(errorFilePath));
    }
  }

  return { created, overwritten, deleted };
}

async function main() {
  if (IS_WORKER) {
    await runWorker();
    return;
  }

  const combos = buildCombos();
  const basePlan = await buildConfigPlan();
  const stressPlan = await buildStressPlan();
  const fileReports = new Map();

  const runResults = await runParallel(combos);
  const summaries = [];

  for (const res of runResults) {
    const contradictionCount =
      res.baseReport.errorCounts.contradiction + res.stressReport.errorCounts.contradiction;
    summaries.push({
      label: res.label,
      totalMs: res.totalMs,
      baseLoaded: res.baseReport.loadedCount,
      baseTotal: res.baseTotal,
      stressIssues: res.stressReport.errorCounts,
      stressMissingDeps: res.stressReport.uniqueMissingDepsCount || 0,
      contradictionCount
    });
    if (res.fileReports && summaries.length === 1) {
      mergeFileReports(fileReports, res.fileReports);
    }
  }

  const fileOps = await writeErrorFiles(fileReports, basePlan, stressPlan);

  const speedRows = summaries.map(entry => ([
    entry.label,
    formatDuration(entry.totalMs)
  ]));
  console.log('\n=== Speed Summary ===');
  console.log(formatSummaryTable(speedRows, ['run', 'duration']));

  const baseRows = summaries.map(entry => ([
    entry.label,
    `${entry.baseLoaded}/${entry.baseTotal}`
  ]));
  console.log('\n=== Base Theory Load Summary ===');
  console.log(formatSummaryTable(baseRows, ['run', 'loaded']));

  const stressRows = summaries.map(entry => ([
    entry.label,
    String(entry.stressIssues.syntax),
    String(entry.stressMissingDeps),
    String(entry.stressIssues.contradiction),
    String(entry.stressIssues.load),
    String(entry.stressIssues.unknown)
  ]));
  console.log('\n=== Stress Theory Issues Summary ===');
  console.log(formatSummaryTable(
    stressRows,
    ['run', ERROR_LABELS.syntax, ERROR_LABELS.dependency, ERROR_LABELS.contradiction, ERROR_LABELS.load, ERROR_LABELS.unknown]
  ));
  console.log('\nNote: missing-deps counts are unique undefined operators/refs.');

  console.log('\n=== .errors Files ===');
  if (fileOps.created.length === 0 &&
      fileOps.overwritten.length === 0 &&
      fileOps.deleted.length === 0) {
    console.log('no changes');
  } else {
    for (const file of fileOps.created) {
      console.log(`created: ${file}`);
    }
    for (const file of fileOps.overwritten) {
      console.log(`updated: ${file}`);
    }
    for (const file of fileOps.deleted) {
      console.log(`deleted: ${file}`);
    }
  }
}

main().catch(err => {
  console.error('Stress check failed:', err?.message || err);
  process.exitCode = 1;
});
