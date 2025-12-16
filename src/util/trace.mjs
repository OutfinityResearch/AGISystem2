/**
 * AGISystem2 - Trace/Debug Utility
 * @module util/trace
 *
 * Provides conditional logging based on SYS2_DEBUG environment variable.
 * When SYS2_DEBUG is set to 'true' or '1', trace messages are logged to console.
 */

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
function isDebugEnabled() {
  if (typeof process !== 'undefined' && process.env) {
    const debug = process.env.SYS2_DEBUG;
    return debug === 'true' || debug === '1';
  }
  // Browser environment - check global
  if (typeof globalThis !== 'undefined' && globalThis.SYS2_DEBUG) {
    return globalThis.SYS2_DEBUG === true || globalThis.SYS2_DEBUG === 'true';
  }
  return false;
}

/**
 * Cached debug state (can be updated via setDebug)
 */
let debugEnabled = isDebugEnabled();

/**
 * Manually enable or disable debug mode
 * @param {boolean} enabled
 */
export function setDebug(enabled) {
  debugEnabled = enabled;
}

/**
 * Get current debug state
 * @returns {boolean}
 */
export function getDebug() {
  return debugEnabled;
}

/**
 * Log a trace message if debug is enabled
 * @param {string} module - Module name (e.g., 'decoder', 'query', 'prove')
 * @param {...any} args - Arguments to log
 */
export function sys2trace(module, ...args) {
  if (debugEnabled) {
    const timestamp = new Date().toISOString();
    console.log(`[SYS2:${module}] ${timestamp}`, ...args);
  }
}

/**
 * Create a scoped tracer for a specific module
 * @param {string} module - Module name
 * @returns {function} Trace function for this module
 */
export function createTracer(module) {
  return (...args) => sys2trace(module, ...args);
}

/**
 * Log with different levels
 */
export const trace = {
  /**
   * General trace message
   */
  log: (module, ...args) => sys2trace(module, ...args),

  /**
   * Warning - always logged if debug is on
   */
  warn: (module, ...args) => {
    if (debugEnabled) {
      console.warn(`[SYS2:${module}:WARN]`, ...args);
    }
  },

  /**
   * Error - always logged regardless of debug flag
   */
  error: (module, ...args) => {
    console.error(`[SYS2:${module}:ERROR]`, ...args);
  },

  /**
   * Entry into a function
   */
  enter: (module, fnName, ...args) => {
    if (debugEnabled) {
      console.log(`[SYS2:${module}] ENTER ${fnName}`, args.length > 0 ? args : '');
    }
  },

  /**
   * Exit from a function
   */
  exit: (module, fnName, result) => {
    if (debugEnabled) {
      const summary = result !== undefined ? summarizeResult(result) : '';
      console.log(`[SYS2:${module}] EXIT ${fnName}`, summary);
    }
  },

  /**
   * Time a block of code
   * @param {string} module
   * @param {string} label
   * @param {function} fn
   * @returns {*} Result of fn
   */
  time: (module, label, fn) => {
    if (debugEnabled) {
      const start = performance.now();
      const result = fn();
      const elapsed = (performance.now() - start).toFixed(2);
      console.log(`[SYS2:${module}] ${label} took ${elapsed}ms`);
      return result;
    }
    return fn();
  },

  /**
   * Async time a block of code
   * @param {string} module
   * @param {string} label
   * @param {function} fn - async function
   * @returns {Promise<*>} Result of fn
   */
  timeAsync: async (module, label, fn) => {
    if (debugEnabled) {
      const start = performance.now();
      const result = await fn();
      const elapsed = (performance.now() - start).toFixed(2);
      console.log(`[SYS2:${module}] ${label} took ${elapsed}ms`);
      return result;
    }
    return fn();
  }
};

/**
 * Summarize a result for trace output
 * @param {*} result
 * @returns {string}
 */
function summarizeResult(result) {
  if (result === null || result === undefined) {
    return String(result);
  }
  if (typeof result === 'boolean' || typeof result === 'number') {
    return String(result);
  }
  if (typeof result === 'string') {
    return result.length > 50 ? result.slice(0, 50) + '...' : result;
  }
  if (Array.isArray(result)) {
    return `Array(${result.length})`;
  }
  if (typeof result === 'object') {
    if ('success' in result) {
      return `{success: ${result.success}}`;
    }
    if ('valid' in result) {
      return `{valid: ${result.valid}}`;
    }
    if ('confidence' in result) {
      return `{confidence: ${result.confidence?.toFixed(3) ?? 'N/A'}}`;
    }
    const keys = Object.keys(result);
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
  }
  return typeof result;
}

export default {
  sys2trace,
  createTracer,
  setDebug,
  getDebug,
  trace
};
