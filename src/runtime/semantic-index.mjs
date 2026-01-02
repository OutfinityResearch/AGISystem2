/**
 * AGISystem2 - Semantic Index
 * @module runtime/semantic-index
 *
 * Deterministic index derived from theory/config files.
 * Purpose: provide theory-driven operator/relation properties to canonicalizer + reasoners.
 *
 * Initial implementation: relation properties from config/Packs/Relations/00-relations.sys2
 * (transitive/symmetric/reflexive/inheritable) + basic constraints.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolveKernelFilePath } from './kernel-manifest.mjs';

function parsePropertyLines(content, className) {
  const names = new Set();
  // Supported declaration shapes:
  // - `@rel:rel __TransitiveRelation`          (legacy; relation token comes from LHS export name)
  // - `__TransitiveRelation rel`              (preferred; relation token is the 1st arg)
  // - `@:<name> __TransitiveRelation rel`     (preferred persistent fact; relation token is the 1st arg)
  // - `@name:name __TransitiveRelation rel`   (same as above; avoids using `rel` as persist name)
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/g);

    // Shape: `__Tag rel`
    if (tokens[0] === className && typeof tokens[1] === 'string') {
      names.add(tokens[1]);
      continue;
    }

    // Shapes with a leading reference: `@... __Tag ...`
    if (!tokens[0]?.startsWith('@') || tokens[1] !== className) continue;

    // `@rel:rel __Tag` (legacy export style)
    const ref = tokens[0];
    const exportNameMatch = ref.match(/^@(\w+):\w+$/);
    if (exportNameMatch && tokens.length === 2) {
      names.add(exportNameMatch[1]);
      continue;
    }

    // `@:name __Tag rel` or `@name:name __Tag rel` (preferred)
    if (typeof tokens[2] === 'string') names.add(tokens[2]);
  }
  return names;
}

function parseTypeMarkers(content) {
  const names = new Set();
  // Matches lines like: "@PersonType:PersonType ___NewVector ..."
  const re = /^@(\w+):\w+\s+___NewVector\b/;
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
  const sources = new Map(); // operator -> Map<"a\u001fb", {file,line,text}>
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^mutuallyExclusive\s+(\w+)\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, operator, a, b] = m;
    if (!map.has(operator)) map.set(operator, []);
    map.get(operator).push([a, b]);

    if (!sources.has(operator)) sources.set(operator, new Map());
    const entry = sources.get(operator);
    const src = { line: i + 1, text: trimmed };
    entry.set(`${a}\u001f${b}`, src);
    entry.set(`${b}\u001f${a}`, src);
  }
  return { map, sources };
}

function parseInverseRelations(content) {
  // Lines like:
  //   inverseRelation before after
  const map = new Map(); // op -> inverseOp
  const sources = new Map(); // op -> {line,text}
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^inverseRelation\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, op, inv] = m;
    map.set(op, inv);
    sources.set(op, { line: i + 1, text: trimmed });
  }
  return { map, sources };
}

function parseContradictsSameArgs(content) {
  // Lines like:
  //   contradictsSameArgs before after
  const map = new Map(); // op -> Set<otherOp>
  const sources = new Map(); // op -> Map<otherOp, {line,text}>
  function add(a, b) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
    if (!sources.has(a)) sources.set(a, new Map());
    return sources.get(a);
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^contradictsSameArgs\s+(\w+)\s+(\w+)\s*$/);
    if (!m) continue;
    const [, a, b] = m;
    // Treat as symmetric by default: A contradicts B and B contradicts A.
    const src = { line: i + 1, text: trimmed };
    add(a, b).set(b, src);
    add(b, a).set(a, src);
  }
  return { map, sources };
}

export class SemanticIndex {
  constructor({
    relations = new Set(),
    assignmentRelations = new Set(),
    transitiveRelations = new Set(),
    symmetricRelations = new Set(),
    reflexiveRelations = new Set(),
    inheritableProperties = new Set(),
    typeMarkers = new Set(),
    mutuallyExclusive = new Map(),
    inverseRelations = new Map(),
    contradictsSameArgs = new Map(),
    mutuallyExclusiveSources = new Map(),
    inverseRelationsSources = new Map(),
    contradictsSameArgsSources = new Map()
  } = {}) {
    this.relations = relations;
    this.assignmentRelations = assignmentRelations;
    this.transitiveRelations = transitiveRelations;
    this.symmetricRelations = symmetricRelations;
    this.reflexiveRelations = reflexiveRelations;
    this.inheritableProperties = inheritableProperties;
    this.typeMarkers = typeMarkers;
    this.mutuallyExclusive = mutuallyExclusive;
    this.inverseRelations = inverseRelations;
    this.contradictsSameArgs = contradictsSameArgs;
    this.mutuallyExclusiveSources = mutuallyExclusiveSources;
    this.inverseRelationsSources = inverseRelationsSources;
    this.contradictsSameArgsSources = contradictsSameArgsSources;
  }

  clone() {
    return new SemanticIndex({
      relations: new Set(this.relations || []),
      assignmentRelations: new Set(this.assignmentRelations || []),
      transitiveRelations: new Set(this.transitiveRelations || []),
      symmetricRelations: new Set(this.symmetricRelations || []),
      reflexiveRelations: new Set(this.reflexiveRelations || []),
      inheritableProperties: new Set(this.inheritableProperties || []),
      typeMarkers: new Set(this.typeMarkers || []),
      mutuallyExclusive: new Map(this.mutuallyExclusive || []),
      inverseRelations: new Map(this.inverseRelations || []),
      contradictsSameArgs: new Map(
        [...(this.contradictsSameArgs || new Map()).entries()].map(([k, v]) => [k, new Set(v || [])])
      ),
      mutuallyExclusiveSources: new Map(
        [...(this.mutuallyExclusiveSources || new Map()).entries()].map(([k, v]) => [k, new Map(v || [])])
      ),
      inverseRelationsSources: new Map(this.inverseRelationsSources || []),
      contradictsSameArgsSources: new Map(
        [...(this.contradictsSameArgsSources || new Map()).entries()].map(([k, v]) => [k, new Map(v || [])])
      )
    });
  }

  /**
   * Incrementally update this SemanticIndex from a newly asserted KB fact.
   * This enables theory-defined operator properties outside the Kernel pack.
   *
   * Supported declaration shapes (mirroring Kernel pack files):
   * - `@rel:rel __TransitiveRelation` (fact.name supplies the relation token)
   * - `@rel:rel __SymmetricRelation`
   * - `@rel:rel __ReflexiveRelation`
   * - `@prop:prop __InheritableProperty`
   * - `mutuallyExclusive op A B`
   * - `inverseRelation op inv`
   * - `contradictsSameArgs op other`
   *
   * @param {{name?: string|null, metadata?: {operator?: string, args?: any[]}}} fact
   */
  observeFact(fact) {
    const meta = fact?.metadata;
    const operator = meta?.operator;
    if (typeof operator !== 'string') return;

    if (
      operator === '__Relation' ||
      operator === '__AssignmentRelation' ||
      operator === '__TransitiveRelation' ||
      operator === '__SymmetricRelation' ||
      operator === '__ReflexiveRelation' ||
      operator === '__InheritableProperty'
    ) {
      // Prefer `meta.args[0]` when present, because declaration facts are often persisted under
      // a unique label (e.g. `@:isA_transitive __TransitiveRelation isA`) to avoid name collisions.
      const rel = Array.isArray(meta.args) && typeof meta.args[0] === 'string' ? meta.args[0] : fact?.name;
      if (typeof rel !== 'string' || !rel) return;

      if (operator === '__Relation') this.relations.add(rel);
      if (operator === '__AssignmentRelation') this.assignmentRelations.add(rel);
      if (operator === '__TransitiveRelation') this.transitiveRelations.add(rel);
      if (operator === '__SymmetricRelation') this.symmetricRelations.add(rel);
      if (operator === '__ReflexiveRelation') this.reflexiveRelations.add(rel);
      if (operator === '__InheritableProperty') this.inheritableProperties.add(rel);
      return;
    }

    if (operator === 'mutuallyExclusive' && Array.isArray(meta.args) && meta.args.length === 3) {
      const [op, a, b] = meta.args;
      if (typeof op !== 'string' || typeof a !== 'string' || typeof b !== 'string') return;
      if (!this.mutuallyExclusive.has(op)) this.mutuallyExclusive.set(op, []);
      this.mutuallyExclusive.get(op).push([a, b]);
      return;
    }

    if (operator === 'inverseRelation' && Array.isArray(meta.args) && meta.args.length === 2) {
      const [op, inv] = meta.args;
      if (typeof op !== 'string' || typeof inv !== 'string') return;
      this.inverseRelations.set(op, inv);
      // Treat as symmetric by default: inverseRelation A B implies inverseRelation B A.
      // (Core expresses both directions explicitly; user theories often won't.)
      if (!this.inverseRelations.has(inv)) {
        this.inverseRelations.set(inv, op);
      }
      return;
    }

    if (operator === 'contradictsSameArgs' && Array.isArray(meta.args) && meta.args.length === 2) {
      const [a, b] = meta.args;
      if (typeof a !== 'string' || typeof b !== 'string') return;

      const add = (x, y) => {
        if (!this.contradictsSameArgs.has(x)) this.contradictsSameArgs.set(x, new Set());
        this.contradictsSameArgs.get(x).add(y);
      };
      add(a, b);
      add(b, a);
    }
  }

  isTransitive(name) {
    return this.transitiveRelations.has(name);
  }

  isRelation(name) {
    return this.relations.has(name);
  }

  isAssignmentRelation(name) {
    return this.assignmentRelations.has(name);
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

  isTypeMarker(name) {
    return this.typeMarkers.has(name);
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

  getMutuallyExclusiveSource(operator, a, b) {
    const byOp = this.mutuallyExclusiveSources.get(operator);
    if (!byOp) return null;
    return byOp.get(`${a}\u001f${b}`) || null;
  }

  getInverseRelationSource(operator) {
    return this.inverseRelationsSources.get(operator) || null;
  }

  getContradictsSameArgsSource(operator, otherOp) {
    const byOp = this.contradictsSameArgsSources.get(operator);
    if (!byOp) return null;
    return byOp.get(otherOp) || null;
  }

  static fromCoreRelationsFile({ allowFallbackDefaults = true } = {}) {
    const defaults = new SemanticIndex({
      relations: new Set(),
      assignmentRelations: new Set(),
      transitiveRelations: new Set([
        'isA',
        'locatedIn',
        'partOf',
        'subclassOf',
        'subsetOf',
        'containedIn',
        'before',
        'after',
        'causes',
        'appealsTo',
        'leadsTo',
        'enables'
      ]),
      symmetricRelations: new Set(['conflictsWith']),
      reflexiveRelations: new Set(['equals', 'sameAs']),
      inheritableProperties: new Set([
        'hasProperty',
        'hasAbility',
        'hasState',
        'causes',
        'prevents',
        'enables',
        'requires',
        'must',
        'should',
        'may'
      ]),
      typeMarkers: new Set(),
      mutuallyExclusive: new Map(),
      inverseRelations: new Map(),
      contradictsSameArgs: new Map(),
      mutuallyExclusiveSources: new Map(),
      inverseRelationsSources: new Map(),
      contradictsSameArgsSources: new Map()
    });

    const configPath = resolveKernelFilePath('00-relations.sys2');
    if (!configPath || !existsSync(configPath)) {
      return allowFallbackDefaults ? defaults : new SemanticIndex();
    }

    const content = readFileSync(configPath, 'utf-8');
    const relations = parsePropertyLines(content, '__Relation');
    const transitiveRelations = parsePropertyLines(content, '__TransitiveRelation');
    const symmetricRelations = parsePropertyLines(content, '__SymmetricRelation');
    const reflexiveRelations = parsePropertyLines(content, '__ReflexiveRelation');
    const inheritableProperties = parsePropertyLines(content, '__InheritableProperty');
    const assignmentRelations = parsePropertyLines(content, '__AssignmentRelation');

    const idx = new SemanticIndex({
      relations,
      assignmentRelations,
      transitiveRelations,
      symmetricRelations,
      reflexiveRelations,
      inheritableProperties,
      typeMarkers: new Set(),
      mutuallyExclusive: new Map(),
      inverseRelations: new Map(),
      contradictsSameArgs: new Map(),
      mutuallyExclusiveSources: new Map(),
      inverseRelationsSources: new Map(),
      contradictsSameArgsSources: new Map()
    });

    if (!allowFallbackDefaults) return idx;

    // Fill gaps to preserve existing behavior if the config file is partial.
    for (const name of defaults.relations) idx.relations.add(name);
    for (const name of defaults.assignmentRelations) idx.assignmentRelations.add(name);
    for (const name of defaults.transitiveRelations) idx.transitiveRelations.add(name);
    for (const name of defaults.symmetricRelations) idx.symmetricRelations.add(name);
    for (const name of defaults.reflexiveRelations) idx.reflexiveRelations.add(name);
    for (const name of defaults.inheritableProperties) idx.inheritableProperties.add(name);

    return idx;
  }

  static withCoreTypes(baseIndex, { allowFallbackDefaults = true } = {}) {
    const configPath = resolveKernelFilePath('00-types.sys2');
    if (!configPath || !existsSync(configPath)) return baseIndex;

    const content = readFileSync(configPath, 'utf-8');
    const markers = parseTypeMarkers(content);

    const merged = new SemanticIndex({
      relations: new Set(baseIndex.relations || []),
      assignmentRelations: new Set(baseIndex.assignmentRelations || []),
      transitiveRelations: new Set(baseIndex.transitiveRelations),
      symmetricRelations: new Set(baseIndex.symmetricRelations),
      reflexiveRelations: new Set(baseIndex.reflexiveRelations),
      inheritableProperties: new Set(baseIndex.inheritableProperties),
      typeMarkers: new Set(baseIndex.typeMarkers || []),
      mutuallyExclusive: new Map(baseIndex.mutuallyExclusive),
      inverseRelations: new Map(baseIndex.inverseRelations),
      contradictsSameArgs: new Map(baseIndex.contradictsSameArgs),
      mutuallyExclusiveSources: new Map(baseIndex.mutuallyExclusiveSources || []),
      inverseRelationsSources: new Map(baseIndex.inverseRelationsSources || []),
      contradictsSameArgsSources: new Map(baseIndex.contradictsSameArgsSources || [])
    });

    for (const m of markers) merged.typeMarkers.add(m);
    if (!allowFallbackDefaults) return merged;
    return merged;
  }

  static withCoreConstraints(baseIndex, { allowFallbackDefaults = true } = {}) {
    const configPath = resolveKernelFilePath('14-constraints.sys2');
    if (!configPath || !existsSync(configPath)) {
      return baseIndex;
    }

    const content = readFileSync(configPath, 'utf-8');
    const file = 'config/Packs/Consistency/14-constraints.sys2';
    const mutuallyExclusive = parseMutuallyExclusive(content);
    const inverseRelations = parseInverseRelations(content);
    const contradictsSameArgs = parseContradictsSameArgs(content);

    // Merge into baseIndex (copy-on-write).
    const merged = new SemanticIndex({
      relations: new Set(baseIndex.relations || []),
      assignmentRelations: new Set(baseIndex.assignmentRelations || []),
      transitiveRelations: new Set(baseIndex.transitiveRelations),
      symmetricRelations: new Set(baseIndex.symmetricRelations),
      reflexiveRelations: new Set(baseIndex.reflexiveRelations),
      inheritableProperties: new Set(baseIndex.inheritableProperties),
      typeMarkers: new Set(baseIndex.typeMarkers || []),
      mutuallyExclusive: new Map(baseIndex.mutuallyExclusive),
      inverseRelations: new Map(baseIndex.inverseRelations),
      contradictsSameArgs: new Map(baseIndex.contradictsSameArgs),
      mutuallyExclusiveSources: new Map(baseIndex.mutuallyExclusiveSources || []),
      inverseRelationsSources: new Map(baseIndex.inverseRelationsSources || []),
      contradictsSameArgsSources: new Map(baseIndex.contradictsSameArgsSources || [])
    });

    for (const [op, pairs] of mutuallyExclusive.map.entries()) {
      const existing = merged.mutuallyExclusive.get(op) || [];
      merged.mutuallyExclusive.set(op, [...existing, ...pairs]);
      const existingSrc = merged.mutuallyExclusiveSources.get(op) || new Map();
      const src = mutuallyExclusive.sources.get(op);
      if (src) {
        for (const [k, v] of src.entries()) {
          existingSrc.set(k, { ...v, file });
        }
      }
      merged.mutuallyExclusiveSources.set(op, existingSrc);
    }

    for (const [op, inv] of inverseRelations.map.entries()) {
      merged.inverseRelations.set(op, inv);
      const src = inverseRelations.sources.get(op);
      if (src) merged.inverseRelationsSources.set(op, { ...src, file });
    }

    for (const [op, others] of contradictsSameArgs.map.entries()) {
      const existing = merged.contradictsSameArgs.get(op) || new Set();
      for (const other of others) existing.add(other);
      merged.contradictsSameArgs.set(op, existing);

      const existingSrc = merged.contradictsSameArgsSources.get(op) || new Map();
      const src = contradictsSameArgs.sources.get(op);
      if (src) {
        for (const [other, meta] of src.entries()) {
          existingSrc.set(other, { ...meta, file });
        }
      }
      merged.contradictsSameArgsSources.set(op, existingSrc);
    }

    if (!allowFallbackDefaults) return merged;
    return merged;
  }
}

const STRICT_BASE = SemanticIndex.fromCoreRelationsFile({ allowFallbackDefaults: false });
const STRICT_WITH_TYPES = SemanticIndex.withCoreTypes(STRICT_BASE, { allowFallbackDefaults: false });
export const DEFAULT_SEMANTIC_INDEX = SemanticIndex.withCoreConstraints(STRICT_WITH_TYPES, {
  allowFallbackDefaults: false
});

const FALLBACK_BASE = SemanticIndex.fromCoreRelationsFile({ allowFallbackDefaults: true });
const FALLBACK_WITH_TYPES = SemanticIndex.withCoreTypes(FALLBACK_BASE, { allowFallbackDefaults: true });
export const FALLBACK_SEMANTIC_INDEX = SemanticIndex.withCoreConstraints(FALLBACK_WITH_TYPES, {
  allowFallbackDefaults: true
});
