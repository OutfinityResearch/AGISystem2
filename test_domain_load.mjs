import { Session } from './src/runtime/session.mjs';
import { loadDomainTheory } from './performance/lib/loader.mjs';
import fs from 'fs';
import path from 'path';

const session = new Session();
const corePath = './config/Core';
const files = fs.readdirSync(corePath)
  .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
  .sort();

let totalFacts = 0;
const errors = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(corePath, file), 'utf8');
  try {
    const res = session.learn(content);
    if (res.success) {
      totalFacts += res.facts || 0;
    } else if (res.errors) {
      errors.push(...res.errors);
      console.log('Error in', file, ':', res.errors);
    }
  } catch (e) {
    errors.push(e.message);
    console.log('Exception in', file, ':', e.message);
  }
}

console.log('Core total facts:', totalFacts);
console.log('Core errors:', errors.length);
console.log('Vocabulary after Core:', session.vocabulary?.size);

// Now load domain
const domainTheories = await loadDomainTheory('Mathematics');
console.log('Domain theories found:', domainTheories.length);

let domainFacts = 0;
for (const content of domainTheories) {
  const res = session.learn(content);
  console.log('Domain learn result:', res.success, 'facts:', res.facts);
  if (res.errors && res.errors.length > 0) {
    console.log('Errors:', res.errors);
  }
  if (res.warnings && res.warnings.length > 0) {
    console.log('Warnings:', res.warnings);
  }
  domainFacts += res.facts || 0;
}
console.log('Domain total facts:', domainFacts);
console.log('Vocabulary after Domain:', session.vocabulary?.size);
