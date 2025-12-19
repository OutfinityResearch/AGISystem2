/**
 * Unified debug helper that honors both SYS2_DEBUG and NODE_DEBUG flags.
 * Accepts truthy values such as 'true', '1', 'yes', 'on', or actual booleans.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on', 'enable', 'enabled', 'debug', 'verbose']);

function normalize(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') return false;
    return TRUTHY.has(normalized);
  }
  return Boolean(value);
}

function readFlag(source, key) {
  if (!source) return false;
  const value = source[key];
  return normalize(value) || false;
}

let overrideValue = null;

function computeDebugState() {
  if (overrideValue !== null) {
    return overrideValue;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (readFlag(process.env, 'SYS2_DEBUG')) return true;
    if (readFlag(process.env, 'NODE_DEBUG')) return true;
  }
  if (typeof globalThis !== 'undefined') {
    if (readFlag(globalThis, 'SYS2_DEBUG')) return true;
    if (readFlag(globalThis, 'NODE_DEBUG')) return true;
  }
  return false;
}

/**
 * Returns whether verbose tracing is currently enabled.
 */
export function isDebugEnabled() {
  return computeDebugState();
}

/**
 * Allows tests or callers to override the debug flag at runtime.
 * Pass null/undefined to clear the override and fall back to env detection.
 */
export function setDebugEnabled(value) {
  if (value === null || value === undefined) {
    overrideValue = null;
  } else {
    overrideValue = Boolean(value);
  }
}

/**
 * Conditional console logging helper. Automatically no-ops when debug is disabled.
 * The first argument can be a prefix string (e.g., "[Session:INIT]") or any value.
 */
export function debug_trace(prefix, ...args) {
  if (!isDebugEnabled()) {
    return;
  }
  if (typeof prefix === 'string') {
    console.log(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}
