/**
 * AGISystem2 - URC Store Helpers (v0)
 * @module runtime/urc-store
 *
 * Minimal in-memory store for URC-shaped objects (Artifact/Evidence).
 * Materialization into KB facts is best-effort and requires the URC pack to be loaded.
 */

import { createHash } from 'node:crypto';
import { fnv1a } from '../util/hash.mjs';

function stableId(prefix, parts) {
  const body = Array.isArray(parts) ? parts.map(p => String(p ?? '')).join('|') : String(parts ?? '');
  return `${prefix}_${fnv1a(body).toString(16)}`;
}

function nowMs() {
  return Date.now();
}

function sha256Hex(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

export function initUrcStores(session) {
  session.urc ||= {};
  session.urc.artifacts ||= new Map(); // id -> artifact object
  session.urc.evidence ||= new Map();  // id -> evidence object
  session.urc.seq ||= 0;
}

export function registerArtifact(session, { format, text, hash } = {}, options = {}) {
  initUrcStores(session);
  session.urc.seq++;
  const computedHash = String(hash || '') || sha256Hex(text);
  const id = stableId('Artifact', [format, computedHash, session.urc.seq]);
  const artifact = {
    id,
    format: String(format || ''),
    hash: computedHash,
    text: String(text || ''),
    at: nowMs()
  };
  session.urc.artifacts.set(id, artifact);

  if (options.materializeFacts) {
    const dsl = [
      `artifactFormat ${id} ${String(format || '')}`,
      `artifactHash ${id} ${JSON.stringify(String(hash || ''))}`
    ].join('\n');
    try { session.learn(dsl); } catch { /* ignore */ }
  }

  return artifact;
}

export function registerEvidence(
  session,
  { kind, method, tool = '_', status, supports = '_', artifactId = '_', scope = '_' } = {},
  options = {}
) {
  initUrcStores(session);
  session.urc.seq++;
  const id = stableId('Evidence', [kind, method, status, supports, artifactId, session.urc.seq]);
  const evidence = {
    id,
    kind: String(kind || ''),
    method: String(method || ''),
    tool: String(tool || '_'),
    status: String(status || ''),
    supports: String(supports || '_'),
    artifactId: String(artifactId || '_'),
    scope: String(scope || '_'),
    at: nowMs()
  };
  session.urc.evidence.set(id, evidence);

  if (options.materializeFacts) {
    const lines = [
      `eKind ${id} ${evidence.kind}`,
      `eMethod ${id} ${evidence.method}`,
      `eTool ${id} ${evidence.tool}`,
      `eStatus ${id} ${evidence.status}`
    ];
    if (evidence.supports !== '_') lines.push(`eSupports ${id} ${evidence.supports}`);
    if (evidence.artifactId !== '_') lines.push(`eArtifact ${id} ${evidence.artifactId}`);
    if (evidence.scope !== '_') lines.push(`eScope ${id} ${evidence.scope}`);
    try { session.learn(lines.join('\n')); } catch { /* ignore */ }
  }

  return evidence;
}
