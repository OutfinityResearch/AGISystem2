import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_POSITIONS } from '../core/constants.mjs';

const DEFAULT_CONFIG = {
  positionAtoms: { count: MAX_POSITIONS, template: 'Pos{n}' },
  atoms: ['BOTTOM_IMPOSSIBLE', 'TOP_INEFFABLE', '__EMPTY_BUNDLE__', '__CANONICAL_REWRITE__']
};

let _cachedConfig = null;

function loadReservedAtomsConfig() {
  if (_cachedConfig) return _cachedConfig;

  try {
    const path = join(process.cwd(), 'config', 'runtime', 'reserved-atoms.json');
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    _cachedConfig = parsed && typeof parsed === 'object' ? parsed : DEFAULT_CONFIG;
    return _cachedConfig;
  } catch {
    _cachedConfig = DEFAULT_CONFIG;
    return _cachedConfig;
  }
}

export function getRuntimeReservedAtomNames({ maxPositions = MAX_POSITIONS } = {}) {
  const cfg = loadReservedAtomsConfig();
  const out = [];

  const posCfg = cfg?.positionAtoms || {};
  const template = typeof posCfg.template === 'string' ? posCfg.template : 'Pos{n}';
  const countRaw = Number.isFinite(posCfg.count) ? posCfg.count : MAX_POSITIONS;
  const count = Math.max(0, Math.min(Number(countRaw) || 0, maxPositions));

  const atoms = Array.isArray(cfg?.atoms) ? cfg.atoms : [];

  const normalizedAtoms = atoms
    .filter((name) => typeof name === 'string' && name.trim() !== '')
    .map((name) => name.trim());

  const priorityAtoms = [];
  const restAtoms = [];
  for (const name of normalizedAtoms) {
    if (name === 'BOTTOM_IMPOSSIBLE' || name === 'TOP_INEFFABLE') priorityAtoms.push(name);
    else restAtoms.push(name);
  }

  // Ensure these always exist and appear first, before any position markers.
  if (!priorityAtoms.includes('BOTTOM_IMPOSSIBLE')) priorityAtoms.unshift('BOTTOM_IMPOSSIBLE');
  if (!priorityAtoms.includes('TOP_INEFFABLE')) priorityAtoms.push('TOP_INEFFABLE');

  for (const name of priorityAtoms) out.push(name);

  for (let i = 1; i <= count; i++) {
    out.push(template.replace('{n}', String(i)));
  }

  for (const name of restAtoms) {
    out.push(name);
  }

  return Array.from(new Set(out));
}

export function initRuntimeReservedAtoms(session, options = {}) {
  if (!session?.vocabulary?.getOrCreate) return { created: 0, names: [] };
  const names = getRuntimeReservedAtomNames(options);
  let created = 0;
  for (const name of names) {
    if (!session.vocabulary.has(name)) created++;
    const isPos = /^Pos\d+$/.test(String(name));
    session.vocabulary.getOrCreate(name, {
      comment: isPos
        ? 'Runtime-reserved position marker (PosN) required for structured binding.'
        : 'Runtime-reserved atom required for cross-session invariants.'
    });
  }
  return { created, names };
}
