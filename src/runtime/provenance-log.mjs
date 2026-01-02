/**
 * AGISystem2 - Provenance Log (v0)
 * @module runtime/provenance-log
 *
 * URC direction (DS49/DS73): provenance must be auditable and ideally represented as facts.
 *
 * v0 provides:
 * - an in-memory structured log (`session.provenanceLog`)
 * - optional best-effort materialization as Sys2DSL facts when URC provenance relations are loaded
 *
 * This is intentionally conservative to avoid breaking strict sessions that do not load URC packs.
 */

import { fnv1a } from '../util/hash.mjs';

function safeId(prefix, body) {
  const h = fnv1a(String(body || ''));
  return `${prefix}_${h.toString(16)}`;
}

function shaKey(text) {
  // FNV is enough for stable ids inside the session; cryptographic hashing is not required here.
  return String(fnv1a(String(text || '')).toString(16));
}

function buildProvenanceDsl({ srcNl, srcDsl, nlText, dslText }) {
  const nl = String(nlText || '');
  const dsl = String(dslText || '');
  return [
    `sourceText ${srcNl} ${JSON.stringify(nl)}`,
    `sourceHash ${srcNl} ${JSON.stringify(shaKey(nl))}`,
    `sourceText ${srcDsl} ${JSON.stringify(dsl)}`,
    `sourceHash ${srcDsl} ${JSON.stringify(shaKey(dsl))}`,
    `normalizedFrom ${srcDsl} ${srcNl}`
  ].join('\n');
}

export function recordNlTranslationProvenance(session, { nlText, dslText, translation = null } = {}, options = {}) {
  const srcNl = safeId('SrcNL', nlText);
  const srcDsl = safeId('SrcDSL', `${nlText} -> ${dslText}`);

  session._provenanceSeq = (session._provenanceSeq || 0) + 1;
  const entry = {
    id: `${srcDsl}_${session._provenanceSeq}`,
    kind: 'nl2dsl',
    at: Date.now(),
    srcNl,
    srcDsl,
    nlText: String(nlText || ''),
    dslText: String(dslText || ''),
    translation
  };
  session.provenanceLog ||= [];
  session.provenanceLog.push(entry);

  const materializeFacts = options.materializeFacts ?? false;
  if (materializeFacts) {
    const provDsl = buildProvenanceDsl({ srcNl, srcDsl, nlText, dslText });
    try {
      session.learn(provDsl);
      entry.materialized = true;
    } catch {
      entry.materialized = false;
    }
  }

  return entry;
}

