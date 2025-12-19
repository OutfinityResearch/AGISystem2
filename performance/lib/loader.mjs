/**
 * Performance Suite - Theory Loader
 * @module performance/lib/loader
 *
 * Loads domain theory files and evaluation cases.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const THEORIES_ROOT = join(ROOT, 'theories');
const CONFIG_ROOT = join(ROOT, '..', 'config');

/**
 * Load Core theory files
 * @returns {Promise<string[]>} Array of theory content strings
 */
export async function loadCoreTheories() {
  const coreDir = join(CONFIG_ROOT, 'Core');
  const theories = [];

  try {
    const entries = await readdir(coreDir);
    const sys2Files = entries
      .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
      .sort();

    for (const file of sys2Files) {
      const content = await readFile(join(coreDir, file), 'utf8');
      theories.push(content);
    }
  } catch (err) {
    console.error(`Warning: Could not load Core theories: ${err.message}`);
  }

  return theories;
}

/**
 * Discover all theory domains
 * @returns {Promise<string[]>} Array of domain names
 */
export async function discoverTheories() {
  const entries = await readdir(THEORIES_ROOT);
  const theories = [];

  for (const entry of entries) {
    const entryPath = join(THEORIES_ROOT, entry);
    const entryStat = await stat(entryPath);
    if (entryStat.isDirectory()) {
      theories.push(entry);
    }
  }

  return theories.sort();
}

/**
 * Load theory DSL file
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<string>} DSL content
 */
export async function loadTheoryDSL(theoryName) {
  const dslPath = join(THEORIES_ROOT, theoryName, 'theory.dsl.txt');
  return await readFile(dslPath, 'utf8');
}

/**
 * Load theory natural language file
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<string>} NL content
 */
export async function loadTheoryNL(theoryName) {
  const nlPath = join(THEORIES_ROOT, theoryName, 'theory.nl.txt');
  try {
    return await readFile(nlPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Load theory simplified NL file
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<string>} Simplified NL content
 */
export async function loadTheorySimpleNL(theoryName) {
  const simplePath = join(THEORIES_ROOT, theoryName, 'theory.simple.txt');
  try {
    return await readFile(simplePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Load evaluation cases for a theory
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<Object>} Evaluation module
 */
export async function loadEvalCases(theoryName) {
  const evalPath = join(THEORIES_ROOT, theoryName, 'eval.mjs');
  try {
    const module = await import(evalPath);
    return {
      name: module.name || theoryName,
      description: module.description || '',
      cases: module.cases || module.steps || [],
      timeout: module.timeout || null
    };
  } catch (err) {
    console.error(`Warning: Could not load eval cases for ${theoryName}: ${err.message}`);
    return {
      name: theoryName,
      description: 'No evaluation cases',
      cases: []
    };
  }
}

/**
 * Load complete theory with all files
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<Object>} Complete theory data
 */
export async function loadTheory(theoryName) {
  const [dsl, nl, simpleNL, evalConfig] = await Promise.all([
    loadTheoryDSL(theoryName).catch(() => ''),
    loadTheoryNL(theoryName),
    loadTheorySimpleNL(theoryName),
    loadEvalCases(theoryName)
  ]);

  // Count facts in DSL
  const factCount = countDSLFacts(dsl);

  return {
    name: theoryName,
    dsl,
    nl,
    simpleNL,
    factCount,
    ...evalConfig
  };
}

/**
 * Count facts in DSL content
 * @param {string} dsl - DSL content
 * @returns {number} Fact count
 */
function countDSLFacts(dsl) {
  if (!dsl) return 0;

  // Count non-empty, non-comment lines
  const lines = dsl.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  return lines.length;
}

export default {
  loadCoreTheories,
  discoverTheories,
  loadTheoryDSL,
  loadTheoryNL,
  loadTheorySimpleNL,
  loadEvalCases,
  loadTheory,
  countDSLFacts
};
