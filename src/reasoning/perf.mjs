function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function startTimer(session, key) {
  if (!session?.reasoningStats?.timersEnabled) return null;
  if (!key) return null;
  return { key, start: nowMs() };
}

export function endTimer(session, token) {
  if (!token || !session?.reasoningStats?.timersEnabled) return;
  const timers = session.reasoningStats.timers || (session.reasoningStats.timers = Object.create(null));
  const entry = timers[token.key] || (timers[token.key] = { count: 0, totalMs: 0, maxMs: 0 });
  const durationMs = nowMs() - token.start;
  entry.count += 1;
  entry.totalMs += durationMs;
  if (durationMs > entry.maxMs) entry.maxMs = durationMs;
}

export function timeBlock(session, key, fn) {
  if (!session?.reasoningStats?.timersEnabled) return fn();
  const token = startTimer(session, key);
  try {
    return fn();
  } finally {
    endTimer(session, token);
  }
}
