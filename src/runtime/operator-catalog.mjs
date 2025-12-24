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
