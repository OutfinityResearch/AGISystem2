import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPERATOR_DECL_RE =
  /^@([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?\s+(graph|macro|__Relation|__TransitiveRelation|__SymmetricRelation|__ReflexiveRelation|__InheritableProperty)\b/;

const GRAPH_HEADER_RE =
  /^@([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?\s+(graph|macro)\b(.*)$/;

function coreConfigPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '../../config/Core');
}

function collectCoreOperators() {
  const operators = new Set();
  const coreDir = coreConfigPath();
  if (!existsSync(coreDir)) return operators;

  const entries = readdirSync(coreDir);
  for (const entry of entries) {
    if (!entry.endsWith('.sys2')) continue;
    if (entry.endsWith('.errors')) continue;
    const content = readFileSync(join(coreDir, entry), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist] = match;
      if (name) operators.add(name);
      if (persist) operators.add(persist);
    }
  }

  return operators;
}

export const CORE_OPERATOR_CATALOG = collectCoreOperators();

function normalizeOperatorKind(kind) {
  if (!kind) return null;
  if (kind === 'graph' || kind === 'macro') return 'graph';
  if (kind === '__Relation') return 'relation';
  if (kind === '__TransitiveRelation') return 'relation';
  if (kind === '__SymmetricRelation') return 'relation';
  if (kind === '__ReflexiveRelation') return 'relation';
  if (kind === '__InheritableProperty') return 'relation';
  return null;
}

function collectCoreOperatorKinds() {
  const kinds = new Map(); // operator -> 'graph'|'relation'
  const coreDir = coreConfigPath();
  if (!existsSync(coreDir)) return kinds;

  const entries = readdirSync(coreDir);
  for (const entry of entries) {
    if (!entry.endsWith('.sys2')) continue;
    if (entry.endsWith('.errors')) continue;
    const content = readFileSync(join(coreDir, entry), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist, rawKind] = match;
      const kind = normalizeOperatorKind(rawKind);
      if (!kind) continue;

      // Prefer relation over graph if both appear (defensive).
      const setKind = (op) => {
        if (!op) return;
        const existing = kinds.get(op);
        if (!existing) kinds.set(op, kind);
        else if (existing !== kind && kind === 'relation') kinds.set(op, kind);
      };

      setKind(name);
      setKind(persist);
    }
  }

  return kinds;
}

export const CORE_OPERATOR_KIND = collectCoreOperatorKinds();

function collectCoreGraphArities() {
  const arities = new Map();
  const coreDir = coreConfigPath();
  if (!existsSync(coreDir)) return arities;

  const entries = readdirSync(coreDir);
  for (const entry of entries) {
    if (!entry.endsWith('.sys2')) continue;
    if (entry.endsWith('.errors')) continue;
    const content = readFileSync(join(coreDir, entry), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(GRAPH_HEADER_RE);
      if (!match) continue;
      const [, name, persist, , rest] = match;
      const invokable = persist || name;
      const params = String(rest || '').trim().split(/\s+/).filter(Boolean);
      if (params.length === 0) continue;
      arities.set(invokable, params.length);
    }
  }

  return arities;
}

export const CORE_GRAPH_ARITY = collectCoreGraphArities();
