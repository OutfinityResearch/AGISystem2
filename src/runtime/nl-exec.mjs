/**
 * AGISystem2 - NL Execution Helper (v0)
 * @module runtime/nl-exec
 *
 * Translate Natural Language to Sys2DSL, record provenance, then execute via Session.
 * URC direction: provenance/evidence are stored in-memory by default; optional materialization produces
 * derived audit DSL lines for tooling (not injected into the KB truth store).
 */

import { translateNL2DSL } from '../nlp/nl2dsl.mjs';

function normalizeMode(mode) {
  const m = String(mode || '').trim().toLowerCase();
  if (m === 'learn' || m === 'query' || m === 'prove' || m === 'abduce' || m === 'findall') return m;
  return null;
}

export function executeNL(session, { mode, text } = {}, options = {}) {
  const m = normalizeMode(mode);
  if (!m) return { success: false, error: 'Invalid mode' };
  const raw = String(text || '');
  if (!raw.trim()) return { success: false, error: 'Empty input' };

  const isQuestion = m !== 'learn';
  const translation = translateNL2DSL(raw, { source: 'generic', isQuestion });
  if (!translation?.success) {
    return { success: false, translation, errors: translation?.errors || [{ error: 'Translation failed' }] };
  }
  const dsl = translation.dsl || '';

  const guardDsl = typeof options.guardDsl === 'function' ? options.guardDsl : null;
  if (guardDsl) {
    try {
      const verdict = guardDsl(dsl, { mode: m, text: raw, translation });
      if (verdict === false) {
        return { success: false, mode: m, text: raw, dsl, translation, blocked: true, status: 400, error: 'Blocked by guard' };
      }
      if (typeof verdict === 'string' && verdict.trim()) {
        return { success: false, mode: m, text: raw, dsl, translation, blocked: true, status: 400, error: verdict.trim() };
      }
      if (verdict && typeof verdict === 'object' && verdict.ok === false) {
        return {
          success: false,
          mode: m,
          text: raw,
          dsl,
          translation,
          blocked: true,
          status: Number.isFinite(verdict.status) ? verdict.status : 400,
          error: verdict.error || 'Blocked by guard'
        };
      }
    } catch {
      return { success: false, mode: m, text: raw, dsl, translation, blocked: true, status: 400, error: 'Guard error' };
    }
  }

  const materializeFacts = options.materializeFacts ?? false;
  try {
    session.recordNlTranslationProvenance?.({ nlText: raw, dslText: dsl, translation }, { materializeFacts });
  } catch {
    // ignore provenance failures
  }

  try {
    let result = null;
    if (m === 'learn') result = session.learn(dsl);
    else if (m === 'query') result = session.queryURC?.(dsl, { materializeFacts }) ?? session.query(dsl);
    else if (m === 'prove') result = session.proveURC?.(dsl, { materializeFacts }) ?? session.prove(dsl);
    else if (m === 'abduce') result = session.abduce(dsl);
    else if (m === 'findall') result = session.findAll(dsl);

    return { success: true, mode: m, text: raw, dsl, translation, result };
  } catch (e) {
    return { success: false, mode: m, text: raw, dsl, translation, error: e?.message || String(e) };
  }
}
