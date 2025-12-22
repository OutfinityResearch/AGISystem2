#!/usr/bin/env node
/**
 * Fix Logic Operators - Orchestrator
 *
 * Reads missing operators from logic.sys2.errors
 * Launches parallel agents to generate semantic definitions (10-20 operators each)
 * Replaces definitions directly in logic.sys2
 */

import { readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';

const LOGIC_FILE = 'evals/stress/logic.sys2';
const ERRORS_FILE = 'evals/stress/logic.sys2.errors';
const BATCH_SIZE = 15; // Each agent handles 15 operators
const MAX_PARALLEL = 10; // Maximum parallel agents

// Extract unique missing operators from .errors file
async function getMissingOperators() {
  const errorContent = await readFile(ERRORS_FILE, 'utf-8');
  const operators = new Set();

  const lines = errorContent.split('\n');
  for (const line of lines) {
    const match = line.match(/Unknown operator '([^']+)'/);
    if (match) {
      operators.add(match[1]);
    }
  }

  return Array.from(operators).sort();
}

// Split operators into batches
function createBatches(operators, batchSize) {
  const batches = [];
  for (let i = 0; i < operators.length; i += batchSize) {
    batches.push(operators.slice(i, i + batchSize));
  }
  return batches;
}

// Generate operator definitions (to be called by agent)
function generateDefinitionsPrompt(operators) {
  return `Generate semantic DSL definitions for these logic/philosophy operators:

${operators.join(', ')}

For each operator, create a complete definition using semantic roles (NOT Left/Right).

Examples of good semantic patterns:

@isDeductive:isDeductive graph argument
    # Deductive reasoning relation
    @arg __Role Argument $argument
    @type __Role ReasoningType Deductive
    @result __Bundle $arg $type
    return $result
end

@hasFreeWill:hasFreeWill graph agent
    # Agent has free will
    @agen __Role Agent $agent
    @prop __Role Property FreeWill
    @result __Pair $agen $prop
    return $result
end

@isNecessary:isNecessary graph proposition world
    # Necessary truth in modal logic
    @prop __Role Proposition $proposition
    @modal __Role Modality Necessary
    @world __Role World $world
    @result __Bundle $prop $modal $world
    return $result
end

Guidelines:
- Use semantic roles like: Argument, Agent, Proposition, Reasoning, Property, Truth, Modality, etc.
- Use __Pair for binary relations, __Bundle for 3+ roles
- Add brief comment explaining the operator
- Return ONLY the operator definitions, no explanations

Generate definitions for ALL ${operators.length} operators listed above.`;
}

// Main workflow
async function main() {
  console.log('🔍 Extracting missing operators from logic.sys2.errors...\n');

  const missingOperators = await getMissingOperators();
  console.log(`Found ${missingOperators.length} unique missing operators:\n`);
  console.log(missingOperators.join(', '));

  const batches = createBatches(missingOperators, BATCH_SIZE);
  console.log(`\n📦 Split into ${batches.length} batches of ~${BATCH_SIZE} operators each\n`);

  // Display batch plan
  for (let i = 0; i < batches.length; i++) {
    console.log(`Batch ${i + 1}: ${batches[i].length} operators - ${batches[i].slice(0, 3).join(', ')}...`);
  }

  console.log('\n🚀 Ready to launch agents!');
  console.log(`\nNext steps:`);
  console.log(`1. Launch ${Math.min(batches.length, MAX_PARALLEL)} agents in parallel`);
  console.log(`2. Each agent generates definitions for its batch`);
  console.log(`3. Append definitions to ${LOGIC_FILE}`);
  console.log(`4. Run stress test to validate`);

  console.log('\n📋 Agent Task List:');
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n=== Agent ${i + 1} Task ===`);
    console.log(`Operators (${batches[i].length}): ${batches[i].join(', ')}`);
    console.log(`\nPrompt:`);
    console.log(generateDefinitionsPrompt(batches[i]));
    console.log(`\n${'='.repeat(80)}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
