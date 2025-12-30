#!/usr/bin/env node
/**
 * Apply DSL-derived `input_nl` into all suite case files.
 *
 * Goal:
 * - Ensure `input_nl` is strictly a translation of `input_dsl` / `query_dsl`
 * - Remove any hand-written hinty NL (proof chains, etc.) by overwriting it
 * - Avoid storing generated lookup tables in the repo
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session } from '../../../src/runtime/session.mjs';
import { discoverSuites, loadSuite } from '../lib/loader.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

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

function shouldGenerateForCase(c) {
  if (!c || typeof c !== 'object') return false;
  if (!c.input_dsl && !c.query_dsl) return false;
  return ['learn', 'prove', 'query', 'listSolutions'].includes(c.action);
}

function escapeSingleQuotedJsString(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}

function ensureFinalPunctuation(s) {
  const t = String(s ?? '').trim();
  if (!t) return '';
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

function generatedInputNlForCase(session, c) {
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
    return res.lines
      .map(l => String(l ?? '').trim().replace(/[.!?]+$/g, ''))
      .filter(Boolean)
      .map(l => `${l}.`)
      .join(' ');
  }

  // query/prove: use first line (one sentence)
  return ensureFinalPunctuation(res.lines[0] || '');
}

function findExportedArray(source) {
  const candidates = ['steps', 'cases'];
  for (const name of candidates) {
    const idx = source.indexOf(`export const ${name} = [`);
    if (idx !== -1) return { name, idx };
  }
  return null;
}

function scanToMatchingBracket(source, openIndex, openChar, closeChar) {
  let i = openIndex;
  let depth = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  let inLineComment = false;
  let inBlockComment = false;

  const n = source.length;
  for (; i < n; i++) {
    const c = source[i];
    const next = i + 1 < n ? source[i + 1] : '';

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inS) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") inS = false;
      continue;
    }
    if (inD) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"') inD = false;
      continue;
    }
    if (inT) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inT = false;
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (c === "'") {
      inS = true;
      continue;
    }
    if (c === '"') {
      inD = true;
      continue;
    }
    if (c === '`') {
      inT = true;
      continue;
    }

    if (c === openChar) depth++;
    if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findTopLevelObjectRanges(arraySource) {
  const ranges = [];
  let i = 0;
  let braceDepth = 0;
  let objStart = -1;
  let inS = false;
  let inD = false;
  let inT = false;
  let inLineComment = false;
  let inBlockComment = false;

  const n = arraySource.length;
  for (; i < n; i++) {
    const c = arraySource[i];
    const next = i + 1 < n ? arraySource[i + 1] : '';

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inS) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") inS = false;
      continue;
    }
    if (inD) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"') inD = false;
      continue;
    }
    if (inT) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inT = false;
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (c === "'") {
      inS = true;
      continue;
    }
    if (c === '"') {
      inD = true;
      continue;
    }
    if (c === '`') {
      inT = true;
      continue;
    }

    if (c === '{') {
      if (braceDepth === 0) objStart = i;
      braceDepth++;
      continue;
    }
    if (c === '}') {
      braceDepth--;
      if (braceDepth === 0 && objStart !== -1) {
        ranges.push({ start: objStart, end: i + 1 });
        objStart = -1;
      }
    }
  }
  return ranges;
}

function replaceOrInsertInputNl(objectSource, generatedNl) {
  const nl = escapeSingleQuotedJsString(generatedNl);

  const keyIdx = objectSource.indexOf('input_nl');
  if (keyIdx !== -1) {
    // Replace the existing single-quoted literal after `input_nl:`
    const colon = objectSource.indexOf(':', keyIdx);
    if (colon === -1) return objectSource;
    const quote = objectSource.indexOf("'", colon);
    if (quote === -1) return objectSource;

    let i = quote + 1;
    for (; i < objectSource.length; i++) {
      const c = objectSource[i];
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") break;
    }
    if (i >= objectSource.length) return objectSource;

    return objectSource.slice(0, quote + 1) + nl + objectSource.slice(i);
  }

  // Insert after `action: ...`
  const actionMatch = objectSource.match(/\n(\s*)action\s*:\s*'[^']*'\s*,?\s*\n/);
  if (!actionMatch) return objectSource;
  const indent = actionMatch[1] || '';
  const insertAt = actionMatch.index + actionMatch[0].length;
  const insertLine = `${indent}input_nl: '${nl}',\n`;
  return objectSource.slice(0, insertAt) + insertLine + objectSource.slice(insertAt);
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

  let touched = 0;
  for (const suiteName of selected) {
    const suite = await loadSuite(suiteName);
    const cases = suite.cases || [];
    if (cases.length === 0) continue;

    const casesPath = path.join(PROJECT_ROOT, 'evals', 'fastEval', suiteName, 'cases.mjs');
    const src = fs.readFileSync(casesPath, 'utf8');
    const exported = findExportedArray(src);
    if (!exported) {
      console.error(`[${suiteName}] Could not find exported steps/cases array in ${casesPath}`);
      process.exitCode = 1;
      continue;
    }

    const openBracket = src.indexOf('[', exported.idx);
    if (openBracket === -1) {
      console.error(`[${suiteName}] Malformed exported array (missing '[') in ${casesPath}`);
      process.exitCode = 1;
      continue;
    }
    const closeBracket = scanToMatchingBracket(src, openBracket, '[', ']');
    if (closeBracket === -1) {
      console.error(`[${suiteName}] Malformed exported array (no matching ']') in ${casesPath}`);
      process.exitCode = 1;
      continue;
    }

    const before = src.slice(0, openBracket + 1);
    const arrayBody = src.slice(openBracket + 1, closeBracket);
    const after = src.slice(closeBracket);

    const objectRanges = findTopLevelObjectRanges(arrayBody);
    if (objectRanges.length !== cases.length) {
      console.error(`[${suiteName}] Object count mismatch: parsed=${objectRanges.length}, exported=${cases.length} in ${casesPath}`);
      process.exitCode = 1;
      continue;
    }

    let outBody = '';
    let cursor = 0;
    for (let i = 0; i < objectRanges.length; i++) {
      const r = objectRanges[i];
      outBody += arrayBody.slice(cursor, r.start);

      const objSrc = arrayBody.slice(r.start, r.end);
      const c = cases[i];
      const should = shouldGenerateForCase(c);
      const generated = should ? generatedInputNlForCase(session, c) : null;
      outBody += generated ? replaceOrInsertInputNl(objSrc, generated) : objSrc;

      cursor = r.end;
    }
    outBody += arrayBody.slice(cursor);

    const nextSrc = before + outBody + after;
    if (nextSrc !== src) {
      fs.writeFileSync(casesPath, nextSrc, 'utf8');
      touched++;
      console.log(`[${suiteName}] updated input_nl for ${cases.length} case(s)`);
    } else {
      console.log(`[${suiteName}] no changes`);
    }
  }

  session.close();
  console.log(`Done. Updated suite files: ${touched}`);
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
