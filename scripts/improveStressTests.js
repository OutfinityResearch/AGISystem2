#!/usr/bin/env node

/**
 * AGI System2 - Stress Test Improvement Script
 *
 * Uses LLM subagent to transform superficial Left/Right definitions
 * into semantic definitions with proper domain-specific roles.
 *
 * Strategy:
 * 1. Parse stress test file to find superficial operators
 * 2. Load domain concepts and relations from config/
 * 3. For each operator, launch LLM subagent to generate semantic definition
 * 4. Replace superficial definitions with semantic ones
 * 5. Validate with runStressCheck.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Domain mapping
const DOMAINS = {
    'anthropology': 'Anthropology',
    'biology': 'Biology',
    'geography': 'Geography',
    'history': 'History',
    'law': 'Law',
    'literature': 'Literature',
    'math': 'Math',
    'medicine': 'Medicine',
    'philosophy': 'Philosophy',
    'psychics': 'Physics',
    'psychology': 'Psychology',
    'sociology': 'Sociology'
};

/**
 * Parse stress test file to extract superficial operators
 */
function parseSuperficialOperators(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const operators = [];

    // Match operator definitions with Left/Right pattern
    const operatorPattern = /@(\w+):(\w+) graph ([^\n]+)\n([\s\S]*?)(?=\n@|\n#|$)/g;
    let match;

    while ((match = operatorPattern.exec(content)) !== null) {
        const [fullMatch, name, internalName, params, body] = match;

        // Check if it's superficial (has @left __Role Left)
        if (body.includes('@left __Role Left') || body.includes('@right __Role Right')) {
            operators.push({
                name,
                internalName,
                params: params.trim(),
                body: body.trim(),
                fullDefinition: fullMatch
            });
        }
    }

    return operators;
}

/**
 * Extract usage context for an operator from stress test
 */
function extractUsageContext(filePath, operatorName, maxExamples = 3) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const usages = [];

    // Find lines where operator is used
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match: @var operatorName $arg1 ...
        const usageRegex = new RegExp(`@\\w+\\s+${operatorName}\\s+`, 'g');
        if (usageRegex.test(line)) {
            // Get context: current line + 2 lines before/after
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            usages.push(lines.slice(start, end).join('\n'));

            if (usages.length >= maxExamples) break;
        }
    }

    return usages;
}

/**
 * Load domain concepts from config/
 */
function loadDomainConcepts(domain) {
    const conceptsPath = path.join(__dirname, '..', 'config', domain, '00-concepts.sys2');
    if (!fs.existsSync(conceptsPath)) {
        return [];
    }

    const content = fs.readFileSync(conceptsPath, 'utf-8');
    const concepts = [];

    // Extract concept names from @ConceptName:ConceptName
    const conceptPattern = /@(\w+):(\w+) graph/g;
    let match;

    while ((match = conceptPattern.exec(content)) !== null) {
        concepts.push(match[1]);
    }

    return concepts;
}

/**
 * Load domain relations from config/
 */
function loadDomainRelations(domain) {
    const relationsPath = path.join(__dirname, '..', 'config', domain, '01-relations.sys2');
    if (!fs.existsSync(relationsPath)) {
        return [];
    }

    const content = fs.readFileSync(relationsPath, 'utf-8');
    return content;
}

/**
 * Main processing function
 */
async function processStressTest(stressFile, domain) {
    const filePath = path.join(__dirname, '..', 'evals', 'stress', stressFile);

    console.log(`\n=== Processing ${stressFile} (${domain}) ===\n`);

    // Parse superficial operators
    const operators = parseSuperficialOperators(filePath);
    console.log(`Found ${operators.length} superficial operators`);

    if (operators.length === 0) {
        console.log('No superficial operators to improve!');
        return;
    }

    // Load domain knowledge
    const concepts = loadDomainConcepts(domain);
    const relations = loadDomainRelations(domain);

    console.log(`Loaded ${concepts.length} concepts from config/${domain}/`);
    console.log(`Loaded relations from config/${domain}/01-relations.sys2`);

    // Process first 5 operators as MVP test
    const toProcess = operators.slice(0, 5);

    console.log(`\n=== Processing first ${toProcess.length} operators as MVP test ===\n`);

    for (const op of toProcess) {
        console.log(`\nOperator: ${op.name}`);
        console.log(`Parameters: ${op.params}`);

        // Extract usage context
        const usages = extractUsageContext(filePath, op.name);
        console.log(`Found ${usages.length} usage examples`);

        if (usages.length > 0) {
            console.log('\nUsage example:');
            console.log(usages[0]);
        }

        // Here we'll call the LLM subagent
        console.log('\n[TODO: Launch LLM subagent to generate semantic definition]');
        console.log(`Available concepts: ${concepts.slice(0, 10).join(', ')}...`);
    }
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node scripts/improveStressTests.js <domain>');
        console.log('Example: node scripts/improveStressTests.js anthropology');
        console.log('\nAvailable domains:', Object.keys(DOMAINS).join(', '));
        process.exit(1);
    }

    const domain = args[0];
    const domainName = DOMAINS[domain];

    if (!domainName) {
        console.error(`Unknown domain: ${domain}`);
        console.log('Available domains:', Object.keys(DOMAINS).join(', '));
        process.exit(1);
    }

    const stressFile = `${domain}.sys2`;
    await processStressTest(stressFile, domainName);

    console.log('\n=== MVP Test Complete ===');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
