/**
 * DS(/cli/cli_help.js) - CLI Help System
 *
 * Provides help documentation and usage examples for the AGISystem2 CLI.
 *
 * @module cli/cli_help
 */

/**
 * Create color scheme based on options
 * @param {Object} options - CLI options
 * @returns {Object} Color codes object
 */
function createColorScheme(options) {
  if (options.noColor || options.json) {
    return {
      heading: '', section: '', command: '', label: '',
      example: '', error: '', dim: '', reset: ''
    };
  }
  return {
    heading: '\x1b[1;36m',
    section: '\x1b[1;34m',
    command: '\x1b[1;32m',
    label: '\x1b[1;33m',
    example: '\x1b[0;36m',
    error: '\x1b[1;31m',
    dim: '\x1b[2m',
    reset: '\x1b[0m'
  };
}

/**
 * Print main help overview
 * @param {Object} color - Color scheme
 */
function printMainHelp(color) {
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
  console.log(`  ${color.command}debug${color.reset}                - toggle debug mode (shows DSL and results)`);
  console.log(`  ${color.command}exit${color.reset} / ${color.command}quit${color.reset}          - end the session\n`);
  console.log(`Type ${color.command}help syntax${color.reset} for more detail on permitted sentences and relations.`);
}

/**
 * Print commands reference
 * @param {Object} color - Color scheme
 */
function printCommandsHelp(color) {
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
  console.log(`    ${color.label}Examples${color.reset}: ${color.example}abduct Smoke CAUSES${color.reset}`);
  console.log(`               ${color.example}abduct Smoke CAUSED_BY${color.reset}\n`);
  console.log(`  ${color.command}cf <question> | <fact1> ; <fact2> ; ...${color.reset}`);
  console.log('    Runs a counterfactual question using extra, temporary facts.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}cf Water HAS_PROPERTY boiling_point=50? | Water HAS_PROPERTY boiling_point=50${color.reset}\n`);
  console.log(`${color.section}Compliance and narrative helpers${color.reset}`);
  console.log(`  ${color.command}check-procedure <ProcedureId> [| extra facts]${color.reset}`);
  console.log('    Uses a theory-level macro to evaluate health-style procedure compliance.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes${color.reset}\n`);
  console.log(`  ${color.command}check-export <ActionId> <Reg1> [Reg2 ...] [| extra facts]${color.reset}`);
  console.log('    Checks an export action under one or more regulation names.');
  console.log(`    ${color.label}Example${color.reset}: ${color.example}check-export ExportData GDPR HIPAA${color.reset}\n`);
  console.log(`  ${color.command}check-magic <ActorId> <CityId> [| extra facts]${color.reset}`);
  console.log('    Checks whether an actor is allowed to cast magic in a city.\n');
  console.log(`${color.section}Theory and introspection${color.reset}`);
  console.log(`  ${color.command}new-theory <name>${color.reset}`);
  console.log('    Creates an empty .AGISystem2/theories/<name>.txt file.');
  console.log(`  ${color.command}list-theories${color.reset}`);
  console.log('    Lists theory files in .AGISystem2/theories.');
  console.log(`  ${color.command}show-theory <name>${color.reset}`);
  console.log('    Prints the contents of a theory file.');
  console.log(`  ${color.command}apply-theory <name> <question>${color.reset}`);
  console.log('    Reads facts from the named theory as a temporary layer.');
  console.log(`  ${color.command}init-samples${color.reset}`);
  console.log('    Writes sample theory files for law/health/sci-fi.\n');
  console.log(`  ${color.command}config${color.reset}`);
  console.log('    Prints the current configuration snapshot.');
  console.log(`  ${color.command}exit${color.reset} / ${color.command}quit${color.reset}`);
  console.log('    Ends the CLI session.\n');
}

/**
 * Print syntax help
 * @param {Object} color - Color scheme
 */
function printSyntaxHelp(color) {
  console.log(`${color.heading}Constrained Grammar and Syntax${color.reset}`);
  console.log('AGISystem2 works with a small, explicit dialect of English.');
  console.log('Every fact is a subject–relation–object triple.\n');

  console.log(`${color.section}Facts${color.reset}:`);
  console.log(`  ${color.example}Dog IS_A Animal${color.reset}`);
  console.log(`  ${color.example}Water HAS_PROPERTY boiling_point=100${color.reset}`);
  console.log(`  ${color.example}ProcedureX REQUIRES Consent${color.reset}`);
  console.log(`  ${color.example}ExportData PROHIBITED_BY GDPR${color.reset}`);
  console.log(`  ${color.example}Alice CASTS Magic${color.reset}`);
  console.log(`  ${color.example}Alice LOCATED_IN CityX${color.reset}\n`);

  console.log(`${color.section}Questions${color.reset}:`);
  console.log('  There are two main forms:');
  console.log(`    1) Natural interrogatives: ${color.example}Is X an Y?${color.reset}`);
  console.log(`    2) Canonical triple with question mark: ${color.example}Subject REL Object?${color.reset}\n`);

  console.log(`${color.section}Relations${color.reset}:`);
  console.log('  Structural: IS_A, HAS_PROPERTY, LOCATED_IN, DISJOINT_WITH');
  console.log('  Causal: CAUSES, CAUSED_BY');
  console.log('  Deontic: PROHIBITED_BY, PERMITTED_BY');
  console.log('  Domain-specific: REQUIRES, GIVEN, PRESENT, CASTS, PERMITS\n');

  console.log(`${color.dim}The CLI does not accept free-form paragraphs. Every fact must be a clear triple.${color.reset}\n`);
}

/**
 * Print examples help
 * @param {Object} color - Color scheme
 */
function printExamplesHelp(color) {
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
  console.log(`${color.example}  check-export ExportData GDPR${color.reset}\n`);

  console.log(`${color.example}  add Alice LOCATED_IN CityX${color.reset}`);
  console.log(`${color.example}  add Alice CASTS Magic${color.reset}`);
  console.log(`${color.example}  check-magic Alice CityX | SciFi_TechMagic PERMITS Magic_IN CityX${color.reset}\n`);

  console.log(`${color.heading}Example Session: Theories${color.reset}`);
  console.log(`${color.example}  init-samples${color.reset}`);
  console.log(`${color.example}  list-theories${color.reset}`);
  console.log(`${color.example}  show-theory health_compliance${color.reset}`);
  console.log(`${color.example}  apply-theory health_compliance check-procedure ProcedureX${color.reset}\n`);
}

/**
 * Print batch mode help
 * @param {Object} color - Color scheme
 */
function printBatchHelp(color) {
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
  console.log(`  ${color.example}node cli/agisystem2-cli.js --exec "add Water HAS_PROPERTY liquid" --json${color.reset}`);
  console.log('');
}

module.exports = {
  createColorScheme,
  printMainHelp,
  printCommandsHelp,
  printSyntaxHelp,
  printExamplesHelp,
  printBatchHelp
};
