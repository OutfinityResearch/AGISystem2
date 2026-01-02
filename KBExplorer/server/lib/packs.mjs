import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { PACKS_DIR } from './paths.mjs';

// Baseline packs for KBExplorer. Keep this list generic and minimal.
export const DEFAULT_PACKS = [
  'Bootstrap',
  'Relations',
  'Logic',
  'Reasoning',
  // URC contract packs are useful by default in KBExplorer (research UI).
  'URC'
];

export function listAvailablePacks() {
  try {
    const entries = readdirSync(PACKS_DIR, { withFileTypes: true });
    const names = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(name => existsSync(path.join(PACKS_DIR, name, 'index.sys2')))
      .sort((a, b) => a.localeCompare(b));
    return names;
  } catch {
    return [];
  }
}

export function sanitizePackList(packs, { availablePacks }) {
  if (!Array.isArray(packs)) return null;
  const allowed = new Set(availablePacks || []);
  const out = [];
  for (const raw of packs) {
    const name = String(raw || '').trim();
    if (!name) continue;
    if (!allowed.has(name)) continue;
    if (out.includes(name)) continue;
    out.push(name);
  }
  return out;
}

export function loadPacksIntoSession(session, packNames) {
  const loaded = [];
  const errors = [];

  for (const packName of packNames || []) {
    const packPath = path.join(PACKS_DIR, packName);
    if (!existsSync(packPath)) {
      errors.push({ pack: packName, error: 'Missing pack directory' });
      continue;
    }
    let report = null;
    try {
      report = session.loadPack(packName, { packPath, includeIndex: true, validate: false });
    } catch (e) {
      errors.push({
        pack: packName,
        error: 'Exception while loading pack',
        details: [e?.message || String(e)]
      });
      continue;
    }
    if (!report?.success) {
      errors.push({
        pack: packName,
        error: 'Failed to load pack',
        details: report?.errors || []
      });
      continue;
    }
    loaded.push(packName);
  }

  return {
    success: errors.length === 0,
    loadedPacks: loaded,
    errors
  };
}
