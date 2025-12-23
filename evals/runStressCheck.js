import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync, readFileSync, mkdirSync, unlinkSync } from 'node:fs';
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

// Default geometries (for normal runs)
const GEOMETRY_VARIANTS = {
  'dense-binary': [256, 512],
  'sparse-polynomial': [2, 4],
  'metric-affine': [16, 32]
};

// Extended geometries (for --strategy sweep mode)
const GEOMETRY_SWEEP = {
  'dense-binary': [128, 256, 512, 1024, 2048, 4096],       // bits
  'sparse-polynomial': [1, 2, 3, 4, 5, 6],                  // k exponents
  'metric-affine': [8, 16, 32, 64, 128, 256]                // bytes
};

const STRATEGY_ALIASES = {
  'dense': 'dense-binary',
  'sparse': 'sparse-polynomial',
  'metric': 'metric-affine'
};

const REASONING_PRIORITIES = [
  'symbolicPriority',
  'holographicPriority'
];

const ERROR_TYPES = [
  'syntax',
  'dependency',
  'contradiction',
  'load',
  'declaration',
  'superficial',
  'incomplete',
  'unknown'
];

const ERROR_LABELS = {
  syntax: 'syntax',
  dependency: 'missing-deps',
  contradiction: 'contradiction',
  load: 'load',
  declaration: 'atom-soup',
  superficial: 'superficial',
  incomplete: 'incomplete',
  unknown: 'other'
};

// Atomic (non-graph) declarations policy.
// We allow these only for Core bootstrap primitives; elsewhere, they are considered "atom soup"
// and reported as issues so domains are pushed toward graph-based semantics.
//
// "Fundamental atoms" should stay short and centralized.
const ATOMIC_DECL_POLICY = {
  // Always ignore generated/diagnostic files.
  ignoreSuffixes: [
    '.errors'
  ],

  // Core may use atomic declarations without being flagged as issues.
  allowedPrefixes: [
    'config/Core/'
  ],

  // Domain lexicons are allowed to define value vocabulary (typed atoms) so strict DSL validation
  // can reject unknown tokens without forcing every domain to embed huge token lists in graphs.
  //
  // Important: lexicon files should NOT introduce ad-hoc schema roles for `__Role` — domain theories
  // must still use Core semantic roles from `config/Core/09-roles.sys2`.
  // Any `00-lexicon*.sys2` file under config/ is treated as a value-vocabulary module.
  // (We keep these modular to avoid huge single lexicon files.)
  isLexiconFile: (relPath) => /\/00-lexicon[^/]*\.sys2$/.test(relPath),

  // Explicit list of "fundamental" declaration heads permitted in Core.
  allowedHeads: new Set([
    // Bootstrap / binding primitives
    '___NewVector',
    '___Bind',
    '___Bundle',
    '___BundlePositioned',
    '___GetType',
    '___Similarity',
    '___MostSimilar',
    '___Extend',

    // Core declaration operators
    '__Relation',
    '__TransitiveRelation',
    '__SymmetricRelation',
    '__ReflexiveRelation',
    '__InheritableProperty',

    // Typed constructors used as atomic markers in Core
    '__Entity',
    '__Person',
    '__Object',
    '__Place',
    '__Organization',
    '__Substance',
    '__Property',
    '__State',
    '__Category',
    '__Action',
    '__Event',
    '__TimePoint',
    '__TimePeriod',
    '__Amount'
  ]),

  // Heads permitted in domain lexicons.
  allowedLexiconHeads: new Set([
    '__Category',
    '__Property',
    '__State',
    '__Relation',
    '__TransitiveRelation',
    '__SymmetricRelation',
    '__ReflexiveRelation',
    '__InheritableProperty'
  ])
};

// Shorter config label for display
function configLabel(strategyId, geometry, reasoningPriority) {
  const strategyShort = (strategyId || '')
    .replace('dense-binary', 'dense')
    .replace('sparse-polynomial', 'sparse')
    .replace('metric-affine', 'metric');
  const priorityShort = (reasoningPriority || '')
    .replace('symbolicPriority', 'symb')
    .replace('holographicPriority', 'holo');
  return `${strategyShort}(${geometry})+${priorityShort}`;
}

const ARGV = process.argv.slice(2);
const IS_WORKER = ARGV.includes('--worker');
const REPORT_FILES = ARGV.includes('--report-files');
const SHOW_OK_FILES = ARGV.includes('--show-ok');
const STRESS_STRICT_ATOMS = ARGV.includes('--stress-strict');

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

