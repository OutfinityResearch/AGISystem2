import { debug_trace, isDebugEnabled, setDebugEnabled as setDebugOverride } from '../utils/debug.js';

/**
 * AGISystem2 - Trace/Debug Utility
 * @module util/trace
 */

export function setDebug(enabled) {
  setDebugOverride(enabled);
}

export function getDebug() {
  return isDebugEnabled();
}

/**
 * Log a trace message if debug is enabled
 * @param {string} module - Module name (e.g., 'decoder', 'query', 'prove')
 * @param {...any} args - Arguments to log
 */
export function sys2trace(module, ...args) {
  if (!isDebugEnabled()) return;
  const timestamp = new Date().toISOString();
  debug_trace(`[SYS2:${module}] ${timestamp}`, ...args);
}

export function createTracer(module) {
  return (...args) => sys2trace(module, ...args);
}

export const trace = {
  log: (module, ...args) => sys2trace(module, ...args),

  warn: (module, ...args) => {
    if (isDebugEnabled()) {
      console.warn(`[SYS2:${module}:WARN]`, ...args);
    }
  },

  error: (module, ...args) => {
    console.error(`[SYS2:${module}:ERROR]`, ...args);
  },

  enter: (module, fnName, ...args) => {
    if (!isDebugEnabled()) return;
    debug_trace(`[SYS2:${module}] ENTER ${fnName}`, args.length > 0 ? args : '');
  },

  exit: (module, fnName, result) => {
    if (!isDebugEnabled()) return;
    const summary = result !== undefined ? summarizeResult(result) : '';
    debug_trace(`[SYS2:${module}] EXIT ${fnName}`, summary);
  },

  time: (module, label, fn) => {
    if (!isDebugEnabled()) return fn();
    const start = performance.now();
    const result = fn();
    const elapsed = (performance.now() - start).toFixed(2);
    debug_trace(`[SYS2:${module}] ${label} took ${elapsed}ms`);
    return result;
  },

  timeAsync: async (module, label, fn) => {
    if (!isDebugEnabled()) return fn();
    const start = performance.now();
    const result = await fn();
    const elapsed = (performance.now() - start).toFixed(2);
    debug_trace(`[SYS2:${module}] ${label} took ${elapsed}ms`);
    return result;
  }
};

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
