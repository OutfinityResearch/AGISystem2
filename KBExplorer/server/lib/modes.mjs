export function sanitizeMode(mode) {
  const m = String(mode || '').trim();
  if (m === 'learn' || m === 'query' || m === 'prove' || m === 'abduce' || m === 'findAll') return m;
  return null;
}

export function sanitizeInputMode(inputMode) {
  const m = String(inputMode || '').trim().toLowerCase();
  if (m === 'nl' || m === 'dsl') return m;
  return null;
}

