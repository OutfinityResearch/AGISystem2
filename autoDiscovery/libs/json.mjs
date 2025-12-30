import fs from 'node:fs';

export const DEFAULT_MAX_JSON_BYTES = 2 * 1024 * 1024; // 2MB

export function readJsonFile(filePath, { maxBytes = DEFAULT_MAX_JSON_BYTES, validate = null } = {}) {
  const stat = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) {
    throw new Error(`JSON file not found: ${filePath}`);
  }
  if (Number.isFinite(maxBytes) && stat.size > maxBytes) {
    throw new Error(`JSON file too large (${stat.size} bytes > ${maxBytes}): ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (typeof validate === 'function') {
    const result = validate(parsed);
    if (result === false) {
      throw new Error(`JSON validation failed: ${filePath}`);
    }
    if (typeof result === 'string' && result.trim() !== '') {
      throw new Error(`JSON validation failed: ${result}`);
    }
  }

  return parsed;
}

export function readJsonFileSafe(filePath, options = {}) {
  try {
    return readJsonFile(filePath, options);
  } catch {
    return null;
  }
}

