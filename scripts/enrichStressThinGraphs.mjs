#!/usr/bin/env node
/**
 * Enrich "thin" stress-graph operator definitions with Core event structure.
 *
 * Targets patterns like:
 *   @op:op graph a b
 *       @x __Role Agent $a
 *       @y __Role Theme $b
 *       @r __Bundle $x $y
 *       return $r
 *   end
 *
 * Rewrites to include:
 *   @eid __Event
 *   @act __Role Action op
 *   @ctx __Role Context StressCompat
 *   @r __Bundle $eid $act $x $y $ctx
 *
 * Conservative: only touches blocks that already contain a __Bundle + `return $<bundleDest>`
 * and do NOT already mention __Event anywhere in the block.
 *
 * Usage:
 *   node scripts/enrichStressThinGraphs.mjs [--write]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(join(__dirname, '..'));
const STRESS_DIR = join(ROOT, 'evals', 'stress');

function hasFlag(args, flag) {
  return args.includes(flag);
}

function toRel(p) {
  return relative(ROOT, p) || p;
}

function isCommentOrBlank(line) {
  const t = line.trim();
  return !t || t.startsWith('#');
}

function parseGraphHeader(line) {
  const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\s+graph\b/);
  if (!m) return null;
  return { name: m[1], persistName: m[2] };
}

function collectDestinations(blockLines) {
  const names = new Set();
  for (const raw of blockLines) {
    const m = raw.match(/^\s*@([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (m) names.add(m[1]);
  }
  return names;
}

function uniqueName(base, existing) {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

function rewriteOneGraphBlock({ header, bodyLines, endLine }) {
  // Skip if already has an event marker anywhere.
  if (bodyLines.some(l => l.includes('__Event'))) return null;

  const bundleIdx = bodyLines.findIndex(l => l.match(/^\s*@\w+\s+__Bundle\b/));
  if (bundleIdx === -1) return null;

  const bundleLine = bodyLines[bundleIdx];
  const bundleMatch = bundleLine.match(/^(\s*)@(\w+)\s+__Bundle\s+(.+?)\s*$/);
  if (!bundleMatch) return null;
  const indent = bundleMatch[1];
  const bundleDest = bundleMatch[2];
  const bundleArgs = bundleMatch[3].trim();

  const returnIdx = bodyLines.findIndex(l => l.trim() === `return $${bundleDest}`);
  if (returnIdx === -1) return null;

  // Only enrich truly "thin-ish" blocks: keep it conservative to avoid rewriting complex logic blocks.
  // If there are more than ~8 meaningful lines, likely not thin.
  const meaningful = bodyLines.filter(l => !isCommentOrBlank(l) && l.trim() !== 'return' && !l.trim().startsWith('return '));
  if (meaningful.length > 8) return null;

  // Insert event structure after leading comments/blank lines.
  const existingDests = collectDestinations(bodyLines);
  const eid = uniqueName('eid', existingDests);
  existingDests.add(eid);
  const act = uniqueName('act', existingDests);
  existingDests.add(act);
  const ctx = uniqueName('ctx', existingDests);
  existingDests.add(ctx);

  const insertAt = bodyLines.findIndex(l => !isCommentOrBlank(l));
  const insertPos = insertAt === -1 ? 0 : insertAt;

  const inserted = [
    `${indent}@${eid} __Event`,
    `${indent}@${act} __Role Action ${header.persistName}`,
    `${indent}@${ctx} __Role Context StressCompat`
  ];

  const newBody = [...bodyLines];
  newBody.splice(insertPos, 0, ...inserted);

  // Patch the bundle line (account for insertion shifting indexes).
  const newBundleIdx = bundleIdx + inserted.length * (bundleIdx >= insertPos ? 1 : 0);
  const old = newBody[newBundleIdx];
  const oldM = old.match(/^(\s*)@(\w+)\s+__Bundle\s+(.+?)\s*$/);
  if (!oldM) return null;
  const args = oldM[3].trim();

  // Avoid double-inserting if script re-runs.
  const hasToken = (token) => new RegExp(`(^|\\s)\\$${token}(\\s|$)`).test(args);
  if (hasToken(eid) || hasToken(act) || hasToken(ctx)) return null;

  const patchedArgs = `$${eid} $${act} ${args} $${ctx}`.replace(/\s+/g, ' ').trim();
  newBody[newBundleIdx] = `${oldM[1]}@${bundleDest} __Bundle ${patchedArgs}`;

  return {
    headerLine: header.raw,
    bodyLines: newBody,
    endLine
  };
}

async function main() {
  const args = process.argv.slice(2);
  const WRITE = hasFlag(args, '--write');

  const files = (await readdir(STRESS_DIR))
    .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors'))
    .map(f => join(STRESS_DIR, f))
    .sort();

  let changedFiles = 0;
  let enrichedBlocks = 0;

  for (const filePath of files) {
    const original = await readFile(filePath, 'utf8');
    const lines = original.split('\n');
    const out = [];

    let i = 0;
    let fileEnriched = 0;
    while (i < lines.length) {
      const headerInfo = parseGraphHeader(lines[i]);
      if (!headerInfo) {
        out.push(lines[i]);
        i += 1;
        continue;
      }

      const headerLine = lines[i];
      const header = { ...headerInfo, raw: headerLine };
      out.push(headerLine);
      i += 1;

      const bodyStart = i;
      while (i < lines.length && lines[i].trim() !== 'end') i += 1;
      if (i >= lines.length) {
        // malformed; just append rest
        out.push(...lines.slice(bodyStart));
        break;
      }

      const bodyLines = lines.slice(bodyStart, i);
      const endLine = lines[i];
      const rewritten = rewriteOneGraphBlock({ header, bodyLines, endLine });
      if (!rewritten) {
        out.push(...bodyLines);
        out.push(endLine);
        i += 1;
        continue;
      }

      fileEnriched += 1;
      out.push(...rewritten.bodyLines);
      out.push(endLine);
      i += 1;
    }

    const updated = out.join('\n');
    if (updated !== original) {
      changedFiles += 1;
      enrichedBlocks += fileEnriched;
      if (WRITE) await writeFile(filePath, updated, 'utf8');
      console.log(`${WRITE ? 'UPDATED' : 'WOULD UPDATE'} ${toRel(filePath)} (+${fileEnriched} enriched graphs)`);
    }
  }

  console.log(`\n${WRITE ? 'DONE' : 'DRY RUN'}: files changed ${changedFiles}/${files.length}, graphs enriched ${enrichedBlocks}`);
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
