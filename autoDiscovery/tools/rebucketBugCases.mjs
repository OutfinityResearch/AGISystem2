#!/usr/bin/env node
/**
 * Re-run + re-bucket existing bugCases using current translator + evaluator logic.
 *
 * - Deletes cases that are now fixed (correct=true) or unsupported.
 * - Moves remaining cases into the correct BUG folder based on updated detectors.
 * - Updates the JSON payload (bugId/failure/translation/execution/sessionConfig).
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { runExample } from '../discovery/run-example.mjs';
import { detectKnownBugPattern, BUG_PATTERNS } from '../discovery/patterns.mjs';
import { ensureDir } from '../discovery/fs-utils.mjs';
import { CATEGORY } from '../discovery/constants.mjs';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'bugCases');

function listBugDirs() {
  if (!fs.existsSync(ROOT)) return [];
  return fs.readdirSync(ROOT)
    .filter(d => d.startsWith('BUG'))
    .map(d => path.join(ROOT, d))
    .filter(p => fs.statSync(p).isDirectory());
}

function parseArgs(argv) {
  const out = { bug: null, limit: null, slowMs: 5000 };
  for (const a of argv) {
    if (a.startsWith('--bug=')) out.bug = a.slice('--bug='.length).trim();
    if (a.startsWith('--limit=')) {
      const n = Number(a.slice('--limit='.length));
      if (Number.isFinite(n) && n > 0) out.limit = n;
    }
    if (a.startsWith('--slow-ms=')) {
      const n = Number(a.slice('--slow-ms='.length));
      if (Number.isFinite(n) && n >= 0) out.slowMs = n;
    }
  }
  return out;
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function safeRm(fileOrDir) {
  fs.rmSync(fileOrDir, { recursive: true, force: true });
}

function extractExample(raw) {
  return {
    source: raw.source || 'generic',
    context: raw?.input?.context_nl ?? raw?.example?.context ?? '',
    question: raw?.input?.question_nl ?? raw?.example?.question ?? '',
    label: raw?.dataset?.label ?? raw?.example?.label ?? null,
    choices: raw?.dataset?.choices ?? raw?.example?.choices ?? [],
    category: raw?.example?.category ?? null,
    answerIndex: raw?.example?.answerIndex ?? null
  };
}

function updateReport(bugDir, bugId) {
  const jsons = listJsonFiles(bugDir).map(f => path.basename(f)).sort();
  if (jsons.length === 0) return;
  const info = BUG_PATTERNS[bugId] || { name: bugId, description: '' };
  const lines = [
    `# ${bugId}: ${info.name || bugId}`,
    '',
    '## Description',
    info.description || '',
    '',
    '## How to Run Cases',
    '```bash',
    `node autoDiscovery/runBugSuite.mjs --bug=${bugId}`,
    '```',
    '',
    '## All Cases',
    ''
  ];
  for (const f of jsons) {
    const caseId = path.basename(f, '.json');
    lines.push(`### ${caseId}`, `- **JSON:** \`${f}\``, '');
  }
  fs.writeFileSync(path.join(bugDir, 'report.md'), lines.join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bugDirs = listBugDirs();
  if (bugDirs.length === 0) {
    console.log('No bugCases folders found.');
    process.exit(0);
  }

  const selectedDirs = args.bug
    ? bugDirs.filter(d => path.basename(d) === args.bug)
    : bugDirs;

  const allFiles = [];
  for (const dir of selectedDirs) {
    for (const file of listJsonFiles(dir)) allFiles.push({ dir, file });
  }
  if (args.limit) allFiles.splice(args.limit);

  let deleted = 0;
  let moved = 0;
  let kept = 0;

  const touchedBugDirs = new Set();
  const startAll = performance.now();
  let processed = 0;

  for (const { dir, file } of allFiles) {
      const startOne = performance.now();
      const raw = readJson(file);
      const example = extractExample(raw);
      const caseId = raw.caseId || path.basename(file, '.json');

      const result = runExample(example, caseId, {
        autoDeclareUnknownOperators: true,
        sessionConfig: raw.sessionConfig || undefined
      });

      if (result.correct === true || result.category === CATEGORY.PASSED) {
        safeRm(file);
        deleted++;
        processed++;
        if (performance.now() - startOne >= args.slowMs) {
          console.log(`SLOW(${Math.round(performance.now() - startOne)}ms): ${caseId} => deleted`);
        }
        if (processed % 10 === 0) {
          console.log(`Progress: ${processed}/${allFiles.length} (elapsed ${Math.round((performance.now() - startAll) / 1000)}s)`);
        }
        continue;
      }

      if (result.category === CATEGORY.UNSUPPORTED) {
        safeRm(file);
        deleted++;
        processed++;
        if (performance.now() - startOne >= args.slowMs) {
          console.log(`SLOW(${Math.round(performance.now() - startOne)}ms): ${caseId} => unsupported`);
        }
        if (processed % 10 === 0) {
          console.log(`Progress: ${processed}/${allFiles.length} (elapsed ${Math.round((performance.now() - startAll) / 1000)}s)`);
        }
        continue;
      }

      const bugId = result.category === CATEGORY.REASONING
        ? (detectKnownBugPattern(result.translated, example, result) || 'BUG000')
        : 'BUG011';

      const targetDir = path.join(ROOT, bugId);
      ensureDir(targetDir);

      const targetFile = path.join(targetDir, `${caseId}.json`);
      if (path.resolve(targetFile) !== path.resolve(file)) {
        fs.renameSync(file, targetFile);
        moved++;
      } else {
        kept++;
      }

      // Update JSON payload to match current run.
      const updated = {
        caseId,
        bugId,
        source: example.source,
        failure: {
          category: result.category,
          reason: result.reason,
          details: result.details
        },
        dataset: {
          label: example.label,
          expectProved: result.translated?.expectProved ?? null,
          choices: Array.isArray(example.choices) ? example.choices : []
        },
        input: {
          context_nl: example.context,
          question_nl: example.question
        },
        translation: {
          translator: 'src/nlp/nl2dsl.mjs::translateExample',
          options: { autoDeclareUnknownOperators: true },
          contextDsl: result.translated?.contextDsl || '',
          questionDsl: result.translated?.questionDsl || '',
          contextErrors: result.translated?.contextErrors || [],
          contextWarnings: result.translated?.contextWarnings || [],
          contextStats: result.translated?.contextStats || null,
          contextAutoDeclaredOperators: result.translated?.contextAutoDeclaredOperators || []
        },
        sessionConfig: result.sessionConfig || raw.sessionConfig || null,
        execution: {
          learnResult: result.learnResult || null,
          proveResult: result.proveResult || null,
          actual_nl: result.actual_nl || null
        },
        expected: raw.expected || {
          expected_proved: result.translated?.expectProved ?? null,
          expected_nl: 'TODO',
          note: 'Run `node autoDiscovery/runBugCase.mjs --accept-actual <case.json>` after reviewing actual_nl'
        },
        timestamp: raw.timestamp || new Date().toISOString()
      };

      writeJson(targetFile, updated);
      touchedBugDirs.add(targetDir);
      touchedBugDirs.add(path.join(path.dirname(file)));
      processed++;
      if (performance.now() - startOne >= args.slowMs) {
        console.log(`SLOW(${Math.round(performance.now() - startOne)}ms): ${caseId} => ${bugId}`);
      }
      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${allFiles.length} (elapsed ${Math.round((performance.now() - startAll) / 1000)}s)`);
      }
  }

  // Delete empty bug dirs and refresh reports.
  for (const dir of listBugDirs()) {
    const jsons = listJsonFiles(dir);
    const bugId = path.basename(dir);
    if (jsons.length === 0) {
      safeRm(dir);
      continue;
    }
    updateReport(dir, bugId);
  }

  console.log(`Rebucket complete: deleted=${deleted} moved=${moved} kept=${kept}`);
  console.log(`Total time: ${Math.round((performance.now() - startAll) / 1000)}s for ${processed} cases`);
}

main().catch(err => {
  console.error(`Fatal: ${err.stack || err.message}`);
  process.exit(1);
});
