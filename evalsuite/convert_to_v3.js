#!/usr/bin/env node
/**
 * Evalsuite Converter - Strict v3.0 Triple Syntax
 *
 * Converts all case.json files to use v3.0 strict triple syntax:
 * - Removes expected_dsl_v2 fields (no backwards compatibility)
 * - Fixes all DSL to use @var Subject VERB Object (exactly 3 components)
 * - Removes all property=value patterns
 * - Adds existence-based expected results
 *
 * Usage: node convert_to_v3.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');

/**
 * Convert DSL string from v2 patterns to v3 strict triple
 */
function convertDslToV3(dsl) {
  if (!dsl) return dsl;

  let result = dsl;

  // Split by newlines for multi-line DSL
  const lines = result.split('\n');
  const convertedLines = lines.map(line => {
    let l = line.trim();
    if (!l) return l;

    // =========================================================
    // STEP 1: Remove command prefixes (ASK, ASSERT)
    // =========================================================

    // @varName ASK Subject VERB Object → @varName Subject VERB Object
    l = l.replace(/^(@\w+)\s+ASK\s+/, '$1 ');

    // @varName ASSERT Subject VERB Object → @_ Subject VERB Object
    l = l.replace(/^(@\w+)\s+ASSERT\s+/, '@_ ');

    // =========================================================
    // STEP 2: Fix multi-argument verbs to use triple pattern
    // =========================================================

    // BOOST with extra param: "@boost X BOOST any 5" → "@boost X BOOST any"
    l = l.replace(/^(@\w+\s+\w+\s+BOOST\s+any)\s+\d+/, '$1');

    // FORGET with property=value: "threshold FORGET any=3" → "any FORGET any"
    l = l.replace(/^(@\w+)\s+threshold\s+FORGET\s+any=\d+/, '@$1 any FORGET any');
    l = l.replace(/FORGET\s+threshold=\d+/, 'FORGET any');

    // RETRACT command form: "@r RETRACT X Y Z" → "@r X RETRACT Z"
    l = l.replace(/^(@\w+)\s+RETRACT\s+(\w+)\s+(\w+)\s+(\w+)/, '$1 $2 RETRACT $4');

    // =========================================================
    // STEP 3: Convert v2 commands to v3 verbs
    // =========================================================

    // THEORY_PUSH → PUSH: "@layer THEORY_PUSH name" → "@layer name PUSH any"
    l = l.replace(/^(@\w+)\s+THEORY_PUSH\s+(\w+)/, '$1 $2 PUSH any');
    l = l.replace(/^(@\w+)\s+THEORY_PUSH\s+name="([^"]+)"/, '$1 $2 PUSH any');

    // THEORY_POP → POP: "@pop THEORY_POP" → "@pop any POP any"
    l = l.replace(/^(@\w+)\s+THEORY_POP\s*$/, '$1 any POP any');

    // MASK_PARTITIONS → MASK: "@m MASK_PARTITIONS X" → "@m X MASK any"
    l = l.replace(/^(@\w+)\s+MASK_PARTITIONS\s+(\w+)/, '$1 $2 MASK any');

    // LIST_THEORIES → THEORIES: "@r LIST_THEORIES" → "@r any THEORIES any"
    l = l.replace(/^(@\w+)\s+LIST_THEORIES\s*$/, '$1 any THEORIES any');

    // RESET_SESSION → RESET: "@r RESET_SESSION" → "@r session RESET any"
    l = l.replace(/^(@\w+)\s+RESET_SESSION\s*$/, '$1 session RESET any');

    // =========================================================
    // STEP 4: Fix verb-first patterns to Subject VERB Object
    // =========================================================

    // TO_JSON $var → $var TO_JSON any
    l = l.replace(/^(@\w+)\s+TO_JSON\s+(\$\w+)/, '$1 $2 TO_JSON any');

    // TO_NATURAL $var → $var TO_NATURAL any
    l = l.replace(/^(@\w+)\s+TO_NATURAL\s+(\$\w+)/, '$1 $2 TO_NATURAL any');

    // COUNT $var → $var COUNT any
    l = l.replace(/^(@\w+)\s+COUNT\s+(\$\w+)/, '$1 $2 COUNT any');

    // NONEMPTY $var → $var NONEMPTY any
    l = l.replace(/^(@\w+)\s+NONEMPTY\s+(\$\w+)/, '$1 $2 NONEMPTY any');

    // EXPLAIN $var → $var EXPLAIN any
    l = l.replace(/^(@\w+)\s+EXPLAIN\s+(\$\w+)/, '$1 $2 EXPLAIN any');

    // SUMMARIZE $var → $var SUMMARIZE any
    l = l.replace(/^(@\w+)\s+SUMMARIZE\s+(\$\w+)/, '$1 $2 SUMMARIZE any');

    // INSPECT Concept → Concept INSPECT any
    l = l.replace(/^(@\w+)\s+INSPECT\s+(\w+)/, '$1 $2 INSPECT any');

    // FACTS_MATCHING X → X FACTS any
    l = l.replace(/^(@\w+)\s+FACTS_MATCHING\s+(\w+)/, '$1 $2 FACTS any');
    l = l.replace(/^(@\w+)\s+FACTS_MATCHING\s+"([^"]+)"/, '$1 $2 FACTS any');

    // INSTANCES_OF Concept → any IS_A Concept (returns all instances)
    l = l.replace(/^(@\w+)\s+INSTANCES_OF\s+(\w+)/, '$1 any IS_A $2');

    // DEFINE_CONCEPT X → X DEFINE concept
    l = l.replace(/^(@\w+)\s+DEFINE_CONCEPT\s+(\w+)/, '$1 $2 DEFINE concept');

    // PROVE Subject VERB Object → Subject PROVE Object
    l = l.replace(/^(@\w+)\s+PROVE\s+(\w+)\s+(\w+)\s+(\w+)/, '$1 $2 PROVE $4');

    // VALIDATE → current_theory VALIDATE any
    l = l.replace(/^(@\w+)\s+VALIDATE\s*$/, '$1 current_theory VALIDATE any');

    // BOOST Concept → Concept BOOST any
    l = l.replace(/^(@\w+)\s+BOOST\s+(\w+)\s+\d+/, '$1 $2 BOOST any');
    l = l.replace(/^(@\w+)\s+BOOST\s+(\w+)/, '$1 $2 BOOST any');

    // FORGET Concept → Concept FORGET any
    l = l.replace(/^(@\w+)\s+FORGET\s+(\w+)/, '$1 $2 FORGET any');

    // PROTECT Concept → Concept PROTECT any
    l = l.replace(/^(@\w+)\s+PROTECT\s+(\w+)/, '$1 $2 PROTECT any');

    // =========================================================
    // STEP 5: Fix boolean operations
    // =========================================================

    // BOOL_AND $a $b → $a AND $b
    l = l.replace(/^(@\w+)\s+BOOL_AND\s+(\$\w+)\s+(\$\w+)/, '$1 $2 AND $3');

    // BOOL_OR $a $b → $a OR $b
    l = l.replace(/^(@\w+)\s+BOOL_OR\s+(\$\w+)\s+(\$\w+)/, '$1 $2 OR $3');

    // BOOL_NOT $a → $a NOT any
    l = l.replace(/^(@\w+)\s+BOOL_NOT\s+(\$\w+)/, '$1 $2 NOT any');

    // =========================================================
    // STEP 6: Clean up any remaining property=value patterns
    // =========================================================

    // Remove any remaining =value patterns that aren't valid
    // But keep things like name="X" as they might be in strings

    return l;
  });

  return convertedLines.join('\n');
}

