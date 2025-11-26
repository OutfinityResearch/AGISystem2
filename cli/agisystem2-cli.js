#!/usr/bin/env node
/**
 * AGISystem2 CLI
 * DS(/interface/cli)
 *
 * Interactive and batch command-line interface for theory exploration and testing.
 *
 * Usage:
 *   Interactive:  node cli/agisystem2-cli.js
 *   Batch:        node cli/agisystem2-cli.js --batch <commands.txt> [--output <results.json>]
 *   Single:       node cli/agisystem2-cli.js --exec "add Dog IS_A Animal"
 *   Help:         node cli/agisystem2-cli.js --help
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const AgentSystem2 = require('../src/interface/agent_system2');

// Parse command line arguments
const argv = process.argv.slice(2);
const options = {
  batch: null,      // --batch <file>
  output: null,     // --output <file>
  exec: null,       // --exec "command"
  noColor: false,   // --no-color
  json: false,      // --json (output as JSON)
  help: false       // --help
};

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--batch' && argv[i + 1]) {
    options.batch = argv[++i];
  } else if (argv[i] === '--output' && argv[i + 1]) {
    options.output = argv[++i];
  } else if (argv[i] === '--exec' && argv[i + 1]) {
    options.exec = argv[++i];
  } else if (argv[i] === '--no-color') {
    options.noColor = true;
  } else if (argv[i] === '--json') {
    options.json = true;
  } else if (argv[i] === '--help' || argv[i] === '-h') {
    options.help = true;
  }
}

// Color codes (disabled in batch/json mode)
const color = options.noColor || options.json ? {
  heading: '', section: '', command: '', label: '',
  example: '', error: '', dim: '', reset: ''
} : {
  heading: '\x1b[1;36m',
  section: '\x1b[1;34m',
  command: '\x1b[1;32m',
  label: '\x1b[1;33m',
  example: '\x1b[0;36m',
  error: '\x1b[1;31m',
  dim: '\x1b[2m',
  reset: '\x1b[0m'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initEngine() {
  const cwd = process.cwd();
  const root = path.join(cwd, '.AGISystem2');
  const dataRoot = path.join(root, 'data');
  const theoriesRoot = path.join(root, 'theories');

  // Check if this is first run (environment doesn't exist yet)
  const isFirstRun = !fs.existsSync(root);

  ensureDir(dataRoot);
  ensureDir(theoriesRoot);

  // Auto-install sample theories on first run
  if (isFirstRun) {
    initSampleTheories(theoriesRoot);
    if (!options.json && !options.batch) {
      console.log(`${color.dim}First run: created .AGISystem2/ environment with sample theories${color.reset}\n`);
    }
  }

  const agent = new AgentSystem2({
    profile: 'manual_test',
    overrides: { storageRoot: dataRoot }
  });
  const session = agent.createSession();

  return { agent, session, root, theoriesRoot, isFirstRun };
}

function printMainHelp() {
  // High-level overview; specific commands get their own help sections.
  /* eslint-disable no-console */
  console.log(`${color.heading}AGISystem2 Raw CLI${color.reset}`);
  console.log(`${color.dim}Manual-test engine in .AGISystem2 for the current directory.${color.reset}`);
  console.log('You interact by typing commands followed by canonical statements or questions.\n');
  console.log(`${color.section}Core commands${color.reset}:`);
  console.log(`  ${color.command}help${color.reset}                 - show this summary`);
  console.log(`  ${color.command}help commands${color.reset}        - list all commands with short descriptions`);
  console.log(`  ${color.command}help syntax${color.reset}          - describe the constrained grammar (facts and questions)`);
  console.log(`  ${color.command}help examples${color.reset}        - show example sessions\n`);
  console.log(`${color.section}Fact and query commands${color.reset}:`);
  console.log(`  ${color.command}add <fact>${color.reset}           - ingest a fact, e.g. ${color.example}add Dog IS_A Animal${color.reset}`);
  console.log(`  ${color.command}ask <question>${color.reset}       - ask a question, e.g. ${color.example}ask Is Dog an Animal?${color.reset}`);
  console.log(`  ${color.command}retract <fact>${color.reset}       - remove a fact, e.g. ${color.example}retract Dog IS_A Animal${color.reset}`);
  console.log(`  ${color.command}abduct <obs> [REL]${color.reset}   - abductive query, e.g. ${color.example}abduct Smoke CAUSES${color.reset}`);
  console.log(`  ${color.command}cf <q> | <facts>${color.reset}     - counterfactual ask with extra facts for this question only\n`);
  console.log(`${color.section}Reasoning commands${color.reset}:`);
  console.log(`  ${color.command}prove <statement>${color.reset}    - attempt to prove, e.g. ${color.example}prove Dog IS_A Animal${color.reset}`);
  console.log(`  ${color.command}validate${color.reset}             - check theory consistency`);
  console.log(`  ${color.command}hypothesize <subj>${color.reset}   - generate hypotheses for subject\n`);
  console.log(`${color.section}Theory layers (what-if)${color.reset}:`);
  console.log(`  ${color.command}push [name]${color.reset}          - push new theory layer for exploration`);
  console.log(`  ${color.command}pop${color.reset}                  - pop and discard top layer`);
  console.log(`  ${color.command}layers${color.reset}               - show current layer stack\n`);
  console.log(`${color.section}Knowledge inspection${color.reset}:`);
  console.log(`  ${color.command}facts [pattern]${color.reset}      - list facts (optionally filter by subject)`);
  console.log(`  ${color.command}concepts${color.reset}             - list all concepts`);
  console.log(`  ${color.command}usage <concept>${color.reset}      - show usage statistics`);
  console.log(`  ${color.command}inspect <concept>${color.reset}    - detailed concept info\n`);
  console.log(`${color.section}Memory management${color.reset}:`);
  console.log(`  ${color.command}protect <concept>${color.reset}    - protect from forgetting`);
  console.log(`  ${color.command}unprotect <concept>${color.reset}  - remove protection`);
  console.log(`  ${color.command}forget <criteria>${color.reset}    - forget by threshold/pattern/concept`);
  console.log(`  ${color.command}boost <concept> [n]${color.reset}  - boost usage priority\n`);
  console.log(`${color.section}Domain helpers${color.reset}:`);
  console.log(`  ${color.command}check-procedure ...${color.reset}  - compliance check for procedures and requirements`);
  console.log(`  ${color.command}check-export ...${color.reset}     - compliance check for export actions under regulations`);
  console.log(`  ${color.command}check-magic ...${color.reset}      - narrative check for magic allowed in a city\n`);
  console.log(`${color.section}Theory files${color.reset}:`);
  console.log(`  ${color.command}new-theory <name>${color.reset}    - create empty theory file under .AGISystem2/theories`);
  console.log(`  ${color.command}list-theories${color.reset}        - list known theory files`);
  console.log(`  ${color.command}show-theory <name>${color.reset}   - print a theory file`);
  console.log(`  ${color.command}load-theory <name>${color.reset}   - load theory into current session`);
  console.log(`  ${color.command}init-samples${color.reset}         - install sample theories (law, health, sci-fi)\n`);
  console.log(`${color.section}Introspection${color.reset}:`);
  console.log(`  ${color.command}config${color.reset}               - print current config snapshot (profile, dims, limits)`);
  console.log(`  ${color.command}run <dsl>${color.reset}            - execute raw DSL statement`);
  console.log(`  ${color.command}exit${color.reset} / ${color.command}quit${color.reset}          - end the session\n`);
  console.log(`Type ${color.command}help syntax${color.reset} for more detail on permitted sentences and relations.`);
  /* eslint-enable no-console */
}

