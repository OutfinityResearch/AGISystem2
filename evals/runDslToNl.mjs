/**
 * DSL → English renderer (script-level)
 *
 * Examples:
 *   node evals/runDslToNl.mjs --file=evals/fastEval/suite01_foundations/cases.mjs
 *   node evals/runDslToNl.mjs --file=config/Core/00-relations.sys2
 *   cat some.sys2 | node evals/runDslToNl.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

import { Session } from '../src/runtime/session.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('-')));
  const get = (name) => {
    const hit = args.find(a => a.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : null;
  };
  return {
    file: get('--file'),
    includeDeclarations: flags.has('--include-decls'),
    includeMeta: flags.has('--include-meta'),
    noCore: flags.has('--no-core'),
    noColor: flags.has('--no-color')
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const opts = parseArgs(process.argv);

  let dsl = '';
  if (opts.file) {
    const full = path.isAbsolute(opts.file) ? opts.file : path.join(process.cwd(), opts.file);
    dsl = fs.readFileSync(full, 'utf8');
  } else if (!process.stdin.isTTY) {
    dsl = await readStdin();
  } else {
    console.log('Usage: node evals/runDslToNl.mjs --file=PATH [--include-decls] [--include-meta] [--no-core]');
    process.exit(0);
  }

  const session = new Session({ geometry: 256, hdcStrategy: 'exact', exactUnbindMode: 'B' });
  if (!opts.noCore) {
    session.loadCore({
      corePath: path.join(process.cwd(), 'config', 'Core'),
      includeIndex: true,
      validate: true,
      throwOnValidationError: false
    });
  }

  const res = session.describeDsl(dsl, {
    includeDeclarations: opts.includeDeclarations,
    includeMeta: opts.includeMeta
  });

  if (!res.success) {
    for (const e of res.errors || []) process.stderr.write(`${e}\n`);
    process.exit(1);
  }

  for (const line of res.lines || []) {
    process.stdout.write(`${line}\n`);
  }

  session.close();
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

