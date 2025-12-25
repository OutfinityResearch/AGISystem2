import fs from 'node:fs';
import { join } from 'node:path';

import { CATEGORY, QUARANTINE_DIR } from './constants.mjs';
import { ensureDir } from './fs-utils.mjs';
import { detectKnownBugPattern, detectNlpBugPattern } from './patterns.mjs';
import { writeBugCaseJson, writeNlpBugCaseJson } from './write-cases.mjs';

export function processQuarantine({ translatorOptions = { autoDeclareUnknownOperators: true } } = {}) {
  ensureDir(QUARANTINE_DIR);
  const files = fs.readdirSync(QUARANTINE_DIR).filter(f => f.endsWith('.json'));
  const moved = { bug: {}, nlp: {}, skipped: 0 };

  for (const file of files) {
    const filePath = join(QUARANTINE_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      moved.skipped++;
      continue;
    }

    const example = data.example || {};
    const result = {
      caseId: data.caseId,
      category: data.category,
      reason: data.reason,
      details: data.details,
      translated: data.translated,
      learnResult: data.learnResult,
      proveResult: data.proveResult,
      actual_nl: data.actual_nl,
      sessionConfig: data.sessionConfig
    };

    try {
      if (data.category === CATEGORY.REASONING) {
        const bugId = detectKnownBugPattern(data.translated, example, { reason: data.reason, details: data.details }) || 'BUG000';
        writeBugCaseJson(bugId, result, example, translatorOptions);
        moved.bug[bugId] = (moved.bug[bugId] || 0) + 1;
        fs.unlinkSync(filePath);
        continue;
      }

      // Translation/goal/learn failures are stored separately to keep the bug tracker actionable.
      if (data.category === CATEGORY.TRANSLATION || data.category === CATEGORY.INVALID_GOAL || data.category === CATEGORY.LEARN_FAILED) {
        const nlpId = detectNlpBugPattern(data.reason, result, example) || 'NLP000';
        writeNlpBugCaseJson(nlpId, result, example, translatorOptions);
        moved.nlp[nlpId] = (moved.nlp[nlpId] || 0) + 1;
        fs.unlinkSync(filePath);
        continue;
      }

      // Unknown/unsupported/no-expectation: keep a small trace as BUG000 to avoid leaving quarantine dirty.
      writeBugCaseJson('BUG000', result, example, translatorOptions);
      moved.bug.BUG000 = (moved.bug.BUG000 || 0) + 1;
      fs.unlinkSync(filePath);
    } catch {
      // Leave the file in quarantine if processing fails.
      moved.skipped++;
    }
  }

  return moved;
}
