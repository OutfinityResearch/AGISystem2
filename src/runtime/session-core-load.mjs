import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load Core theories from `config/Core` into this session.
 * Convenience helper to make "theory-driven" behavior easy to enable.
 */
export function loadCore(session, options = {}) {
  const corePath = options.corePath || './config/Core';
  const includeIndex = options.includeIndex || false;

  const files = readdirSync(corePath)
    .filter(f => f.endsWith('.sys2'))
    .filter(f => includeIndex || f !== 'index.sys2')
    .sort();

  const errors = [];
  for (const file of files) {
    const content = readFileSync(join(corePath, file), 'utf8');
    const result = session.learn(content);
    if (!result.success) {
      errors.push({ file, errors: result.errors });
    }
  }

  return { success: errors.length === 0, errors };
}

