/**
 * DS(/cli/cli_commands.js) - CLI Command Executor
 *
 * Executes CLI commands by translating them to Sys2DSL statements.
 * Used by both batch mode and interactive mode.
 *
 * @module cli/cli_commands
 */

const fs = require('fs');
const path = require('path');

/**
 * Execute a single CLI command and return structured result
 * @param {string} line - The command line to execute
 * @param {object} session - The DSL session
 * @param {string} theoriesRoot - Path to theories directory
 * @returns {object} - { command, args, result, error?, timestamp }
 */
function executeCommand(line, session, theoriesRoot) {
  const trimmed = line.trim();
  const timestamp = new Date().toISOString();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return { command: null, skipped: true, line: trimmed, timestamp };
  }

  const [cmd, ...rest] = trimmed.split(/\s+/);
  const args = rest.join(' ');
  const result = { command: cmd, args, timestamp };

  try {
    switch (cmd.toLowerCase()) {
      case 'add': {
        const fact = args.trim();
        if (!fact) {
          result.error = 'Missing fact';
          break;
        }
        session.run([`@f ASSERT ${fact}`]);
        result.result = { ok: true, action: 'asserted', fact };
        break;
      }
      case 'ask': {
        const question = args.trim();
        const env = session.run([`@q ASK "${question}"`]);
        const res = env.q || env.result || {};
        result.result = { truth: res.truth, band: res.band };
        break;
      }
      case 'retract': {
        const fact = args.trim();
        if (!fact) {
          result.error = 'Missing fact';
          break;
        }
        const env = session.run([`@r RETRACT ${fact}`]);
        result.result = env.r || { ok: false };
        break;
      }
      case 'prove': {
        const statement = args.trim();
        if (!statement) {
          result.error = 'Missing statement';
          break;
        }
        const env = session.run([`@r PROVE ${statement}`]);
        result.result = env.r || {};
        break;
      }
      case 'validate': {
        const env = session.run(['@r VALIDATE']);
        result.result = env.r || {};
        break;
      }
      case 'hypothesize': {
        const subject = args.trim();
        if (!subject) {
          result.error = 'Missing subject';
          break;
        }
        const env = session.run([`@r HYPOTHESIZE ${subject}`]);
        result.result = env.r || {};
        break;
      }
      case 'abduct': {
        const parts = args.split(/\s+/);
        if (parts.length < 1 || !parts[0]) {
          result.error = 'Missing observation';
          break;
        }
        const observation = parts[0];
        const relation = parts.length >= 2 ? parts[1] : null;
        const env = session.run([
          relation
            ? `@h ABDUCT ${observation} ${relation}`
            : `@h ABDUCT ${observation}`
        ]);
        result.result = env.h || {};
        break;
      }
      case 'cf': {
        const split = args.split('|');
        if (split.length < 2) {
          result.error = 'Missing counterfactual facts (use | separator)';
          break;
        }
        const question = split[0].trim();
        const factsPart = split.slice(1).join('|');
        const facts = factsPart
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const env = session.run([`@cf CF "${question}" | ${facts.join(' ; ')}`]);
        result.result = env.cf || {};
        break;
      }
      case 'push': {
        const name = args.trim() || `layer_${Date.now()}`;
        const env = session.run([`@r THEORY_PUSH name="${name}"`]);
        result.result = { ok: true, name, depth: (env.r || {}).depth };
        break;
      }
      case 'pop': {
        const env = session.run(['@r THEORY_POP']);
        result.result = env.r || {};
        break;
      }
      case 'layers': {
        const env = session.run(['@r LIST_THEORIES']);
        result.result = env.r || {};
        break;
      }
      case 'facts': {
        const pattern = args.trim();
        const dsl = pattern
          ? `@r FACTS_MATCHING ${pattern} ? ?`
          : '@r FACTS_MATCHING ? ? ?';
        const env = session.run([dsl]);
        result.result = { facts: env.r || [], count: (env.r || []).length };
        break;
      }
      case 'concepts': {
        const conceptStore = session.engine.conceptStore;
        const concepts = conceptStore.listConcepts();
        result.result = { concepts, count: concepts.length };
        break;
      }
      case 'usage': {
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        const env = session.run([`@r GET_USAGE ${concept}`]);
        result.result = env.r || {};
        break;
      }
      case 'inspect': {
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        const env = session.run([`@r INSPECT ${concept}`]);
        result.result = env.r || null;
        break;
      }
      case 'protect': {
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        session.run([`@r PROTECT ${concept}`]);
        result.result = { ok: true, protected: concept };
        break;
      }
      case 'unprotect': {
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        const conceptStore = session.engine.conceptStore;
        conceptStore.unprotect(concept);
        result.result = { ok: true, unprotected: concept };
        break;
      }
      case 'forget': {
        const criteria = args.trim();
        if (!criteria) {
          result.error = 'Missing criteria';
          break;
        }
        const env = session.run([`@r FORGET ${criteria}`]);
        result.result = env.r || {};
        break;
      }
      case 'boost': {
        const parts = args.trim().split(/\s+/);
        if (!parts[0]) {
          result.error = 'Missing concept';
          break;
        }
        const concept = parts[0];
        const amount = parts[1] ? parseInt(parts[1], 10) : 10;
        session.run([`@r BOOST ${concept} ${amount}`]);
        result.result = { ok: true, boosted: concept, amount };
        break;
      }
      case 'run': {
        const dsl = args.trim();
        if (!dsl) {
          result.error = 'Missing DSL statement';
          break;
        }
        const env = session.run([dsl]);
        result.result = env;
        break;
      }
      case 'load-theory': {
        const name = args.trim();
        if (!name) {
          result.error = 'Missing theory name';
          break;
        }
        // Security: validate theory name to prevent path traversal
        // Only allow alphanumeric, underscore, dash, and dot (not leading)
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
          result.error = 'Invalid theory name. Use only letters, numbers, underscore, dash.';
          break;
        }
        const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
        // Double-check: resolved path must be inside theoriesRoot
        const resolvedPath = path.resolve(filePath);
        const resolvedRoot = path.resolve(theoriesRoot);
        if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
          result.error = 'Invalid theory path';
          break;
        }
        if (!fs.existsSync(filePath)) {
          result.error = `Theory file not found: ${filePath}`;
          break;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        session.appendTheory(content);
        result.result = { ok: true, loaded: name };
        break;
      }
      case 'config': {
        const snap = session.engine.config.snapshot();
        result.result = snap;
        break;
      }
      case 'check-procedure':
      case 'check-export':
      case 'check-magic': {
        result.result = { note: 'Domain helper - use interactive mode for full output' };
        break;
      }
      case 'list-theories': {
        const entries = fs.readdirSync(theoriesRoot)
          .filter((f) => f.endsWith('.sys2dsl') || f.endsWith('.txt'))
          .sort();
        result.result = { theories: entries, count: entries.length };
        break;
      }
      case 'new-theory': {
        const name = args.trim();
        if (!name) {
          result.error = 'Missing theory name';
          break;
        }
        const filePath = path.join(theoriesRoot, `${name}.txt`);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '# One fact per line, using Subject REL Object\n', 'utf8');
        }
        result.result = { ok: true, created: filePath };
        break;
      }
      case 'show-theory': {
        const name = args.trim();
        if (!name) {
          result.error = 'Missing theory name';
          break;
        }
        const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
        if (!fs.existsSync(filePath)) {
          result.error = `Theory file not found: ${filePath}`;
          break;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        result.result = { name, content };
        break;
      }
      default:
        result.error = `Unknown command: ${cmd}`;
    }
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

/**
 * Initialize sample theories
 * @param {string} theoriesRoot - Path to theories directory
 */
function initSampleTheories(theoriesRoot) {
  const names = ['health_compliance', 'law_minimal', 'scifi_magic'];
  const cliDir = __dirname;

  for (const name of names) {
    const src = path.join(cliDir, '..', 'data', 'init', 'theories', `${name}.sys2dsl`);
    const dest = path.join(theoriesRoot, `${name}.sys2dsl`);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      const content = fs.readFileSync(src, 'utf8');
      fs.writeFileSync(dest, content, 'utf8');
    }
  }
}

module.exports = {
  executeCommand,
  initSampleTheories
};