// Detect "thin" graph definitions that are likely placeholders / overly-minimal semantics.
// Heuristic: graph body uses only __Role + __Bundle + return/end (and maybe __Bind), and binds
// <= 2 roles (typically just Type + Theme/Entity/etc).
function detectThinGraphDefinitions(content) {
  if (!content) return [];
  const warnings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].trim();
    const opMatch = header.match(/^@(\w+):(\w+)\s+graph\b/);
    if (!opMatch) continue;

    const opName = opMatch[1];
    if (opName.startsWith('__')) continue; // skip core structural helpers

    const roles = [];
    let stmtCount = 0;
    let hasBundle = false;

    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      const line = raw.trim();
      if (line === 'end') break;
      if (!line || line.startsWith('#')) continue;
      stmtCount += 1;

      if (line.includes('__Bundle')) hasBundle = true;

      const roleMatch = line.match(/\b__Role\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
      if (roleMatch) roles.push(roleMatch[1]);

      // Stop early if another graph starts (malformed file)
      if (line.match(/^@\w+:\w+\s+graph\b/)) break;
    }

    const roleCount = roles.length;
    const roleSet = new Set(roles);
    const thinRoleSet = ['Type', 'Theme', 'Entity', 'Location', 'Value', 'State', 'Action', 'Property', 'Category', 'Time', 'Agent', 'Patient'];
    const onlyThinRoles = [...roleSet].every(r => thinRoleSet.includes(r));

    if (hasBundle && stmtCount <= 6 && roleCount > 0 && roleCount <= 2 && onlyThinRoles) {
      warnings.push(`Graph '${opName}' at line ${i + 1}: thin definition (roles: ${[...roleSet].join(', ') || 'none'})`);
    }
  }

  return warnings;
}

// Detect incomplete definitions (missing 'end')
function detectIncompleteDefinitions(content) {
  const incomplete = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match operator definitions: @name:name graph ...
    const opMatch = line.match(/^@(\w+):(\w+)\s+graph/);
    if (opMatch) {
      const opName = opMatch[1];
      let hasEnd = false;

      // Check next 50 lines for 'end'
      for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
        if (lines[j].match(/^end\s*$/)) {
          hasEnd = true;
          break;
        }
        // If we hit another operator, this one is incomplete
        if (lines[j].match(/^@\w+:\w+\s+graph/)) {
          break;
        }
      }

      if (!hasEnd) {
        incomplete.push(`Operator '${opName}' at line ${i + 1}: missing 'end'`);
      }
    }
  }

  return incomplete;
}

function shouldIgnoreNonGraphDecl(relPath) {
  if (!relPath) return false;
  if (ATOMIC_DECL_POLICY.ignoreSuffixes.some(s => relPath.endsWith(s))) return true;
  return false;
}

// Detect non-graph declarations like: `@Foo:Foo __Relation` / `@Bar:Bar __Category` / `@Baz:Baz ___NewVector`.
// These should be rare outside bootstrap; prefer defining concepts/relations using `graph`.
function detectNonGraphDeclarations(content, relPath) {
  if (!content) return [];
  if (shouldIgnoreNonGraphDecl(relPath)) return [];

  const out = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@_')) continue; // Load/Unload

    // Only look at top-level declarations of the form @Name:Name ...
    const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
    if (!m) continue;

    const dest = m[1];
    const persist = m[2];
    const rest = m[3];

    // Graph/macro definitions are OK.
    if (rest.startsWith('graph ') || rest === 'graph' || rest.startsWith('macro')) continue;

    // Treat typed declarations / vector constructors as "non-graph declarations".
    // Examples:
    //   @Foo:Foo __Relation
    //   @Bar:Bar __Category
    //   @X:X ___NewVector
    const head = rest.split(/\s+/)[0];
    if (head.startsWith('__') || head.startsWith('___')) {
      const inAllowedPrefix = ATOMIC_DECL_POLICY.allowedPrefixes.some(p => relPath.startsWith(p));
      const inAllowedLexicon = Boolean(ATOMIC_DECL_POLICY.isLexiconFile?.(relPath));
      const allowedCore = inAllowedPrefix && ATOMIC_DECL_POLICY.allowedHeads.has(head);
      const allowedLexicon = inAllowedLexicon && ATOMIC_DECL_POLICY.allowedLexiconHeads.has(head);
      const allowed = allowedCore || allowedLexicon;
      out.push({
        dest,
        persist,
        head,
        line: i + 1,
        allowed,
        allowedKind: allowedCore ? 'core' : (allowedLexicon ? 'lexicon' : null)
      });
    }
  }

  return out;
}
// Allow disabling via --no-color or NO_COLOR env.
// Default: use colors even when stdout isn't a TTY (Codex/CI often pipes output).
const IS_TTY = IS_WORKER || process.stdout.isTTY || process.stderr.isTTY;
const NO_COLOR = ARGV.includes('--no-color') || Boolean(process.env.NO_COLOR);
const USE_COLOR = !NO_COLOR;
let logLine = (...args) => console.log(...args);

