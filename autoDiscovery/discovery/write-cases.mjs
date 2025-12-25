import fs from 'node:fs';
import { join } from 'node:path';
import { BUG_CASES_DIR, NLP_BUGS_DIR, QUARANTINE_DIR } from './constants.mjs';
import { ensureDir } from './fs-utils.mjs';
import { BUG_PATTERNS, NLP_BUG_PATTERNS } from './patterns.mjs';

function appendCaseToReport(reportFile, header, caseId, jsonFilename) {
  if (!fs.existsSync(reportFile)) {
    fs.writeFileSync(reportFile, `${header}\n\n## All Cases\n\n`);
  }
  const content = fs.readFileSync(reportFile, 'utf8');
  if (content.includes(caseId)) return;
  fs.appendFileSync(reportFile, `### ${caseId}\n- **JSON:** \`${jsonFilename}\`\n\n`);
}

export function quarantineCase(result, example) {
  ensureDir(QUARANTINE_DIR);
  const filepath = join(QUARANTINE_DIR, `${result.caseId}.json`);
  const data = {
    caseId: result.caseId,
    category: result.category,
    reason: result.reason,
    details: result.details,
    timestamp: new Date().toISOString(),
    example: {
      source: example.source,
      context: example.context,
      question: example.question,
      label: example.label,
      category: example.category,
      choices: example.choices || [],
      answerIndex: example.answerIndex
    },
    translated: result.translated,
    learnResult: result.learnResult || null,
    proveResult: result.proveResult || null,
    actual_nl: result.actual_nl || null,
    sessionConfig: result.sessionConfig || null
  };
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

export function writeNlpBugCaseJson(nlpBugId, result, example, translatorOptions) {
  const bugDir = join(NLP_BUGS_DIR, nlpBugId);
  ensureDir(bugDir);
  const filename = `${result.caseId}.json`;
  const filepath = join(bugDir, filename);

  const label = example.label;
  const expectProved = result.translated?.expectProved;

  const payload = {
    caseId: result.caseId,
    nlpBugId,
    source: example.source || 'generic',
    reason: result.reason,
    details: result.details,
    dataset: {
      label,
      expectProved
    },
    input: {
      context_nl: example.context,
      question_nl: example.question,
      label
    },
    translation: {
      translator: 'src/nlp/nl2dsl.mjs::translateExample',
      options: translatorOptions || {},
      contextDsl: result.translated?.contextDsl || '',
      questionDsl: result.translated?.questionDsl || '',
      contextErrors: result.translated?.contextErrors || [],
      contextWarnings: result.translated?.contextWarnings || [],
      contextStats: result.translated?.contextStats || null,
      contextAutoDeclaredOperators: result.translated?.contextAutoDeclaredOperators || []
    },
    execution: {
      learnResult: result.learnResult || null,
      proveResult: result.proveResult || null,
      actual_nl: result.actual_nl || null
    },
    expected: {
      expected_proved: expectProved,
      expected_nl: 'TODO',
      note: 'For NLP bugs, expected_nl is often unavailable until translation + learn succeed; use runBugCase once DSL is valid.'
    },
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));

  const pattern = NLP_BUG_PATTERNS[nlpBugId] || { name: nlpBugId, description: 'Unknown' };
  const reportFile = join(bugDir, 'report.md');
  const header = `# ${nlpBugId}: ${pattern.name}\n\n## Description\n${pattern.description}\n\n## How to Inspect\nOpen the JSON case files listed below and review the translation + errors.`;
  appendCaseToReport(reportFile, header, result.caseId, filename);
  return filepath;
}

export function writeBugCaseJson(bugId, result, example, translatorOptions) {
  const bugDir = join(BUG_CASES_DIR, bugId);
  ensureDir(bugDir);
  const filename = `${result.caseId}.json`;
  const filepath = join(bugDir, filename);

  const expectProved = result.translated?.expectProved;
  const questionNl = String(example.question || '').trim();
  const goalNl = questionNl ? questionNl.replace(/[?]+$/, '') : '[goal]';
  const bugCase = {
    caseId: result.caseId,
    bugId,
    source: example.source || 'generic',
    failure: {
      category: result.category || null,
      reason: result.reason || null,
      details: result.details || null
    },
    dataset: {
      label: example.label,
      expectProved,
      choices: example.choices || []
    },
    input: {
      context_nl: example.context,
      question_nl: example.question
    },
    translation: {
      translator: 'src/nlp/nl2dsl.mjs::translateExample',
      options: translatorOptions || {},
      contextDsl: result.translated?.contextDsl || '',
      questionDsl: result.translated?.questionDsl || '',
      contextErrors: result.translated?.contextErrors || [],
      contextWarnings: result.translated?.contextWarnings || [],
      contextStats: result.translated?.contextStats || null,
      contextAutoDeclaredOperators: result.translated?.contextAutoDeclaredOperators || []
    },
    sessionConfig: result.sessionConfig || null,
    execution: {
      learnResult: result.learnResult || null,
      proveResult: result.proveResult || null,
      actual_nl: result.actual_nl || null
    },
    expected: {
      expected_proved: expectProved,
      expected_nl: 'TODO',
      expected_nl_hint: expectProved === true
        ? `Proved: ${goalNl}. Proof: [engine steps]`
        : `Cannot prove: ${goalNl}`,
      note: 'Run `node autoDiscovery/tools/runBugCase.mjs --accept-actual <case.json>` after reviewing actual_nl'
    },
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(filepath, JSON.stringify(bugCase, null, 2));

  const bugInfo = BUG_PATTERNS[bugId] || { name: bugId, description: 'Unknown' };
  const reportFile = join(bugDir, 'report.md');
  const header = `# ${bugId}: ${bugInfo.name}\n\n## Description\n${bugInfo.description}\n\n## How to Run Cases\n\`\`\`bash\nnode autoDiscovery/tools/runBugSuite.mjs --bug=${bugId}\n\`\`\``;
  appendCaseToReport(reportFile, header, result.caseId, filename);
  return filepath;
}
