/**
 * AGISystem2 - Policy View Materializer (v0)
 * @module runtime/policy-view
 *
 * URC direction (DS49/DS73):
 * - facts are never deleted,
 * - revision happens via policy and a "current view",
 * - policy output is inspectable (for tooling), but not automatically treated as truth.
 *
 * This v0 materializer supports only explicit `negates(new, old)` links.
 */

function resolveFactRef(session, ref) {
  if (ref == null) return null;
  if (typeof ref === 'number' && Number.isFinite(ref)) {
    const id = Math.floor(ref);
    return session.kbFacts?.find(f => f.id === id) || null;
  }
  const s = String(ref || '').trim();
  if (!s) return null;

  // Named fact reference: use name match first.
  const byName = session.kbFacts?.find(f => f.name === s) || null;
  if (byName) return byName;

  // Allow "Fact#123" for tooling.
  const m = s.match(/^Fact#(\d+)$/i);
  if (m) {
    const id = Number(m[1]);
    if (Number.isFinite(id)) return session.kbFacts?.find(f => f.id === id) || null;
  }
  return null;
}

/**
 * Materialize a policy view for the session.
 *
 * @param {import('./session.mjs').Session} session
 * @param {object} [options]
 * @param {boolean} [options.newerWins=true]
 * @returns {{
 *   currentFactIds: Set<number>,
 *   supersedes: Array<{ newFactId: number, oldFactId: number }>,
 *   negates: Array<{ newFactId: number, oldFactId: number }>,
 *   warnings: string[]
 * }}
 */
export function materializePolicyView(session, options = {}) {
  const newerWins = options.newerWins ?? true;
  const warnings = [];

  // Collect negation/supersedence edges.
  const negEdges = [];
  for (const fact of session.kbFacts || []) {
    const op = fact?.metadata?.operator;
    const args = fact?.metadata?.args || [];
    if (op !== 'negates' || args.length !== 2) continue;

    const newFact = resolveFactRef(session, args[0]);
    const oldFact = resolveFactRef(session, args[1]);
    if (!newFact || !oldFact) {
      warnings.push(`Unresolved negates edge: negates ${String(args[0])} ${String(args[1])}`);
      continue;
    }
    negEdges.push({ newFactId: newFact.id, oldFactId: oldFact.id });
  }

  // Decide winner for each old fact (who supersedes it).
  const supersedes = [];
  const bestSuperseder = new Map(); // oldFactId -> newFactId
  for (const e of negEdges) {
    const prev = bestSuperseder.get(e.oldFactId);
    if (prev == null) {
      bestSuperseder.set(e.oldFactId, e.newFactId);
      continue;
    }
    if (!newerWins) continue;
    if (e.newFactId > prev) bestSuperseder.set(e.oldFactId, e.newFactId);
  }

  for (const [oldFactId, newFactId] of bestSuperseder.entries()) {
    supersedes.push({ newFactId, oldFactId });
  }

  // Compute current facts: anything not superseded by a stronger/newer superseder.
  const current = new Set((session.kbFacts || []).map(f => f.id));
  for (const { oldFactId } of supersedes) current.delete(oldFactId);

  // If a new fact is superseded itself, it might be removed from current as well.
  // Iterate until stable (since supersedes can chain).
  let changed = true;
  while (changed) {
    changed = false;
    for (const { newFactId, oldFactId } of supersedes) {
      if (!current.has(oldFactId)) continue;
      current.delete(oldFactId);
      changed = true;
    }
    for (const { newFactId, oldFactId } of supersedes) {
      if (current.has(oldFactId)) continue;
      // no-op; loop is for potential future enhancements
      void newFactId;
    }
  }

  return {
    currentFactIds: current,
    supersedes,
    negates: negEdges,
    warnings
  };
}

