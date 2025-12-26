/**
 * AGISystem2 - Proof Validator (DS19 incremental)
 * @module reasoning/proof-validator
 *
 * Minimal replayable validator for `proofObject` produced by `buildProofObject`.
 * This does NOT re-run search. It only checks that evidence steps correspond to
 * KB facts / synonym relations / relation properties as recorded.
 */

function factExists(session, operator, args = []) {
  if (!operator) return false;
  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== operator) continue;
    const a = meta.args || [];
    if (a.length !== args.length) continue;
    let ok = true;
    for (let i = 0; i < args.length; i++) {
      if (a[i] !== args[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function isSynonym(session, a, b) {
  if (!a || !b) return false;
  const kb = session?.componentKB;
  if (!kb || typeof kb.expandSynonyms !== 'function') return false;
  const set = kb.expandSynonyms(a);
  return set.has(b);
}

function isCanonicalMapping(session, alias, canonical) {
  if (!alias || !canonical) return false;
  const kb = session?.componentKB;
  if (!kb || typeof kb.resolveCanonical !== 'function') return false;
  return kb.resolveCanonical(alias) === canonical;
}

/**
 * Validate a proofObject (best-effort, incremental).
 * Returns false if structure is invalid or if required evidence is missing.
 *
 * @param {Object} proofObject - result.proofObject
 * @param {import('../runtime/session.mjs').Session} session
 * @returns {boolean}
 */
export function validateProof(proofObject, session) {
  if (!proofObject || typeof proofObject !== 'object') return false;
  if (!proofObject.goal || typeof proofObject.goal !== 'object') return false;
  if (typeof proofObject.goal.operator !== 'string') return false;
  if (!Array.isArray(proofObject.goal.args)) return false;
  if (!Array.isArray(proofObject.steps)) return false;

  // For failed proofs, we only validate shape.
  if (!proofObject.valid) return true;

  function ruleExists(ruleRef) {
    const rules = session?.rules || [];
    const id = ruleRef?.id;
    const name = ruleRef?.name;
    if (id && rules.some(r => r?.id === id)) return true;
    if (name && rules.some(r => r?.label === name || r?.name === name)) return true;
    return false;
  }

  for (const step of proofObject.steps) {
    if (!step || typeof step !== 'object') return false;

    if (step.kind === 'fact' || step.kind === 'default') {
      const uses = step.usesFacts || [];
      for (const u of uses) {
        if (!u || typeof u.operator !== 'string' || !Array.isArray(u.args)) continue;
        if (!factExists(session, u.operator, u.args)) return false;
      }
    }

    if (step.kind === 'rule') {
      const rules = step.usesRules || [];
      for (const r of rules) {
        if (!ruleExists(r)) return false;
      }
    }

    if (step.kind === 'synonym') {
      const syn = step.detail?.synonymUsed;
      const canon = step.detail?.canonicalUsed;
      if (typeof syn === 'string' && syn.includes('<->')) {
        const [left, right] = syn.split('<->').map(s => s.trim());
        if (left && right && !isSynonym(session, left, right)) return false;
      }
      if (typeof canon === 'string' && canon.includes('->')) {
        const [left, right] = canon.split('->').map(s => s.trim());
        if (left && right && !isCanonicalMapping(session, left, right)) return false;
      }
    }

    if (step.kind === 'transitive') {
      const u = (step.usesFacts || [])[0];
      if (u?.operator && session?.semanticIndex?.isTransitive) {
        if (!session.semanticIndex.isTransitive(u.operator)) return false;
      }
      // If this step points to an edge fact, ensure edge exists; for derived "found"
      // steps, this may fail (and DS19 will later model derivations explicitly).
      if (u?.operator && Array.isArray(u.args) && u.args.length === 2) {
        const edgeExists = factExists(session, u.operator, u.args);
        if (!edgeExists && step.detail?.operation === 'transitive_step') {
          // This SHOULD reference a KB edge.
          return false;
        }
      }
    }
  }

  return true;
}
