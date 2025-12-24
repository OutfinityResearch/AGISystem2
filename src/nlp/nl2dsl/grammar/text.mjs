export function clean(text) {
  return String(text || '')
    .trim()
    // Strip dataset annotations like [BG], [FOL], etc.
    .replace(/\[[A-Z]+\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.?!]+$/, '');
}

export function lower(text) {
  return String(text || '').toLowerCase();
}

export function splitCoord(text) {
  const t = clean(text);
  if (!t) return { op: 'And', items: [] };

  const hasOr = /\s+or\s+/i.test(t);
  const op = hasOr ? 'Or' : 'And';
  const byConj = hasOr ? /\s+or\s+/i : /\s+and\s+/i;

  const raw = t
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(part => part.split(byConj).map(p => p.trim()).filter(Boolean));

  const items = raw
    .map(s => s.replace(/^(?:or|and)\s+/i, '').trim())
    .filter(Boolean);

  return { op, items };
}

export function detectNegationPrefix(text) {
  const t = clean(text);
  if (/^not\s+/i.test(t)) return { negated: true, rest: t.replace(/^not\s+/i, '').trim() };
  return { negated: false, rest: t };
}
