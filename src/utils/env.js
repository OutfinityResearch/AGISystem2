const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on', 'enable', 'enabled', 'debug', 'verbose']);
const FALSY = new Set(['0', 'false', 'no', 'n', 'off', 'disable', 'disabled']);

function normalizeBoolean(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') return undefined;
    if (TRUTHY.has(normalized)) return true;
    if (FALSY.has(normalized)) return false;
    return undefined;
  }
  return undefined;
}

/**
 * Read an env var as a boolean with tolerant truthy/falsy parsing.
 * Returns `undefined` if the env var is unset or unparseable.
 */
export function readEnvBoolean(name, env = process.env) {
  if (!env || !name) return undefined;
  return normalizeBoolean(env[name]);
}