/**
 * Process a single case.json file
 */
function processCase(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let data;

  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`  Error parsing ${filePath}: ${e.message}`);
    return { changed: false };
  }

  let changed = false;

  // Update version to 3.0
  if (data.version !== '3.0') {
    data.version = '3.0';
    changed = true;
  }

  // Process queries
  if (data.queries && Array.isArray(data.queries)) {
    for (const query of data.queries) {
      // REMOVE expected_dsl_v2 - no backwards compatibility
      if (query.expected_dsl_v2) {
        delete query.expected_dsl_v2;
        changed = true;
      }

      // Convert expected_dsl to v3 strict triple
      if (query.expected_dsl) {
        const converted = convertDslToV3(query.expected_dsl);
        if (converted !== query.expected_dsl) {
          query.expected_dsl = converted;
          changed = true;
        }
      }

      // Add existence-based expectation alongside truth
      if (query.expected_answer && !query.expected_answer.existence) {
        const answer = query.expected_answer;
        if (answer.truth === 'TRUE_CERTAIN' || answer.truth === 'TRUE_DEFAULT' || answer.truth === 'TRUE') {
          answer.existence = 'positive';
          changed = true;
        } else if (answer.truth === 'FALSE') {
          answer.existence = 'negative';
          changed = true;
        } else if (answer.truth === 'UNKNOWN') {
          answer.existence = 'zero';
          changed = true;
        }
      }
    }
  }

  // Write back if changed
  if (changed && !dryRun) {
    const output = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, output + '\n');
  }

  return { changed, path: filePath, dryRun: dryRun && changed };
}

/**
 * Find and process all case.json files
 */
function main() {
  const suiteDir = __dirname;
  const dirs = fs.readdirSync(suiteDir).filter(d =>
    d.startsWith('suite_') && fs.statSync(path.join(suiteDir, d)).isDirectory()
  );

  console.log(`\nEvalsuite v3.0 Strict Triple Syntax Converter`);
  console.log('='.repeat(50));
  console.log(`Found ${dirs.length} test suites\n`);

  if (dryRun) {
    console.log('[DRY RUN MODE - no files will be modified]\n');
  }

  let totalChanged = 0;
  const results = [];

  for (const dir of dirs) {
    const casePath = path.join(suiteDir, dir, 'case.json');
    if (fs.existsSync(casePath)) {
      const result = processCase(casePath);
      if (result.changed || result.dryRun) {
        totalChanged++;
        results.push({ dir, ...result });
        console.log(`  [${dryRun ? 'would convert' : 'converted'}] ${dir}/case.json`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  if (results.length === 0) {
    console.log('All files already v3.0 compliant - no changes needed');
  } else {
    console.log(`Total: ${totalChanged} files ${dryRun ? 'would be changed' : 'converted'}`);
  }

  if (dryRun && totalChanged > 0) {
    console.log('\nRun without --dry-run to apply changes');
  }

  console.log('\nConversion complete!\n');
}

main();
