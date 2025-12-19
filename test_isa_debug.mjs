import { Session } from './src/runtime/session.mjs';
import fs from 'fs';
import path from 'path';

const s = new Session();

// Load Core
const corePath = './config/Core';
const files = fs.readdirSync(corePath)
  .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
  .sort();

console.log('Loading Core...');
for (const file of files) {
  const content = fs.readFileSync(path.join(corePath, file), 'utf8');
  const r = s.learn(content);
  if (!r.success || (r.errors && r.errors.length > 0)) {
    console.log(`  ${file}: errors:`, r.errors);
  }
}
console.log('Core loaded, vocabulary:', s.vocabulary?.size);

// Now try domain files
console.log('\nLoading Math domain...');
const mathPath = './config/Math';
const mathFiles = fs.readdirSync(mathPath)
  .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
  .sort();

for (const file of mathFiles) {
  const content = fs.readFileSync(path.join(mathPath, file), 'utf8');
  console.log(`\nLoading ${file}...`);
  const r = s.learn(content);
  console.log('Result:', JSON.stringify(r, null, 2));
}

console.log('\nFinal vocabulary size:', s.vocabulary?.size);
