import {
  isGenericClassNoun,
  isPlural,
  normalizeEntity,
  normalizeTypeName,
  sanitizePredicate,
  singularize
} from '../../utils.mjs';

import { clean, lower, splitCoord } from '../text.mjs';
import { parsePredicateItem } from './shared.mjs';

export function parseQuantifiedSubjectDescriptor(subjectPart) {
  const s = clean(subjectPart);
  if (!s) return { typeName: null, properties: [] };

  const ofMatch = s.match(/^(\w+)\s+of\s+(.+)$/i);
  if (ofMatch) {
    const head = ofMatch[1];
    const tail = ofMatch[2];
    const headType = normalizeTypeName(singularize(head));
    const tailEnt = normalizeEntity(tail, '?x');
    const typeName = headType && tailEnt ? `${headType}Of${tailEnt}` : null;
    return { typeName, properties: [] };
  }

  const rel = s.match(/^(.+?)\s+(?:who|that|which)\s+(.+)$/i);
  const baseText = rel ? rel[1].trim() : s;
  const relTextRaw = rel ? rel[2].trim() : null;
  const relText = relTextRaw ? relTextRaw.replace(/^(?:are|is)\s+/i, '').trim() : null;

  const tokens = lower(baseText).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { typeName: null, properties: [] };

  // Heuristic: in subject descriptors like:
  // - "students working in the lab"
  // - "students instructed by professor David"
  // - "students taking the database course"
  // the head is typically the first plural noun ("students"), and the rest is a relative predicate.
  // The older "head=last token" heuristic breaks badly on trailing proper names ("... David").
  if (!relText && isPlural(tokens[0]) && !isGenericClassNoun(tokens[0]) && tokens.length >= 2) {
    const t1 = tokens[1] || '';
    const preps = new Set(['in', 'on', 'at', 'by', 'to', 'from', 'with', 'for', 'of', 'near', 'behind', 'beside', 'under', 'over', 'inside', 'outside']);
    const hasPrep = tokens.some(t => preps.has(t));
    const looksLikeVerbish = /(?:ing|ed)$/.test(t1) || preps.has(t1) || hasPrep;
    if (looksLikeVerbish) {
      const headType = normalizeTypeName(singularize(tokens[0]));
      const relative = tokens.slice(1).join(' ').trim();
      return { typeName: headType, properties: [], ...(relative ? { relative } : {}) };
    }
  }

  const head = tokens[tokens.length - 1];
  const mods = tokens.slice(0, -1);
  const typeName = isGenericClassNoun(head) ? null : normalizeTypeName(isPlural(head) ? singularize(head) : head);
  const properties = mods
    .filter(m => !['who', 'that', 'which', 'are', 'is'].includes(m))
    .map(m => sanitizePredicate(m))
    .filter(Boolean);
  return { typeName, properties, ...(relText ? { relative: relText } : {}) };
}

export function emitSubjectDescriptorItems(subject, descriptor) {
  const items = [];
  if (descriptor?.typeName) {
    items.push({ negated: false, atom: { op: 'isA', args: [subject, descriptor.typeName] } });
  }
  for (const p of descriptor?.properties || []) {
    items.push({ negated: false, atom: { op: 'hasProperty', args: [subject, p] } });
  }
  if (descriptor?.relative) {
    const coord = splitCoord(descriptor.relative);
    for (const raw of coord.items || []) {
      const parsed = parsePredicateItem(raw, subject);
      const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      for (const it of list) {
        if (it?.atom) items.push(it);
      }
    }
  }
  return items;
}

export function parseCopulaPredicates(subject, predPart) {
  const coord = splitCoord(predPart);
  const items = [];
  for (const raw of coord.items || []) {
    const parsed = parsePredicateItem(raw, subject);
    const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    for (const it of list) {
      if (it) items.push(it);
    }
  }
  return items.length > 0 ? { op: coord.op, items } : null;
}

export function parseHavePredicate(subject, objectPart, negated = false) {
  const obj = clean(objectPart)
    .replace(/^(?:a|an|the)\s+/i, '')
    .trim();
  if (!obj) return null;
  const tokens = obj.split(/\s+/).filter(Boolean).map(t => String(t).toLowerCase());
  const det = new Set(['the', 'a', 'an']);
  const kept = tokens.filter(t => !det.has(t)).map(t => singularize(t));
  const keyTokens = kept.length <= 10 ? kept : [...kept.slice(0, 5), ...kept.slice(-3)];
  const key = keyTokens.join('_');
  const prop = sanitizePredicate(key) || sanitizePredicate(keyTokens[keyTokens.length - 1] || '');
  if (!prop) return null;
  return { negated, atom: { op: 'hasProperty', args: [subject, prop] } };
}
