import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPERATOR_DECL_RE =
  /^@([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?\s+(graph|macro|__Relation|__TransitiveRelation|__SymmetricRelation|__ReflexiveRelation|__InheritableProperty)\b/;

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
