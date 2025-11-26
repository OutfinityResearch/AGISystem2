/**
 * DS(/cli/cli_interactive.js) - Interactive CLI Handler
 *
 * Handles interactive REPL mode for the AGISystem2 CLI.
 * Provides colored output and user-friendly formatting.
 *
 * @module cli/cli_interactive
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  printMainHelp,
  printCommandsHelp,
  printSyntaxHelp,
  printExamplesHelp
} = require('./cli_help');
const { initSampleTheories } = require('./cli_commands');

/**
 * Run the interactive REPL
 * @param {Object} session - DSL session
 * @param {string} theoriesRoot - Path to theories directory
 * @param {Object} color - Color scheme
 */
function runInteractive(session, theoriesRoot, color) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'AGIS2> '
  });

  printMainHelp(color);
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
      handleCommand(cmd.toLowerCase(), args, session, theoriesRoot, color, rl);
    } catch (err) {
      console.error(`${color.error}Error${color.reset}: ${err.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
  rl.on('SIGINT', () => rl.close());
}

/**
 * Handle a single interactive command
 */
function handleCommand(cmd, args, session, theoriesRoot, color, rl) {
  switch (cmd) {
    case 'help':
      if (!args) printMainHelp(color);
      else if (args.toLowerCase() === 'commands') printCommandsHelp(color);
      else if (args.toLowerCase() === 'syntax') printSyntaxHelp(color);
      else if (args.toLowerCase() === 'examples') printExamplesHelp(color);
      else printMainHelp(color);
      break;

    case 'add': {
      const fact = args.trim();
      if (!fact) { console.log('Usage: add <Subject REL Object>'); break; }
      session.run([`@f ASSERT ${fact}`]);
      console.log(`${color.label}OK${color.reset} ${color.dim}(fact ingested via Sys2DSL)${color.reset}`);
      break;
    }

    case 'ask': {
      const question = args.trim();
      const env = session.run([`@q ASK "${question}"`]);
      const res = env.q || env.result || {};
      if (res && Object.prototype.hasOwnProperty.call(res, 'band')) {
        console.log(`${color.label}Result${color.reset}: ${color.example}${res.truth}${color.reset}  ${color.label}Band${color.reset}: ${color.example}${res.band}${color.reset}`);
      } else {
        console.log(`${color.label}Result${color.reset}: ${color.example}${res.truth}${color.reset}`);
      }
      break;
    }

    case 'retract': {
      const fact = args.trim();
      if (!fact) { console.log('Usage: retract <Subject REL Object>'); break; }
      const env = session.run([`@r RETRACT ${fact}`]);
      const res = env.r || {};
      console.log(res.ok
        ? `${color.label}OK${color.reset} ${color.dim}(fact retracted)${color.reset}`
        : `${color.dim}No matching fact found${color.reset}`);
      break;
    }

    case 'prove': {
      const statement = args.trim();
      if (!statement) { console.log('Usage: prove <Subject REL Object>'); break; }
      const env = session.run([`@r PROVE ${statement}`]);
      const res = env.r || {};
      if (res.proven) {
        console.log(`${color.label}PROVEN${color.reset} ${color.dim}(method: ${res.method}, confidence: ${res.confidence})${color.reset}`);
        if (res.chain) console.log(`${color.dim}Chain: ${res.chain.join(' → ')}${color.reset}`);
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
      if (!subject) { console.log('Usage: hypothesize <subject>'); break; }
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

    case 'abduct': {
      const parts = args.split(/\s+/);
      if (parts.length < 1 || !parts[0]) { console.log('Usage: abduct <observation> [REL]'); break; }
      const observation = parts[0];
      const relation = parts.length >= 2 ? parts[1] : null;
      const env = session.run([relation ? `@h ABDUCT ${observation} ${relation}` : `@h ABDUCT ${observation}`]);
      const res = env.h || {};
      console.log(`${color.label}Hypothesis${color.reset}: ${color.example}${res.hypothesis}${color.reset}  ${color.label}Band${color.reset}: ${color.example}${res.band}${color.reset}`);
      break;
    }

    case 'cf': {
      const split = args.split('|');
      if (split.length < 2) { console.log('Usage: cf <question> | <fact1> ; <fact2> ; ...'); break; }
      const question = split[0].trim();
      const facts = split.slice(1).join('|').split(';').map((s) => s.trim()).filter((s) => s.length > 0);
      const env = session.run([`@cf CF "${question}" | ${facts.join(' ; ')}`]);
      const res = env.cf || {};
      console.log(`${color.label}Result (counterfactual)${color.reset}: ${color.example}${res.truth}${color.reset}`);
      break;
    }

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
      console.log(res.ok
        ? `${color.label}Popped layer${color.reset} ${color.example}${res.popped}${color.reset} ${color.dim}(depth: ${res.depth})${color.reset}`
        : `${color.error}No layer to pop${color.reset}`);
      break;
    }

    case 'layers': {
      const env = session.run(['@r LIST_THEORIES']);
      const res = env.r || {};
      console.log(`${color.label}Theory layers${color.reset} ${color.dim}(${res.count} active)${color.reset}:`);
      for (const layer of res.active || []) console.log(`  - ${color.example}${layer}${color.reset}`);
      if (res.count === 0) console.log(`  ${color.dim}(base layer only)${color.reset}`);
      break;
    }

    case 'facts': {
      const pattern = args.trim();
      const dsl = pattern ? `@r FACTS_MATCHING ${pattern} ? ?` : '@r FACTS_MATCHING ? ? ?';
      const env = session.run([dsl]);
      const facts = env.r || [];
      console.log(`${color.label}Facts${color.reset} ${color.dim}(${facts.length} found)${color.reset}:`);
      for (const f of facts.slice(0, 20)) {
        console.log(`  ${f.subject} ${color.example}${f.relation}${color.reset} ${f.object}`);
      }
      if (facts.length > 20) console.log(`  ${color.dim}... and ${facts.length - 20} more${color.reset}`);
      break;
    }

    case 'concepts': {
      const concepts = session.engine.conceptStore.listConcepts();
      console.log(`${color.label}Concepts${color.reset} ${color.dim}(${concepts.length} total)${color.reset}:`);
      for (const c of concepts.slice(0, 30)) console.log(`  - ${color.example}${c}${color.reset}`);
      if (concepts.length > 30) console.log(`  ${color.dim}... and ${concepts.length - 30} more${color.reset}`);
      break;
    }

    case 'usage': {
      const concept = args.trim();
      if (!concept) { console.log('Usage: usage <concept>'); break; }
      const env = session.run([`@r GET_USAGE ${concept}`]);
      const res = env.r || {};
      if (res.error) {
        console.log(`${color.error}${res.error}${color.reset}`);
      } else {
        console.log(`${color.label}Usage stats for${color.reset} ${color.example}${concept}${color.reset}:`);
        console.log(`  Total: ${res.usageCount}  Assert: ${res.assertCount}  Query: ${res.queryCount}  Inference: ${res.inferenceCount}`);
      }
      break;
    }

    case 'inspect': {
      const concept = args.trim();
      if (!concept) { console.log('Usage: inspect <concept>'); break; }
      const env = session.run([`@r INSPECT ${concept}`]);
      const res = env.r;
      if (!res) {
        console.log(`${color.error}Concept not found${color.reset}`);
      } else {
        console.log(`${color.label}Concept${color.reset} ${color.example}${res.label}${color.reset}:`);
        console.log(`  Diamonds: ${res.diamonds.length}`);
      }
      break;
    }

    case 'protect': {
      const concept = args.trim();
      if (!concept) { console.log('Usage: protect <concept>'); break; }
      session.run([`@r PROTECT ${concept}`]);
      console.log(`${color.label}Protected${color.reset} ${color.example}${concept}${color.reset}`);
      break;
    }

    case 'unprotect': {
      const concept = args.trim();
      if (!concept) { console.log('Usage: unprotect <concept>'); break; }
      session.engine.conceptStore.unprotect(concept);
      console.log(`${color.label}Unprotected${color.reset} ${color.example}${concept}${color.reset}`);
      break;
    }

    case 'forget': {
      const criteria = args.trim();
      if (!criteria) { console.log('Usage: forget threshold=N | olderThan=Xd | concept=name [dryRun]'); break; }
      const env = session.run([`@r FORGET ${criteria}`]);
      const res = env.r || {};
      console.log(`${color.label}Forgotten${color.reset} ${res.count} concepts`);
      break;
    }

    case 'boost': {
      const parts = args.trim().split(/\s+/);
      if (!parts[0]) { console.log('Usage: boost <concept> [amount]'); break; }
      const concept = parts[0];
      const amount = parts[1] ? parseInt(parts[1], 10) : 10;
      session.run([`@r BOOST ${concept} ${amount}`]);
      console.log(`${color.label}Boosted${color.reset} ${color.example}${concept}${color.reset} by ${amount}`);
      break;
    }

    case 'run': {
      const dsl = args.trim();
      if (!dsl) { console.log('Usage: run <@var COMMAND args...>'); break; }
      const env = session.run([dsl]);
      console.log(`${color.label}Result${color.reset}:`);
      console.log(JSON.stringify(env, null, 2));
      break;
    }

    case 'config': {
      const snap = session.engine.config.snapshot();
      console.log(JSON.stringify(snap, null, 2));
      break;
    }

    case 'new-theory': {
      const name = args.trim();
      if (!name) { console.log('Usage: new-theory <name>'); break; }
      const filePath = path.join(theoriesRoot, `${name}.txt`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '# One fact per line, using Subject REL Object\n', 'utf8');
        console.log(`${color.label}Created theory file${color.reset}: ${filePath}`);
      } else {
        console.log(`${color.dim}Theory file already exists:${color.reset} ${filePath}`);
      }
      break;
    }

    case 'list-theories': {
      const entries = fs.readdirSync(theoriesRoot).filter((f) => f.endsWith('.sys2dsl')).sort();
      if (entries.length === 0) {
        console.log(`${color.dim}No theories found in${color.reset} ${theoriesRoot}`);
      } else {
        console.log(`${color.section}Theories in${color.reset} ${theoriesRoot}:`);
        for (const e of entries) console.log(`  - ${color.example}${e.replace(/\\.txt$/, '')}${color.reset}`);
      }
      break;
    }

    case 'show-theory': {
      const name = args.trim();
      if (!name) { console.log('Usage: show-theory <name>'); break; }
      const filePath = path.join(theoriesRoot, `${name}.sys2dsl`);
      if (!fs.existsSync(filePath)) {
        console.log(`${color.error}No such theory file${color.reset}: ${filePath}`);
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`${color.section}--- ${filePath} ---${color.reset}\n${content}`);
      }
      break;
    }

    case 'load-theory': {
      const name = args.trim();
      if (!name) { console.log('Usage: load-theory <name>'); break; }
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

    case 'apply-theory': {
      const split = args.split(/\s+/);
      if (split.length < 2) { console.log('Usage: apply-theory <name> <question...>'); break; }
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

    case 'check-procedure':
    case 'check-export':
    case 'check-magic':
      handleDomainHelper(cmd, args, session, color);
      break;

    case 'exit':
    case 'quit':
      rl.close();
      return;

    default:
      console.log(`${color.error}Unknown command${color.reset}. Type ${color.command}help${color.reset} for a list of commands.`);
      break;
  }
}

/**
 * Handle domain-specific helper commands
 */
function handleDomainHelper(cmd, args, session, color) {
  const split = args.split('|');
  const extraFacts = split[1]
    ? split[1].split(';').map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  if (cmd === 'check-procedure') {
    const head = split[0].trim();
    if (!head) { console.log('Usage: check-procedure <ProcedureId> [| extra facts]'); return; }
    const env = session.run([
      `@procId ASSERT ${head} IS_A Procedure`,
      extraFacts.length
        ? `@cf CF "Is ${head} compliant?" | ${extraFacts.join(' ; ')}`
        : `@q ASK "Is ${head} compliant?"`
    ]);
    const res = env.cf || env.q || env.result || {};
    console.log(`${color.label}Procedure compliance${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
  } else if (cmd === 'check-export') {
    const headParts = split[0].trim().split(/\s+/).filter(Boolean);
    if (headParts.length < 2) { console.log('Usage: check-export <ActionId> <Reg1> [Reg2 ...] [| extra facts]'); return; }
    const actionId = headParts[0];
    const regs = headParts.slice(1);
    const env = session.run([
      extraFacts.length
        ? `@cf CF "Is ${actionId} allowed under ${regs.join(',')}?" | ${extraFacts.join(' ; ')}`
        : `@q ASK "Is ${actionId} allowed under ${regs.join(',')}?"`
    ]);
    const res = env.cf || env.q || env.result || {};
    console.log(`${color.label}Export decision under${color.reset} ${color.example}${regs.join(',')}${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
  } else if (cmd === 'check-magic') {
    const headParts = split[0].trim().split(/\s+/).filter(Boolean);
    if (headParts.length < 2) { console.log('Usage: check-magic <ActorId> <CityId> [| extra facts]'); return; }
    const actorId = headParts[0];
    const cityId = headParts[1];
    const env = session.run([
      extraFacts.length
        ? `@cf CF "Can ${actorId} cast magic in ${cityId}?" | ${extraFacts.join(' ; ')}`
        : `@q ASK "Can ${actorId} cast magic in ${cityId}?"`
    ]);
    const res = env.cf || env.q || env.result || {};
    console.log(`${color.label}Magic allowed${color.reset}: ${color.example}${res.truth || 'UNKNOWN'}${color.reset}`);
  }
}

module.exports = { runInteractive };
