import { Session } from '../../../src/index.mjs';

import { sanitizeSessionOptions } from './sessionOptions.mjs';
import { DEFAULT_PACKS, listAvailablePacks, loadPacksIntoSession, sanitizePackList } from './packs.mjs';

export function newSessionUniverse(options, sessionOptions, requestedPacks = null) {
  const resolvedSessionOptions = {
    ...(options?.sessionOptions || {}),
    ...(sanitizeSessionOptions(sessionOptions) || {})
  };

  const availablePacks = listAvailablePacks();
  const requested = sanitizePackList(requestedPacks, { availablePacks });
  const packs = requested && requested.length > 0 ? requested : DEFAULT_PACKS.filter(p => availablePacks.includes(p));

  const warnings = [];
  let session = null;
  try {
    session = new Session(resolvedSessionOptions);
  } catch (e) {
    warnings.push(`Failed to create session with requested options; falling back to defaults: ${e?.message || String(e)}`);
    session = new Session({});
  }

  const coreLoad = loadPacksIntoSession(session, packs);
  if (!coreLoad?.success) warnings.push('Baseline pack load reported errors (KBExplorer will still run, but behavior may be degraded).');

  return {
    sessionOptions: resolvedSessionOptions,
    coreLoad,
    loadedPacks: packs,
    warnings,
    session,
    chat: [],
    createdAt: Date.now(),
    lastUsedAt: Date.now()
  };
}

export function resetSessionUniverse(universe, options, sessionOptions, packs) {
  try {
    universe.session?.close?.();
  } catch {
    // ignore
  }

  const resolved = {
    ...(universe.sessionOptions || {}),
    ...(sanitizeSessionOptions(sessionOptions) || {})
  };
  universe.sessionOptions = resolved;

  let session = null;
  const warnings = [];
  try {
    session = new Session(resolved);
  } catch (e) {
    warnings.push(`Failed to create session with requested options; falling back to defaults: ${e?.message || String(e)}`);
    session = new Session({});
  }

  const availablePacks = listAvailablePacks();
  const requested = sanitizePackList(packs, { availablePacks });
  const nextPacks = requested && requested.length > 0
    ? requested
    : (Array.isArray(universe.loadedPacks) ? universe.loadedPacks : DEFAULT_PACKS).filter(p => availablePacks.includes(p));

  const coreLoad = loadPacksIntoSession(session, nextPacks);
  if (!coreLoad?.success) warnings.push('Baseline pack load reported errors.');

  universe.session = session;
  universe.coreLoad = coreLoad;
  universe.warnings = warnings;
  universe.loadedPacks = nextPacks;
  universe.chat = [];

  return { coreLoad, loadedPacks: nextPacks, warnings, session };
}

