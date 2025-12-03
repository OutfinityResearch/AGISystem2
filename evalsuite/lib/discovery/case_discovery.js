/**
 * CaseDiscovery - Discover and load test cases from filesystem
 *
 * Scans suite directory for case.json files, supports filtering
 * by case name, range, and failed status.
 *
 * @module evalsuite/lib/discovery/case_discovery
 */

const fs = require('fs');
const path = require('path');

/**
 * Discover test cases in suite directory
 *
 * @param {string} suiteDir - Path to test suite directory
 * @param {Object} options - Discovery options
 * @param {string} [options.filterCase] - Filter by case name pattern
 * @param {number} [options.from] - Start from case number
 * @param {number} [options.to] - End at case number
 * @param {boolean} [options.runFailed] - Only run previously failed cases
 * @returns {Array} Array of test case objects
 */
function discoverCases(suiteDir, options = {}) {
  const { filterCase, from, to, runFailed } = options;

  // Load failed cases if needed
  let failedCaseIds = new Set();
  if (runFailed) {
    const failedPath = path.join(suiteDir, 'failed.json');
    if (fs.existsSync(failedPath)) {
      try {
        const failedData = JSON.parse(fs.readFileSync(failedPath, 'utf-8'));
        failedCaseIds = new Set(failedData.map(c => c.id));
      } catch (e) {
        console.warn('Warning: Could not parse failed.json');
      }
    }
  }

  const cases = [];
  const dirs = fs.readdirSync(suiteDir)
    .filter(d => fs.statSync(path.join(suiteDir, d)).isDirectory())
    .filter(d => !d.startsWith('.') && d !== 'lib')
    .sort((a, b) => {
      // Sort numerically if possible
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

  let caseIndex = 0;
  for (const dir of dirs) {
    caseIndex++;

    // Apply range filters
    if (from !== null && from !== undefined && caseIndex < from) continue;
    if (to !== null && to !== undefined && caseIndex > to) continue;

    // Apply name filter
    if (filterCase && !dir.toLowerCase().includes(filterCase.toLowerCase())) {
      continue;
    }

    const casePath = path.join(suiteDir, dir, 'case.json');
    if (!fs.existsSync(casePath)) continue;

    try {
      const caseData = JSON.parse(fs.readFileSync(casePath, 'utf-8'));
      caseData._dir = dir;
      caseData._path = casePath;
      caseData._index = caseIndex;

      // Apply failed filter
      if (runFailed && !failedCaseIds.has(caseData.id)) {
        continue;
      }

      cases.push(caseData);
    } catch (e) {
      console.warn(`Warning: Could not parse ${casePath}: ${e.message}`);
    }
  }

  return cases;
}

/**
 * Save failed cases to failed.json
 * Merges with existing failures outside the current range
 *
 * @param {string} suiteDir - Path to test suite directory
 * @param {Array} failedCases - Array of failed case objects
 * @param {number} [from] - Start of range that was tested
 * @param {number} [to] - End of range that was tested
 */
function saveFailedCases(suiteDir, failedCases, from = null, to = null) {
  const failedPath = path.join(suiteDir, 'failed.json');

  let existingFailed = [];
  if (fs.existsSync(failedPath)) {
    try {
      existingFailed = JSON.parse(fs.readFileSync(failedPath, 'utf-8'));
    } catch (e) {
      existingFailed = [];
    }
  }

  // If we tested a range, keep failures outside that range
  let mergedFailed;
  if (from !== null || to !== null) {
    mergedFailed = existingFailed.filter(c => {
      const idx = c._index || 0;
      if (from !== null && idx < from) return true;
      if (to !== null && idx > to) return true;
      return false;
    });
    mergedFailed = [...mergedFailed, ...failedCases];
  } else {
    mergedFailed = failedCases;
  }

  fs.writeFileSync(failedPath, JSON.stringify(mergedFailed, null, 2));
}

/**
 * Get case count in suite directory
 *
 * @param {string} suiteDir - Path to test suite directory
 * @returns {number} Number of test cases found
 */
function getCaseCount(suiteDir) {
  const dirs = fs.readdirSync(suiteDir)
    .filter(d => fs.statSync(path.join(suiteDir, d)).isDirectory())
    .filter(d => !d.startsWith('.') && d !== 'lib')
    .filter(d => fs.existsSync(path.join(suiteDir, d, 'case.json')));

  return dirs.length;
}

module.exports = {
  discoverCases,
  saveFailedCases,
  getCaseCount
};
