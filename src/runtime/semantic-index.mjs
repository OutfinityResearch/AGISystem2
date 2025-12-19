/**
 * AGISystem2 - Semantic Index
 * @module runtime/semantic-index
 *
 * Deterministic index derived from theory/config files.
 * Purpose: provide theory-driven operator/relation properties to canonicalizer + reasoners.
 *
 * Initial implementation: relation properties from config/Core/00-relations.sys2
 * (transitive/symmetric/reflexive/inheritable) + basic constraints.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function coreConfigPath(relativeFile) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '../../config/Core', relativeFile);
}

function parsePropertyLines(content, className) {
  const names = new Set();
  // Matches lines like: "@isA:isA __TransitiveRelation"
  // Captures the exported name before ":" (canonical operator token used by code/tests).
  const re = new RegExp(String.raw`^@(\w+):\w+\s+${className}\b`, 'm');

  for (const line of content.split('\n')) {
    const m = line.match(re);
    if (m) names.add(m[1]);
  }
  return names;
}

function parseMutuallyExclusive(content) {
  // Lines like:
  //   mutuallyExclusive hasState Open Closed
  const map = new Map(); // operator -> Array<[a,b]>
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^mutuallyExclusive\s+(\w+)\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, operator, a, b] = m;
    if (!map.has(operator)) map.set(operator, []);
    map.get(operator).push([a, b]);
  }
  return map;
}

function parseInverseRelations(content) {
  // Lines like:
  //   inverseRelation before after
  const map = new Map(); // op -> inverseOp
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^inverseRelation\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, op, inv] = m;
    map.set(op, inv);
  }
  return map;
}

function parseContradictsSameArgs(content) {
  // Lines like:
  //   contradictsSameArgs before after
  const map = new Map(); // op -> Set<otherOp>
  function add(a, b) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^contradictsSameArgs\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, a, b] = m;
    // Treat as symmetric by default: A contradicts B and B contradicts A.
    add(a, b);
    add(b, a);
  }
  return map;
}

export class SemanticIndex {
  constructor({
    transitiveRelations = new Set(),
    symmetricRelations = new Set(),
    reflexiveRelations = new Set(),
    inheritableProperties = new Set(),
    mutuallyExclusive = new Map(),
    inverseRelations = new Map(),
    contradictsSameArgs = new Map()
  } = {}) {
    this.transitiveRelations = transitiveRelations;
    this.symmetricRelations = symmetricRelations;
    this.reflexiveRelations = reflexiveRelations;
    this.inheritableProperties = inheritableProperties;
    this.mutuallyExclusive = mutuallyExclusive;
    this.inverseRelations = inverseRelations;
    this.contradictsSameArgs = contradictsSameArgs;
  }

  isTransitive(name) {
    return this.transitiveRelations.has(name);
  }

  isSymmetric(name) {
    return this.symmetricRelations.has(name);
  }

  isReflexive(name) {
    return this.reflexiveRelations.has(name);
  }

  isInheritableProperty(name) {
    return this.inheritableProperties.has(name);
  }

  getMutuallyExclusivePairs(operator) {
    return this.mutuallyExclusive.get(operator) || [];
  }

  hasMutuallyExclusive(operator) {
    const pairs = this.mutuallyExclusive.get(operator);
    return !!pairs && pairs.length > 0;
  }

  getInverseRelation(operator) {
    return this.inverseRelations.get(operator) || null;
  }

  contradictsSameArgsWith(operator) {
    return this.contradictsSameArgs.get(operator) || new Set();
  }

  static fromCoreRelationsFile({ allowFallbackDefaults = true } = {}) {
    const defaults = new SemanticIndex({
      transitiveRelations: new Set([
        'isA',
        'locatedIn',
        'partOf',
        'subclassOf',
        'containedIn',
        'before',
        'after',
        'causes',
        'appealsTo',
        'leadsTo',
        'enables'
      ]),
      symmetricRelations: new Set(['siblingOf', 'marriedTo', 'near', 'adjacent', 'conflictsWith']),
      reflexiveRelations: new Set(['equals', 'sameAs']),
      inheritableProperties: new Set([
        'can',
        'has',
        'likes',
        'knows',
        'owns',
        'uses',
        'hasProperty',
        'hasAbility',
        'hasTrait',
        'exhibits',
        'causes',
        'prevents',
        'enables',
        'requires',
        'must',
        'should',
        'may'
      ]),
      mutuallyExclusive: new Map(),
      inverseRelations: new Map(),
      contradictsSameArgs: new Map()
    });

    const configPath = coreConfigPath('00-relations.sys2');
    if (!existsSync(configPath)) {
      return allowFallbackDefaults ? defaults : new SemanticIndex();
    }

    const content = readFileSync(configPath, 'utf-8');
    const transitiveRelations = parsePropertyLines(content, '__TransitiveRelation');
    const symmetricRelations = parsePropertyLines(content, '__SymmetricRelation');
    const reflexiveRelations = parsePropertyLines(content, '__ReflexiveRelation');
    const inheritableProperties = parsePropertyLines(content, '__InheritableProperty');

    const idx = new SemanticIndex({
      transitiveRelations,
      symmetricRelations,
      reflexiveRelations,
      inheritableProperties,
      mutuallyExclusive: new Map(),
      inverseRelations: new Map(),
      contradictsSameArgs: new Map()
    });

    if (!allowFallbackDefaults) return idx;

    // Fill gaps to preserve existing behavior if the config file is partial.
    for (const name of defaults.transitiveRelations) idx.transitiveRelations.add(name);
    for (const name of defaults.symmetricRelations) idx.symmetricRelations.add(name);
    for (const name of defaults.reflexiveRelations) idx.reflexiveRelations.add(name);
    for (const name of defaults.inheritableProperties) idx.inheritableProperties.add(name);

    return idx;
  }

  static withCoreConstraints(baseIndex, { allowFallbackDefaults = true } = {}) {
    const configPath = coreConfigPath('14-constraints.sys2');
    if (!existsSync(configPath)) {
      return baseIndex;
    }

    const content = readFileSync(configPath, 'utf-8');
    const mutuallyExclusive = parseMutuallyExclusive(content);
    const inverseRelations = parseInverseRelations(content);
    const contradictsSameArgs = parseContradictsSameArgs(content);

    // Merge into baseIndex (copy-on-write).
    const merged = new SemanticIndex({
      transitiveRelations: new Set(baseIndex.transitiveRelations),
      symmetricRelations: new Set(baseIndex.symmetricRelations),
      reflexiveRelations: new Set(baseIndex.reflexiveRelations),
      inheritableProperties: new Set(baseIndex.inheritableProperties),
      mutuallyExclusive: new Map(baseIndex.mutuallyExclusive),
      inverseRelations: new Map(baseIndex.inverseRelations),
      contradictsSameArgs: new Map(baseIndex.contradictsSameArgs)
    });

    for (const [op, pairs] of mutuallyExclusive.entries()) {
      const existing = merged.mutuallyExclusive.get(op) || [];
      merged.mutuallyExclusive.set(op, [...existing, ...pairs]);
    }

    for (const [op, inv] of inverseRelations.entries()) {
      merged.inverseRelations.set(op, inv);
    }

    for (const [op, others] of contradictsSameArgs.entries()) {
      const existing = merged.contradictsSameArgs.get(op) || new Set();
      for (const other of others) existing.add(other);
      merged.contradictsSameArgs.set(op, existing);
    }

    if (!allowFallbackDefaults) return merged;
    return merged;
  }
}

const BASE_SEMANTIC_INDEX = SemanticIndex.fromCoreRelationsFile({ allowFallbackDefaults: true });

export const DEFAULT_SEMANTIC_INDEX = SemanticIndex.withCoreConstraints(BASE_SEMANTIC_INDEX, {
  allowFallbackDefaults: true
});
