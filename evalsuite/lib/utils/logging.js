/**
 * Logging Utilities - Formatted console output for evaluation suite
 *
 * @module evalsuite/lib/utils/logging
 */

const colors = require('./colors');

/**
 * Log a message with optional color
 * @param {string} msg - Message to log
 * @param {string} [color] - ANSI color code
 */
function log(msg, color = '') {
  if (color) {
    console.log(`${color}${msg}${colors.reset}`);
  } else {
    console.log(msg);
  }
}

/**
 * Log a section header
 * @param {string} title - Section title
 */
function logSection(title) {
  console.log('\n' + colors.bright + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + ` ${title}` + colors.reset);
  console.log(colors.bright + '═'.repeat(60) + colors.reset);
}

/**
 * Log a test result with pass/fail indicator
 * @param {boolean} passed - Whether test passed
 * @param {string} message - Result message
 */
function logResult(passed, message) {
  const icon = passed ? `${colors.green}✓` : `${colors.red}✗`;
  log(`    ${icon} ${message}${colors.reset}`);
}

/**
 * Log an error message
 * @param {string} msg - Error message
 */
function logError(msg) {
  log(`  Error: ${msg}`, colors.red);
}

/**
 * Log a warning message
 * @param {string} msg - Warning message
 */
function logWarning(msg) {
  log(`  Warning: ${msg}`, colors.yellow);
}

/**
 * Log verbose/debug information
 * @param {string} msg - Debug message
 */
function logDebug(msg) {
  log(`  ${msg}`, colors.gray);
}

module.exports = {
  log,
  logSection,
  logResult,
  logError,
  logWarning,
  logDebug,
  colors
};
