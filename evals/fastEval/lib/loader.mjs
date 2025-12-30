/**
 * EvalSuite - Theory and Suite Loader
 * @module evals/fastEval/lib/loader
 *
 * Loads Core theory stack and suite configurations.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, '..', '..', 'config');

/**
 * Load Core theory files in order
 * @returns {Promise<{files: string[], theories: Object<string, string>}>}
 */
export async function loadCoreTheory() {
  const coreDir = join(CONFIG_ROOT, 'Core');
  const indexPath = join(coreDir, 'index.sys2');

  const files = [];
  const theories = {};

  try {
    const indexContent = await readFile(indexPath, 'utf8');

    // Parse Load directives
    const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
    let match;

    while ((match = loadRegex.exec(indexContent)) !== null) {
      const filename = match[1].replace('./', '');
      files.push(filename);

      const filePath = join(coreDir, filename);
      try {
        theories[filename] = await readFile(filePath, 'utf8');
      } catch (err) {
        theories[filename] = `# Error loading ${filename}: ${err.message}`;
      }
    }
  } catch (err) {
    throw new Error(`Failed to load Core theory index: ${err.message}`);
  }

  return { files, theories };
}

/**
 * Load suite theory files (.sys2) from suite directory
 * @param {string} suiteDir - Suite directory path
 * @returns {Promise<string[]>}
 */
export async function loadSuiteTheories(suiteDir) {
  const theories = [];

  try {
    const entries = await readdir(suiteDir);
    const sys2Files = entries.filter(f => f.endsWith('.sys2')).sort();

    for (const file of sys2Files) {
      const content = await readFile(join(suiteDir, file), 'utf8');
      theories.push(content);
    }
  } catch (err) {
    // No theory files is OK
  }

  return theories;
}

/**
 * Load suite cases from cases.mjs
 * @param {string} suiteDir - Suite directory path
 * @returns {Promise<Object>}
 */
export async function loadSuiteCases(suiteDir) {
  const casesPath = join(suiteDir, 'cases.mjs');

  try {
    const module = await import(casesPath);
    const rawCases = module.steps || module.cases || [];
    return {
      name: module.name || 'Unknown Suite',
      description: module.description || '',
      // Support both new 'steps' and legacy 'cases' format
      cases: rawCases,
      theories: module.theories || [],
      localTheories: module.localTheories || [],
      sessionOptions: module.sessionOptions || null,
      timeout: module.timeout || null,  // Optional per-suite timeout in ms
      suiteDir  // Pass through for local theory loading
    };
  } catch (err) {
    throw new Error(`Failed to load suite cases from ${casesPath}: ${err.message}`);
  }
}

/**
 * Load local theory file from suite directory
 * @param {string} suiteDir - Suite directory path
 * @param {string} theoryPath - Relative path to theory file
 * @returns {Promise<string>}
 */
export async function loadLocalTheory(suiteDir, theoryPath) {
  const fullPath = join(suiteDir, theoryPath);
  try {
    return await readFile(fullPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to load local theory ${theoryPath}: ${err.message}`);
  }
}

/**
 * Load all local theories for a suite
 * @param {string} suiteDir - Suite directory path
 * @param {string[]} theoryPaths - Array of relative paths
 * @returns {Promise<Object<string, string>>}
 */
export async function loadLocalTheories(suiteDir, theoryPaths) {
  const theories = {};
  for (const path of theoryPaths) {
    theories[path] = await loadLocalTheory(suiteDir, path);
  }
  return theories;
}

/**
 * Discover all suites in evals/fastEval directory
 * @returns {Promise<string[]>}
 */
export async function discoverSuites() {
  const entries = await readdir(ROOT);
  return entries
    .filter(e => e.startsWith('suite') && !e.includes('.'))
    .sort();
}

/**
 * Load all data for a suite
 * @param {string} suiteName - Suite directory name
 * @returns {Promise<Object>}
 */
export async function loadSuite(suiteName) {
  const suiteDir = join(ROOT, suiteName);

  const [coreTheory, suiteTheories, suiteConfig] = await Promise.all([
    loadCoreTheory(),
    loadSuiteTheories(suiteDir),
    loadSuiteCases(suiteDir)
  ]);

  return {
    name: suiteConfig.name,
    description: suiteConfig.description,
    suiteName,
    suiteDir,
    coreTheory,
    suiteTheories,
    cases: suiteConfig.cases,
    declaredTheories: suiteConfig.theories,
    localTheories: suiteConfig.localTheories || [],
    sessionOptions: suiteConfig.sessionOptions || null,
    timeout: suiteConfig.timeout  // Optional per-suite timeout in ms
  };
}

export default {
  loadCoreTheory,
  loadSuiteTheories,
  loadSuiteCases,
  loadLocalTheory,
  loadLocalTheories,
  discoverSuites,
  loadSuite
};
