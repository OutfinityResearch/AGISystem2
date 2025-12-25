/**
 * AutoDiscovery semantics helpers.
 *
 * We generally evaluate entailment-style corpora under open-world semantics:
 * - Do NOT treat missing facts as evidence for `Not(...)`.
 * - `Not(...)` must be derived from explicit negation, disjointness, or contradiction.
 */

export function normalizeSessionConfigForSource(sessionConfig, source) {
  const cfg = { ...(sessionConfig || {}) };
  const src = String(source || '').toLowerCase();

  // Default to open-world for discovery unless explicitly enabled.
  if (cfg.closedWorldAssumption === undefined) cfg.closedWorldAssumption = false;

  // Entailment and NLI-style corpora must not use negation-as-failure.
  if ([
    'folio',
    'folio_fol',
    'logicnli',
    'rulebert',
    'ruletaker',
    'prontoqa',
    'logiqa',
    'logiqa2',
    'reclor'
  ].includes(src)) {
    cfg.closedWorldAssumption = false;
  }

  return cfg;
}

