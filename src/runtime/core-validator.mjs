import { existsSync, readFileSync } from 'node:fs';
import { resolveKernelFilePath } from './kernel-manifest.mjs';

function parseTypeMarkerNamesFromCoreFile(content) {
  const names = new Set();
  // Matches:
  //   @PersonType:PersonType ___NewVector ...
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^@(\w+):\w+\s+___NewVector\b/);
    if (m) names.add(m[1]);
  }
  return names;
}

function validateTypeMarkers(session) {
  const errors = [];
  const warnings = [];

  const path = resolveKernelFilePath('00-types.sys2');
  if (!path || !existsSync(path)) {
    warnings.push('Missing Kernel types file (00-types.sys2); cannot validate type markers');
    return { errors, warnings };
  }

  const content = readFileSync(path, 'utf8');
  const expected = parseTypeMarkerNamesFromCoreFile(content);
  if (expected.size === 0) {
    warnings.push('No type markers found in Kernel types file (00-types.sys2)');
    return { errors, warnings };
  }

  for (const name of expected) {
    if (!session?.scope?.has?.(name)) {
      errors.push(`Missing type marker in scope: ${name} (expected from Kernel types file 00-types.sys2)`);
    }
  }

  return { errors, warnings };
}

function validateSemanticIndex(session) {
  const errors = [];
  const warnings = [];
  const idx = session?.semanticIndex;
  if (!idx) {
    errors.push('Missing session.semanticIndex');
    return { errors, warnings };
  }

  // Minimal invariants used throughout the reasoners.
  if (typeof idx.isTransitive !== 'function' || idx.isTransitive('isA') !== true) {
    errors.push('SemanticIndex missing required transitive relation: isA');
  }
  if (typeof idx.isSymmetric !== 'function' || idx.isSymmetric('spouse') !== true) {
    warnings.push('SemanticIndex does not mark spouse as symmetric (Core expects it)');
  }

  return { errors, warnings };
}

/**
 * Validate the Core stack invariants for strict mode. Intended to run after loading Core.
 *
 * @param {import('./session.mjs').Session} session
 * @param {Object} [options]
 * @param {boolean} [options.throwOnError] - default false
 * @returns {{ok: boolean, errors: string[], warnings: string[]}}
 */
export function validateCore(session, options = {}) {
  const errors = [];
  const warnings = [];

  const typeCheck = validateTypeMarkers(session);
  errors.push(...typeCheck.errors);
  warnings.push(...typeCheck.warnings);

  const idxCheck = validateSemanticIndex(session);
  errors.push(...idxCheck.errors);
  warnings.push(...idxCheck.warnings);

  const ok = errors.length === 0;
  if (!ok && options.throwOnError) {
    const msg = `Core validation failed:\n- ${errors.join('\n- ')}`;
    throw new Error(msg);
  }
  return { ok, errors, warnings };
}