function printCommandsHelp() {
  /* eslint-disable no-console */
  console.log(`${color.heading}Commands Reference${color.reset}`);
  console.log(`${color.section}Facts and queries${color.reset}`);
  console.log(`  ${color.command}add <fact>${color.reset}`);
  console.log('    Ingests a single fact into long-term memory.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}add Dog IS_A Animal${color.reset}`);
  console.log(`             ${color.example}add Water HAS_PROPERTY boiling_point=100${color.reset}\n`);
  console.log(`  ${color.command}ask <question>${color.reset}`);
  console.log('    Asks a question in constrained English or canonical triple form.');
  console.log(`    ${color.label}Examples${color.reset}: ${color.example}ask Is Dog an Animal?${color.reset}`);
  console.log(`              ${color.example}ask Water HAS_PROPERTY boiling_point=100?${color.reset}\n`);
  console.log(`  ${color.command}abduct <observation> [REL]${color.reset}`);
  console.log('    Performs abductive reasoning for observed effects using causal facts.');
  console.log('    The REL argument is optional and currently treated as a hint; the engine');
  console.log('    searches CAUSES/CAUSED_BY relations regardless.');
  console.log(`    ${color.label}Examples${color.reset}: ${color.example}abduct Smoke CAUSES${color.reset}`);
  console.log(`               ${color.example}abduct Smoke CAUSED_BY${color.reset}\n`);
  console.log(`  ${color.command}cf <question> | <fact1> ; <fact2> ; ...${color.reset}`);
  console.log('    Runs a counterfactual question using extra, temporary facts.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}cf Water HAS_PROPERTY boiling_point=50? | Water HAS_PROPERTY boiling_point=50${color.reset}\n`);
  console.log(`${color.section}Compliance and narrative helpers${color.reset}`);
  console.log(`  ${color.command}check-procedure <ProcedureId> [| extra facts]${color.reset}`);
  console.log('    Uses a theory-level macro defined in the engine to evaluate health-style');
  console.log('    procedure compliance. The macro is written in the same DSL that theories');
  console.log('    use, combining generic primitives like FACTS_MATCHING and');
  console.log('    ALL_REQUIREMENTS_SATISFIED; no health rules are hard-coded in JS.');
  console.log('    Typical facts: ProcedureX REQUIRES Consent, Consent GIVEN yes,');
  console.log('    AuditTrail PRESENT yes, etc.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}check-procedure ProcedureX${color.reset}`);
  console.log(`             ${color.example}check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes${color.reset}\n`);
  console.log(`  ${color.command}check-export <ActionId> <Reg1> [Reg2 ...] [| extra facts]${color.reset}`);
  console.log('    Checks an export action under one or more regulation names using a');
  console.log('    macro that inspects PROHIBITED_BY/PERMITTED_BY facts and applies a');
  console.log('    generic conflict triage rule (permit vs. prohibit vs. conflict).');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}check-export ExportData GDPR${color.reset}`);
  console.log(`             ${color.example}check-export ExportData GDPR HIPAA${color.reset}\n`);
  console.log(`  ${color.command}check-magic <ActorId> <CityId> [| extra facts]${color.reset}`);
  console.log('    Checks whether an actor is allowed to cast magic in a city via a macro');
  console.log('    that requires three conditions: the actor casts Magic, is located in the');
  console.log('    city, and some theory states that magic is permitted there (for example,');
  console.log('    SciFi_TechMagic PERMITS Magic_IN CityX). All of this is expressed in DSL');
  console.log('    rather than hard-coded logic.\n');
  console.log(`${color.section}Theory and introspection${color.reset}`);
  console.log(`  ${color.command}new-theory <name>${color.reset}`);
  console.log('    Creates an empty .AGISystem2/theories/<name>.txt file you can edit with facts.');
  console.log('    Each line should be a canonical fact (Subject REL Object).');
  console.log(`  ${color.command}list-theories${color.reset}`);
  console.log('    Lists theory files in .AGISystem2/theories.');
  console.log(`  ${color.command}show-theory <name>${color.reset}`);
  console.log('    Prints the contents of a theory file.');
  console.log(`  ${color.command}apply-theory <name> <question>${color.reset}`);
  console.log('    Reads facts from the named theory and applies them as a temporary layer');
  console.log('    when answering the question (similar to cf).');
  console.log(`  ${color.command}init-samples${color.reset}`);
  console.log('    Writes a few sample theory files for law/health/sci-fi into .AGISystem2/theories.\n');
  console.log(`  ${color.command}config${color.reset}`);
  console.log('    Prints the current configuration snapshot (profile, dimensions, limits).');
  console.log(`  ${color.command}exit${color.reset} / ${color.command}quit${color.reset}`);
  console.log('    Ends the CLI session.\n');
  /* eslint-enable no-console */
}

function printSyntaxHelp() {
  /* eslint-disable no-console */
  console.log(`${color.heading}Constrained Grammar and Syntax${color.reset}`);
  console.log('AGISystem2 works with a small, explicit dialect of English.');
  console.log('Every fact is a subject–relation–object triple. The subject and object');
  console.log('are tokens or short phrases; the relation is usually an ALL_CAPS verb.\n');

  console.log(`${color.section}Facts${color.reset}:`);
  console.log(`  ${color.example}Dog IS_A Animal${color.reset}`);
  console.log(`  ${color.example}Water HAS_PROPERTY boiling_point=100${color.reset}`);
  console.log(`  ${color.example}ProcedureX REQUIRES Consent${color.reset}`);
  console.log(`  ${color.example}Consent GIVEN yes${color.reset}`);
  console.log(`  ${color.example}AuditTrail PRESENT yes${color.reset}`);
  console.log(`  ${color.example}ExportData PROHIBITED_BY GDPR${color.reset}`);
  console.log(`  ${color.example}ExportData PERMITTED_BY HIPAA${color.reset}`);
  console.log(`  ${color.example}Alice CASTS Magic${color.reset}`);
  console.log(`  ${color.example}Alice LOCATED_IN CityX${color.reset}`);
  console.log(`  ${color.example}SciFi_TechMagic PERMITS Magic_IN CityX${color.reset}\n`);

  console.log(`${color.section}Questions${color.reset}:`);
  console.log('  There are two main forms:');
  console.log(`    1) Natural interrogatives: ${color.example}Is X an Y?${color.reset} / ${color.example}Is X Y?${color.reset}`);
  console.log(`       Example: ${color.example}Is Dog an Animal?${color.reset}`);
  console.log(`    2) Canonical triple with question mark: ${color.example}Subject REL Object?${color.reset}`);
  console.log(`       Example: ${color.example}Water HAS_PROPERTY boiling_point=100?${color.reset}\n`);

  console.log(`${color.section}Relations${color.reset}:`);
  console.log('  Structural: IS_A, HAS_PROPERTY, LOCATED_IN, DISJOINT_WITH etc.');
  console.log('  Causal: CAUSES, CAUSED_BY');
  console.log('  Deontic: PROHIBITED_BY, PERMITTED_BY');
  console.log('  Domain-specific (health): REQUIRES, GIVEN, PRESENT');
  console.log('  Domain-specific (narrative): CASTS, PERMITS Magic_IN CityX\n');

  console.log(`${color.dim}The CLI does not accept free-form paragraphs. If you pass a sentence${color.reset}`);
  console.log(`${color.dim}that TranslatorBridge cannot normalise to this grammar, it will throw${color.reset}`);
  console.log(`${color.dim}an error instead of guessing. This is intentional: every vector and${color.reset}`);
  console.log(`${color.dim}every decision must be traceable back to a clear canonical sentence.${color.reset}\n`);
  /* eslint-enable no-console */
}

function printExamplesHelp() {
  /* eslint-disable no-console */
  console.log(`${color.heading}Example Session: Basics${color.reset}`);
  console.log(`${color.example}  add Dog IS_A Animal${color.reset}`);
  console.log(`${color.example}  add Water HAS_PROPERTY boiling_point=100${color.reset}`);
  console.log(`${color.example}  ask Is Dog an Animal?${color.reset}`);
  console.log(`${color.example}  ask Water HAS_PROPERTY boiling_point=100?${color.reset}\n`);

  console.log(`${color.heading}Example Session: Abduction${color.reset}`);
  console.log(`${color.example}  add Fire CAUSES Smoke${color.reset}`);
  console.log(`${color.example}  add Smoke CAUSED_BY Fire${color.reset}`);
  console.log(`${color.example}  abduct Smoke CAUSES    # expects Fire as hypothesis${color.reset}\n`);

  console.log(`${color.heading}Example Session: Counterfactual${color.reset}`);
  console.log(`${color.example}  add Water HAS_PROPERTY boiling_point=100${color.reset}`);
  console.log(`${color.example}  ask Water HAS_PROPERTY boiling_point=50?    # FALSE in base context${color.reset}`);
  console.log(`${color.example}  cf Water HAS_PROPERTY boiling_point=50? | Water HAS_PROPERTY boiling_point=50${color.reset}`);
  console.log(`${color.dim}    # TRUE_CERTAIN under temporary assumption${color.reset}\n`);

  console.log(`${color.heading}Example Session: Health Compliance${color.reset}`);
  console.log(`${color.example}  add ProcedureX REQUIRES Consent${color.reset}`);
  console.log(`${color.example}  add ProcedureX REQUIRES AuditTrail${color.reset}`);
  console.log(`${color.example}  check-procedure ProcedureX${color.reset}`);
  console.log(`${color.example}  check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes${color.reset}\n`);

  console.log(`${color.heading}Example Session: Export and Narrative${color.reset}`);
  console.log(`${color.example}  add ExportData PROHIBITED_BY GDPR${color.reset}`);
  console.log(`${color.example}  add ExportData PERMITTED_BY HIPAA${color.reset}`);
  console.log(`${color.example}  check-export ExportData GDPR${color.reset}`);
  console.log(`${color.example}  check-export ExportData HIPAA${color.reset}\n`);

  console.log(`${color.example}  add Alice IS_A Human${color.reset}`);
  console.log(`${color.example}  add Alice LOCATED_IN CityX${color.reset}`);
  console.log(`${color.example}  add Alice CASTS Magic${color.reset}`);
  console.log(`${color.example}  check-magic Alice CityX           # FALSE without SciFi_TechMagic${color.reset}`);
  console.log(`${color.example}  check-magic Alice CityX | SciFi_TechMagic PERMITS Magic_IN CityX${color.reset}\n`);

  console.log(`${color.heading}Example Session: Theories${color.reset}`);
  console.log(`${color.example}  init-samples${color.reset}`);
  console.log(`${color.example}  list-theories${color.reset}`);
  console.log(`${color.example}  show-theory health_compliance${color.reset}`);
  console.log(`${color.example}  apply-theory health_compliance check-procedure ProcedureX${color.reset}`);
  console.log(`${color.example}  apply-theory scifi_magic check-magic Alice CityX${color.reset}\n`);

  console.log(`${color.dim}These examples are intentionally simple. You can create your own theory${color.reset}`);
  console.log(`${color.dim}files under .AGISystem2/theories by writing one fact per line, using the${color.reset}`);
  console.log(`${color.dim}same constrained grammar, and then apply them with apply-theory.${color.reset}\n`);
  /* eslint-enable no-console */
}

