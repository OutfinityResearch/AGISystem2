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
 * Map performance theory names to config domain names
 */
const DOMAIN_MAP = {
  'math': 'Math',
  'mathematics': 'Math',
  'physics': 'Physics',
  'biology': 'Biology',
  'medicine': 'Medicine',
  'geography': 'Geography',
  'history': 'History',
  'psychology': 'Psychology',
  'sociology': 'Sociology',
  'anthropology': 'Anthropology',
  'philosophy': 'Philosophy',
  'law': 'Law',
  'literature': 'Literature',
  'litcrit': 'Literature'
};

/**
 * Load domain-specific fundamental theory from config/<Domain>/
 * @param {string} theoryName - Theory domain name (e.g., 'math', 'biology')
 * @returns {Promise<string[]>} Array of domain theory content strings
 */
export async function loadDomainTheory(theoryName) {
  const domainName = DOMAIN_MAP[theoryName.toLowerCase()] || capitalize(theoryName);
  const domainDir = join(CONFIG_ROOT, domainName);
  const theories = [];

  try {
    const entries = await readdir(domainDir);
    const sys2Files = entries
      .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
      .sort();

    for (const file of sys2Files) {
      const content = await readFile(join(domainDir, file), 'utf8');
      theories.push(content);
    }
  } catch (err) {
    // Domain theory not found - this is ok, not all domains have config theories
  }

  return theories;
}

/**
 * Discover available domain theories in config/
 * @returns {Promise<string[]>} Array of domain names
 */
export async function discoverDomainTheories() {
  const domains = [];
  try {
    const entries = await readdir(CONFIG_ROOT);
    for (const entry of entries) {
      if (entry === 'Core') continue; // Skip Core
      const entryPath = join(CONFIG_ROOT, entry);
      const entryStat = await stat(entryPath);
      if (entryStat.isDirectory()) {
        domains.push(entry);
      }
    }
  } catch (err) {
    // Config dir not accessible
  }
  return domains.sort();
}

/**
 * Get all defined concepts from domain theory
 * @param {string} theoryName - Theory domain name
 * @returns {Promise<Set<string>>} Set of defined concept names
 */
export async function getDomainConcepts(theoryName) {
  const theories = await loadDomainTheory(theoryName);
  const concepts = new Set();

  for (const content of theories) {
    // Extract concepts defined with @Name pattern
    const matches = content.matchAll(/@(\w+)(?::\w+)?\s+(?:isA|graph|___)/g);
    for (const match of matches) {
      concepts.add(match[1]);
    }
  }

  return concepts;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
  loadDomainTheory,
  discoverDomainTheories,
  getDomainConcepts,
  discoverTheories,
  loadTheoryDSL,
  loadTheoryNL,
  loadTheorySimpleNL,
  loadEvalCases,
  loadTheory,
  countDSLFacts
};
