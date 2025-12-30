import fs from 'node:fs';
import { join } from 'node:path';

import { QUARANTINE_DIR, BUG_CASES_DIR, NLP_BUGS_DIR, CATEGORY } from '../discovery/constants.mjs';
import { detectKnownBugPattern, detectNlpBugPattern, BUG_PATTERNS, NLP_BUG_PATTERNS } from '../discovery/patterns.mjs';
import { runExample } from '../discovery/run-example.mjs';
import { ensureDir } from '../discovery/fs-utils.mjs';
import { writeBugCaseJson, writeNlpBugCaseJson } from '../discovery/write-cases.mjs';
import { readJsonFileSafe } from './json.mjs';
import { refreshFolderReport } from './reports.mjs';

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
}

function extractExample(quarantineJson) {
  const ex = quarantineJson?.example || {};
  return {
    source: ex.source || quarantineJson.source || 'generic',
    context: ex.context || quarantineJson?.input?.context_nl || '',
    question: ex.question || quarantineJson?.input?.question_nl || '',
    label: ex.label ?? quarantineJson?.dataset?.label ?? null,
    choices: Array.isArray(ex.choices) ? ex.choices : (Array.isArray(quarantineJson?.dataset?.choices) ? quarantineJson.dataset.choices : []),
    category: ex.category || null,
    answerIndex: ex.answerIndex ?? null
  };
}

export function categorizeQuarantine({
  autoDeclareUnknownOperators = true,
  maxPerBug = 10,
  maxPerNlpBug = 10,
  keepFixedInQuarantine = false
} = {}) {
  ensureDir(QUARANTINE_DIR);
  const files = listJsonFiles(QUARANTINE_DIR);

  const touchedBug = new Set();
  const touchedNlp = new Set();

  const stats = {
    total: files.length,
    fixed: 0,
    movedBug: 0,
    movedNlp: 0,
    kept: 0,
    byBug: {},
    byNlp: {}
  };

  for (const file of files) {
    const raw = readJsonFileSafe(file);
    if (!raw) continue;
    const caseId = raw.caseId || file.split('/').pop()?.replace(/\\.json$/, '');
    const example = extractExample(raw);

    const result = runExample(example, caseId, { autoDeclareUnknownOperators });

    if (result.correct === true) {
      stats.fixed++;
      if (!keepFixedInQuarantine) {
        try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
      } else {
        stats.kept++;
      }
      continue;
    }

    const translatorOptions = { autoDeclareUnknownOperators };

    if (result.category === CATEGORY.REASONING) {
      const bugId = detectKnownBugPattern(result.translated, example, result) || 'BUG000';
      ensureDir(join(BUG_CASES_DIR, bugId));
      writeBugCaseJson(bugId, result, example, translatorOptions);
      touchedBug.add(bugId);
      stats.movedBug++;
      stats.byBug[bugId] = (stats.byBug[bugId] || 0) + 1;
      try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
      continue;
    }

    // Everything else becomes an NLP bucket (including invalid goal / learn failed).
    const nlpId = detectNlpBugPattern(result.reason, result, example) || 'NLP000';
    ensureDir(join(NLP_BUGS_DIR, nlpId));
    writeNlpBugCaseJson(nlpId, result, example, translatorOptions);
    touchedNlp.add(nlpId);
    stats.movedNlp++;
    stats.byNlp[nlpId] = (stats.byNlp[nlpId] || 0) + 1;
    try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
  }

  // Refresh reports + enforce caps for touched folders (and remove empty dirs).
  for (const bugId of touchedBug) {
    const p = BUG_PATTERNS[bugId] || { name: bugId, description: '' };
    refreshFolderReport(join(BUG_CASES_DIR, bugId), {
      id: bugId,
      title: p.name || bugId,
      description: p.description || '',
      maxCases: maxPerBug
    });
  }

  for (const nlpId of touchedNlp) {
    const p = NLP_BUG_PATTERNS[nlpId] || { name: nlpId, description: '' };
    refreshFolderReport(join(NLP_BUGS_DIR, nlpId), {
      id: nlpId,
      title: p.name || nlpId,
      description: p.description || '',
      maxCases: maxPerNlpBug
    });
  }

  return stats;
}