function initSampleTheories(theoriesRoot) {
  const names = ['health_compliance', 'law_minimal', 'scifi_magic'];
  for (const name of names) {
    const src = path.join(__dirname, '..', 'data', 'init', 'theories', `${name}.sys2dsl`);
    const dest = path.join(theoriesRoot, `${name}.sys2dsl`);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      const content = fs.readFileSync(src, 'utf8');
      fs.writeFileSync(dest, content, 'utf8');
    }
  }
}

// =========================================================================
// Batch/Non-interactive mode support
// =========================================================================

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
        const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
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
        // Domain helpers - simplified for batch mode
        result.result = { note: 'Domain helper - use interactive mode for full output' };
        break;
      }
      case 'init-samples': {
        initSampleTheories(theoriesRoot);
        result.result = { ok: true, installed: ['health_compliance', 'law_minimal', 'scifi_magic'] };
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
 * Run commands from a file in batch mode
 * @param {string} batchFile - Path to file with commands
 * @param {string} outputFile - Optional path to output file
 * @param {boolean} jsonOutput - Whether to output JSON
 */
async function runBatch(batchFile, outputFile, jsonOutput) {
  const { session, theoriesRoot } = initEngine();

  if (!fs.existsSync(batchFile)) {
    console.error(`Error: Batch file not found: ${batchFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(batchFile, 'utf8');
  const lines = content.split('\n');

  const results = {
    batchFile,
    timestamp: new Date().toISOString(),
    commands: [],
    summary: { total: 0, executed: 0, skipped: 0, errors: 0 }
  };

  for (const line of lines) {
    results.summary.total++;
    const cmdResult = executeCommand(line, session, theoriesRoot);

    if (cmdResult.skipped) {
      results.summary.skipped++;
    } else if (cmdResult.error) {
      results.summary.errors++;
      results.commands.push(cmdResult);
    } else {
      results.summary.executed++;
      results.commands.push(cmdResult);
    }
  }

  // Output results
  if (jsonOutput || outputFile) {
    const output = JSON.stringify(results, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, output, 'utf8');
      console.log(`Results written to: ${outputFile}`);
    } else {
      console.log(output);
    }
  } else {
    // Human-readable output
    console.log(`\n${color.heading}Batch Execution Results${color.reset}`);
    console.log(`File: ${batchFile}`);
    console.log(`Total: ${results.summary.total}, Executed: ${results.summary.executed}, Skipped: ${results.summary.skipped}, Errors: ${results.summary.errors}\n`);

    for (const cmd of results.commands) {
      if (cmd.error) {
        console.log(`${color.error}ERROR${color.reset} ${cmd.command} ${cmd.args}`);
        console.log(`  ${color.dim}${cmd.error}${color.reset}`);
      } else {
        console.log(`${color.label}OK${color.reset} ${cmd.command} ${cmd.args}`);
        if (cmd.result && typeof cmd.result === 'object') {
          const preview = JSON.stringify(cmd.result).substring(0, 80);
          console.log(`  ${color.dim}${preview}${preview.length >= 80 ? '...' : ''}${color.reset}`);
        }
      }
    }
  }

  // Exit with error code if any errors
  process.exit(results.summary.errors > 0 ? 1 : 0);
}

/**
 * Execute a single command from --exec argument
 * @param {string} command - The command to execute
 * @param {boolean} jsonOutput - Whether to output JSON
 */
async function runSingleCommand(command, jsonOutput) {
  const { session, theoriesRoot } = initEngine();

  const result = executeCommand(command, session, theoriesRoot);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.error) {
      console.log(`${color.error}ERROR${color.reset}: ${result.error}`);
      process.exit(1);
    } else {
      console.log(`${color.label}Result${color.reset}:`);
      console.log(JSON.stringify(result.result, null, 2));
    }
  }

  process.exit(result.error ? 1 : 0);
}

/**
 * Print batch mode help
 */
function printBatchHelp() {
  console.log(`${color.heading}AGISystem2 CLI - Batch Mode${color.reset}\n`);
  console.log(`${color.section}Usage:${color.reset}`);
  console.log(`  Interactive:  node cli/agisystem2-cli.js`);
  console.log(`  Batch:        node cli/agisystem2-cli.js --batch <commands.txt> [--output <results.json>]`);
  console.log(`  Single:       node cli/agisystem2-cli.js --exec "add Dog IS_A Animal"`);
  console.log(`\n${color.section}Options:${color.reset}`);
  console.log(`  --batch <file>   Execute commands from file (one per line)`);
  console.log(`  --output <file>  Write results to file (implies JSON)`);
  console.log(`  --exec "cmd"     Execute a single command`);
  console.log(`  --json           Output results in JSON format`);
  console.log(`  --no-color       Disable colored output`);
  console.log(`  --help, -h       Show this help`);
  console.log(`\n${color.section}Batch File Format:${color.reset}`);
  console.log(`  # Comments start with # or //`);
  console.log(`  add Dog IS_A Animal`);
  console.log(`  add Cat IS_A Animal`);
  console.log(`  ask Is Dog an Animal?`);
  console.log(`  prove Cat IS_A Animal`);
  console.log(`\n${color.section}Examples:${color.reset}`);
  console.log(`  ${color.example}node cli/agisystem2-cli.js --batch tests/cli/basic_facts.txt${color.reset}`);
  console.log(`  ${color.example}node cli/agisystem2-cli.js --batch tests/cli/theory_test.txt --output results.json${color.reset}`);
  console.log(`  ${color.example}node cli/agisystem2-cli.js --exec "add Water HAS_PROPERTY liquid" --json${color.reset}`);
  console.log('');
}

async function main() {
  // Handle batch mode / single command / help before interactive mode
  if (options.help) {
    printBatchHelp();
    process.exit(0);
  }

  if (options.batch) {
    await runBatch(options.batch, options.output, options.json);
    return; // runBatch calls process.exit
  }

  if (options.exec) {
    await runSingleCommand(options.exec, options.json);
    return; // runSingleCommand calls process.exit
  }

  // Interactive mode
  const { agent, session, theoriesRoot } = initEngine();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'AGIS2> '
  });

  printMainHelp();
  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const args = rest.join(' ');

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          if (!args) {
            printMainHelp();
          } else if (args.toLowerCase() === 'commands') {
            printCommandsHelp();
          } else if (args.toLowerCase() === 'syntax') {
            printSyntaxHelp();
          } else if (args.toLowerCase() === 'examples') {
            printExamplesHelp();
          } else {
            printMainHelp();
          }
          break;
        case 'add': {
          // Translate legacy "add fact" into a Sys2DSL ASSERT statement in the current session.
          const fact = args.trim();
          if (!fact) {
            console.log('Usage: add <Subject REL Object>');
            break;
          }
          session.run([`@f ASSERT ${fact}`]);
          console.log(`${color.label}OK${color.reset} ${color.dim}(fact ingested via Sys2DSL)${color.reset}`);
          break;
        }
        case 'ask': {
          const question = args.trim();
          const env = session.run([`@q ASK "${question}"`]);
          const res = env.q || env.result || {};
          if (res && Object.prototype.hasOwnProperty.call(res, 'band')) {
            console.log(
              `${color.label}Result${color.reset}: ${color.example}${res.truth}${color.reset}` +
              `  ${color.label}Band${color.reset}: ${color.example}${res.band}${color.reset}`
            );
          } else {
            console.log(`${color.label}Result${color.reset}: ${color.example}${res.truth}${color.reset}`);
          }
          break;
        }
        case 'abduct': {
          const parts = args.split(/\s+/);
          if (parts.length < 1 || !parts[0]) {
            console.log('Usage: abduct <observation> [REL]');
            break;
          }
          const observation = parts[0];
          const relation = parts.length >= 2 ? parts[1] : null;
          const env = session.run([
            relation
              ? `@h ABDUCT ${observation} ${relation}`
              : `@h ABDUCT ${observation}`
          ]);
          const res = env.h || {};
          console.log(`${color.label}Hypothesis${color.reset}: ${color.example}${res.hypothesis}${color.reset}  ${color.label}Band${color.reset}: ${color.example}${res.band}${color.reset}`);
          break;
        }
        case 'cf': {
          const split = args.split('|');
          if (split.length < 2) {
            console.log('Usage: cf <question> | <fact1> ; <fact2> ; ...');
            break;
          }
          const question = split[0].trim();
          const factsPart = split.slice(1).join('|');
          const facts = factsPart
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          const env = session.run([`@cf CF "${question}" | ${facts.join(' ; ')}`]);
          const res = env.cf || {};
          console.log(`${color.label}Result (counterfactual)${color.reset}: ${color.example}${res.truth}${color.reset}`);
          break;
        }
        case 'check-procedure': {
          const split = args.split('|');
          const head = split[0].trim();
          if (!head) {
            console.log('Usage: check-procedure <ProcedureId> [| extra facts]');
            break;
          }
          const extraFacts = split[1]
            ? split[1].split(';').map((s) => s.trim()).filter((s) => s.length > 0)
            : [];
          const env = session.run([
            `@procId ASSERT ${head} IS_A Procedure`,
            extraFacts.length
              ? `@cf CF "Is ${head} compliant?" | ${extraFacts.join(' ; ')}`
              : `@q ASK "Is ${head} compliant?"`
          ]);
          const res = env.cf || env.q || env.result || {};
          console.log(`${color.label}Procedure compliance${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
          break;
        }
        case 'check-export': {
          const split = args.split('|');
          const headParts = split[0].trim().split(/\s+/).filter(Boolean);
          if (headParts.length < 2) {
            console.log('Usage: check-export <ActionId> <Reg1> [Reg2 ...] [| extra facts]');
            break;
          }
          const actionId = headParts[0];
          const regs = headParts.slice(1);
          const extraFacts = split[1]
            ? split[1].split(';').map((s) => s.trim()).filter((s) => s.length > 0)
            : [];
          const env = session.run([
            extraFacts.length
              ? `@cf CF "Is ${actionId} allowed under ${regs.join(',')}?" | ${extraFacts.join(' ; ')}`
              : `@q ASK "Is ${actionId} allowed under ${regs.join(',')}?"`
          ]);
          const res = env.cf || env.q || env.result || {};
          console.log(`${color.label}Export decision under${color.reset} ${color.example}${regs.join(',')}${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
          break;
        }
        case 'check-magic': {
          const split = args.split('|');
          const headParts = split[0].trim().split(/\s+/).filter(Boolean);
          if (headParts.length < 2) {
            console.log('Usage: check-magic <ActorId> <CityId> [| extra facts]');
            break;
          }
          const actorId = headParts[0];
          const cityId = headParts[1];
          const extraFacts = split[1]
            ? split[1].split(';').map((s) => s.trim()).filter((s) => s.length > 0)
            : [];
          const env = session.run([
            extraFacts.length
              ? `@cf CF "Can ${actorId} cast magic in ${cityId}?" | ${extraFacts.join(' ; ')}`
              : `@q ASK "Can ${actorId} cast magic in ${cityId}?"`
          ]);
          const res = env.cf || env.q || env.result || {};
          console.log(`${color.label}Magic allowed${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
          break;
        }
        case 'new-theory': {
          const name = args.trim();
          if (!name) {
            console.log('Usage: new-theory <name>');
            break;
          }
          const filePath = path.join(theoriesRoot, `${name}.txt`);
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(
              filePath,
              '# One fact per line, using Subject REL Object\n',
              'utf8'
            );
            console.log(`${color.label}Created theory file${color.reset}: ${filePath}`);
          } else {
            console.log(`${color.dim}Theory file already exists:${color.reset} ${filePath}`);
          }
          break;
        }
        case 'list-theories': {
          const entries = fs.readdirSync(theoriesRoot)
            .filter((f) => f.endsWith('.sys2dsl'))
            .sort();
          if (entries.length === 0) {
            console.log(`${color.dim}No theories found in${color.reset} ${theoriesRoot}`);
          } else {
            console.log(`${color.section}Theories in${color.reset} ${theoriesRoot}:`);
            for (const e of entries) {
              console.log(`  - ${color.example}${e.replace(/\\.txt$/, '')}${color.reset}`);
            }
          }
          break;
        }
        case 'show-theory': {
          const name = args.trim();
          if (!name) {
            console.log('Usage: show-theory <name>');
            break;
          }
          const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
          if (!fs.existsSync(filePath)) {
            console.log(`${color.error}No such theory file${color.reset}: ${filePath}`);
          } else {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`${color.section}--- ${filePath} ---${color.reset}\n${content}`);
          }
          break;
        }
        case 'apply-theory': {
          const split = args.split(/\s+/);
          if (split.length < 2) {
            console.log('Usage: apply-theory <name> <question...>');
            break;
          }
          const name = split[0];
          const question = split.slice(1).join(' ');
          const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
          if (!fs.existsSync(filePath)) {
            console.log(`${color.error}Theory file not found${color.reset}: ${filePath}`);
            break;
          }
          const content = fs.readFileSync(filePath, 'utf8');
          session.appendTheory(content);
          const env = session.run([`@q ASK "${question}"`]);
          const res = env.q || env.result || {};
          console.log(`${color.label}Result with theory${color.reset} ${color.example}${name}${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
          break;
        }
        case 'init-samples':
          initSampleTheories(theoriesRoot);
          console.log(`${color.label}Sample theories installed under${color.reset} ${theoriesRoot}`);
          break;
        case 'config': {
          const snap = session.engine.config.snapshot();
          console.log(JSON.stringify(snap, null, 2));
          break;
        }

        // =========================================================================
        // New commands: Reasoning
        // =========================================================================
        case 'retract': {
          const fact = args.trim();
          if (!fact) {
            console.log('Usage: retract <Subject REL Object>');
            break;
          }
          const env = session.run([`@r RETRACT ${fact}`]);
          const res = env.r || {};
          if (res.ok) {
            console.log(`${color.label}OK${color.reset} ${color.dim}(fact retracted)${color.reset}`);
          } else {
            console.log(`${color.dim}No matching fact found${color.reset}`);
          }
          break;
        }
        case 'prove': {
          const statement = args.trim();
          if (!statement) {
            console.log('Usage: prove <Subject REL Object>');
            break;
          }
          const env = session.run([`@r PROVE ${statement}`]);
          const res = env.r || {};
          if (res.proven) {
            console.log(`${color.label}PROVEN${color.reset} ${color.dim}(method: ${res.method}, confidence: ${res.confidence})${color.reset}`);
            if (res.chain) {
              console.log(`${color.dim}Chain: ${res.chain.join(' → ')}${color.reset}`);
            }
          } else {
            console.log(`${color.error}NOT PROVEN${color.reset} ${color.dim}(method: ${res.method})${color.reset}`);
          }
          break;
        }
        case 'validate': {
          const env = session.run(['@r VALIDATE']);
          const res = env.r || {};
          if (res.consistent) {
            console.log(`${color.label}CONSISTENT${color.reset} ${color.dim}(${res.factCount} facts checked)${color.reset}`);
          } else {
            console.log(`${color.error}INCONSISTENT${color.reset} ${color.dim}(${res.issues.length} issues found)${color.reset}`);
            for (const issue of res.issues || []) {
              console.log(`  - ${color.example}${issue.type}${color.reset}: ${issue.subject} at ${issue.location}`);
            }
          }
          break;
        }
        case 'hypothesize': {
          const subject = args.trim();
          if (!subject) {
            console.log('Usage: hypothesize <subject>');
            break;
          }
          const env = session.run([`@r HYPOTHESIZE ${subject}`]);
          const res = env.r || {};
          console.log(`${color.label}Hypotheses for${color.reset} ${color.example}${res.subject}${color.reset}:`);
          for (const h of res.hypotheses || []) {
            console.log(`  - ${h.subject} ${color.example}${h.relation}${color.reset} ${h.object} ${color.dim}(basis: ${h.basis})${color.reset}`);
          }
          if (!res.hypotheses || res.hypotheses.length === 0) {
            console.log(`  ${color.dim}(none generated)${color.reset}`);
          }
          break;
        }

        // =========================================================================
        // New commands: Theory layers
        // =========================================================================
        case 'push': {
          const name = args.trim() || `layer_${Date.now()}`;
          const env = session.run([`@r THEORY_PUSH name="${name}"`]);
          const res = env.r || {};
          console.log(`${color.label}Pushed layer${color.reset} ${color.example}${name}${color.reset} ${color.dim}(depth: ${res.depth})${color.reset}`);
          break;
        }
        case 'pop': {
          const env = session.run(['@r THEORY_POP']);
          const res = env.r || {};
          if (res.ok) {
            console.log(`${color.label}Popped layer${color.reset} ${color.example}${res.popped}${color.reset} ${color.dim}(depth: ${res.depth})${color.reset}`);
          } else {
            console.log(`${color.error}No layer to pop${color.reset}`);
          }
          break;
        }
        case 'layers': {
          const env = session.run(['@r LIST_THEORIES']);
          const res = env.r || {};
          console.log(`${color.label}Theory layers${color.reset} ${color.dim}(${res.count} active)${color.reset}:`);
          for (const layer of res.active || []) {
            console.log(`  - ${color.example}${layer}${color.reset}`);
          }
          if (res.count === 0) {
            console.log(`  ${color.dim}(base layer only)${color.reset}`);
          }
          break;
        }

        // =========================================================================
        // New commands: Knowledge inspection
        // =========================================================================
        case 'facts': {
          const pattern = args.trim();
          const dsl = pattern
            ? `@r FACTS_MATCHING ${pattern} ? ?`
            : '@r FACTS_MATCHING ? ? ?';
          const env = session.run([dsl]);
          const facts = env.r || [];
          console.log(`${color.label}Facts${color.reset} ${color.dim}(${facts.length} found)${color.reset}:`);
          for (const f of facts.slice(0, 20)) {
            console.log(`  ${f.subject} ${color.example}${f.relation}${color.reset} ${f.object}`);
          }
          if (facts.length > 20) {
            console.log(`  ${color.dim}... and ${facts.length - 20} more${color.reset}`);
          }
          break;
        }
        case 'concepts': {
          const conceptStore = session.engine.conceptStore;
          const concepts = conceptStore.listConcepts();
          console.log(`${color.label}Concepts${color.reset} ${color.dim}(${concepts.length} total)${color.reset}:`);
          for (const c of concepts.slice(0, 30)) {
            console.log(`  - ${color.example}${c}${color.reset}`);
          }
          if (concepts.length > 30) {
            console.log(`  ${color.dim}... and ${concepts.length - 30} more${color.reset}`);
          }
          break;
        }
        case 'usage': {
          const concept = args.trim();
          if (!concept) {
            console.log('Usage: usage <concept>');
            break;
          }
          const env = session.run([`@r GET_USAGE ${concept}`]);
          const res = env.r || {};
          if (res.error) {
            console.log(`${color.error}${res.error}${color.reset}`);
          } else {
            console.log(`${color.label}Usage stats for${color.reset} ${color.example}${concept}${color.reset}:`);
            console.log(`  Total: ${res.usageCount}  Assert: ${res.assertCount}  Query: ${res.queryCount}  Inference: ${res.inferenceCount}`);
            console.log(`  Recency: ${res.recency}  Frequency: ${res.frequency}  Priority: ${res.priority}`);
            console.log(`  Created: ${res.createdAt}  Last used: ${res.lastUsedAt}`);
          }
          break;
        }
        case 'inspect': {
          const concept = args.trim();
          if (!concept) {
            console.log('Usage: inspect <concept>');
            break;
          }
          const env = session.run([`@r INSPECT ${concept}`]);
          const res = env.r;
          if (!res) {
            console.log(`${color.error}Concept not found${color.reset}`);
          } else {
            console.log(`${color.label}Concept${color.reset} ${color.example}${res.label}${color.reset}:`);
            console.log(`  Diamonds: ${res.diamonds.length}`);
            if (res.usage) {
              console.log(`  Priority: ${res.usage.priority}  Usage: ${res.usage.usageCount}`);
            }
            console.log(`  Snapshot: ${res.timestamp}`);
          }
          break;
        }

        // =========================================================================
        // New commands: Memory management
        // =========================================================================
        case 'protect': {
          const concept = args.trim();
          if (!concept) {
            console.log('Usage: protect <concept>');
            break;
          }
          const env = session.run([`@r PROTECT ${concept}`]);
          const res = env.r || {};
          console.log(`${color.label}Protected${color.reset} ${color.example}${concept}${color.reset}`);
          break;
        }
        case 'unprotect': {
          const concept = args.trim();
          if (!concept) {
            console.log('Usage: unprotect <concept>');
            break;
          }
          const conceptStore = session.engine.conceptStore;
          conceptStore.unprotect(concept);
          console.log(`${color.label}Unprotected${color.reset} ${color.example}${concept}${color.reset}`);
          break;
        }
        case 'forget': {
          const criteria = args.trim();
          if (!criteria) {
            console.log('Usage: forget threshold=N | olderThan=Xd | concept=name | pattern=pat [dryRun]');
            break;
          }
          const env = session.run([`@r FORGET ${criteria}`]);
          const res = env.r || {};
          if (res.wouldRemove) {
            console.log(`${color.label}Would forget${color.reset} ${color.dim}(dry run)${color.reset}:`);
            for (const c of res.wouldRemove.slice(0, 10)) {
              console.log(`  - ${color.example}${c}${color.reset}`);
            }
          } else {
            console.log(`${color.label}Forgotten${color.reset} ${res.count} concepts`);
            if (res.protected.length > 0) {
              console.log(`${color.dim}Skipped ${res.protected.length} protected concepts${color.reset}`);
            }
          }
          break;
        }
        case 'boost': {
          const parts = args.trim().split(/\s+/);
          if (!parts[0]) {
            console.log('Usage: boost <concept> [amount]');
            break;
          }
          const concept = parts[0];
          const amount = parts[1] ? parseInt(parts[1], 10) : 10;
          const env = session.run([`@r BOOST ${concept} ${amount}`]);
          console.log(`${color.label}Boosted${color.reset} ${color.example}${concept}${color.reset} by ${amount}`);
          break;
        }

        // =========================================================================
        // New commands: DSL execution
        // =========================================================================
        case 'run': {
          const dsl = args.trim();
          if (!dsl) {
            console.log('Usage: run <@var COMMAND args...>');
            break;
          }
          const env = session.run([dsl]);
          console.log(`${color.label}Result${color.reset}:`);
          console.log(JSON.stringify(env, null, 2));
          break;
        }
        case 'load-theory': {
          const name = args.trim();
          if (!name) {
            console.log('Usage: load-theory <name>');
            break;
          }
          const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
          if (!fs.existsSync(filePath)) {
            console.log(`${color.error}Theory file not found${color.reset}: ${filePath}`);
            break;
          }
          const content = fs.readFileSync(filePath, 'utf8');
          session.appendTheory(content);
          console.log(`${color.label}Loaded theory${color.reset} ${color.example}${name}${color.reset}`);
          break;
        }

        case 'exit':
        case 'quit':
          rl.close();
          return;
        default:
          console.log(`${color.error}Unknown command${color.reset}. Type ${color.command}help${color.reset} for a list of commands.`);
          break;
      }
    } catch (err) {
      console.error(`${color.error}Error${color.reset}: ${err.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });

  rl.on('SIGINT', () => {
    rl.close();
  });
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
