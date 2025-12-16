/**
 * AGISystem2 - Debug Utility
 * @module utils/debug
 *
 * Provides conditional debug logging based on SYS2_DEBUG environment variable.
 * Set SYS2_DEBUG=true to enable detailed tracing.
 */

const DEBUG = process.env.SYS2_DEBUG === 'true';

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Debug logger with categories
 */
export const debug = {
  enabled: DEBUG,

  /**
   * Log general debug message
   */
  log(...args) {
    if (DEBUG) console.log(`${colors.gray}[DEBUG]${colors.reset}`, ...args);
  },

  /**
   * Log reasoning step
   */
  reason(step, method, details = '') {
    if (DEBUG) {
      console.log(`${colors.cyan}[REASON]${colors.reset} Step ${step}: ${colors.yellow}${method}${colors.reset} ${details}`);
    }
  },

  /**
   * Log proof attempt
   */
  proof(depth, goal, status = '') {
    if (DEBUG) {
      const indent = '  '.repeat(depth);
      const goalStr = typeof goal === 'string' ? goal : goal?.toString?.() || JSON.stringify(goal);
      console.log(`${colors.magenta}[PROOF]${colors.reset} ${indent}depth=${depth} ${colors.blue}${goalStr.substring(0, 60)}${colors.reset} ${status}`);
    }
  },

  /**
   * Log query execution
   */
  query(queryStr, result = '') {
    if (DEBUG) {
      console.log(`${colors.green}[QUERY]${colors.reset} ${queryStr} ${colors.dim}=> ${result}${colors.reset}`);
    }
  },

  /**
   * Log KB scan
   */
  kbScan(operation, factCount, details = '') {
    if (DEBUG) {
      console.log(`${colors.gray}[KB]${colors.reset} ${operation} (${factCount} facts) ${details}`);
    }
  },

  /**
   * Log transitive chain step
   */
  transitive(from, via, to, status = '') {
    if (DEBUG) {
      console.log(`${colors.yellow}[TRANS]${colors.reset} ${from} -> ${via} -> ${to} ${status}`);
    }
  },

  /**
   * Log rule application
   */
  rule(ruleName, status, details = '') {
    if (DEBUG) {
      console.log(`${colors.blue}[RULE]${colors.reset} ${ruleName}: ${status} ${details}`);
    }
  },

  /**
   * Log warning
   */
  warn(...args) {
    if (DEBUG) console.log(`${colors.yellow}[WARN]${colors.reset}`, ...args);
  },

  /**
   * Log error (always shown)
   */
  error(...args) {
    console.error(`${colors.red}[ERROR]${colors.reset}`, ...args);
  },

  /**
   * Log timeout/limit reached
   */
  limit(type, value, max) {
    if (DEBUG) {
      console.log(`${colors.red}[LIMIT]${colors.reset} ${type}: ${value}/${max}`);
    }
  },

  /**
   * Log phase timing
   */
  phase(name, durationMs, status = 'done') {
    if (DEBUG) {
      console.log(`${colors.cyan}[PHASE]${colors.reset} ${name}: ${durationMs}ms (${status})`);
    }
  },

  /**
   * Log similarity check
   */
  similarity(a, b, score) {
    if (DEBUG && score > 0.3) {  // Only log meaningful similarities
      console.log(`${colors.dim}[SIM]${colors.reset} ${a} ~ ${b} = ${score.toFixed(3)}`);
    }
  },

  /**
   * Create a timer for measuring operations
   */
  timer(label) {
    const start = Date.now();
    return {
      stop() {
        const duration = Date.now() - start;
        if (DEBUG) {
          console.log(`${colors.dim}[TIME]${colors.reset} ${label}: ${duration}ms`);
        }
        return duration;
      }
    };
  }
};

export default debug;
