/**
 * RuleTaker Evaluation Reporter
 *
 * Provides formatted output for evaluation results including:
 * - Progress indicators
 * - Depth-stratified accuracy tables
 * - Development mode diagnostics
 * - Multi-strategy comparison
 */

// Terminal colors
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m'
};

/**
 * Format duration with adaptive scale
 * < 1s     → "234ms"
 * < 60s    → "12.34s"
 * < 60m    → "2m 34.5s"
 * >= 60m   → "1h 23m"
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Short config label
 */
export function configLabel(strategy, geometry, priority) {
  const s = (strategy || '')
    .replace('dense-binary', 'dense')
    .replace('sparse-polynomial', 'sparse')
    .replace('metric-affine', 'metric');
  const p = (priority || '')
    .replace('symbolicPriority', 'symb')
    .replace('holographicPriority', 'holo');
  return `${s}(${geometry})+${p}`;
}

/**
 * Report header
 */
export function reportHeader(isDevel = false) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.blue}AGISystem2 - RuleTaker Evaluation${isDevel ? ' (DEVELOPMENT MODE)' : ''}${COLORS.reset}`);
  console.log(`${COLORS.dim}Logical reasoning benchmark (Allen AI)${COLORS.reset}`);
  console.log();
}

/**
 * Report dataset info
 */
export function reportDatasetInfo(split, total, sampled, depthFilter) {
  let msg = `Loaded ${COLORS.cyan}${sampled}${COLORS.reset} examples from ${COLORS.yellow}${split}${COLORS.reset} split`;

  if (sampled < total) {
    msg += ` ${COLORS.dim}(sampled from ${total})${COLORS.reset}`;
  }

  if (depthFilter !== undefined) {
    msg += ` ${COLORS.dim}[depth-${depthFilter} only]${COLORS.reset}`;
  }

  console.log(msg);
  console.log();
}

/**
 * Report configuration
 */
export function reportConfiguration(label) {
  console.log(`${COLORS.magenta}${'═'.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}Configuration: ${label}${COLORS.reset}`);
  console.log(`${COLORS.magenta}${'═'.repeat(60)}${COLORS.reset}`);
}

/**
 * Report progress (inline update)
 */
export function reportProgress(current, total, correct, durationMs, isDevel = false) {
  const pct = ((current / total) * 100).toFixed(0);
  const acc = total > 0 ? ((correct / current) * 100).toFixed(1) : '0.0';

  if (isDevel) {
    // In devel mode, print each example result
    return; // Handled separately
  }

  process.stdout.write(`\r  Progress: ${current}/${total} (${pct}%) | Accuracy: ${acc}% | ${formatDuration(durationMs)}`);
}

/**
 * Report single example result (for devel mode)
 */
export function reportExampleResult(index, total, correct, durationMs) {
  const status = correct
    ? `${COLORS.green}✓${COLORS.reset}`
    : `${COLORS.red}✗ FAILED${COLORS.reset}`;

  console.log(`  Example ${index + 1}/${total}: ${status} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset}`);
}

/**
 * Report example with NL context (for verbose/parallel mode)
 */
export function reportExampleNL(index, total, example, proved, correct, durationMs) {
  const statusIcon = correct
    ? `${COLORS.green}✓${COLORS.reset}`
    : `${COLORS.red}✗${COLORS.reset}`;

  const expectedStr = example.label === 'entailment' ? 'PROVE' : 'NOT PROVE';
  const actualStr = proved ? 'PROVED' : 'NOT PROVED';

  // Truncate context for display
  const contextShort = example.context.length > 60
    ? example.context.slice(0, 57) + '...'
    : example.context;

  console.log(`${statusIcon} ${COLORS.dim}#${String(index + 1).padStart(4)}${COLORS.reset} ${COLORS.cyan}Q:${COLORS.reset} "${example.question}" ${COLORS.dim}| expect:${expectedStr} got:${actualStr} | ${formatDuration(durationMs)}${COLORS.reset}`);
}

/**
 * Report summary
 */