// ANSI color codes for TTY output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
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
  if (!USE_COLOR) return text;
  return codes.join('') + text + COLORS.reset;
}

function getArgValue(name) {
  // Handle --name=value format
  const eqArg = ARGV.find(a => a.startsWith(`${name}=`));
  if (eqArg) {
    return eqArg.split('=')[1];
  }
  // Handle --name value format
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

function printSummaryLegend() {
  console.log('=== Legend (Columns) ===');
  console.log('- file: path to the `.sys2` file');
  console.log('- status: OK = loaded and no issues; ISSUES = loaded/checked with problems');
  console.log('- time: wall-clock time spent on check+load for that file');
  console.log('- syntax: lexer/parser errors');
  console.log('- missing-deps: number of unique missing symbols (unknown atoms/operators/refs) in that file');
  console.log('- contradiction: contradictions rejected during learn() (atomic rollback expected)');
  console.log('- load: runtime load/execution failures (non-syntax)');
  console.log('- atom-fund: count of allowed Core fundamental atomic declarations encountered');
  console.log('- atom-soup: count of non-Core atomic declarations (discouraged “atom soup”)');
  console.log('- superficial: heuristics for thin/placeholder graph semantics');
  console.log('- incomplete: graph definitions missing `end`');
  console.log('- other: uncategorized errors');
  console.log('- colors: green OK; red syntax/load; yellow missing-deps/contradiction/incomplete; gray = non-fatal observations');
  console.log('- flags: --show-ok prints OK rows for Config/Stress (Core is always shown)');
  console.log('- flags: --stress-strict forces strict atom deps on Stress (expected to be very noisy)');
  console.log('');
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

function splitTrailingLocation(message) {
  const msg = sanitizeMessage(message);
  const match = msg.match(/\s+at\s+(\d+:\d+)\s*$/);
  if (!match) return { message: msg, location: null };
  return {
    message: msg.slice(0, match.index).trim(),
    location: match[1]
  };
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
  const unknownConcept = message.match(/Unknown concept '([^']+)'/);
  if (unknownConcept) return unknownConcept[1];
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
  const split = splitTrailingLocation(message);
  const token = extractMissingDepToken(split.message);
  entry[safeType].push({
    label,
    message: split.message,
    location: split.location,
    token
  });
}

function logProgressStart(label, progress, relPath, prevInfo) {
  if (!progress) return;
  const { phase, index, total } = progress;
  const prefix = phase ? `${phase} ` : '';
  let prevText = '';
  if (prevInfo && prevInfo.file) {
    prevText = ` ${COLORS.dim}|${COLORS.reset} prev: ${COLORS.dim}${prevInfo.file}${COLORS.reset} ${COLORS.cyan}${formatDuration(prevInfo.durationMs)}${COLORS.reset}`;
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
    `${ERROR_LABELS.declaration} ${localCounts.declaration || 0}`,
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

  const localCounts = {};
  for (const type of ERROR_TYPES) localCounts[type] = 0;
  const localMissingDeps = new Set();
  let localFundamentalAtoms = 0;

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

      // Also update the file-level report in fileReports Map
      const fileEntry = ensureReport(fileReports, filePath);
      if (!fileEntry.uniqueMissingDeps) fileEntry.uniqueMissingDeps = new Set();
      for (const dep of localMissingDeps) fileEntry.uniqueMissingDeps.add(dep);
    }
  };

  const start = performance.now();
  const content = await readFile(filePath, 'utf8');

  // Detect atomic (non-graph) declarations.
  // - In Core: count allowed "fundamental atoms" but don't flag them as issues.
  // - Outside Core: flag as issues (domains should converge to graph-based semantics).
  const atomicDecls = detectNonGraphDeclarations(content, relPath);
  for (const decl of atomicDecls) {
    if (decl.allowed) {
      if (decl.allowedKind === 'core') localFundamentalAtoms += 1;
      continue;
    }
    addIssue('declaration', `Atomic declaration '${decl.dest}:${decl.persist} ${decl.head}' at ${decl.line}:1`);
  }

  // Detect superficial definitions
  const superficialDefs = detectSuperficialDefinitions(content);
  for (const msg of superficialDefs) {
    addIssue('superficial', msg);
  }

  // Only flag "thin" graphs outside Core (Core has many small compositional primitives).
  if (!relPath.startsWith('config/Core/')) {
    const thinDefs = detectThinGraphDefinitions(content);
    for (const msg of thinDefs) {
      addIssue('superficial', msg);
    }
  }

  // Detect incomplete definitions
  const incompleteDefs = detectIncompleteDefinitions(content);
  for (const msg of incompleteDefs) {
    addIssue('incomplete', msg);
  }

  try {
    const isStressPhase = progress?.phase === 'stress';
    // Config theories are validated strictly: no undeclared atoms should slip in.
    // Stress corpora are open-vocabulary by design; by default we validate syntax + operator existence.
    // If you want to force predeclared atoms (very noisy on stress files), pass --stress-strict.
    const check = (isStressPhase && !STRESS_STRICT_ATOMS)
      ? session.checkDSL.bind(session)
      : session.checkDSLStrict.bind(session);
    check(content, { mode: 'learn', allowHoles: true, allowNewOperators: false });
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
    return { file: relPath, durationMs: duration, loaded: false, issues: issueTotal, counts: { ...localCounts, fundamentalAtoms: localFundamentalAtoms } };
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
      return { file: relPath, durationMs: duration, loaded: false, issues: issueTotal, counts: { ...localCounts, fundamentalAtoms: localFundamentalAtoms } };
    }
    report.loadedCount += 1;
    report.totalMs += duration;
    localCounts.dependency = localMissingDeps.size;
    if (!IS_WORKER) logProgress(label, progress, relPath, duration, localCounts);
    const issueTotal = ERROR_TYPES.reduce((sum, type) => sum + (localCounts[type] || 0), 0);
    return { file: relPath, durationMs: duration, loaded: true, issues: issueTotal, counts: { ...localCounts, fundamentalAtoms: localFundamentalAtoms } };
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
    return { file: relPath, durationMs: duration, loaded: false, issues: issueTotal, counts: { ...localCounts, fundamentalAtoms: localFundamentalAtoms } };
  }
}

