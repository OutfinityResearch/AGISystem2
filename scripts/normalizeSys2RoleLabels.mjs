#!/usr/bin/env node
/**
 * Normalize non-Core `__Role <Label> ...` usage to Core semantic roles.
 *
 * Why:
 * - Stress / generated corpora often misuse `__Role` with open-vocabulary labels (e.g. `__Role Argument ...`).
 * - In Core semantics, role labels should come from `config/Core/09-roles.sys2` to keep schemas coherent.
 *
 * What it does:
 * - Reads Core roles from `config/Core/09-roles.sys2`.
 * - Rewrites `__Role <Label>` where `<Label>` is not Core into `__Role <MappedCoreRole>`.
 *
 * Notes:
 * - This is intentionally conservative: it does not expand the DSL (no extra lines), to keep files compact.
 * - Run with `--write` to update files in-place; otherwise it prints a summary only.
 *
 * Usage:
 *   node scripts/normalizeSys2RoleLabels.mjs --stress [--write]
 *   node scripts/normalizeSys2RoleLabels.mjs --paths=evals/stress/logic.sys2,config/Anthropology/00-concepts.sys2 --write
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(join(__dirname, '..'));

function hasFlag(args, flag) {
  return args.includes(flag);
}

function getArgValue(args, name) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const val = args[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function parseList(value) {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function toRel(p) {
  return relative(ROOT, p) || p;
}

async function listSys2FilesRec(dirPath) {
  const { readdir } = await import('node:fs/promises');
  const out = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dirPath, ent.name);
    if (ent.isDirectory()) {
      out.push(...await listSys2FilesRec(p));
    } else if (ent.isFile() && ent.name.endsWith('.sys2') && !ent.name.endsWith('.errors')) {
      out.push(p);
    }
  }
  return out;
}

function parseCoreRoles(content) {
  const roles = new Set();
  const lines = content.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^@([A-Za-z_][A-Za-z0-9_]*)\:([A-Za-z_][A-Za-z0-9_]*)\s+__Relation\b/);
    if (!m) continue;
    roles.add(m[1]);
    roles.add(m[2]);
  }
  return roles;
}

// Best-effort mappings from domain-ish labels -> Core semantic roles.
// Anything not found here falls back to Attribute.
const ROLE_MAP = {
  // Generic / logic
  // Preserve ordered-pair feel without inventing ad-hoc schema roles.
  // These often originate from superficial placeholder schemas.
  Left: 'Source',
  Right: 'Goal',
  Relation: 'Action',
  Argument: 'Content',
  Proposition: 'Content',
  Claim: 'Content',
  Content: 'Content',
  Meaning: 'Content',
  Narrative: 'Content',
  Story: 'Content',
  Context: 'Context',
  Law: 'Context',
  Domain: 'Context',
  Principle: 'Property',
  Validity: 'Property',
  Property: 'Property',
  Nature: 'Nature',
  Fallacy: 'Type',
  ReasoningType: 'Type',
  Reasoning: 'Process',
  Event: 'Action',
  Effect: 'Result',
  ApparentCause: 'Cause',
  Cause: 'Cause',
  Target: 'Target',
  Person: 'Entity',
  Emotion: 'State',
  Expression: 'Content',
  Indicator: 'Attribute',
  View: 'Context',
  Value: 'Value',
  Unit: 'Unit',

  // Anthropology-ish
  System: 'Structure',
  Institution: 'Structure',
  Framework: 'Structure',
  Structure: 'Structure',
  Pattern: 'Structure',
  Representation: 'Content',
  Transmission: 'Process',
  Practice: 'Action',
  Method: 'Process',
  Technique: 'Instrument',
  Mode: 'Manner',
  Giver: 'Agent',
  Producer: 'Agent',
  Researcher: 'Agent',
  Observer: 'Experiencer',
  Believer: 'Experiencer',
  Worshipper: 'Experiencer',
  Receiver: 'Recipient',
  DataSource: 'Source',
  Basis: 'Attribute',
  Rule: 'Property',
  Status: 'State',
  Object: 'Theme',
  Deity: 'Entity',
  Ancestor: 'Theme',
  Descendant: 'Theme',
  Spouse: 'Theme'
};

function rewriteRoleLabels(content, coreRoles, stats) {
  const out = [];
  const lines = content.split('\n');
  for (const raw of lines) {
    const m = raw.match(/^(\s*)@(\w+)\s+__Role\s+([A-Za-z_][A-Za-z0-9_]*)(\b[\s\S]*)$/);
    if (!m) {
      out.push(raw);
      continue;
    }

    const indent = m[1];
    const dest = m[2];
    const label = m[3];
    const suffix = m[4];

    // Special-case legacy placeholder roles that were normalized previously to Theme.
    // We keep them as ordered pair endpoints (Source/Goal) instead of generic Theme.
    if (label === 'Theme' && (dest === 'left' || dest === 'right')) {
      const mapped = dest === 'left' ? 'Source' : 'Goal';
      stats.rewritten += 1;
      stats.byLabel.set(`${label}:${dest}`, (stats.byLabel.get(`${label}:${dest}`) || 0) + 1);
      stats.byMapping.set(`${label}:${dest} -> ${mapped}`, (stats.byMapping.get(`${label}:${dest} -> ${mapped}`) || 0) + 1);
      out.push(`${indent}@${dest} __Role ${mapped}${suffix}`);
      continue;
    }

    if (coreRoles.has(label)) {
      out.push(raw);
      continue;
    }

    const mapped = ROLE_MAP[label] || 'Attribute';
    if (!coreRoles.has(mapped)) {
      // Shouldn't happen; keep original if mapping is invalid.
      out.push(raw);
      continue;
    }

    stats.rewritten += 1;
    stats.byLabel.set(label, (stats.byLabel.get(label) || 0) + 1);
    stats.byMapping.set(`${label} -> ${mapped}`, (stats.byMapping.get(`${label} -> ${mapped}`) || 0) + 1);
    out.push(`${indent}@${dest} __Role ${mapped}${suffix}`);
  }
  return out.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const WRITE = hasFlag(args, '--write');
  const stressMode = hasFlag(args, '--stress');
  const pathsArg = getArgValue(args, '--paths');

  const rolesPath = join(ROOT, 'config', 'Core', '09-roles.sys2');
  if (!existsSync(rolesPath)) {
    throw new Error(`Missing Core roles file: ${toRel(rolesPath)}`);
  }
  const coreRoles = parseCoreRoles(await readFile(rolesPath, 'utf8'));

  let files = [];
  if (pathsArg) {
    files = parseList(pathsArg).map(p => resolve(join(ROOT, p)));
  } else if (stressMode) {
    files = await listSys2FilesRec(join(ROOT, 'evals', 'stress'));
  } else {
    throw new Error('Pass --stress or --paths=... (comma-separated).');
  }

  files.sort();

  const overall = {
    changed: 0,
    rewritten: 0,
    files: [],
    byLabel: new Map(),
    byMapping: new Map()
  };

  for (const filePath of files) {
    const rel = toRel(filePath);
    const original = await readFile(filePath, 'utf8');
    const stats = { rewritten: 0, byLabel: new Map(), byMapping: new Map() };
    const updated = rewriteRoleLabels(original, coreRoles, stats);

    if (updated !== original) {
      overall.changed += 1;
      overall.rewritten += stats.rewritten;
      for (const [k, v] of stats.byLabel) overall.byLabel.set(k, (overall.byLabel.get(k) || 0) + v);
      for (const [k, v] of stats.byMapping) overall.byMapping.set(k, (overall.byMapping.get(k) || 0) + v);
      overall.files.push({ file: rel, rewritten: stats.rewritten });
      if (WRITE) {
        await writeFile(filePath, updated, 'utf8');
      }
    }
  }

  const action = WRITE ? 'UPDATED' : 'WOULD UPDATE';
  console.log(`${action} ${overall.changed}/${files.length} files | rewritten __Role labels: ${overall.rewritten}`);

  if (overall.files.length > 0) {
    console.log('\nFiles changed:');
    for (const entry of overall.files) {
      console.log(`- ${entry.file} (${entry.rewritten} rewrites)`);
    }
  }

  const top = [...overall.byMapping.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  if (top.length > 0) {
    console.log('\nTop mappings (count):');
    for (const [k, v] of top) {
      console.log(`- ${k}: ${v}`);
    }
  }
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