export function reportSummary(results, totalDuration) {
  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const errors = results.filter(r => r.error).length;
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

  console.log();
  console.log(`${COLORS.bold}Results Summary:${COLORS.reset}`);
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  ${COLORS.green}Correct:${COLORS.reset}    ${correct} / ${total} (${accuracy}%)`);

  if (errors > 0) {
    console.log(`  ${COLORS.red}Errors:${COLORS.reset}     ${errors} (translation failures)`);
  }

  console.log(`  ${COLORS.cyan}Duration:${COLORS.reset}   ${formatDuration(totalDuration)}`);
  console.log(`  ${'─'.repeat(40)}`);
}

/**
 * Report accuracy by depth
 */
export function reportDepthBreakdown(results, examples) {
  // Group by depth
  const byDepth = new Map();

  for (let i = 0; i < results.length; i++) {
    const depth = results[i].depth || 0;
    if (!byDepth.has(depth)) {
      byDepth.set(depth, { total: 0, correct: 0, totalTime: 0 });
    }
    const entry = byDepth.get(depth);
    entry.total++;
    if (results[i].correct) entry.correct++;
    entry.totalTime += results[i].durationMs || 0;
  }

  // Sort by depth
  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  console.log();
  console.log(`${COLORS.bold}${COLORS.cyan}Accuracy by Proof Depth:${COLORS.reset}`);
  console.log(`  ${'─'.repeat(56)}`);
  console.log(`  ${COLORS.dim}Depth │ Total │ Correct │ Accuracy │ Avg Time${COLORS.reset}`);
  console.log(`  ${'─'.repeat(56)}`);

  for (const depth of depths) {
    const entry = byDepth.get(depth);
    const accuracy = ((entry.correct / entry.total) * 100).toFixed(1);
    const avgTime = Math.round(entry.totalTime / entry.total);

    console.log(
      `    ${String(depth).padStart(1)}   │ ` +
      `${String(entry.total).padStart(5)} │ ` +
      `${String(entry.correct).padStart(7)} │ ` +
      `${accuracy.padStart(6)}%  │ ` +
      `${formatDuration(avgTime).padStart(8)}`
    );
  }

  console.log(`  ${'─'.repeat(56)}`);
}

/**
 * Report failure diagnostics (for --devel mode)
 */
export function reportFailureDiagnostics(result, translated) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.bgRed} FAILURE DIAGNOSTICS (Example #${result.index + 1}) ${COLORS.reset}`);
  console.log(`${'═'.repeat(72)}`);

  // Original input
  console.log();
  console.log(`${COLORS.bold}┌${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bold}│ ORIGINAL INPUT (RuleTaker)${COLORS.reset}`);
  console.log(`${COLORS.bold}├${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`│ ${COLORS.dim}Context:${COLORS.reset} "${wrapText(translated.original.context, 60)}"`);
  console.log(`│ ${COLORS.dim}Question:${COLORS.reset} "${translated.original.question}"`);
  console.log(`│ ${COLORS.dim}Label:${COLORS.reset} "${translated.original.label}"`);
  console.log(`│ ${COLORS.dim}Config:${COLORS.reset} ${translated.original.config}`);
  console.log(`${COLORS.bold}└${'─'.repeat(70)}${COLORS.reset}`);

  // Translated DSL (Context)
  console.log();
  console.log(`${COLORS.bold}┌${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bold}│ TRANSLATED DSL (Context → Learn)${COLORS.reset}`);
  console.log(`${COLORS.bold}├${'─'.repeat(70)}${COLORS.reset}`);
  for (const line of translated.contextDsl.split('\n')) {
    console.log(`│ ${COLORS.yellow}${line}${COLORS.reset}`);
  }
  if (translated.contextErrors.length > 0) {
    console.log(`│`);
    console.log(`│ ${COLORS.red}Translation errors:${COLORS.reset}`);
    for (const err of translated.contextErrors) {
      console.log(`│   - "${err.sentence}": ${err.error}`);
    }
  }
  console.log(`${COLORS.bold}└${'─'.repeat(70)}${COLORS.reset}`);

  // Query DSL
  console.log();
  console.log(`${COLORS.bold}┌${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bold}│ QUERY DSL (Question → Prove)${COLORS.reset}`);
  console.log(`${COLORS.bold}├${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`│ ${COLORS.cyan}${translated.questionDsl || '(translation failed)'}${COLORS.reset}`);
  console.log(`${COLORS.bold}└${'─'.repeat(70)}${COLORS.reset}`);

  // Result comparison
  console.log();
  console.log(`${COLORS.bold}┌${'─'.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bold}│ RESULT COMPARISON${COLORS.reset}`);
  console.log(`${COLORS.bold}├${'─'.repeat(70)}${COLORS.reset}`);

  const expectedStr = translated.expectProved
    ? `${COLORS.green}PROVED${COLORS.reset} (label = "entailment")`
    : `${COLORS.yellow}CANNOT PROVE${COLORS.reset} (label = "not entailment")`;

  const actualStr = result.proved
    ? `${COLORS.green}PROVED${COLORS.reset} (valid = true)`
    : `${COLORS.red}NOT PROVED${COLORS.reset} (valid = false)`;

  console.log(`│ ${COLORS.dim}Expected:${COLORS.reset} ${expectedStr}`);
  console.log(`│ ${COLORS.dim}Actual:${COLORS.reset}   ${actualStr}`);

  if (result.error) {
    console.log(`│`);
    console.log(`│ ${COLORS.red}Error:${COLORS.reset} ${result.error}`);
  }

  if (result.proof) {
    console.log(`│`);
    console.log(`│ ${COLORS.dim}Proof returned:${COLORS.reset}`);
    const proofLines = String(result.proof).split('\n');
    for (const line of proofLines.slice(0, 5)) {
      console.log(`│   "${line}"`);
    }
    if (proofLines.length > 5) {
      console.log(`│   ... (${proofLines.length - 5} more lines)`);
    }
  }

  // Problem analysis
  console.log(`│`);
  if (translated.expectProved && !result.proved) {
    console.log(`│ ${COLORS.yellow}Problem:${COLORS.reset} Engine failed to prove assertion that should be true.`);
    console.log(`│          Check if rules/facts are correctly translated.`);
  } else if (!translated.expectProved && result.proved) {
    console.log(`│ ${COLORS.yellow}Problem:${COLORS.reset} Engine proved assertion that should be false.`);
    console.log(`│          Check negation handling in rules.`);
  }

  console.log(`${COLORS.bold}└${'─'.repeat(70)}${COLORS.reset}`);
  console.log();
}

