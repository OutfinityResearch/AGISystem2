import fs from 'node:fs';
import { join } from 'node:path';
import { ensureDir } from './fs-utils.mjs';
import { QUARANTINE_DIR, C } from './constants.mjs';
import { readJsonFileSafe } from '../libs/json.mjs';

export function analyzeQuarantine() {
  ensureDir(QUARANTINE_DIR);
  const files = fs.readdirSync(QUARANTINE_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log(`${C.cyan}Quarantine is empty.${C.reset}`);
    return;
  }

  const stats = { total: files.length, byCategory: {}, bySource: {}, byReason: {} };
  for (const file of files) {
    const data = readJsonFileSafe(join(QUARANTINE_DIR, file));
    if (!data) continue;
    stats.byCategory[data.category] = (stats.byCategory[data.category] || 0) + 1;
    const src = data.example?.source || 'unknown';
    stats.bySource[src] = (stats.bySource[src] || 0) + 1;
    stats.byReason[data.reason] = (stats.byReason[data.reason] || 0) + 1;
  }

  console.log(`\n${C.bold}${C.magenta}Quarantine Analysis${C.reset}`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`\n${C.bold}Total Cases: ${stats.total}${C.reset}`);

  console.log(`\n${C.cyan}By Category:${C.reset}`);
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${cat.padEnd(3)} ${count}`);
  }

  console.log(`\n${C.cyan}By Source:${C.reset}`);
  for (const [source, count] of Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source.padEnd(15)} ${count}`);
  }

  console.log(`\n${C.cyan}By Reason:${C.reset}`);
  for (const [reason, count] of Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason.padEnd(20)} ${count}`);
  }
  console.log();
}
