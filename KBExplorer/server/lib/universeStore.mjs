import { randomUUID } from 'node:crypto';

import { getHeader } from './http.mjs';
import { newSessionUniverse } from './universe.mjs';

function getSessionIdFromRequest(req, url) {
  const headerId = getHeader(req, 'x-session-id');
  if (headerId) return headerId;
  const q = url?.searchParams?.get('sessionId');
  if (q) return q;
  return null;
}

export function createUniverseStore(options) {
  const sessions = new Map();

  function getOrCreateUniverse(req, url) {
    const sid = getSessionIdFromRequest(req, url);
    if (sid && sessions.has(sid)) {
      const u = sessions.get(sid);
      u.lastUsedAt = Date.now();
      return { sessionId: sid, universe: u };
    }
    const sessionId = randomUUID();
    const universe = newSessionUniverse(options, null);
    sessions.set(sessionId, universe);
    return { sessionId, universe };
  }

  function requireUniverse(req, url) {
    const sid = getSessionIdFromRequest(req, url);
    if (!sid || !sessions.has(sid)) {
      return null;
    }
    const u = sessions.get(sid);
    u.lastUsedAt = Date.now();
    return { sessionId: sid, universe: u };
  }

  function createNewSession(sessionOptions, packs) {
    const sessionId = randomUUID();
    const universe = newSessionUniverse(options, sessionOptions, packs);
    sessions.set(sessionId, universe);
    return { sessionId, universe };
  }

  return {
    sessions,
    getOrCreateUniverse,
    requireUniverse,
    createNewSession
  };
}

