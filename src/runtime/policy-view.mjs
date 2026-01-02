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

function parseBoolAtom(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

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

function readPolicyConfig(session) {
  const facts = session.kbFacts || [];
  const policyOps = new Set(['policyNewerWins', 'policyEvidenceRank', 'policyRoleRank', 'policySourceRank']);

  // Choose the most recently referenced policy id, if any.
  let policyId = null;
  for (let i = facts.length - 1; i >= 0; i--) {
    const meta = facts[i]?.metadata;
    if (!meta || !policyOps.has(meta.operator)) continue;
    const args = Array.isArray(meta.args) ? meta.args : [];
    if (args.length < 2) continue;
    policyId = String(args[0] ?? '').trim() || null;
    if (policyId) break;
  }

  const config = {
    policyId,
    newerWins: null,
    evidenceRank: {},
    roleRank: {},
    sourceRank: {}
  };
  if (!policyId) return config;

  for (const fact of facts) {
    const meta = fact?.metadata;
    if (!meta) continue;
    const op = meta.operator;
    const args = Array.isArray(meta.args) ? meta.args : [];
    if (args.length < 2) continue;
    if (String(args[0] ?? '').trim() !== policyId) continue;

    if (op === 'policyNewerWins') {
      const b = parseBoolAtom(args[1]);
      if (b !== null) config.newerWins = b;
      continue;
    }
    if (op === 'policyEvidenceRank' && args.length >= 3) {
      const kind = String(args[1] ?? '').trim();
      const rank = String(args[2] ?? '').trim();
      if (kind && rank) config.evidenceRank[kind] = rank;
      continue;
    }
    if (op === 'policyRoleRank' && args.length >= 3) {
      const role = String(args[1] ?? '').trim();
      const rank = String(args[2] ?? '').trim();
      if (role && rank) config.roleRank[role] = rank;
      continue;
    }
    if (op === 'policySourceRank' && args.length >= 3) {
      const source = String(args[1] ?? '').trim();
      const rank = String(args[2] ?? '').trim();
      if (source && rank) config.sourceRank[source] = rank;
      continue;
    }
  }

  return config;
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
 *   policy: { policyId: string|null, newerWins: boolean|null, evidenceRank: Object, roleRank: Object, sourceRank: Object },
 *   warnings: string[]
 * }}
 */
export function materializePolicyView(session, options = {}) {
  const policy = readPolicyConfig(session);
  const newerWins = options.newerWins ?? policy.newerWins ?? true;
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

  return {
    newerWins,
    currentFactIds: current,
    supersedes,
    negates: negEdges,
    policy,
    warnings
  };
}
