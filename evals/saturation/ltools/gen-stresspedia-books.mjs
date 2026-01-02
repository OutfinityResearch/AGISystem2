#!/usr/bin/env node
/**
 * Generate "stresspedia" saturation books from evals/stress/*.sys2.
 *
 * Goal:
 * - Treat each stress domain as a 1-chapter "book" made of many StresspediaEntry(book, key, idea) records.
 * - Load the corresponding domain theory via DSL `@_ Load` directives inside the book.
 * - Load the stress theory via DSL `@_ Load` directives inside the book.
 * - Ideas are extracted from operator/declaration names found in the stress DSL source (no learning required).
 * - POS query targets an idea token known from Core (default: EntityType) to maximize interference.
 * - NEG query uses an invented key and should return no confident match.
 *
 * Output:
 * - Writes into evals/saturation/stresspedia-books/
 * - Filenames: book_stresspedia_<domain>.sys2
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from '../../../src/runtime/session.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

const STRESS_DIR = path.join(PROJECT_ROOT, 'evals', 'stress');
const OUT_DIR = path.join(PROJECT_ROOT, 'evals', 'saturation', 'stresspedia-books');

const DOMAIN_ORDER = [
  'anthropology',
  'biology',
  'geography',
  'history',
  'law',
  'literature',
  'logic',
  'math',
  'medicine',
  'psychics',
  'psychology',
  'sociology'
];

const STRESS_DOMAIN_TO_DOMAIN_FOLDER = {
  anthropology: 'Anthropology',
  biology: 'Biology',
  geography: 'Geography',
  history: 'History',
  law: 'Law',
  literature: 'Literature',
  math: 'Math',
  medicine: 'Medicine',
  psychology: 'Psychology',
  sociology: 'Sociology',
  psychics: 'Physics',
  // There is no dedicated Logic domain folder today; Philosophy is the closest shared substrate.
  logic: 'Philosophy'
};

const STRESSPEDIA_BOOK_VERSION = 2;

// Parser keywords (see src/core/constants.mjs KEYWORDS).
// These cannot be used as plain atoms inside facts (e.g., `... theory`), or the parser will
// treat them as control words and fail.
const DSL_KEYWORDS = new Set([
  'theory',
  'import',
  'rule',
  'graph',
  'macro',
  'begin',
  'end',
  'return'
]);

let CORE_TYPE_MARKERS_CACHE = null;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pad(n, w) {
  return String(n).padStart(w, '0');
}

function parseArg(name) {
  const arg = process.argv.slice(2).find(a => a.startsWith(`${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function sanitizeIdent(text) {
  return String(text || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
}

function titleCase(word) {
  if (!word) return '';
  return word[0].toUpperCase() + word.slice(1);
}

function extractIdeaNamesFromStressDsl(content) {
  const ideas = new Set();
  const lines = String(content || '').split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@_')) continue;

    // Match: @Name:Name graph ...
    //        @Name:Name macro ...
    //        @Name:Name __Relation / __Category / ___NewVector ...
    const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
    if (!m) continue;
    const dest = m[1];
    const persist = m[2];
    const rest = m[3];
    if (dest !== persist) continue;

    const head = rest.split(/\s+/)[0];
    if (head === 'graph' || head === 'macro' || head.startsWith('__') || head.startsWith('___')) {
      ideas.add(dest);
    }
  }

  return Array.from(ideas);
}

function extractNewVectorDeclsFromSys2(content) {
  const declared = new Set();
  const lines = String(content || '').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\s+___NewVector\b/);
    if (!m) continue;
    const dest = m[1];
    const persist = m[2];
    if (dest !== persist) continue;
    declared.add(dest);
  }
  return declared;
}

function extractTypeMarkersUsed(content) {
  const used = new Set();
  const text = String(content || '');
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)Type\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    used.add(m[0]);
  }
  return used;
}

function getCoreTypeMarkers(projectRoot) {
  if (CORE_TYPE_MARKERS_CACHE) return CORE_TYPE_MARKERS_CACHE;
  const out = new Set();
  const coreDir = path.join(projectRoot, 'config', 'Core');
  try {
    const files = fs.readdirSync(coreDir).filter(f => f.endsWith('.sys2')).sort();
    for (const f of files) {
      const content = fs.readFileSync(path.join(coreDir, f), 'utf8');
      for (const name of extractNewVectorDeclsFromSys2(content)) out.add(name);
    }
  } catch {
    // best-effort
  }
  CORE_TYPE_MARKERS_CACHE = out;
  return out;
}

function extractDeclaredOperatorsFromSys2(content) {
  const declared = new Set();
  const lines = String(content || '').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@_')) continue;
    const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (!m) continue;
    const dest = m[1];
    const persist = m[2];
    if (dest !== persist) continue;
    declared.add(dest);
  }
  return declared;
}

function collectStrictLoadOperatorStubs({ dsl, domainIndexRel = null, declaredOperators = null }) {
  const stubs = new Set();
  const session = new Session({
    hdcStrategy: 'dense-binary',
    geometry: 256,
    reasoningPriority: 'symbolicPriority'
  });
  if (session?.executor) session.executor.basePath = PROJECT_ROOT;
  session.loadCore({ includeIndex: true, corePath: path.join(PROJECT_ROOT, 'config', 'Packs', 'Kernel') });
  session.loadPack('tests_and_evals', { includeIndex: true, validate: false, packPath: path.join(PROJECT_ROOT, 'config', 'Packs', 'tests_and_evals') });

  if (domainIndexRel) {
    const full = path.join(PROJECT_ROOT, domainIndexRel);
    if (fs.existsSync(full)) {
      try {
        session.learn(`@_ Load "./${domainIndexRel.replaceAll(path.sep, '/')}"`);
      } catch {
        // Best-effort: still generate a sanitized stress theory even if the domain index has issues.
      }
    }
  }

  const extract = (msg, re) => {
    let m;
    while ((m = re.exec(msg)) !== null) {
      const name = m[1];
      if (!name) continue;
      stubs.add(name);
    }
  };

  // Iterate to converge (adding stubs can reveal more unknown operators).
  let current = String(dsl || '');
  for (let iter = 0; iter < 4; iter++) {
    try {
      session.checkDSL(current, { mode: 'learn', allowHoles: true, allowNewOperators: false });
      break;
    } catch (e) {
      const msg = String(e?.message || '');
      extract(msg, /Unknown operator '([^']+)'/g);
      extract(msg, /Undeclared operator '([^']+)'/g);

      const decls = Array.from(stubs)
        .filter(n => typeof n === 'string')
        .filter(n => n && !n.startsWith('__') && !n.startsWith('___'))
        .filter(n => !(declaredOperators && declaredOperators.has(n)))
        .filter(n => !DSL_KEYWORDS.has(n));

      if (decls.length === 0) break;
      // Prepend stubs for the next iteration.
      current = `${decls.map(n => `@${n}:${n} __Relation`).join('\n')}\n\n${dsl}`;
    }
  }

  session.close();
  return stubs;
}

function safeIdeaAtom(idea, { coreIdea } = {}) {
  if (!idea) return idea;
  if (idea === coreIdea) return idea;
  if (DSL_KEYWORDS.has(idea)) return titleCase(idea);
  // In strict mode, identifiers ending with `Type` are treated as type markers and must already exist.
  // Keep the Core-chosen `coreIdea` (often `EntityType`) but rewrite everything else to avoid hard failures.
  if (/Type$/.test(idea)) return `${idea}_SP`;
  return idea;
}

function generateStresspediaBookDsl({
  domain,
  stressPath,
  recordPrefix,
  bookId,
  coreIdea = 'EntityType',
  maxIdeas = 800
}) {
  const raw = fs.readFileSync(stressPath, 'utf8');
  const domainFolder = STRESS_DOMAIN_TO_DOMAIN_FOLDER[domain] || titleCase(domain);
  const domainIndexRel = path.join('evals', 'domains', domainFolder, 'index.sys2');
  const stressRel = path.join('evals', 'stress', `${domain}.sys2`);

  const ideasFromStress = extractIdeaNamesFromStressDsl(raw);

  const domainDir = path.join(PROJECT_ROOT, 'evals', 'domains', domainFolder);
  const ideasFromDomain = [];
  const domainTypeMarkers = new Set();
  if (fs.existsSync(domainDir)) {
    for (const f of fs.readdirSync(domainDir).filter(x => x.endsWith('.sys2')).sort()) {
      try {
        const content = fs.readFileSync(path.join(domainDir, f), 'utf8');
        ideasFromDomain.push(...extractIdeaNamesFromStressDsl(content));
        for (const name of extractNewVectorDeclsFromSys2(content)) domainTypeMarkers.add(name);
      } catch {
        // best-effort
      }
    }
  }

  const extracted = [];
  const seen = new Set();
  for (const name of ideasFromStress) {
    if (seen.has(name)) continue;
    seen.add(name);
    extracted.push(name);
  }
  for (const name of ideasFromDomain) {
    if (seen.has(name)) continue;
    seen.add(name);
    extracted.push(name);
  }

  const coreTypeMarkers = getCoreTypeMarkers(PROJECT_ROOT);
  const stressTypeMarkersDeclared = extractNewVectorDeclsFromSys2(raw);
  const stressTypeMarkersUsed = extractTypeMarkersUsed(raw);
  const missingTypeMarkers = Array.from(stressTypeMarkersUsed)
    .filter(n => !coreTypeMarkers.has(n))
    .filter(n => !domainTypeMarkers.has(n))
    .filter(n => !stressTypeMarkersDeclared.has(n))
    .sort((a, b) => a.localeCompare(b));

  const declaredInStress = extractDeclaredOperatorsFromSys2(raw);
  const operatorStubs = collectStrictLoadOperatorStubs({
    dsl: raw,
    domainIndexRel,
    declaredOperators: declaredInStress
  });
  const stubDecls = Array.from(operatorStubs)
    .filter(n => typeof n === 'string')
    .filter(n => n && !n.startsWith('__') && !n.startsWith('___'))
    .filter(n => !declaredInStress.has(n))
    .filter(n => !DSL_KEYWORDS.has(n))
    .sort((a, b) => a.localeCompare(b));

  // Cap for runtime sanity; still enough to stress saturation.
  const ideas = extracted.slice(0, Math.max(0, maxIdeas));

  const lines = [];
  lines.push(`# STRESSPEDIA_BOOK_VERSION=${STRESSPEDIA_BOOK_VERSION}`);
  lines.push(`# book_stresspedia_${domain}.sys2`);
  lines.push(`# Stresspedia domain: ${domain}`);
  lines.push(`# Source: ${path.relative(PROJECT_ROOT, stressPath)}`);
  lines.push(`# Ideas extracted: ${extracted.length} (using ${ideas.length})`);
  lines.push(`# Single-chapter stresspedia (index entries only)`);
  lines.push('');

  // Ensure the book itself loads its dependencies via DSL (not hidden in the eval runner).
  lines.push(`# Dependencies (domain theory must be loaded before the stress theory)`);
  if (fs.existsSync(path.join(PROJECT_ROOT, domainIndexRel))) {
    lines.push(`@_ Load "./${domainIndexRel.replaceAll(path.sep, '/')}"`);
  } else {
    lines.push(`# NOTE: Missing domain index: ${domainIndexRel}`);
  }
  lines.push('');

  if (missingTypeMarkers.length) {
    lines.push('# Type markers for strict loading (auto-declared)');
    for (const name of missingTypeMarkers) {
      lines.push(`@${name}:${name} ___NewVector "${name}" "Stresspedia"`);
    }
    lines.push('');
  }

  if (stubDecls.length) {
    lines.push('# Operator stubs for strict loading (auto-discovered)');
    for (const name of stubDecls) {
      lines.push(`@${name}:${name} __Relation`);
    }
    lines.push('');
  }

  if (fs.existsSync(path.join(PROJECT_ROOT, stressRel))) {
    lines.push(`# Stress theory (loaded via DSL; domain theory already loaded above)`);
    lines.push(`@_ Load "./${stressRel.replaceAll(path.sep, '/')}"`);
  } else {
    lines.push(`# NOTE: Missing stress theory: ${stressRel}`);
  }
  lines.push('');

  // Avoid keys ending with `Type` because strict mode reserves `*Type` identifiers for type markers.
  const posKey = `Key_SP_${sanitizeIdent(domain)}_Core_${sanitizeIdent(coreIdea)}_K`;
  const missingKey = `Key_SP_${sanitizeIdent(domain)}_Missing_Invented`;
  lines.push(`# SAT_QUERY_POS op=StresspediaEntry book=${bookId} key=${posKey} expect=${coreIdea}`);
  lines.push(`# SAT_QUERY_NEG op=StresspediaEntry book=${bookId} key=${missingKey} expect=none`);
  lines.push('');

  // More semantic than the old "Mentions": a triadic encyclopedia index entry.
  // StresspediaEntry(Book, Key, Idea)
  lines.push('@StresspediaEntry:StresspediaEntry __Relation');
  lines.push('');

  // Ensure the POS idea exists in the book and is a Core-known token.
  const refs = [];
  let mentionId = 0;
  const emitEntry = (key, idea) => {
    mentionId++;
    const id = `${recordPrefix}_R${pad(mentionId, 4)}`;
    lines.push(`@${id}:StresspediaEntry_${id} StresspediaEntry ${bookId} ${key} ${idea}`);
    refs.push(`$${id}`);
  };

  emitEntry(posKey, coreIdea);

  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    if (idea === coreIdea) continue;
    const safeIdea = safeIdeaAtom(idea, { coreIdea });
    const key = `Key_SP_${sanitizeIdent(domain)}_I${pad(i + 1, 4)}`;
    emitEntry(key, safeIdea);
  }

  lines.push('');
  lines.push(`@Chapter01_Seq __Sequence [${refs.join(', ')}]`);
  lines.push(`@Chapter01:Chapter01 bundle [${refs.join(', ')}]`);
  lines.push(`@Book_Seq __Sequence [$Chapter01]`);
  lines.push(`@Book:Book bundle [$Chapter01]`);
  lines.push('');

  return lines.join('\n');
}

function listStressDomains() {
  const files = fs.readdirSync(STRESS_DIR)
    .filter(f => f.endsWith('.sys2'))
    .filter(f => !f.endsWith('.sys2.errors'))
    .map(f => f.replace(/\.sys2$/, ''));

  const set = new Set(files);
  const ordered = DOMAIN_ORDER.filter(d => set.has(d));
  for (const d of files.sort()) {
    if (!ordered.includes(d)) ordered.push(d);
  }
  return ordered;
}

function resolveStressPath(domain) {
  return path.join(STRESS_DIR, `${domain}.sys2`);
}

function recordPrefixForDomain(domain) {
  const idx = Math.max(0, DOMAIN_ORDER.indexOf(domain));
  const n = 50 + (idx >= 0 ? idx : 0);
  return `B${pad(n % 100, 2)}`;
}

function bookIdForDomain(domain) {
  return `Stresspedia${titleCase(domain)}`;
}

export function ensureStresspediaBooks({
  outDir = OUT_DIR,
  stressDir = STRESS_DIR,
  regenerate = false,
  domains = null,
  maxIdeas = 800,
  coreIdea = 'EntityType'
} = {}) {
  ensureDir(outDir);

  const selectedDomains = Array.isArray(domains) && domains.length > 0
    ? domains
    : (() => {
        const files = fs.readdirSync(stressDir)
          .filter(f => f.endsWith('.sys2'))
          .filter(f => !f.endsWith('.sys2.errors'))
          .map(f => f.replace(/\.sys2$/, ''));

        const set = new Set(files);
        const ordered = DOMAIN_ORDER.filter(d => set.has(d));
        for (const d of files.sort()) {
          if (!ordered.includes(d)) ordered.push(d);
        }
        return ordered;
      })();

  const written = [];
  const skipped = [];
  const errors = [];

  const shouldRegenerateExisting = (outPath) => {
    try {
      const text = fs.readFileSync(outPath, 'utf8');
      if (text.includes('stresspedia-theories/')) return true; // legacy format
      if (!text.includes(`# STRESSPEDIA_BOOK_VERSION=${STRESSPEDIA_BOOK_VERSION}`)) return true;
      if (!text.includes('@_ Load "./evals/stress/')) return true;
      return false;
    } catch {
      return true;
    }
  };

  for (const domain of selectedDomains) {
    const stressPath = path.join(stressDir, `${domain}.sys2`);
    if (!fs.existsSync(stressPath)) {
      errors.push(`Missing stress file: ${path.relative(PROJECT_ROOT, stressPath)}`);
      continue;
    }

    const outPath = path.join(outDir, `book_stresspedia_${domain}.sys2`);
    const exists = fs.existsSync(outPath);
    if (!regenerate && exists && !shouldRegenerateExisting(outPath)) {
      skipped.push(outPath);
      continue;
    }

    try {
      const recordPrefix = recordPrefixForDomain(domain);
      const bookId = bookIdForDomain(domain);
      const dsl = generateStresspediaBookDsl({
        domain,
        stressPath,
        recordPrefix,
        bookId,
        coreIdea,
        maxIdeas
      });
      fs.writeFileSync(outPath, dsl, 'utf8');
      written.push(outPath);
    } catch (e) {
      errors.push(`Failed to generate ${domain}: ${e.message}`);
    }
  }

  return { written, skipped, errors };
}

function isDirectRun() {
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
  return invoked === __filename;
}

function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    process.stdout.write(`
Generate stresspedia saturation books from evals/stress/*.sys2

Usage:
  node evals/saturation/ltools/gen-stresspedia-books.mjs [options]

Options:
  --help, -h           Show this help message
  --all                Generate books for all stress domains
  --domain=NAME        Generate a single domain (e.g., logic, biology)
  --regenerate          Overwrite existing generated books
  --max-ideas=N        Cap extracted idea count per book (default: 800)
  --core-idea=NAME     POS query idea token (default: EntityType)

Output:
  - Writes to evals/saturation/stresspedia-books/
  - Books are picked up automatically by: node evals/runSaturationEval.mjs
`);
    process.exit(0);
  }

  const domainArg = parseArg('--domain');
  const all = hasFlag('--all') || !domainArg;
  const regenerate = hasFlag('--regenerate');
  const maxIdeasArg = parseArg('--max-ideas');
  const coreIdea = parseArg('--core-idea') || 'EntityType';

  const maxIdeas = maxIdeasArg ? Number.parseInt(maxIdeasArg, 10) : 800;
  if (!Number.isFinite(maxIdeas) || maxIdeas < 0) {
    console.error(`Invalid --max-ideas value: ${maxIdeasArg}`);
    process.exit(2);
  }

  const domains = all ? listStressDomains() : [sanitizeIdent(domainArg.toLowerCase())];
  if (domains.length === 0) {
    console.error('No stress domains found in evals/stress/.');
    process.exit(1);
  }

  const { written, skipped, errors } = ensureStresspediaBooks({
    regenerate,
    domains,
    maxIdeas,
    coreIdea
  });

  if (errors.length) {
    process.stderr.write(`Warnings:\n`);
    for (const e of errors) process.stderr.write(`- ${e}\n`);
  }

  if (written.length === 0 && skipped.length === 0) {
    console.error('No books written.');
    process.exit(1);
  }

  process.stdout.write(`Generated ${written.length} stresspedia book(s).\n`);
  if (skipped.length) process.stdout.write(`Skipped ${skipped.length} existing book(s). Use --regenerate to overwrite.\n`);
  process.stdout.write(`Run:\n  node evals/runSaturationEval.mjs\n`);
}

if (isDirectRun()) main();
