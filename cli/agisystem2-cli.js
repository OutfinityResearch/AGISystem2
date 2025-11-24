#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const EngineAPI = require('../src/interface/api');

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
  console.log('AGISystem2 Raw CLI');
  console.log('This tool starts a manual-test profile engine in .AGISystem2 for the current directory.');
  console.log('You interact by typing commands followed by canonical statements or questions.\n');
  console.log('Core commands:');
  console.log('  help                 - show this summary');
  console.log('  help commands        - list all commands with short descriptions');
  console.log('  help syntax          - describe the constrained grammar (facts and questions)');
  console.log('  help examples        - show example sessions');
  console.log('  add <fact>           - ingest a fact, e.g. add Dog IS_A Animal');
  console.log('  ask <question>       - ask a question, e.g. ask Is Dog an Animal?');
  console.log('  abduct <obs> <REL>   - abductive query, e.g. abduct Smoke CAUSES');
  console.log('  cf <q> | <facts>     - counterfactual ask with extra facts for this question only');
  console.log('  check-procedure ...  - compliance check for procedures and requirements');
  console.log('  check-export ...     - compliance check for export actions under regulations');
  console.log('  check-magic ...      - narrative check for magic allowed in a city');
  console.log('  new-theory <name>    - create an empty named theory file under .AGISystem2/theories');
  console.log('  list-theories        - list known theory files');
  console.log('  show-theory <name>   - print a theory file');
  console.log('  apply-theory <name> <question> - ask a question under the facts in the theory');
  console.log('  init-samples         - install sample theories (law, health, sci-fi) into .AGISystem2/theories');
  console.log('  config               - print current config snapshot (profile, dims, limits)');
  console.log('  exit / quit          - end the session\n');
  console.log('Type "help syntax" for more detail on permitted sentences and relations.');
  /* eslint-enable no-console */
}

function printCommandsHelp() {
  /* eslint-disable no-console */
  console.log('Commands Reference:');
  console.log('  add <fact>');
  console.log('    Ingests a single fact into long-term memory.');
  console.log('    Example: add Dog IS_A Animal');
  console.log('             add Water HAS_PROPERTY boiling_point=100\n');
  console.log('  ask <question>');
  console.log('    Asks a question in constrained English or canonical triple form.');
  console.log('    Examples: ask Is Dog an Animal?');
  console.log('              ask Water HAS_PROPERTY boiling_point=100?\n');
  console.log('  abduct <observation> <REL>');
  console.log('    Performs abductive reasoning for simple causal relations.');
  console.log('    Example: abduct Smoke CAUSES   (expects Fire as a likely cause)\n');
  console.log('  cf <question> | <fact1> ; <fact2> ; ...');
  console.log('    Runs a counterfactual question using extra, temporary facts.');
  console.log('    Example: cf Water HAS_PROPERTY boiling_point=50? | Water HAS_PROPERTY boiling_point=50\n');
  console.log('  check-procedure <ProcedureId> [| extra facts]');
  console.log('    Uses domain-specific health compliance logic:');
  console.log('    - facts of the form ProcedureX REQUIRES Consent');
  console.log('    - plus Consent GIVEN yes, AuditTrail PRESENT yes, etc.');
  console.log('    Example: check-procedure ProcedureX');
  console.log('             check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes\n');
  console.log('  check-export <ActionId> <Reg1> [Reg2 ...] [| extra facts]');
  console.log('    Checks an export action under one or more regulation names.');
  console.log('    Example: check-export ExportData GDPR');
  console.log('             check-export ExportData GDPR HIPAA\n');
  console.log('  check-magic <ActorId> <CityId> [| extra facts]');
  console.log('    Checks whether an actor is allowed to cast magic in a city, given facts');
  console.log('    like Alice CASTS Magic, Alice LOCATED_IN CityX and SciFi_TechMagic PERMITS Magic_IN CityX.\n');
  console.log('  new-theory <name>');
  console.log('    Creates an empty .AGISystem2/theories/<name>.txt file you can edit with facts.');
  console.log('    Each line should be a canonical fact (Subject REL Object).');
  console.log('  list-theories');
  console.log('    Lists theory files in .AGISystem2/theories.');
  console.log('  show-theory <name>');
  console.log('    Prints the contents of a theory file.');
  console.log('  apply-theory <name> <question>');
  console.log('    Reads facts from the named theory and applies them as a temporary layer');
  console.log('    when answering the question (similar to cf).');
  console.log('  init-samples');
  console.log('    Writes a few sample theory files for law/health/sci-fi into .AGISystem2/theories.\n');
  console.log('  config');
  console.log('    Prints the current configuration snapshot (profile, dimensions, limits).');
  console.log('  exit / quit');
  console.log('    Ends the CLI session.\n');
  /* eslint-enable no-console */
}

