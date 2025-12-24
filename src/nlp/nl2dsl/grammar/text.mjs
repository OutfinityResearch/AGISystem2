export function clean(text) {
  return String(text || '')
    .trim()
    // Strip dataset annotations like [BG], [FOL], etc.
    .replace(/\[[A-Z]+\]\s*/g, '')
    // Strip leading numbering / enumeration markers (common in bAbI, logic datasets).
    .replace(/^\(?\d+\)?[)\].:-]?\s+/g, '')
    .replace(/^:\(?\d+\)?[)\].:-]?\s+/g, '')
    // Strip dataset section headers and rule ids (kept generic enough for multiple sources)
    .replace(/^(?:facts|rules|hypothesis|premise|conclusion)\s*:\s*/i, '')
    .replace(/^\(\s*r\d+\s*(?:,\s*[0-9.]+)?\s*\)\s*:\s*/i, '')
    .replace(/^r\d+\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.?!]+$/, '');
}

export function lower(text) {
  return String(text || '').toLowerCase();
}

export function splitCoord(text) {
  let t = clean(text);
  if (!t) return { op: 'And', items: [] };

  // Protect "between X and Y" so its internal "and" doesn't get treated as coordination.
  const BETWEEN_AND = '__BETWEEN_AND__';
  t = t.replace(/(\bbetween\b[^,]*?)\s+and\s+([^,]*)(?=,|$)/gi, (_, a, b) => `${a} ${BETWEEN_AND} ${b}`);

  const hasOr = /\s+or\s+/i.test(t);
  const op = hasOr ? 'Or' : 'And';
  const byConj = hasOr ? /\s+or\s+/i : /\s+and\s+/i;

  const raw = t
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(part => part.split(byConj).map(p => p.trim()).filter(Boolean));

  const items = raw
    .map(s => s.replaceAll(BETWEEN_AND, 'and'))
    .map(s => s.replace(/^(?:or|and)\s+/i, '').trim())
    .filter(Boolean);

  return { op, items };
}

export function detectNegationPrefix(text) {
  const t = clean(text);
  if (/^not\s+/i.test(t)) return { negated: true, rest: t.replace(/^not\s+/i, '').trim() };
  return { negated: false, rest: t };
}
