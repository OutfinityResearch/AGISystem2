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
        // v3 syntax: @_ Subject VERB Object
        const fact = args.trim();
        if (!fact) {
          result.error = 'Missing fact';
          break;
        }
        // Parse "Subject VERB Object" into triplet
        const parts = fact.split(/\s+/);
        if (parts.length < 3) {
          result.error = 'Fact must be: Subject VERB Object';
          break;
        }
        const [subject, verb, ...objParts] = parts;
        const object = objParts.join('_'); // Join remaining as object
        session.run([`@add ${subject} ${verb} ${object}`]);
        result.result = { ok: true, action: 'asserted', fact };
        break;
      }
      case 'ask': {
        // v3 syntax: @q Subject VERB Object (query binding)
        const question = args.trim();
        // Parse question: "Dog IS_A Animal?" or "Is Dog an Animal?"
        // Remove trailing ? and common prefixes
        let cleaned = question.replace(/\?$/, '').trim();
        cleaned = cleaned.replace(/^(Is|Does|Can|Will|Has)\s+/i, '').trim();
        cleaned = cleaned.replace(/\s+(a|an)\s+/gi, ' IS_A ').trim();
        const parts = cleaned.split(/\s+/);
        if (parts.length < 3) {
          result.error = 'Question must resolve to: Subject VERB Object';
          break;
        }
        const [subject, verb, ...objParts] = parts;
        const object = objParts.join('_');
        const env = session.run([`@q ${subject} ${verb} ${object}`]);
        const res = env.q || env.result || {};
        result.result = { truth: res.truth, band: res.band };
        break;
      }
      case 'retract': {
        // v3 syntax: @r Subject RETRACT Object
        const fact = args.trim();
        if (!fact) {
          result.error = 'Missing fact';
          break;
        }
        const parts = fact.split(/\s+/);
        if (parts.length < 3) {
          result.error = 'Fact must be: Subject VERB Object';
          break;
        }
        const [subject, _verb, ...objParts] = parts;
        const object = objParts.join('_');
        const env = session.run([`@r ${subject} RETRACT ${object}`]);
        result.result = env.r || { ok: false };
        break;
      }
      case 'prove': {
        // v3 syntax: @r Subject PROVE Object
        const statement = args.trim();
        if (!statement) {
          result.error = 'Missing statement';
          break;
        }
        const parts = statement.split(/\s+/);
        if (parts.length < 3) {
          result.error = 'Statement must be: Subject VERB Object';
          break;
        }
        const [subject, _verb, ...objParts] = parts;
        const object = objParts.join('_');
        const env = session.run([`@r ${subject} PROVE ${object}`]);
        result.result = env.r || {};
        break;
      }
      case 'validate': {
        // v3 syntax: @r Subject VERB Object (4 tokens required)
        const env = session.run(['@r current_theory VALIDATE any']);
        result.result = env.r || {};
        break;
      }
      case 'hypothesize': {
        // v3 syntax: @r Subject HYPOTHESIZE Object
        const subject = args.trim();
        if (!subject) {
          result.error = 'Missing subject';
          break;
        }
        const env = session.run([`@r ${subject} HYPOTHESIZE any`]);
        result.result = env.r || {};
        break;
      }
      case 'abduct': {
        // v3 syntax: @h Subject ABDUCT Object
        const parts = args.split(/\s+/);
        if (parts.length < 1 || !parts[0]) {
          result.error = 'Missing observation';
          break;
        }
        const observation = parts[0];
        const target = parts.length >= 2 ? parts[1] : 'any';
        const env = session.run([`@h ${observation} ABDUCT ${target}`]);
        result.result = env.h || {};
        break;
      }
      case 'cf': {
        // v3 syntax: Counterfactual needs special handling
        // CLI syntax: cf Subject VERB Object? | Fact1 ; Fact2 ; ...
        const split = args.split('|');
        if (split.length < 2) {
          result.error = 'Missing counterfactual facts (use | separator)';
          break;
        }
        const question = split[0].trim().replace(/\?$/, '');
        const factsPart = split.slice(1).join('|');
        const facts = factsPart
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        // Parse question into triplet
        const qParts = question.split(/\s+/);
        if (qParts.length < 3) {
          result.error = 'Question must be: Subject VERB Object';
          break;
        }
        const [qSubject, qVerb, ...qObjParts] = qParts;
        const qObject = qObjParts.join('_');
        // Use THEORY_PUSH/POP for counterfactual exploration
        session.run(['@cfPush cf_layer THEORY_PUSH any']);
        // Add counterfactual facts
        let cfIdx = 0;
        for (const fact of facts) {
          const fParts = fact.split(/\s+/);
          if (fParts.length >= 3) {
            const [fSubject, fVerb, ...fObjParts] = fParts;
            session.run([`@cfFact${cfIdx} ${fSubject} ${fVerb} ${fObjParts.join('_')}`]);
            cfIdx++;
          }
        }
        // Query in counterfactual world
        const env = session.run([`@cf ${qSubject} ${qVerb} ${qObject}`]);
        // Pop the layer to restore original state
        session.run(['@cfPop any THEORY_POP any']);
        result.result = env.cf || {};
        break;
      }
      case 'push': {
        // v3 syntax: @r name THEORY_PUSH any
        const name = args.trim() || `layer_${Date.now()}`;
        const env = session.run([`@r ${name} THEORY_PUSH any`]);
        result.result = { ok: true, name, depth: (env.r || {}).depth };
        break;
      }
      case 'pop': {
        // v3 syntax: @r any THEORY_POP any
        const env = session.run(['@r any THEORY_POP any']);
        result.result = env.r || {};
        break;
      }
      case 'layers': {
        // v3 syntax: @r any LIST_THEORIES any
        const env = session.run(['@r any LIST_THEORIES any']);
        result.result = env.r || {};
        break;
      }
      case 'facts': {
        // v3 syntax: @r pattern FACTS_MATCHING any
        const pattern = args.trim() || 'any';
        const env = session.run([`@r ${pattern} FACTS_MATCHING any`]);
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
        // v3 syntax: @r concept GET_USAGE any
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        const env = session.run([`@r ${concept} GET_USAGE any`]);
        result.result = env.r || {};
        break;
      }
      case 'inspect': {
        // v3 syntax: @r concept INSPECT any
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        const env = session.run([`@r ${concept} INSPECT any`]);
        result.result = env.r || null;
        break;
      }
      case 'protect': {
        // v3 syntax: @r concept PROTECT any
        const concept = args.trim();
        if (!concept) {
          result.error = 'Missing concept';
          break;
        }
        session.run([`@r ${concept} PROTECT any`]);
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
        // v3 syntax: @r criteria FORGET any
        const criteria = args.trim();
        if (!criteria) {
          result.error = 'Missing criteria';
          break;
        }
        const env = session.run([`@r ${criteria} FORGET any`]);
        result.result = env.r || {};
        break;
      }
      case 'boost': {
        // v3 syntax: @r concept BOOST amount
        const parts = args.trim().split(/\s+/);
        if (!parts[0]) {
          result.error = 'Missing concept';
          break;
        }
        const concept = parts[0];
        const amount = parts[1] ? parts[1] : '10';
        session.run([`@r ${concept} BOOST ${amount}`]);
        result.result = { ok: true, boosted: concept, amount: parseInt(amount, 10) };
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
