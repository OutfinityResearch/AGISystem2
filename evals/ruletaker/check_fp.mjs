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

const examples = await loadExamples('test', { limit: 1000, randomSeed: 42 });

// Check all FALSE_POSITIVE cases from analysis
const fpIndexes = [95, 335, 431];

for (const idx of fpIndexes) {
  const ex = examples[idx];
  console.log('='.repeat(60));
  console.log('Example #' + idx);
  console.log('Question:', ex.question);
  console.log('Label:', ex.label, '(should NOT be proved)');

  resetRefCounter();
  const t = translateExample(ex);

  const session = new Session({
    hdcStrategy: 'dense-binary',
    geometry: 256,
    reasoningPriority: 'symbolicPriority',
    closedWorldAssumption: true
  });
  loadCoreTheories(session);

  const theoryPath = path.join(__dirname, 'ruletaker-theory.sys2');
  if (fs.existsSync(theoryPath)) {
    session.learn(fs.readFileSync(theoryPath, 'utf8'));
  }
  session.learn(t.contextDsl);

  const result = session.prove(t.questionDsl, { timeout: 2000 });
  console.log('Proved:', result.valid, '| Method:', result.method);
  if (result.steps) {
    console.log('Steps:');
    for (const step of result.steps.slice(0, 4)) {
      console.log('  -', step.operation, step.fact || step.detail || '');
    }
  }
  console.log();
}
