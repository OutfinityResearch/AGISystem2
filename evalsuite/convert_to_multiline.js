#!/usr/bin/env node
/**
 * Convert case.json files to case.js with multi-line template literals
 * This makes DSL code much more readable
 */

const fs = require('fs');
const path = require('path');

const suiteDir = __dirname;

// Get all suite directories
const suites = fs.readdirSync(suiteDir)
  .filter(f => f.startsWith('suite_'))
  .filter(f => fs.statSync(path.join(suiteDir, f)).isDirectory())
  .sort();

for (const suite of suites) {
  const jsonPath = path.join(suiteDir, suite, 'case.json');
  const jsPath = path.join(suiteDir, suite, 'case.js');

  if (!fs.existsSync(jsonPath)) {
    console.log(`SKIP: ${suite} (no case.json)`);
    continue;
  }

  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const testCase = JSON.parse(content);

    // Generate JS module content
    let js = `/**
 * Test Case: ${testCase.name || testCase.id}
 * ${testCase.description || ''}
 * Version: 3.0
 */

module.exports = {
  id: ${JSON.stringify(testCase.id)},
  name: ${JSON.stringify(testCase.name)},
  description: ${JSON.stringify(testCase.description)},
  theory: {
    natural_language: ${JSON.stringify(testCase.theory?.natural_language)},
    expected_facts: ${JSON.stringify(testCase.theory?.expected_facts, null, 6).replace(/\n/g, '\n    ')}
  },
  queries: [
`;

    // Convert each query
    for (let i = 0; i < (testCase.queries || []).length; i++) {
      const q = testCase.queries[i];
      const isLast = i === testCase.queries.length - 1;

      // Format expected_dsl as template literal with actual newlines
      const dslLines = (q.expected_dsl || '').split('\n');
      let dslFormatted;
      if (dslLines.length === 1) {
        dslFormatted = `\`${escapeTemplate(dslLines[0])}\``;
      } else {
        dslFormatted = '`\n' + dslLines.map(l => '        ' + escapeTemplate(l)).join('\n') + '\n      `';
      }

      js += `    {
      id: ${JSON.stringify(q.id)},
      natural_language: ${JSON.stringify(q.natural_language)},
      expected_dsl: ${dslFormatted},
      expected_answer: {
        natural_language: ${JSON.stringify(q.expected_answer?.natural_language)},
        truth: ${JSON.stringify(q.expected_answer?.truth)},
        explanation: ${JSON.stringify(q.expected_answer?.explanation)},
        existence: ${JSON.stringify(q.expected_answer?.existence)}
      }
    }${isLast ? '' : ','}\n`;
    }

    js += `  ],
  version: "3.0"
};
`;

    fs.writeFileSync(jsPath, js, 'utf8');
    console.log(`CONVERTED: ${suite}`);

    // Optionally remove the old JSON file
    // fs.unlinkSync(jsonPath);

  } catch (err) {
    console.error(`ERROR: ${suite} - ${err.message}`);
  }
}

function escapeTemplate(str) {
  // Escape backticks and ${} in template literals
  return str.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

console.log('\nDone! Run the test suite to verify.');
