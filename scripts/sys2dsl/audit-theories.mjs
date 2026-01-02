import fs from 'node:fs';
import path from 'node:path';

const ALL_ISSUES = new Set(['MULTI_AT', 'MISSING_COMMENT', 'SHORT_COMMENT']);

function isSys2File(p) {
  return p.endsWith('.sys2');
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && isSys2File(full)) out.push(full);
  }
  return out;
}

function findInlineCommentStart(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (inSingle || inDouble) continue;

    if (ch === '#') return i;
    if (ch === '/' && next === '/') return i;
  }
  return -1;
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
    .filter(w => /[a-z0-9]/i.test(w))
    .length;
}

function shorten(text, max = 120) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    const commentStart = findInlineCommentStart(raw);
    const code = commentStart >= 0 ? raw.slice(0, commentStart) : raw;
    const codeTrim = code.trim();
    if (!codeTrim) continue;

    const atCount = (code.match(/@/g) || []).length;
    if (atCount > 1) {
      issues.push({ line: i + 1, issue: 'MULTI_AT', snippet: raw });
      continue;
    }

    if (commentStart < 0) {
      issues.push({ line: i + 1, issue: 'MISSING_COMMENT', snippet: raw });
      continue;
    }

    const comment = raw.slice(commentStart + (raw[commentStart] === '#' ? 1 : 2));
    if (countWords(comment) < 3) {
      issues.push({ line: i + 1, issue: 'SHORT_COMMENT', snippet: raw });
    }
  }

  return issues;
}

function parseArgs(argv) {
  const roots = [];
  let only = null; // Set<string> | null
  let maxRows = Infinity;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-comments') {
      only = new Set(['MULTI_AT']);
      continue;
    }
    if (arg === '--no-short-comments') {
      only = new Set(['MULTI_AT', 'MISSING_COMMENT']);
      continue;
    }
    if (arg.startsWith('--only=')) {
      const raw = arg.slice('--only='.length).trim();
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      only = new Set(parts);
      continue;
    }
    if (arg === '--only') {
      const raw = String(argv[i + 1] || '').trim();
      i++;
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      only = new Set(parts);
      continue;
    }
    if (arg.startsWith('--max=')) {
      const n = Number(arg.slice('--max='.length));
      if (Number.isFinite(n) && n > 0) maxRows = Math.floor(n);
      continue;
    }
    if (arg === '--max') {
      const n = Number(argv[i + 1]);
      i++;
      if (Number.isFinite(n) && n > 0) maxRows = Math.floor(n);
      continue;
    }
    if (arg.startsWith('-')) {
      // Unknown flag; ignore to keep the tool permissive.
      continue;
    }
    roots.push(arg);
  }

  if (only) {
    const normalized = new Set();
    for (const x of only) {
      const key = String(x || '').trim();
      if (ALL_ISSUES.has(key)) normalized.add(key);
    }
    only = normalized;
  }

  return { roots, only, maxRows };
}

function formatTable(rows) {
  const head = ['File', 'Line', 'Issue', 'Snippet'];
  const widths = [40, 6, 14, 80];

  function pad(s, n) {
    const str = String(s);
    if (str.length >= n) return str.slice(0, n - 1) + '…';
    return str + ' '.repeat(n - str.length);
  }

  const sep = `${'-'.repeat(widths[0])}-+-${'-'.repeat(widths[1])}-+-${'-'.repeat(widths[2])}-+-${'-'.repeat(widths[3])}`;
  const out = [];
  out.push(`${pad(head[0], widths[0])} | ${pad(head[1], widths[1])} | ${pad(head[2], widths[2])} | ${pad(head[3], widths[3])}`);
  out.push(sep);
  for (const r of rows) {
    out.push(
      `${pad(r.file, widths[0])} | ${pad(r.line, widths[1])} | ${pad(r.issue, widths[2])} | ${pad(shorten(r.snippet, widths[3]), widths[3])}`
    );
  }
  return out.join('\n');
}

const { roots, only, maxRows } = parseArgs(process.argv.slice(2));
const scanRoots = roots.length ? roots : ['config/Packs'];

const allIssues = [];
for (const r of scanRoots) {
  const root = path.resolve(process.cwd(), r);
  if (!fs.existsSync(root)) continue;
  const files = fs.statSync(root).isDirectory() ? walk(root) : (isSys2File(root) ? [root] : []);
  for (const f of files) {
    const issues = auditFile(f);
    for (const iss of issues) {
      if (only && only.size > 0 && !only.has(iss.issue)) continue;
      allIssues.push({ file: path.relative(process.cwd(), f), ...iss });
    }
  }
}

if (allIssues.length === 0) {
  console.log('No issues found.');
  process.exit(0);
}

allIssues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.issue.localeCompare(b.issue));
const shown = allIssues.slice(0, maxRows);
console.log(formatTable(shown));
if (shown.length < allIssues.length) {
  console.log(`\n(truncated: showing ${shown.length} of ${allIssues.length} issues; re-run with --max=${allIssues.length} to see all)`);
}
process.exitCode = 1;
