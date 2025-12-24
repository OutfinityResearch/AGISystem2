import { C, CATEGORY } from './constants.mjs';
import { generateCaseId } from './ids.mjs';
import { recordAnalysedCase } from './analysed.mjs';
import { runExample } from './run-example.mjs';
import { detectKnownBugPattern, detectNlpBugPattern } from './patterns.mjs';
import { quarantineCase, writeBugCaseJson, writeNlpBugCaseJson } from './write-cases.mjs';

export async function runBatch(examples, analysedCases, args) {
  const results = {
    total: 0,
    passed: 0,
    categoryA: 0,
    categoryB: 0,
    categoryU: 0,
    categoryS: 0,
    categoryN: 0,
    categoryL: 0,
    categoryG: 0,
    skipped: 0,
    byBugType: {},
    byNlpBug: {},
    bySource: {},
    byReason: {}
  };

  const toProcess = [];
  for (const example of examples) {
    const caseId = generateCaseId(example.source || 'generic', example);
    if (analysedCases.has(caseId)) {
      results.skipped++;
      continue;
    }
    toProcess.push({ example, caseId });
  }

  console.log(`\n${C.cyan}Processing ${toProcess.length} cases (${results.skipped} already analysed)${C.reset}\n`);

  const chunkSize = Math.max(1, args.workers || 1);
  const startTime = performance.now();

  for (let i = 0; i < toProcess.length; i += chunkSize) {
    const chunk = toProcess.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(({ example, caseId }) => {
      return Promise.resolve(runExample(example, caseId, {
        autoDeclareUnknownOperators: args.autoDeclareUnknownOperators === true
      }));
    }));

    for (let j = 0; j < chunk.length; j++) {
      const { example, caseId } = chunk[j];
      const result = chunkResults[j];

      results.total++;
      results.bySource[example.source || 'generic'] = (results.bySource[example.source || 'generic'] || 0) + 1;
      results.byReason[result.reason] = (results.byReason[result.reason] || 0) + 1;

      const translatorOptions = { autoDeclareUnknownOperators: args.autoDeclareUnknownOperators === true };

      if (result.correct) {
        results.passed++;
        analysedCases.add(caseId);
        recordAnalysedCase(caseId, 'PASS', result.details);
        continue;
      }

      analysedCases.add(caseId);

      if (result.category === CATEGORY.NO_EXPECTATION) {
        results.categoryN++;
        recordAnalysedCase(caseId, 'RUN', result.details || result.reason);
        continue;
      }

      if (result.category === CATEGORY.UNSUPPORTED) {
        results.categoryS++;
        recordAnalysedCase(caseId, 'RUN', result.details || result.reason);
        continue;
      }

      if (result.category === CATEGORY.INVALID_GOAL) {
        results.categoryG++;
        recordAnalysedCase(caseId, 'FAIL(G)', result.reason);
      } else if (result.category === CATEGORY.LEARN_FAILED) {
        results.categoryL++;
        recordAnalysedCase(caseId, 'FAIL(L)', result.reason);
      } else if (result.category === CATEGORY.TRANSLATION) {
        results.categoryA++;
        recordAnalysedCase(caseId, 'FAIL(A)', result.reason);
      }

      if (result.category === CATEGORY.TRANSLATION || result.category === CATEGORY.INVALID_GOAL || result.category === CATEGORY.LEARN_FAILED) {
        quarantineCase(result, example);
        const nlpId = detectNlpBugPattern(result.reason, result, example);
        if (nlpId) {
          results.byNlpBug[nlpId] = (results.byNlpBug[nlpId] || 0) + 1;
          writeNlpBugCaseJson(nlpId, result, example, translatorOptions);
        }
        continue;
      }

      if (result.category === CATEGORY.REASONING) {
        results.categoryB++;
        recordAnalysedCase(caseId, 'FAIL(B)', result.reason);
        const bugId = detectKnownBugPattern(result.translated, example) || 'BUG000';
        results.byBugType[bugId] = (results.byBugType[bugId] || 0) + 1;
        writeBugCaseJson(bugId, result, example, translatorOptions);
        continue;
      }

      results.categoryU++;
      recordAnalysedCase(caseId, 'FAIL(U)', result.reason);
      quarantineCase(result, example);
    }

    const processed = Math.min(i + chunkSize, toProcess.length);
    const pct = ((processed / toProcess.length) * 100).toFixed(0);
    const elapsed = performance.now() - startTime;
    const rate = processed / (elapsed / 1000);
    if (!args.verbose) {
      process.stdout.write(`\r  Progress: ${processed}/${toProcess.length} (${pct}%) | ${rate.toFixed(1)} cases/sec`);
    }
  }

  if (!args.verbose) console.log();
  return results;
}
