#!/usr/bin/env node
/**
 * Migrates EvalSuite cases from embedding "Proof:" inside `expected_nl`
 * to separate fields: `expected_nl` + `proof_nl`.
 *
 * Scope: only `action: 'prove'` cases within `export const steps = [ ... ]`.
 * Safety: skips cases that already have `proof_nl`.
 *
 * Usage:
 *   node scripts/migrate-proof-nl.mjs
 *   node scripts/migrate-proof-nl.mjs evalSuite/suite06_compound_logic/cases.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

function findJsFiles(rootDir) {
  const out = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      out.push(...findJsFiles(p));
    } else if (e.isFile() && e.name === 'cases.mjs' && p.includes(`${path.sep}evalSuite${path.sep}suite`)) {
      out.push(p);
    }
  }
  return out;
}

function parseSingleQuotedValue(line, key) {
  const idxKey = line.indexOf(key);
  if (idxKey === -1) return null;
  const idxColon = line.indexOf(':', idxKey);
  if (idxColon === -1) return null;
  const idxQuote = line.indexOf("'", idxColon);
  if (idxQuote === -1) return null;

  let i = idxQuote + 1;
  let out = '';
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\') {
      const next = line[i + 1];
      if (next !== undefined) {
        out += ch + next;
        i += 2;
        continue;
      }
    }
    if (ch === "'") {
      return { value: out, endIndex: i };
    }
    out += ch;
    i++;
  }
  return null;
}

function escapeForSingleQuotes(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function migrateFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split('\n');

  let inSteps = false;
  let inCase = false;
  let currentAction = null;
  let hasProofNl = false;
  let changed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inSteps) {
      if (line.includes('export const steps') && line.includes('[')) {
        inSteps = true;
      }
      continue;
    }
    if (inSteps && /^\s*];\s*$/.test(line)) {
      inSteps = false;
      inCase = false;
      currentAction = null;
      hasProofNl = false;
      continue;
    }

    if (/^\s*{\s*$/.test(line)) {
      inCase = true;
      currentAction = null;
      hasProofNl = false;
      continue;
    }
    if (inCase && /^\s*}\s*,?\s*$/.test(line)) {
      inCase = false;
      currentAction = null;
      hasProofNl = false;
      continue;
    }

    if (!inCase) continue;

    const actionMatch = line.match(/^\s*action:\s*'([^']+)'\s*,?\s*$/);
    if (actionMatch) {
      currentAction = actionMatch[1];
      continue;
    }

    if (/^\s*proof_nl:\s*/.test(line)) {
      hasProofNl = true;
      continue;
    }

    if (currentAction !== 'prove' || hasProofNl) continue;

    if (!/^\s*expected_nl:\s*/.test(line)) continue;

    const indent = (line.match(/^(\s*)/) || [''])[0];
    const parsed = parseSingleQuotedValue(line, 'expected_nl');
    if (!parsed) continue;

    const raw = parsed.value;
    if (!raw.includes('True:') || !raw.includes('Proof:')) continue;

    const idx = raw.indexOf('Proof:');
    if (idx === -1) continue;

    const main = raw.slice(0, idx).trimEnd();
    const proof = raw.slice(idx + 'Proof:'.length).trim();

    const mainEsc = escapeForSingleQuotes(main);
    const proofEsc = escapeForSingleQuotes(proof);

    lines[i] = `${indent}expected_nl: '${mainEsc}',`;
    lines.splice(i + 1, 0, `${indent}proof_nl: '${proofEsc}'`);
    i += 1;
    changed += 1;
  }

  if (changed === 0) return { changed: 0 };

  const updated = lines.join('\n');
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
  return { changed };
}

function main() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args.map(p => path.resolve(p))
      : findJsFiles(path.resolve('evalSuite'));

  let totalChanged = 0;
  let fileCount = 0;
  for (const f of files) {
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    const res = migrateFile(f);
    if (res.changed > 0) {
      totalChanged += res.changed;
      fileCount += 1;
      console.log(`[migrate-proof-nl] ${path.relative(process.cwd(), f)}: ${res.changed} case(s) updated`);
    }
  }

  console.log(`[migrate-proof-nl] Done. Files changed: ${fileCount}, cases updated: ${totalChanged}`);
}

main();

