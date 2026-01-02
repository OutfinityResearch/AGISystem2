/**
 * AGISystem2 - Fact kind classification
 * @module runtime/fact-kind
 *
 * Separates "truth" facts (user/session assertions) from "theory/schema" facts
 * (loaded from .sys2 theory packs) to enable faster operator-indexed scans.
 */

function normalizePath(p) {
  return String(p || '').replaceAll('\\', '/');
}

/**
 * Classify a fact as `truth` or `theory` based on its metadata.
 *
 * Heuristic (intentionally conservative):
 * - Anything coming from a `.sys2` source file is treated as `theory`.
 * - Files under `config/Packs/` are treated as `theory`.
 * - Everything else is treated as `truth`.
 */
export function classifyFactKind(metadata) {
  const file = metadata?.source?.file;
  if (typeof file !== 'string' || file.trim() === '') return 'truth';
  const norm = normalizePath(file);
  if (norm.includes('/config/Packs/') || norm.includes('config/Packs/')) return 'theory';
  if (norm.endsWith('.sys2')) return 'theory';
  return 'truth';
}

export function ensureFactKind(fact) {
  if (!fact || typeof fact !== 'object') return null;
  if (fact.kind === 'truth' || fact.kind === 'theory') return fact.kind;
  const kind = classifyFactKind(fact.metadata);
  fact.kind = kind;
  return kind;
}

