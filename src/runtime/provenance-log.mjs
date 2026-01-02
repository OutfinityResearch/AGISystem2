/**
 * AGISystem2 - Provenance Log (v0)
 * @module runtime/provenance-log
 *
 * URC direction (DS49/DS73): provenance must be auditable.
 *
 * v0 provides:
 * - an in-memory structured log (`session.provenanceLog`)
 * - optional best-effort materialization as derived Sys2DSL lines for debugging/tooling
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

function buildProvenanceFactLines({ srcNl, srcDsl, nlText, dslText }) {
  const nl = String(nlText || '');
  const dsl = String(dslText || '');
  const spanId = safeId('Span', `${srcNl}:0:${nl.length}`);
  const decisionId = safeId('Decision', `${srcDsl}:Parse`);
  return [
    `sourceText ${srcNl} ${JSON.stringify(nl)}`,
    `sourceHash ${srcNl} ${shaKey(nl)}`,
    `sourceText ${srcDsl} ${JSON.stringify(dsl)}`,
    `sourceHash ${srcDsl} ${shaKey(dsl)}`,
    `spanOf ${spanId} ${srcNl}`,
    `spanStart ${spanId} 0`,
    `spanEnd ${spanId} ${nl.length}`,
    `interprets ${spanId} ${srcDsl}`,
    `confidence ${srcDsl} 1`,
    `decisionKind ${decisionId} Parse`,
    `decides ${decisionId} ${srcDsl}`,
    `because ${decisionId} ${spanId}`,
    `normalizedFrom ${srcDsl} ${srcNl}`
  ];
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
    translation,
    materializedFactLines: []
  };
  session.provenanceLog ||= [];
  session.provenanceLog.push(entry);

  const materializeFacts = options.materializeFacts ?? false;
  if (materializeFacts) {
    // DS73: provenance is an audit surface, not KB truth. Materialization is provided as derived DSL lines only.
    entry.materializedFactLines = buildProvenanceFactLines({ srcNl, srcDsl, nlText, dslText });
    entry.materialized = true;
  } else {
    entry.materializedFactLines = [];
    entry.materialized = false;
  }

  return entry;
}
