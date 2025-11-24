#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const EngineAPI = require('../src/interface/api');

const color = {
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
  ensureDir(dataRoot);
  ensureDir(theoriesRoot);

  const api = new EngineAPI({
    profile: 'manual_test',
    storageRoot: dataRoot
  });

  return { api, root, theoriesRoot };
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
  console.log(`  ${color.command}abduct <obs> [REL]${color.reset}   - abductive query, e.g. ${color.example}abduct Smoke CAUSES${color.reset}`);
  console.log(`  ${color.command}cf <q> | <facts>${color.reset}     - counterfactual ask with extra facts for this question only\n`);
  console.log(`${color.section}Domain helpers${color.reset}:`);
  console.log(`  ${color.command}check-procedure ...${color.reset}  - compliance check for procedures and requirements`);
  console.log(`  ${color.command}check-export ...${color.reset}     - compliance check for export actions under regulations`);
  console.log(`  ${color.command}check-magic ...${color.reset}      - narrative check for magic allowed in a city\n`);
  console.log(`${color.section}Theory files${color.reset}:`);
  console.log(`  ${color.command}new-theory <name>${color.reset}    - create empty theory file under .AGISystem2/theories`);
  console.log(`  ${color.command}list-theories${color.reset}        - list known theory files`);
  console.log(`  ${color.command}show-theory <name>${color.reset}   - print a theory file`);
  console.log(`  ${color.command}apply-theory <name> <question>${color.reset} - ask question under facts from a theory`);
  console.log(`  ${color.command}init-samples${color.reset}         - install sample theories (law, health, sci-fi)\n`);
  console.log(`${color.section}Introspection${color.reset}:`);
  console.log(`  ${color.command}config${color.reset}               - print current config snapshot (profile, dims, limits)`);
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
  const samples = [
    {
      name: 'health_compliance.txt',
      lines: [
        'ProcedureX REQUIRES Consent',
        'ProcedureX REQUIRES AuditTrail',
        'ExportData PROHIBITED_BY GDPR',
        'ExportData PERMITTED_BY HIPAA'
      ]
    },
    {
      name: 'law_minimal.txt',
      lines: [
        'Killing PROHIBITS permitted',
        'Helping PERMITS permitted'
      ]
    },
    {
      name: 'scifi_magic.txt',
      lines: [
        'Alice IS_A Human',
        'Alice LOCATED_IN CityX',
        'Alice CASTS Magic',
        'SciFi_TechMagic PERMITS Magic_IN CityX'
      ]
    }
  ];
  for (const sample of samples) {
    const filePath = path.join(theoriesRoot, sample.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `${sample.lines.join('\n')}\n`, 'utf8');
    }
  }
}

function readTheoryFacts(theoriesRoot, name) {
  const filePath = path.join(theoriesRoot, `${name}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Theory file not found: ${filePath}`);
  }
  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  return lines;
}

async function main() {
  const { api, theoriesRoot } = initEngine();

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
        case 'add':
          api.ingest(args);
          console.log(`${color.label}OK${color.reset} ${color.dim}(fact ingested)${color.reset}`);
          break;
        case 'ask': {
          const res = api.ask(args);
          console.log(`${color.label}Result${color.reset}: ${color.example}${res.truth}${color.reset}`);
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
          const res = api.abduct(observation, relation);
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
          const res = api.counterfactualAsk(question, facts);
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
          const res = api.checkProcedureCompliance(head, extraFacts);
          console.log(`${color.label}Procedure compliance${color.reset}: ${color.example}${res.truth}${color.reset}`);
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
          const res = api.checkExport(actionId, regs, extraFacts);
          console.log(`${color.label}Export decision under${color.reset} ${color.example}${regs.join(',')}${color.reset}: ${color.example}${res.truth}${color.reset}`);
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
          const res = api.checkMagicInCity(actorId, cityId, extraFacts);
          console.log(`${color.label}Magic allowed${color.reset}: ${color.example}${res.truth}${color.reset}`);
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
            .filter((f) => f.endsWith('.txt'))
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
          const filePath = path.join(theoriesRoot, `${name}.txt`);
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
          const facts = readTheoryFacts(theoriesRoot, name);
          const res = api.counterfactualAsk(question, facts);
          console.log(`${color.label}Result with theory${color.reset} ${color.example}${name}${color.reset}: ${color.example}${res.truth}${color.reset}`);
          break;
        }
        case 'init-samples':
          initSampleTheories(theoriesRoot);
          console.log(`${color.label}Sample theories installed under${color.reset} ${theoriesRoot}`);
          break;
        case 'config': {
          const snap = api.config.snapshot();
          console.log(JSON.stringify(snap, null, 2));
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
