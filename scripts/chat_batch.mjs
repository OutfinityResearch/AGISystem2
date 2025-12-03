#!/usr/bin/env node

/**
 * DS(/scripts/chat_batch.mjs) - Batch Chat Runner
 *
 * Runs the AGISystem2 chat engine on a sequence of inputs
 * read from a text file (one message per line), using the
 * same ChatEngine and NL interpretation as the interactive REPL.
 *
 * Usage:
 *   node scripts/chat_batch.mjs <input-file> [--debug] [--no-color]
 *
 * Lines starting with '#' are treated as comments and ignored.
 * Empty lines are skipped. Each remaining line is sent as a single
 * user message to ChatEngine.processMessage().
 */

import fs from 'node:fs';
import path from 'node:path';
import { ChatEngine } from '../chat/chat_engine.mjs';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function color(enable, name, text) {
  if (!enable) return text;
  return `${COLORS[name] || ''}${text}${COLORS.reset}`;
}

function formatDSL(actions) {
  const lines = [];
  let qIndex = 1;
  let fIndex = 1;

  if (!actions) return lines;

  for (const action of actions) {
    if (action.type === 'fact_extraction' && Array.isArray(action.facts)) {
      lines.push(`# Extracted facts (${action.source || 'unknown'}):`);
      for (const f of action.facts) {
        lines.push(`#   ${f.subject} ${f.relation} ${f.object}`);
      }
    }
    if (action.type === 'fact_added' && action.fact) {
      const f = action.fact;
      const fVar = `f${String(fIndex++).padStart(3, '0')}`;
      lines.push(`@${fVar} ${f.subject} ${f.relation} ${f.object}`);
    }
    if (action.type === 'query' && action.query) {
      const q = action.query;
      const qVar = `q${String(qIndex++).padStart(3, '0')}`;
      lines.push(`@${qVar} ASK ${q.subject || '?'} ${q.relation || 'IS_A'} ${q.object || '?'}`);
      if (action.result) {
        lines.push(`# Result: ${JSON.stringify({
          truth: action.result.truth,
          method: action.result.method,
          confidence: action.result.confidence
        })}`);
      }
    }
  }

  return lines;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/chat_batch.mjs <input-file> [--debug] [--no-color]');
    process.exit(1);
  }

  const file = args[0];
  const debug = args.includes('--debug');
  const noColor = args.includes('--no-color');

  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) {
    console.error(`Input file not found: ${resolved}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, 'utf8');
  const lines = content.split('\n');

  const engine = new ChatEngine({});
  console.log(color(!noColor, 'dim', 'Initializing chat engine...'));
  const init = await engine.initialize();
  if (!init.success) {
    console.error(color(!noColor, 'magenta', 'Initialization failed:'));
    console.error(init.message);
    process.exit(1);
  }
  console.log(color(!noColor, 'green', `✓ ${init.message}`));
  console.log('');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    console.log(color(!noColor, 'cyan', `You: ${line}`));
    try {
      const result = await engine.processMessage(line);
      if (debug) {
        const dslLines = formatDSL(result.actions);
        if (dslLines.length > 0) {
          console.log(color(!noColor, 'magenta', '  [DSL]'));
          for (const d of dslLines) {
            console.log(color(!noColor, 'yellow', '    ' + d));
          }
        }
      }
      console.log(color(!noColor, 'green', 'AI: ') + result.response);
      console.log('');
    } catch (err) {
      console.log(color(!noColor, 'magenta', 'AI (error): ') + err.message);
      console.log('');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

