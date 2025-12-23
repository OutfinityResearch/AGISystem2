#!/usr/bin/env node
/**
 * Debug script to analyze ProntoQA failures
 */

import fs from 'fs';
import path from 'path';
import { Session } from '../src/runtime/session.mjs';
import { loadExamples } from './logiglue/lib/dataset-loader.mjs';
import { translateExample, resetRefCounter } from './logiglue/lib/translator.mjs';

const CONFIG_ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'config');

function loadCoreTheories(session) {
  const corePath = path.join(CONFIG_ROOT, 'Core');
  if (!fs.existsSync(corePath)) return;

  for (const f of fs.readdirSync(corePath).filter(x => x.endsWith('.sys2')).sort()) {
    try {
      session.learn(fs.readFileSync(path.join(corePath, f), 'utf8'));
    } catch (e) {}
  }
}

async function main() {
  const data = await loadExamples({ sources: ['prontoqa'], limit: 30, randomSeed: 42 });

  let passed = 0, failed = 0;
  const failures = [];

  for (const ex of data.examples) {
    resetRefCounter();
    const translated = translateExample(ex);

    if (!translated.contextDsl || !translated.questionDsl) {
      failed++;
      failures.push({
        reason: 'Translation failed',
        question: ex.question,
        contextDsl: translated.contextDsl,
        questionDsl: translated.questionDsl
      });
      continue;
    }

    const session = new Session({
      hdcStrategy: 'dense-binary',
      geometry: 256,
      reasoningPriority: 'holographicPriority'
    });

    loadCoreTheories(session);

    try {
      session.learn(translated.contextDsl);
      const result = session.prove(translated.questionDsl, { timeout: 2000 });
      const proved = result?.valid === true;
      const correct = (proved === translated.expectProved);

      if (correct) {
        passed++;
      } else {
        failed++;
        failures.push({
          reason: 'Reasoning mismatch',
          question: ex.question,
          context: ex.context,
          contextDsl: translated.contextDsl,
          questionDsl: translated.questionDsl,
          expectProved: translated.expectProved,
          actualProved: proved,
          proveResult: result
        });
      }
    } catch (e) {
      failed++;
      failures.push({
        reason: 'Error: ' + e.message,
        question: ex.question
      });
    }
  }

  console.log(`\nResults: ${passed}/${passed + failed} (${(passed/(passed+failed)*100).toFixed(1)}%)\n`);

  console.log('=== FAILURES ===\n');
  for (const f of failures.slice(0, 10)) {
    console.log('Reason:', f.reason);
    console.log('Question:', f.question);
    if (f.reason === 'Reasoning mismatch') {
      console.log('Context:', f.context?.slice(0, 150));
      console.log('Expected:', f.expectProved, '| Got:', f.actualProved);
      console.log('ContextDSL:\n', f.contextDsl);
      console.log('QuestionDSL:', f.questionDsl);
    }
    console.log('---\n');
  }
}

main().catch(console.error);
