#!/usr/bin/env node
/**
 * Fix Superficial Definitions - Orchestrator
 *
 * Reads problem files from runStressCheck.js output
 * Launches parallel agents to generate semantic definitions
 * Replaces superficial definitions directly in files
 */

import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Parse problem files from .errors files
async function getProblemFiles() {
  const { stdout } = await execAsync('node evals/runStressCheck.js 2>&1 | grep -A 100 "FILES WITH SUPERFICIAL"');

  const problemFiles = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    // Match: "  evals/stress/medicine.sys2: 174 superficial (174 total)"
    const match = line.match(/^\s+([\w\/\.-]+):\s+(\d+)\s+superficial/);
    if (match) {
      problemFiles.push({
        file: match[1],
        count: parseInt(match[2])
      });
    }
  }

  return problemFiles;
}

// Extract superficial operators from a file
async function extractSuperficialOperators(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const operators = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opMatch = line.match(/^@(\w+):(\w+)\s+graph\s+(.+)/);

    if (opMatch) {
      const opName = opMatch[1];
      const params = opMatch[2];

      // Check if superficial
      let hasLeft = false;
      let hasRight = false;
      let endLine = i;

      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].includes('@left __Role Left')) hasLeft = true;
        if (lines[j].includes('@right __Role Right')) hasRight = true;
        if (lines[j].match(/^end\s*$/)) {
          endLine = j;
          break;
        }
      }

      if (hasLeft && hasRight) {
        const originalDef = lines.slice(i, endLine + 1).join('\n');
        operators.push({
          name: opName,
          params,
          startLine: i,
          endLine,
          original: originalDef
        });
      }
    }
  }

  return operators;
}

async function main() {
  console.log('🔍 Scanning for superficial definitions...\n');

  const problemFiles = await getProblemFiles();

  if (problemFiles.length === 0) {
    console.log('✅ No superficial definitions found!');
    return;
  }

  console.log(`Found ${problemFiles.length} file(s) with superficial definitions:\n`);
  for (const { file, count } of problemFiles) {
    console.log(`  ${file}: ${count} operators`);

    const operators = await extractSuperficialOperators(file);
    console.log(`    Extracted ${operators.length} superficial operators`);

    for (const op of operators) {
      console.log(`      - ${op.name} (lines ${op.startLine}-${op.endLine})`);
    }
  }

  console.log('\n✅ Scan complete. Ready to launch agents for fixes.');
  console.log('\nNext: Launch parallel agents to generate semantic definitions');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
