import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCore } from './core-validator.mjs';
import { parseCoreIndexLoads } from './kernel-manifest.mjs';
import { parseWithOptions } from '../parser/parser.mjs';

/**
 * Load the Kernel theory pack from `config/Packs/Kernel` into this session.
 * Convenience helper to make theory-driven behavior easy to enable.
 */
export function loadCore(session, options = {}) {
  const corePath = options.corePath || './config/Packs/Kernel';
  const includeIndex = options.includeIndex || false;
  const validate = options.validate ?? true;
  const throwOnValidationError = options.throwOnValidationError ?? false;

  const all = readdirSync(corePath)
    .filter(f => f.endsWith('.sys2'))
    .sort();

  // Core policy:
  // - `includeIndex: true` means "use index.sys2 as the load-order manifest".
  //   We do NOT rely on runtime `@_ Load` resolving relative paths at parse-time.
  // - `includeIndex: false` means "enumerate all *.sys2 except index.sys2" (legacy mode).
  let files;
  if (includeIndex && all.includes('index.sys2')) {
    const indexContent = readFileSync(join(corePath, 'index.sys2'), 'utf8');
    const ordered = parseCoreIndexLoads(indexContent);
    files = ordered.length > 0 ? ordered : all.filter(f => f !== 'index.sys2');
  } else {
    files = all.filter(f => f !== 'index.sys2');
  }

  const errors = [];
  for (const file of files) {
    const fullPath = join(corePath, file);
    const content = readFileSync(fullPath, 'utf8');
    const ast = parseWithOptions(content, { sourceName: fullPath });
    const result = session.learn(ast);
    if (!result.success) {
      errors.push({ file, errors: result.errors });
    }
  }

  const response = { success: errors.length === 0, errors };

  if (validate && session?.strictMode) {
    const report = validateCore(session, { throwOnError: throwOnValidationError });
    if (!report.ok) {
      response.success = false;
      response.errors = [...(response.errors || []), { file: 'CoreValidation', errors: report.errors }];
    }
    if (report.warnings.length > 0) {
      response.warnings = report.warnings;
    }
  }

  return response;
}