async function buildConfigPlan() {
  const plan = [];
  for (const dirName of CONFIG_ORDER) {
    const dirPath = join(CONFIG_ROOT, dirName);
    if (!existsSync(dirPath)) continue;
    let files = null;
    files = await loadIndexOrder(dirPath);
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

async function runCombination(strategyId, reasoningPriority, geometry, basePlan, stressPlan, fileReports) {
  const label = configLabel(strategyId, geometry, reasoningPriority);

  const session = new Session({
    hdcStrategy: strategyId,
    geometry,
    reasoningPriority,
    reasoningProfile: 'theoryDriven',
    rejectContradictions: true
  });

  for (const op of BOOTSTRAP_OPERATORS) {
    session.declaredOperators.add(op);
  }

  const baseReport = createReport();
  const stressReport = createReport();
  const baseByGroup = new Map(); // group -> { total, loaded }
  const baseFileResults = [];
  const stressFileResults = [];
  const start = performance.now();
  const baseTotal = basePlan.length;
  let prevInfo = null;
  for (let i = 0; i < basePlan.length; i++) {
    const filePath = basePlan[i];
    const relToConfig = relative(CONFIG_ROOT, filePath);
    const group = relToConfig.split('/')[0] || 'unknown';
    if (!baseByGroup.has(group)) baseByGroup.set(group, { total: 0, loaded: 0 });
    baseByGroup.get(group).total += 1;

    prevInfo = await checkAndLoad(session, filePath, baseReport, label, fileReports, {
      phase: 'base',
      index: i + 1,
      total: baseTotal
    }, prevInfo);
    baseFileResults.push(prevInfo);
    if (prevInfo?.loaded) {
      baseByGroup.get(group).loaded += 1;
    }
  }
  const stressTotal = stressPlan.length;
  for (let i = 0; i < stressPlan.length; i++) {
    const filePath = stressPlan[i];
    prevInfo = await checkAndLoad(session, filePath, stressReport, label, fileReports, {
      phase: 'stress',
      index: i + 1,
      total: stressTotal
    }, prevInfo);
    stressFileResults.push(prevInfo);
  }
  const totalMs = performance.now() - start;
  const coreGroup = baseByGroup.get('Core') || { total: 0, loaded: 0 };
  return {
    label,
    baseReport,
    stressReport,
    baseTotal,
    baseByGroup: Object.fromEntries([...baseByGroup.entries()]),
    coreLoaded: coreGroup.loaded,
    coreTotal: coreGroup.total,
    baseFileResults,
    stressFileResults,
    totalMs
  };
}

function buildCombos() {
  const comboArg = getArgValue('--combo');
  if (comboArg) {
    const parts = comboArg.split('/');
    const strategyId = parts[0];
    const geometry = parts.length === 3 ? parseInt(parts[1], 10) : null;
    const reasoningPriority = parts.length === 3 ? parts[2] : parts[1];
    if (strategyId && reasoningPriority) {
      const fallbackGeometry = GEOMETRY_VARIANTS[strategyId]?.[0] ?? null;
      return [{
        strategyId,
        reasoningPriority,
        geometry: Number.isFinite(geometry) ? geometry : fallbackGeometry
      }];
    }
  }

  const fastRun = ARGV.includes('--fast');
  const strategyArg = getArgValue('--strategy') || getArgValue('--strategies');
  const priorities = parseList(getArgValue('--priority') || getArgValue('--priorities'));

  // --fast alone: single quick test
  if (fastRun && !strategyArg) {
    return [{ strategyId: 'dense-binary', reasoningPriority: 'holographicPriority', geometry: 256 }];
  }

  // --strategy=X: single strategy with ALL geometries (sweep mode)
  if (strategyArg && !strategyArg.includes(',')) {
    const resolvedStrategy = STRATEGY_ALIASES[strategyArg.toLowerCase()] || strategyArg;
    if (GEOMETRY_SWEEP[resolvedStrategy]) {
      // --strategy=X --fast: single geometry for quick test of that strategy
      if (fastRun) {
        const defaultGeometry = GEOMETRY_VARIANTS[resolvedStrategy]?.[0] || GEOMETRY_SWEEP[resolvedStrategy][0];
        return [{ strategyId: resolvedStrategy, reasoningPriority: 'holographicPriority', geometry: defaultGeometry }];
      }
      // --strategy=X: all geometries for that strategy
      const geometries = GEOMETRY_SWEEP[resolvedStrategy];
      const priorityList = priorities || REASONING_PRIORITIES;
      const combos = [];
      for (const geometry of geometries) {
        for (const reasoningPriority of priorityList) {
          combos.push({ strategyId: resolvedStrategy, reasoningPriority, geometry });
        }
      }
      return combos;
    }
  }

  // Default mode (no --strategy, no --fast): all 3 strategies × 2 geometries × 2 priorities
  const strategies = strategyArg ? parseList(strategyArg) : null;
  const strategyList = strategies
    ? strategies.map(s => STRATEGY_ALIASES[s.toLowerCase()] || s)
    : HDC_STRATEGIES;
  const priorityList = priorities || REASONING_PRIORITIES;

  const combos = [];
  for (const strategyId of strategyList) {
    const geometries = GEOMETRY_VARIANTS[strategyId] || [];
    for (const reasoningPriority of priorityList) {
      for (const geometry of geometries) {
        combos.push({ strategyId, reasoningPriority, geometry });
      }
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
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  const visibleLen = (text) => String(text).replace(ansiRegex, '').length;
  const widths = headers.map(h => visibleLen(h));
  for (const row of rows) {
    row.forEach((cell, idx) => {
      const cellWidth = visibleLen(cell);
      if (cellWidth > widths[idx]) widths[idx] = cellWidth;
    });
  }
  const pad = (text, width) => {
    const raw = String(text);
    const padCount = Math.max(0, width - visibleLen(raw));
    return raw + ' '.repeat(padCount);
  };
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
  const outPath = getArgValue('--out');
  const combos = buildCombos();
  if (combos.length !== 1) {
    console.error('Worker expects a single combo');
    process.exitCode = 1;
    return;
  }
  const { strategyId, reasoningPriority, geometry } = combos[0];
  const basePlan = await buildConfigPlan();
  const stressPlan = await buildStressPlan();
  const fileReports = new Map();
  const result = await runCombination(strategyId, reasoningPriority, geometry, basePlan, stressPlan, fileReports);
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
    coreLoaded: result.coreLoaded || 0,
    coreTotal: result.coreTotal || 0,
    baseByGroup: result.baseByGroup || null,
    baseFileResults: result.baseFileResults || null,
    stressFileResults: result.stressFileResults || null,
    baseTotal: basePlan.length,
    stressTotal: stressPlan.length
  };
  if (outPath) {
    await writeFile(outPath, JSON.stringify(payload), 'utf8');
    return;
  }
  process.stdout.write(JSON.stringify(payload));
}

async function runParallel(combos) {
  const scriptPath = fileURLToPath(import.meta.url);
  const numWorkers = combos.length;
  const useInPlace = IS_TTY && numWorkers > 1;
  const tmpDir = join(ROOT, 'evals', '.tmp-stress-check');
  mkdirSync(tmpDir, { recursive: true });

  // Create label to index mapping
  const labelToIdx = new Map();
  for (let i = 0; i < numWorkers; i++) {
    const label = configLabel(combos[i].strategyId, combos[i].geometry, combos[i].reasoningPriority);
    labelToIdx.set(label, i);
  }

  // Track last line content for each worker to avoid rewriting identical content
  const workerLines = new Array(numWorkers).fill('');

  // Initialize display lines
  if (useInPlace) {
    console.log(`${COLORS.bold}${COLORS.bgBlue} Parallel Execution (${numWorkers} workers) ${COLORS.reset}\n`);
    for (let i = 0; i < numWorkers; i++) {
      const label = configLabel(combos[i].strategyId, combos[i].geometry, combos[i].reasoningPriority);
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
      const outPath = join(
        tmpDir,
        `result.${Date.now()}.${Math.random().toString(16).slice(2)}.json`
      );
      const args = [
        scriptPath,
        '--worker',
        '--combo',
        `${combo.strategyId}/${combo.geometry}/${combo.reasoningPriority}`,
        `--out=${outPath}`
      ];
      if (i === 0) args.push('--report-files');
      const child = spawn(process.execPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr.on('data', handleStderr);
      child.on('error', reject);
      child.on('close', code => {
        const label = configLabel(combo.strategyId, combo.geometry, combo.reasoningPriority);
        let raw = '';
        try {
          raw = readFileSync(outPath, 'utf8');
        } catch {}
        try {
          unlinkSync(outPath);
        } catch {}
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          if (!parsed) {
            updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.red}${COLORS.bold}✗ failed${COLORS.reset}`);
            reject(new Error(`Worker did not produce a readable result file: ${label}`));
            return;
          }
          if (code !== 0) {
            updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.red}${COLORS.bold}✗ failed${COLORS.reset}`);
            reject(new Error(parsed.error || `Worker failed: ${label}`));
            return;
          }
          updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.green}${COLORS.bold}✓ done${COLORS.reset} ${COLORS.dim}(${formatDuration(parsed.totalMs)})${COLORS.reset}`);
          resolve(parsed);
        } catch (error) {
          updateLine(i, `${COLORS.bold}${COLORS.cyan}[${label}]${COLORS.reset} ${COLORS.red}${COLORS.bold}✗ failed${COLORS.reset}`);
          reject(error);
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
  const groups = new Map();
  for (const item of items) {
    if (!item) continue;
    const label = item.label || 'unknown';
    const rawMessage = item.message || '';
    const split = splitTrailingLocation(rawMessage);
    const normalizedMessage = split.message;
    const location = item.location || split.location;
    const token = item.token || extractMissingDepToken(normalizedMessage);

    // Prefer grouping missing-deps by token (Unknown concept/operator, missing $ref),
    // otherwise group by normalized message (sans location).
    const key = token ? `${label}::token::${token}` : `${label}::msg::${normalizedMessage}`;
    if (!groups.has(key)) {
      groups.set(key, {
        label,
        message: normalizedMessage,
        token,
        count: 0,
        locations: new Set()
      });
    }
    const g = groups.get(key);
    g.count += 1;
    if (location) g.locations.add(location);
  }

  const sorted = [...groups.values()].sort((a, b) => {
    if (a.label !== b.label) return a.label.localeCompare(b.label);
    const aKey = a.token || a.message;
    const bKey = b.token || b.message;
    return aKey.localeCompare(bKey);
  });

  const MAX_LINES = 120;
  let emitted = 0;

  for (const g of sorted) {
    if (emitted >= MAX_LINES) break;
    const countSuffix = g.count > 1 ? ` (${g.count}x)` : '';
    const locations = [...g.locations];
    let locationSuffix = '';
    if (locations.length > 0) {
      locations.sort((a, b) => {
        const [al, ac] = a.split(':').map(Number);
        const [bl, bc] = b.split(':').map(Number);
        if (al !== bl) return al - bl;
        return ac - bc;
      });
      const shown = locations.slice(0, 10);
      const extra = locations.length - shown.length;
      locationSuffix = ` at ${shown.join(', ')}${extra > 0 ? ` (+${extra} more)` : ''}`;
    }
    lines.push(`- [${g.label}] ${g.message}${countSuffix}${locationSuffix}`);
    emitted++;
  }
  if (sorted.length > MAX_LINES) {
    lines.push(`- ${sorted.length - MAX_LINES} more...`);
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
      sections.push(formatErrorSection('Non-Graph Declarations', report.declaration));
      sections.push(formatErrorSection('Superficial Definitions', report.superficial));
      sections.push(formatErrorSection('Incomplete Definitions', report.incomplete));
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
  // Help
  if (ARGV.includes('--help') || ARGV.includes('-h')) {
    console.log(`
Stress Check - Theory Loading & Validation

Validates theory files (config/ and evals/stress/) for syntax, dependencies,
and semantic issues across multiple HDC strategy configurations.

Usage:
  node evals/runStressCheck.js [options]

Options:
  --help, -h              Show this help message
  --fast                  Quick run with single config (dense/256/holo)
  --strategy=NAME         Run single strategy with all geometries
                          NAME: dense, sparse, metric
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority
  --combo=S/G/P           Run specific combo (e.g., dense-binary/256/holographicPriority)
  --show-ok               Show OK files in output (default: only show files with issues)
  --stress-strict         Force strict atom deps on Stress files (very noisy)
  --report-files          Include file reports in worker output
  --no-color              Disable colored output

Strategy Mode (runs single strategy with multiple geometries):
  --strategy=dense        Dense: 128, 256, 512, 1024, 2048, 4096 bits
  --strategy=sparse       Sparse: k=1, 2, 3, 4, 5, 6
  --strategy=metric       Metric: 8, 16, 32, 64, 128, 256 bytes

Default Mode (no --strategy):
  Runs 3 strategies × 2 geometries × 2 priorities = 12 configurations

Output:
  - Creates .errors files next to each .sys2 file with issues
  - Shows per-file issue counts: syntax, missing-deps, contradiction, etc.
  - Summary tables for speed, Core/Config load, and stress issues

Examples:
  node evals/runStressCheck.js                   # Run all 12 configs
  node evals/runStressCheck.js --fast            # Quick single config
  node evals/runStressCheck.js --strategy=dense  # Dense sweep
  node evals/runStressCheck.js --show-ok         # Also show OK files
`);
    process.exit(0);
  }

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
      coreLoaded: res.coreLoaded || 0,
      coreTotal: res.coreTotal || 0,
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

  // Single-run mode (e.g., `--fast`): show which files have problems, not per-engine aggregates.
  if (summaries.length === 1) {
    const only = runResults[0];
    const label = only.label;
    console.log(`\n=== Run ===\n${label} | ${formatDuration(only.totalMs)}\n`);

    console.log('=== Load Summary ===');
    console.log(`Core:   ${only.coreLoaded}/${only.coreTotal}`);
    console.log(`Config: ${only.baseReport.loadedCount}/${only.baseTotal}`);
    console.log('');

    const rowSeverity = (counts, issues) => {
      if (!issues) return 'ok';
      const syntax = Number(counts?.syntax || 0);
      const load = Number(counts?.load || 0);
      const missing = Number(counts?.dependency || 0);
      const contradiction = Number(counts?.contradiction || 0);
      const incomplete = Number(counts?.incomplete || 0);
      const other = Number(counts?.unknown || 0);
      const superficial = Number(counts?.superficial || 0);
      const atomSoup = Number(counts?.declaration || 0);
      if (syntax > 0 || load > 0) return 'error';
      if (missing > 0 || contradiction > 0 || incomplete > 0) return 'warn';
      if (atomSoup > 0 || superficial > 0 || other > 0) return 'info';
      return 'warn';
    };

    const colorStatus = (severity, text) => {
      if (severity === 'ok') return colorize(text, COLORS.green, COLORS.bold);
      if (severity === 'error') return colorize(text, COLORS.red, COLORS.bold);
      if (severity === 'warn') return colorize(text, COLORS.yellow, COLORS.bold);
      return colorize(text, COLORS.gray);
    };

    const colorNumber = (value, color) => {
      const n = Number(value);
      if (!n) return String(value);
      return colorize(String(value), color);
    };

    const formatFileRow = (r) => {
      const counts = r.counts || {};
      const sev = rowSeverity(counts, r.issues);
      const fileCell =
        sev === 'error' ? colorize(r.file, COLORS.red) :
        sev === 'warn' ? colorize(r.file, COLORS.yellow) :
        sev === 'info' ? colorize(r.file, COLORS.gray) :
        colorize(r.file, COLORS.green);

      const syntax = String(counts.syntax || 0);
      const missing = String(counts.dependency || 0);
      const contradiction = String(counts.contradiction || 0);
      const load = String(counts.load || 0);
      const atomFund = String(counts.fundamentalAtoms || 0);
      const atomSoup = String(counts.declaration || 0);
      const superficial = String(counts.superficial || 0);
      const incomplete = String(counts.incomplete || 0);
      const other = String(counts.unknown || 0);

      return ([
        fileCell,
        colorStatus(sev, r.issues === 0 ? 'OK' : 'ISSUES'),
        formatDuration(r.durationMs),
        colorNumber(syntax, COLORS.red),
        colorNumber(missing, COLORS.yellow),
        colorNumber(contradiction, COLORS.yellow),
        colorNumber(load, COLORS.red),
        colorNumber(atomFund, COLORS.gray),
        colorNumber(atomSoup, COLORS.gray),
        colorNumber(superficial, COLORS.gray),
        colorNumber(incomplete, COLORS.yellow),
        colorNumber(other, COLORS.gray)
      ]);
    };

    const baseIssueRows = (only.baseFileResults || []).filter(r => (r?.issues || 0) > 0).map(formatFileRow);
    const stressIssueRows = (only.stressFileResults || []).filter(r => (r?.issues || 0) > 0).map(formatFileRow);
    const coreRows = (only.baseFileResults || [])
      .filter(r => String(r?.file || '').startsWith('config/Core/'))
      .map(formatFileRow);
    const baseAllRows = (only.baseFileResults || []).map(formatFileRow);
    const stressAllRows = (only.stressFileResults || []).map(formatFileRow);

    printSummaryLegend();

    console.log('=== Core Files ===');
    if (coreRows.length === 0) {
      console.log('none');
    } else {
      console.log(formatSummaryTable(
        coreRows,
        ['file', 'status', 'time', 'syntax', 'missing-deps', 'contradiction', 'load', 'atom-fund', 'atom-soup', 'superficial', 'incomplete', 'other']
      ));
    }

    console.log('=== Config Files With Issues ===');
    if (baseIssueRows.length === 0 && !SHOW_OK_FILES) {
      console.log('none');
    } else {
      const rows = SHOW_OK_FILES ? baseAllRows : baseIssueRows;
      console.log(formatSummaryTable(
        rows,
        ['file', 'status', 'time', 'syntax', 'missing-deps', 'contradiction', 'load', 'atom-fund', 'atom-soup', 'superficial', 'incomplete', 'other']
      ));
    }

    console.log('\n=== Stress Files With Issues ===');
    if (stressIssueRows.length === 0 && !SHOW_OK_FILES) {
      console.log('none');
    } else {
      const rows = SHOW_OK_FILES ? stressAllRows : stressIssueRows;
      console.log(formatSummaryTable(
        rows,
        ['file', 'status', 'time', 'syntax', 'missing-deps', 'contradiction', 'load', 'atom-fund', 'atom-soup', 'superficial', 'incomplete', 'other']
      ));
    }

    console.log('\n=== .errors Files ===');
    if (fileOps.created.length === 0 &&
        fileOps.overwritten.length === 0 &&
        fileOps.deleted.length === 0) {
      console.log('no changes');
    } else {
      for (const file of fileOps.created) console.log(`created: ${file}`);
      for (const file of fileOps.overwritten) console.log(`updated: ${file}`);
      for (const file of fileOps.deleted) console.log(`deleted: ${file}`);
    }
    return;
  }

  const speedRows = [...summaries]
    .sort((a, b) => a.totalMs - b.totalMs)
    .map(entry => ([
      entry.label,
      formatDuration(entry.totalMs)
    ]));
  console.log('\n=== Speed Summary ===');
  console.log(formatSummaryTable(speedRows, ['run', 'duration']));

  const coreRows = [...summaries]
    .sort((a, b) => a.totalMs - b.totalMs)
    .map(entry => ([
      entry.label,
      `${entry.coreLoaded}/${entry.coreTotal}`
    ]));
  console.log('\n=== Core Theory Load Summary ===');
  console.log(formatSummaryTable(coreRows, ['run', 'loaded']));

  const baseRows = [...summaries]
    .sort((a, b) => a.totalMs - b.totalMs)
    .map(entry => ([
      entry.label,
      `${entry.baseLoaded}/${entry.baseTotal}`
    ]));
  console.log('\n=== Config Load Summary (Core + Domains) ===');
  console.log(formatSummaryTable(baseRows, ['run', 'loaded']));

  const stressRows = [...summaries]
    .sort((a, b) => a.totalMs - b.totalMs)
    .map(entry => ([
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
  console.log('\nNote: missing-deps counts are unique missing operators/refs/concepts.');

  // Show file-level details (same as --fast mode) using first worker's results
  const firstResult = runResults[0];
  if (firstResult) {
    const formatFileRow = (r) => ([
      r.file,
      r.issues === 0 ? 'OK' : 'ISSUES',
      formatDuration(r.durationMs),
      String(r.counts?.syntax || 0),
      String(r.counts?.dependency || 0),
      String(r.counts?.contradiction || 0),
      String(r.counts?.load || 0),
      String(r.counts?.fundamentalAtoms || 0),
      String(r.counts?.declaration || 0),
      String(r.counts?.superficial || 0),
      String(r.counts?.incomplete || 0),
      String(r.counts?.unknown || 0)
    ]);

    const baseIssueRows = (firstResult.baseFileResults || []).filter(r => (r?.issues || 0) > 0).map(formatFileRow);
    const stressIssueRows = (firstResult.stressFileResults || []).filter(r => (r?.issues || 0) > 0).map(formatFileRow);

    printSummaryLegend();

    console.log('=== Config Files With Issues ===');
    if (baseIssueRows.length === 0) {
      console.log('none');
    } else {
      console.log(formatSummaryTable(
        baseIssueRows,
        ['file', 'status', 'time', 'syntax', 'missing-deps', 'contradiction', 'load', 'atom-fund', 'atom-nonfund', 'superficial', 'incomplete', 'other']
      ));
    }

    console.log('\n=== Stress Files With Issues ===');
    if (stressIssueRows.length === 0) {
      console.log('none');
    } else {
      console.log(formatSummaryTable(
        stressIssueRows,
        ['file', 'status', 'time', 'syntax', 'missing-deps', 'contradiction', 'load', 'atom-fund', 'atom-nonfund', 'superficial', 'incomplete', 'other']
      ));
    }
  }

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
