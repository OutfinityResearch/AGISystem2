#!/usr/bin/env node
/**
 * Analyze RuleTaker failures in detail
 * Categorizes failures by type to understand reasoning engine issues
 */

import { loadExamples } from './lib/dataset-loader.mjs';
import { translateExample, resetRefCounter } from './lib/translator.mjs';
import { Session } from '../../src/runtime/session.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.join(__dirname, '../../config');

function loadCoreTheories(session) {
  const corePath = path.join(CONFIG_ROOT, 'Core');
  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(corePath, file), 'utf8');
    try { session.learn(content); } catch (e) {}
  }
}

function loadRuleTakerTheory(session) {
  const theoryPath = path.join(__dirname, 'ruletaker-theory.sys2');
  if (fs.existsSync(theoryPath)) {
    const content = fs.readFileSync(theoryPath, 'utf8');
    try { session.learn(content); } catch (e) {}
  }
}

function categorizeFailure(example, translated, proveResult) {
  const { context, question, label } = example;
  const expectProved = label === 'entailment';
  const actualProved = proveResult?.valid === true;

  // False Positive: proved when shouldn't
  if (actualProved && !expectProved) {
    return 'FALSE_POSITIVE';
  }

  // False Negative: didn't prove when should
  if (!actualProved && expectProved) {
    const questionLower = question.toLowerCase();

    // CWA failure: "X is not Y" should be provable when "X is Y" is absent
    if (questionLower.includes(' not ')) {
      return 'CWA_NEGATION';
    }

    // Check if there are rules in context
    const hasRules = context.toLowerCase().includes(' if ') ||
                     context.toLowerCase().includes(' things are ') ||
                     context.toLowerCase().includes(' all ');

    if (hasRules) {
      return 'RULE_APPLICATION';
    }

    return 'DIRECT_FACT_MISS';
  }

  return 'UNKNOWN';
}

async function main() {
  const sampleSize = parseInt(process.argv[2]) || 200;
  const priority = process.argv[3] || 'symbolicPriority';

  console.log(`\nAnalyzing ${sampleSize} examples with ${priority}...\n`);

  const examples = await loadExamples('test', { limit: sampleSize, randomSeed: 42 });

  const categories = {
    FALSE_POSITIVE: [],
    CWA_NEGATION: [],
    RULE_APPLICATION: [],
    DIRECT_FACT_MISS: [],
    UNKNOWN: []
  };

  let correct = 0;

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    resetRefCounter();
    const translated = translateExample(example);

    if (!translated.contextDsl || !translated.questionDsl) {
      continue;
    }

    const session = new Session({
      hdcStrategy: 'dense-binary',
      geometry: 256,
      reasoningPriority: priority,
      closedWorldAssumption: true
    });

    loadCoreTheories(session);
    loadRuleTakerTheory(session);

    try {
      session.learn(translated.contextDsl);
      const result = session.prove(translated.questionDsl, { timeout: 2000 });

      const proved = result?.valid === true;
      const expectProved = example.label === 'entailment';

      if (proved === expectProved) {
        correct++;
      } else {
        const category = categorizeFailure(example, translated, result);
        categories[category].push({
          index: i,
          context: example.context,
          question: example.question,
          label: example.label,
          contextDsl: translated.contextDsl,
          questionDsl: translated.questionDsl,
          result: { valid: result?.valid, reason: result?.reason }
        });
      }
    } catch (err) {
      categories.UNKNOWN.push({
        index: i,
        error: err.message
      });
    }
  }

  console.log('='.repeat(70));
  console.log('FAILURE ANALYSIS SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total: ${examples.length}, Correct: ${correct} (${(100*correct/examples.length).toFixed(1)}%)`);
  console.log(`Failed: ${examples.length - correct}`);
  console.log();

  console.log('Failure Categories:');
  console.log('-'.repeat(50));
  for (const [cat, items] of Object.entries(categories)) {
    if (items.length > 0) {
      console.log(`  ${cat}: ${items.length} (${(100*items.length/(examples.length-correct)).toFixed(1)}% of failures)`);
    }
  }

  // Show examples from each category
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLES BY CATEGORY');
  console.log('='.repeat(70));

  for (const [cat, items] of Object.entries(categories)) {
    if (items.length === 0) continue;

    console.log(`\n### ${cat} (${items.length} cases) ###\n`);

    // Show first 3 examples
    for (const ex of items.slice(0, 3)) {
      console.log(`Example #${ex.index}:`);
      console.log(`  Context: "${ex.context?.slice(0, 100)}..."`);
      console.log(`  Question: "${ex.question}"`);
      console.log(`  Label: ${ex.label} (expected ${ex.label === 'entailment' ? 'PROVED' : 'NOT PROVED'})`);
      console.log(`  Query DSL: ${ex.questionDsl}`);
      console.log(`  Result: ${ex.result?.valid ? 'PROVED' : 'NOT PROVED'} - ${ex.result?.reason || ''}`);
      console.log();
    }
  }

  // Export detailed data
  const outputPath = path.join(__dirname, 'failure_analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      total: examples.length,
      correct,
      failed: examples.length - correct,
      accuracy: (100*correct/examples.length).toFixed(1) + '%'
    },
    categories: Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, v.length])
    ),
    examples: categories
  }, null, 2));

  console.log(`\nDetailed data saved to: ${outputPath}`);
}

main().catch(console.error);
