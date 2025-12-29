import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_POSITIONS } from '../core/constants.mjs';

const DEFAULT_CONFIG = {
  positionAtoms: { count: MAX_POSITIONS, template: '__POS_{n}__' },
  atoms: ['__EMPTY_BUNDLE__', '__CANONICAL_REWRITE__']
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
  const template = typeof posCfg.template === 'string' ? posCfg.template : '__POS_{n}__';
  const countRaw = Number.isFinite(posCfg.count) ? posCfg.count : MAX_POSITIONS;
  const count = Math.max(0, Math.min(Number(countRaw) || 0, maxPositions));

  for (let i = 1; i <= count; i++) {
    out.push(template.replace('{n}', String(i)));
  }

  const atoms = Array.isArray(cfg?.atoms) ? cfg.atoms : [];
  for (const name of atoms) {
    if (typeof name === 'string' && name.trim() !== '') out.push(name);
  }

  return Array.from(new Set(out));
}

export function initRuntimeReservedAtoms(session, options = {}) {
  if (!session?.vocabulary?.getOrCreate) return { created: 0, names: [] };
  const names = getRuntimeReservedAtomNames(options);
  let created = 0;
  for (const name of names) {
    if (!session.vocabulary.has(name)) created++;
    session.vocabulary.getOrCreate(name);
  }
  return { created, names };
}

