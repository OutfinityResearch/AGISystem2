#!/usr/bin/env node
/**
 * Prune resolved NLP bug snapshots.
 *
 * These JSON files are historical snapshots created by `bugsAutoDiscovery.mjs`.
 * They are not auto-deleted when the translator improves.
 *
 * Default: move resolved cases into `autoDiscovery/nlpBugs/_resolved/<NLPID>/`.
 *
 * Usage:
 *   node autoDiscovery/pruneNlpBugs.mjs
 *   node autoDiscovery/pruneNlpBugs.mjs --dry-run
 */

import fs from 'node:fs';
import { join } from 'node:path';

import { translateExample } from '../src/nlp/nl2dsl.mjs';
import { createSession, validateQuestionDsl } from './discovery/session.mjs';

const ROOT = join(process.cwd(), 'autoDiscovery', 'nlpBugs');
const RESOLVED_ROOT = join(ROOT, '_resolved');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-n'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
}

function listCases() {
  if (!fs.existsSync(ROOT)) return [];
  const nlpIds = fs.readdirSync(ROOT).filter(d => d.startsWith('NLP') && fs.statSync(join(ROOT, d)).isDirectory());
  const cases = [];
  for (const nlpId of nlpIds) {
    const dir = join(ROOT, nlpId);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      cases.push({ nlpId, path: join(dir, file), file });
    }
  }
  return cases;
}

function classifyWithCurrentCode(caseJson) {
  const source = caseJson.source || caseJson.example?.source || 'generic';
  const context = caseJson.input?.context_nl ?? caseJson.example?.context ?? '';
  const question = caseJson.input?.question_nl ?? caseJson.example?.question ?? '';
  const label = caseJson.input?.label ?? caseJson.example?.label ?? caseJson.dataset?.label ?? null;

  const translated = translateExample({
    source,
    context,
    question,
    label,
    translateOptions: {
      autoDeclareUnknownOperators: true,
      expandCompoundQuestions: true
    }
  });

  if (!translated.contextDsl || !translated.contextDsl.trim()) return { ok: false, reason: 'context_translation_empty' };
  if (!translated.questionDsl || !translated.questionDsl.trim()) return { ok: false, reason: 'question_translation_empty' };

  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) return { ok: false, reason: goalValidation.reason };

  const session = createSession();
  if (Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
    const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
    session.learn(declLines);
  }

  try {
    const learnResult = session.learn(translated.contextDsl);
    if (learnResult.success === false || (learnResult.errors && learnResult.errors.length > 0)) {
      return { ok: false, reason: 'learn_failed' };
    }
  } catch (e) {
    return { ok: false, reason: 'learn_failed' };
  }

  return { ok: true, reason: 'resolved' };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs();
  const cases = listCases();

  let resolved = 0;
  let still = 0;
  const byReason = {};
  const examplesByReason = {};

  for (const c of cases) {
    const data = JSON.parse(fs.readFileSync(c.path, 'utf8'));
    const verdict = classifyWithCurrentCode(data);
    if (!verdict.ok) {
      still++;
      byReason[verdict.reason] = (byReason[verdict.reason] || 0) + 1;
      if (args.verbose) {
        examplesByReason[verdict.reason] ||= [];
        if (examplesByReason[verdict.reason].length < 5) {
          examplesByReason[verdict.reason].push(`${c.nlpId}/${c.file}`);
        }
      }
      continue;
    }

    resolved++;
    const destDir = join(RESOLVED_ROOT, c.nlpId);
    const destPath = join(destDir, c.file);

    if (!args.dryRun) {
      ensureDir(destDir);
      fs.renameSync(c.path, destPath);
    }
  }

  console.log(`NLP bug snapshots: ${cases.length}`);
  console.log(`Resolved (moved): ${resolved}${args.dryRun ? ' (dry-run)' : ''}`);
  console.log(`Still failing: ${still}`);
  if (still > 0) {
    const sorted = Object.entries(byReason).sort((a, b) => b[1] - a[1]);
    console.log('\nStill failing by reason:');
    for (const [reason, count] of sorted) {
      console.log(`  ${reason.padEnd(28)} ${count}`);
      if (args.verbose && Array.isArray(examplesByReason[reason]) && examplesByReason[reason].length > 0) {
        console.log(`    e.g. ${examplesByReason[reason].join(', ')}`);
      }
    }
    if (!args.verbose) {
      console.log('\nTip: add --verbose to print example filenames per reason.');
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