/**
 * Report multi-strategy comparison
 */
export function reportMultiStrategyComparison(allResults) {
  const configs = Object.keys(allResults);
  if (configs.length <= 1) return;

  console.log();
  console.log(`${COLORS.bold}${COLORS.bgBlue} MULTI-STRATEGY COMPARISON ${COLORS.reset}`);
  console.log(`${'═'.repeat(72)}`);
  console.log();

  // Summary table
  console.log(`${COLORS.bold}Configuration Totals:${COLORS.reset}`);
  console.log(`  ${'─'.repeat(68)}`);
  console.log(`  ${'Config'.padEnd(20)} │ ${'Accuracy'.padEnd(10)} │ ${'Correct'.padEnd(10)} │ ${'Duration'.padEnd(12)}`);
  console.log(`  ${'─'.repeat(68)}`);

  for (const config of configs) {
    const results = allResults[config];
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const accuracy = ((correct / total) * 100).toFixed(1) + '%';
    const duration = formatDuration(results.reduce((s, r) => s + (r.durationMs || 0), 0));

    console.log(
      `  ${config.padEnd(20)} │ ` +
      `${accuracy.padEnd(10)} │ ` +
      `${(correct + '/' + total).padEnd(10)} │ ` +
      `${duration.padEnd(12)}`
    );
  }

  console.log(`  ${'─'.repeat(68)}`);
}

/**
 * Wrap text to max width
 */
function wrapText(text, maxWidth) {
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 3) + '...';
}

/**
 * Report final status
 */
export function reportFinalStatus(success, message) {
  console.log();
  if (success) {
    console.log(`${COLORS.green}${COLORS.bold}${message}${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}${COLORS.bold}${message}${COLORS.reset}`);
  }
  console.log();
}
