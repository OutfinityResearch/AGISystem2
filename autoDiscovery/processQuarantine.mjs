#!/usr/bin/env node
/**
 * Process quarantine files into appropriate bug folders
 */

import fs from 'node:fs';
import path from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const quarantineDir = join(__dirname, 'quarantine');
const nlpBugsDir = join(__dirname, 'nlpBugs');
const bugCasesDir = join(__dirname, 'bugCases');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function classifyCase(data) {
  const reason = data.reason || 'unknown';
  const details = data.details || '';
  const ctx = data.example?.context || '';
  const dsl = data.contextDsl || '';

  // NLP bugs first
  if (reason === 'question_translation_empty') return { type: 'nlp', id: 'NLP002' };
  if (reason === 'learn_failed' || details.includes('Parse error')) return { type: 'nlp', id: 'NLP005' };
  if (reason === 'translation_quality_issue') return { type: 'nlp', id: 'NLP006' };
  if (details.includes('Lexer error')) return { type: 'nlp', id: 'NLP008' };
  if (reason === 'runtime_error') return { type: 'nlp', id: 'NLP009' };

  // Reasoning bugs
  if (reason === 'reasoning_failure') {
    const hasOr = dsl.includes('Or ') || ctx.toLowerCase().includes(' or ');
    const impliesCount = (dsl.match(/Implies/g) || []).length;
    const hasExists = ctx.toLowerCase().includes('there is') || ctx.toLowerCase().includes('some ');

    if (hasOr && impliesCount >= 1) return { type: 'bug', id: 'BUG001' };
    if (impliesCount >= 4) return { type: 'bug', id: 'BUG003' };
    if (hasExists) return { type: 'bug', id: 'BUG008' };
    return { type: 'bug', id: 'BUG009' };
  }

  return null;
}

function findShortestExample(bugDir) {
  if (!fs.existsSync(bugDir)) return null;
  const jsonFiles = fs.readdirSync(bugDir).filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) return null;

  let shortest = null;
  let shortestLen = Infinity;

  for (const file of jsonFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(join(bugDir, file), 'utf8'));
      const contextLen = (data.example?.context || '').length;
      if (contextLen < shortestLen && contextLen > 0) {
        shortestLen = contextLen;
        shortest = { file, data };
      }
    } catch (e) { /* skip */ }
  }

  return shortest;
}

function generateReportContent(bugId, isNlp, description, shortest) {
  const lines = [
    `# ${bugId}: ${description}`,
    '',
    `**Type:** ${isNlp ? 'NLP/Translation' : 'Reasoning'}`,
    `**Status:** Open`,
    '',
    '## Description',
    '',
    description,
    ''
  ];

  if (shortest) {
    const ex = shortest.data.example || {};
    lines.push(
      '## Shortest Example',
      '',
      `**File:** \`${shortest.file}\``,
      `**Source:** ${ex.source || 'unknown'}`,
      '',
      '### Natural Language',
      '```',
      `Context: ${ex.context || '(empty)'}`,
      `Question: ${ex.question || '(empty)'}`,
      `Label: ${ex.label || 'unknown'}`,
      '```',
      ''
    );

    if (shortest.data.contextDsl) {
      lines.push(
        '### Generated DSL',
        '```',
        shortest.data.contextDsl,
        '```',
        ''
      );
    }

    if (shortest.data.details) {
      lines.push(
        '### Error Details',
        '```',
        shortest.data.details,
        '```',
        ''
      );
    }
  }

  return lines.join('\n');
}

const bugDescriptions = {
  'NLP002': 'Question translation empty',
  'NLP005': 'Learn parse error',
  'NLP006': 'Translation quality issue',
  'NLP008': 'Lexer error (special characters)',
  'NLP009': 'Runtime execution error',
  'BUG001': 'Or→And implication failure',
  'BUG003': 'Deep chain failure',
  'BUG008': 'Existential reasoning failure',
  'BUG009': 'General reasoning failure'
};

// Main processing
ensureDir(quarantineDir);
const files = fs.readdirSync(quarantineDir).filter(f => f.endsWith('.json'));

const moved = { nlp: {}, bug: {} };
let processed = 0;

for (const file of files) {
  const filePath = join(quarantineDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const classification = classifyCase(data);

  if (!classification) continue;

  const { type, id } = classification;
  const targetDir = type === 'nlp'
    ? join(nlpBugsDir, id)
    : join(bugCasesDir, id);

  ensureDir(targetDir);

  // Copy to bug folder
  const targetPath = join(targetDir, file);
  fs.copyFileSync(filePath, targetPath);

  // Remove from quarantine
  fs.unlinkSync(filePath);

  // Track
  moved[type][id] = (moved[type][id] || 0) + 1;
  processed++;
}

// Update report.md for each bug folder
const allBugIds = [...new Set([...Object.keys(moved.nlp), ...Object.keys(moved.bug)])];

for (const bugId of allBugIds) {
  const isNlp = bugId.startsWith('NLP');
  const bugDir = isNlp ? join(nlpBugsDir, bugId) : join(bugCasesDir, bugId);
  const shortest = findShortestExample(bugDir);
  const desc = bugDescriptions[bugId] || 'Unknown issue';

  const reportPath = join(bugDir, 'report.md');
  const content = generateReportContent(bugId, isNlp, desc, shortest);
  fs.writeFileSync(reportPath, content);
}

console.log(`Processed ${processed} files\n`);
console.log('NLP Bugs:');
for (const [id, count] of Object.entries(moved.nlp)) {
  console.log(`  ${id}: ${count} cases`);
}
console.log('\nReasoning Bugs:');
for (const [id, count] of Object.entries(moved.bug)) {
  console.log(`  ${id}: ${count} cases`);
}
console.log('\nQuarantine cleared.');