function printSyntaxHelp() {
  /* eslint-disable no-console */
  console.log('Constrained Grammar and Syntax:');
  console.log('AGISystem2 works with a small, explicit dialect of English.');
  console.log('Every fact is a subject–relation–object triple. The subject and object');
  console.log('are tokens or short phrases; the relation is usually an ALL_CAPS verb.');
  console.log('');
  console.log('Facts:');
  console.log('  Dog IS_A Animal');
  console.log('  Water HAS_PROPERTY boiling_point=100');
  console.log('  ProcedureX REQUIRES Consent');
  console.log('  Consent GIVEN yes');
  console.log('  AuditTrail PRESENT yes');
  console.log('  ExportData PROHIBITED_BY GDPR');
  console.log('  ExportData PERMITTED_BY HIPAA');
  console.log('  Alice CASTS Magic');
  console.log('  Alice LOCATED_IN CityX');
  console.log('  SciFi_TechMagic PERMITS Magic_IN CityX');
  console.log('');
  console.log('Questions:');
  console.log('  There are two main forms:');
  console.log('    1) Natural interrogatives: Is X an Y? / Is X Y?');
  console.log('       Example: Is Dog an Animal?');
  console.log('    2) Canonical triple with question mark: Subject REL Object?');
  console.log('       Example: Water HAS_PROPERTY boiling_point=100?');
  console.log('');
  console.log('Relations:');
  console.log('  Structural: IS_A, HAS_PROPERTY, LOCATED_IN, DISJOINT_WITH etc.');
  console.log('  Causal: CAUSES, CAUSED_BY');
  console.log('  Deontic: PROHIBITED_BY, PERMITTED_BY');
  console.log('  Domain-specific (health): REQUIRES, GIVEN, PRESENT');
  console.log('  Domain-specific (narrative): CASTS, PERMITS Magic_IN CityX');
  console.log('');
  console.log('The CLI does not accept free-form paragraphs. If you pass a sentence');
  console.log('that TranslatorBridge cannot normalise to this grammar, it will throw');
  console.log('an error instead of guessing. This is intentional: every vector and');
  console.log('every decision must be traceable back to a clear canonical sentence.\n');
  /* eslint-enable no-console */
}

function printExamplesHelp() {
  /* eslint-disable no-console */
  console.log('Example Session: Basics');
  console.log('  add Dog IS_A Animal');
  console.log('  add Water HAS_PROPERTY boiling_point=100');
  console.log('  ask Is Dog an Animal?');
  console.log('  ask Water HAS_PROPERTY boiling_point=100?');
  console.log('');
  console.log('Example Session: Abduction');
  console.log('  add Fire CAUSES Smoke');
  console.log('  add Smoke CAUSED_BY Fire');
  console.log('  abduct Smoke CAUSES    # expects Fire as hypothesis');
  console.log('');
  console.log('Example Session: Counterfactual');
  console.log('  add Water HAS_PROPERTY boiling_point=100');
  console.log('  ask Water HAS_PROPERTY boiling_point=50?    # FALSE in base context');
  console.log('  cf Water HAS_PROPERTY boiling_point=50? | Water HAS_PROPERTY boiling_point=50');
  console.log('    # TRUE_CERTAIN under temporary assumption');
  console.log('');
  console.log('Example Session: Health Compliance');
  console.log('  add ProcedureX REQUIRES Consent');
  console.log('  add ProcedureX REQUIRES AuditTrail');
  console.log('  check-procedure ProcedureX');
  console.log('  check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes');
  console.log('');
  console.log('Example Session: Export and Narrative');
  console.log('  add ExportData PROHIBITED_BY GDPR');
  console.log('  add ExportData PERMITTED_BY HIPAA');
  console.log('  check-export ExportData GDPR');
  console.log('  check-export ExportData HIPAA');
  console.log('');
  console.log('  add Alice IS_A Human');
  console.log('  add Alice LOCATED_IN CityX');
  console.log('  add Alice CASTS Magic');
  console.log('  check-magic Alice CityX           # FALSE without SciFi_TechMagic');
  console.log('  check-magic Alice CityX | SciFi_TechMagic PERMITS Magic_IN CityX');
  console.log('');
  console.log('Example Session: Theories');
  console.log('  init-samples');
  console.log('  list-theories');
  console.log('  show-theory health_compliance');
  console.log('  apply-theory health_compliance check-procedure ProcedureX');
  console.log('  apply-theory scifi_magic check-magic Alice CityX');
  console.log('');
  console.log('These examples are intentionally simple. You can create your own theory');
  console.log('files under .AGISystem2/theories by writing one fact per line, using the');
  console.log('same constrained grammar, and then apply them with apply-theory.\n');
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
          console.log('OK (fact ingested)');
          break;
        case 'ask': {
          const res = api.ask(args);
          console.log('Result:', res.truth);
          break;
        }
        case 'abduct': {
          const parts = args.split(/\s+/);
          if (parts.length < 2) {
            console.log('Usage: abduct <observation> <REL>');
            break;
          }
          const observation = parts[0];
          const relation = parts[1];
          const res = api.abduct(observation, relation);
          console.log('Hypothesis:', res.hypothesis, 'Band:', res.band);
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
          console.log('Result (counterfactual):', res.truth);
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
          console.log('Procedure compliance:', res.truth);
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
          console.log('Export decision under', regs.join(','), ':', res.truth);
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
          console.log('Magic allowed:', res.truth);
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
            console.log('Created theory file:', filePath);
          } else {
            console.log('Theory file already exists:', filePath);
          }
          break;
        }
        case 'list-theories': {
          const entries = fs.readdirSync(theoriesRoot)
            .filter((f) => f.endsWith('.txt'))
            .sort();
          if (entries.length === 0) {
            console.log('No theories found in', theoriesRoot);
          } else {
            console.log('Theories in', theoriesRoot, ':');
            for (const e of entries) {
              console.log('  -', e.replace(/\.txt$/, ''));
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
            console.log('No such theory file:', filePath);
          } else {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`--- ${filePath} ---\n${content}`);
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
          console.log('Result with theory', name + ':', res.truth);
          break;
        }
        case 'init-samples':
          initSampleTheories(theoriesRoot);
          console.log('Sample theories installed under', theoriesRoot);
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
          console.log('Unknown command. Type "help" for a list of commands.');
          break;
      }
    } catch (err) {
      console.error('Error:', err.message);
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

