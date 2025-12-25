/**
 * AGISystem2 - HDC Query Operations
 * @module reasoning/query-hdc
 *
 * HDC Master Equation search: Answer = KB ⊕ Query⁻¹
 * True holographic computing for pattern matching.
 */

import { bind, unbind, bundle, topKSimilar } from '../core/operations.mjs';
import { getPositionVector } from '../core/position.mjs';
import { getThresholds } from '../core/constants.mjs';
import { debug_trace } from '../utils/debug.js';
import { ProofEngine } from './prove.mjs';
import { Statement, Identifier } from '../parser/ast.mjs';

function dbg(category, ...args) {
  debug_trace(`[QueryHDC:${category}]`, ...args);
}

/**
 * Core reserved words to filter from HDC results.
 *
 * NOTE: This list should ONLY contain logical operators and DSL keywords.
 * Domain-specific terms (like 'GoodDriver', 'Passport', etc.) should NOT
 * be here - HDC candidate validation via verifyHDCCandidate() handles
 * filtering test-specific noise properly.
 */
export const RESERVED = new Set([
  // Logical operators
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
  'True', 'False',

  // DSL relation operators (these are predicates, not entities)
  'can', 'cannot', 'must', 'has', 'isA',
  'hasProperty', 'locatedIn', 'partOf', 'before', 'after',
  'causes', 'enables', 'prevents', 'conflictsWith',

  // Internal markers
  '__Relation', '__Role', '__TransitiveRelation', '__SymmetricRelation'
]);

const RESERVED_CACHE = new WeakMap();

function getReserved(session) {
  if (!session || typeof session !== 'object') return RESERVED;
  if (!session.useTheoryReserved) return RESERVED;
  const cached = RESERVED_CACHE.get(session);
  if (cached) return cached;

  const set = new Set(RESERVED);

  // Session-reserved operator tokens (DSL keywords/macros).
  for (const op of session.operators?.keys?.() || []) {
    set.add(op);
  }

  // Theory-derived relation/property tokens (mostly lower-case; still useful for safety).
  if (session.useSemanticIndex) {
    const idx = session.semanticIndex;
    for (const op of idx?.transitiveRelations || []) set.add(op);
    for (const op of idx?.symmetricRelations || []) set.add(op);
    for (const op of idx?.reflexiveRelations || []) set.add(op);
    for (const op of idx?.inheritableProperties || []) set.add(op);
  }

  RESERVED_CACHE.set(session, set);
  return set;
}

/**
 * Check if a name is a valid entity (not reserved/internal)
 */
export function isValidEntity(name, session) {
  if (!name || typeof name !== 'string') return false;
  if (name.startsWith('_') || name.startsWith('?')) return false;
  if (name.startsWith('$') || name.startsWith('@')) return false;
  if (name.match(/^[a-z]+$/)) return false; // lowercase only = operator
  if (getReserved(session).has(name)) return false;
  return true;
}

/**
 * Verify HDC candidate can be proved or exists in KB
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Operator
 * @param {Array} knowns - Known arguments
 * @param {string} candidate - Candidate value
 * @param {number} holeIndex - Hole position (1-based)
 * @returns {boolean} True if verifiable
 */
function canonicalizeToken(session, name) {
  if (!session?.canonicalizationEnabled) return name;
  const kb = session.componentKB;
  if (!kb || typeof kb.canonicalizeName !== 'function') return name;
  return kb.canonicalizeName(name);
}

function buildGoalStatement(operatorName, args) {
  const operator = new Identifier(operatorName, 1, 1);
  const exprs = args.map(arg => new Identifier(arg, 1, 1));
  return new Statement(null, operator, exprs, 1, 1);
}

export function verifyHDCCandidate(session, operatorName, knowns, candidate, holeIndex, options = {}) {
  const cache = options.cache;
  const cacheKey = cache
    ? `${operatorName}|${holeIndex}|${candidate}|${knowns.map(k => `${k.index}:${k.name}`).join(',')}`
    : null;
  if (cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);

  const normalizedOperator = canonicalizeToken(session, operatorName);
  const normalizedCandidate = canonicalizeToken(session, candidate);
  const normalizedKnowns = knowns.map(known => ({
    ...known,
    name: canonicalizeToken(session, known.name)
  }));

  // Build args array with candidate in hole position
  const args = [];
  const totalArgs = Math.max(holeIndex, ...normalizedKnowns.map(k => k.index));

  for (let i = 1; i <= totalArgs; i++) {
    if (i === holeIndex) {
      args.push(normalizedCandidate);
    } else {
      const known = normalizedKnowns.find(k => k.index === i);
      args.push(known?.name || null);
    }
  }

  // Check if this exact fact exists in KB
  for (const fact of session.kbFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact.metadata;
    if (!meta || meta.operator !== normalizedOperator) continue;
    if (!meta.args || meta.args.length !== args.length) continue;

    let match = true;
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== null && meta.args[i] !== args[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (cacheKey) cache.set(cacheKey, true);
      return true;
    }
  }

  if (args.some(arg => arg === null)) {
    if (cacheKey) cache.set(cacheKey, false);
    return false;
  }

  const engine = options.validator || new ProofEngine(session);
  const goalStatement = buildGoalStatement(normalizedOperator, args);
  const proofResult = engine.prove(goalStatement);
  const ok = !!proofResult?.valid;
  if (cacheKey) cache.set(cacheKey, ok);
  return ok;
}

/**
 * HDC Master Equation search: Answer = KB ⊕ Query⁻¹
 * Results are filtered and verified.
 * @param {Session} session - Session with KB and vocabulary
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments with positions
 * @param {Array} holes - Holes with positions
 * @param {Vector} operatorVec - Operator vector
 * @param {Object} options - Additional options
 * @returns {Array} Matching results with bindings
 */
export function searchHDC(session, operatorName, knowns, holes, operatorVec, options = {}) {
  const results = [];
  const thresholds = getThresholds(session.hdcStrategy || 'dense-binary');

  if (session.kbFacts.length === 0) return results;

  // Build partial vector (everything except holes)
  let partial = operatorVec;
  for (const known of knowns) {
    const posVec = getPositionVector(known.index, session.geometry, session.hdcStrategy);
    partial = bind(partial, bind(known.vector, posVec));
  }

  // Check if level-progressive search is enabled
  const componentKB = session.componentKB;
  const useLevelSearch = options.useLevelOptimization ??
    (componentKB?.useLevelOptimization && session.useLevelOptimization !== false);

  let kbBundle;

  if (useLevelSearch && componentKB) {
    // Level-progressive search: try lower levels first for early termination
    const levelResults = searchHDCByLevel(session, operatorName, knowns, holes, operatorVec, partial, thresholds);
    if (levelResults.length > 0) {
      return levelResults;
    }
    // Fallback to full bundle if level search didn't find results
    kbBundle = componentKB.getCumulativeBundle(componentKB.getMaxLevel());
  }

  if (!kbBundle) {
    // Bundle all KB facts into single KB vector
    const factVectors = session.kbFacts.map(f => f.vector).filter(v => v);
    if (factVectors.length === 0) return results;
    kbBundle = bundle(factVectors);
  }

  // Master Equation: Answer = KB ⊕ Query⁻¹ (for XOR: unbind = bind)
  const answer = unbind(kbBundle, partial);

  // For single hole - extract directly
  if (holes.length === 1) {
    const hole = holes[0];
    const posVec = getPositionVector(hole.index, session.geometry, session.hdcStrategy);
    const candidate = unbind(answer, posVec);

    // Find top K matches in vocabulary
      const matches = topKSimilar(candidate, session.vocabulary.atoms, 15, session);

    const validator = new ProofEngine(session);
    const validationCache = new Map();

    for (const match of matches) {
      // Use strategy-dependent threshold, filter invalid entities, and verify candidate
      if (match.similarity > thresholds.HDC_MATCH && isValidEntity(match.name, session)) {
        // Verify the candidate actually makes sense
        if (!verifyHDCCandidate(session, operatorName, knowns, match.name, hole.index, {
          validator,
          cache: validationCache
        })) {
          dbg('HDC', `Rejecting unverifiable candidate: ${match.name}`);
          continue;
        }

        const factBindings = new Map();
        factBindings.set(hole.name, {
          answer: match.name,
          similarity: match.similarity,
          method: 'hdc'
        });

        results.push({
          bindings: factBindings,
          score: match.similarity,
          method: 'hdc'
        });
      }
    }
  }

  // For multiple holes - extract each
  if (holes.length >= 2) {
    // For each combination of top candidates per hole
    const holeCandidates = [];
    for (const hole of holes) {
      const posVec = getPositionVector(hole.index, session.geometry, session.hdcStrategy);
      const candidate = unbind(answer, posVec);
      const matches = topKSimilar(candidate, session.vocabulary.atoms, 5, session);
      holeCandidates.push({
        hole,
        matches: matches.filter(m => m.similarity > thresholds.VERIFICATION)
      });
    }

    // Generate combinations (limit to avoid explosion)
    const combinations = generateCombinations(holeCandidates, 20);
    for (const combo of combinations) {
      const factBindings = new Map();
      let totalScore = 0;
      let validCombo = true;

      for (const { hole, match } of combo) {
        if (!match) {
          validCombo = false;
          break;
        }
        factBindings.set(hole.name, {
          answer: match.name,
          similarity: match.similarity,
          method: 'hdc'
        });
        totalScore += match.similarity;
      }

      if (validCombo) {
        results.push({
          bindings: factBindings,
          score: totalScore / combo.length,
          method: 'hdc'
        });
      }
    }
  }

  return results;
}

/**
 * Generate limited combinations of candidates for multiple holes
 */
export function generateCombinations(holeCandidates, limit) {
  if (holeCandidates.length === 0) return [];
  if (holeCandidates.length === 1) {
    return holeCandidates[0].matches.slice(0, limit).map(m => [
      { hole: holeCandidates[0].hole, match: m }
    ]);
  }

  const combinations = [];
  const first = holeCandidates[0];
  const rest = holeCandidates.slice(1);
  const restCombos = generateCombinations(rest, Math.ceil(limit / Math.max(1, first.matches.length)));

  for (const match of first.matches.slice(0, 5)) {
    for (const restCombo of restCombos) {
      if (combinations.length >= limit) break;
      combinations.push([{ hole: first.hole, match }, ...restCombo]);
    }
    if (combinations.length >= limit) break;
  }

  return combinations;
}

/**
 * Level-progressive HDC search
 * Searches level by level, starting from lowest, with early termination
 * on high-confidence matches.
 *
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Query operator name
 * @param {Array} knowns - Known arguments
 * @param {Array} holes - Holes with positions
 * @param {Vector} operatorVec - Operator vector
 * @param {Vector} partial - Pre-computed partial query vector
 * @param {Object} thresholds - HDC thresholds
 * @returns {Array} Matching results
 */
export function searchHDCByLevel(session, operatorName, knowns, holes, operatorVec, partial, thresholds) {
  const componentKB = session.componentKB;
  if (!componentKB) return [];

  const maxLevel = componentKB.getMaxLevel();
  const results = [];

  // High confidence threshold for early termination
  const HIGH_CONFIDENCE = thresholds.HDC_MATCH_HIGH ?? (thresholds.HDC_MATCH * 1.2);

  // Single hole optimization
  if (holes.length === 1) {
    const hole = holes[0];
    const posVec = getPositionVector(hole.index, session.geometry, session.hdcStrategy);
    const validator = new ProofEngine(session);
    const validationCache = new Map();

    // Search level by level
    for (let level = 0; level <= maxLevel; level++) {
      const levelBundle = componentKB.getCumulativeBundle(level);
      if (!levelBundle) continue;

      const answer = unbind(levelBundle, partial);
      const candidate = unbind(answer, posVec);
      const matches = topKSimilar(candidate, session.vocabulary.atoms, 10, session);

      for (const match of matches) {
        if (match.similarity <= thresholds.HDC_MATCH) continue;
        if (!isValidEntity(match.name, session)) continue;

        // Verify candidate
        if (!verifyHDCCandidate(session, operatorName, knowns, match.name, hole.index, {
          validator,
          cache: validationCache
        })) {
          continue;
        }

        const factBindings = new Map();
        factBindings.set(hole.name, {
          answer: match.name,
          similarity: match.similarity,
          method: 'hdc_level',
          level
        });

        results.push({
          bindings: factBindings,
          score: match.similarity,
          method: 'hdc_level',
          level
        });

        // Early termination on high confidence
        if (match.similarity >= HIGH_CONFIDENCE) {
          dbg('HDC_LEVEL', `Early termination at level ${level} with confidence ${match.similarity}`);
          return results;
        }
      }

      // If we found good results at this level, return them
      if (results.length > 0 && results[0].score >= thresholds.HDC_MATCH * 1.1) {
        dbg('HDC_LEVEL', `Found ${results.length} results at level ${level}`);
        return results;
      }
    }
  }

  // Multi-hole: use cumulative bundle approach
  if (holes.length >= 2 && results.length === 0) {
    for (let level = 0; level <= maxLevel; level++) {
      const levelBundle = componentKB.getCumulativeBundle(level);
      if (!levelBundle) continue;

      const answer = unbind(levelBundle, partial);
      const holeCandidates = [];

      for (const hole of holes) {
        const posVec = getPositionVector(hole.index, session.geometry, session.hdcStrategy);
        const candidate = unbind(answer, posVec);
        const matches = topKSimilar(candidate, session.vocabulary.atoms, 5, session);
        holeCandidates.push({
          hole,
          matches: matches.filter(m => m.similarity > thresholds.VERIFICATION)
        });
      }

      const combinations = generateCombinations(holeCandidates, 15);
      for (const combo of combinations) {
        const factBindings = new Map();
        let totalScore = 0;
        let validCombo = true;

        for (const { hole, match } of combo) {
          if (!match) {
            validCombo = false;
            break;
          }
          factBindings.set(hole.name, {
            answer: match.name,
            similarity: match.similarity,
            method: 'hdc_level',
            level
          });
          totalScore += match.similarity;
        }

        if (validCombo) {
          results.push({
            bindings: factBindings,
            score: totalScore / combo.length,
            method: 'hdc_level',
            level
          });
        }
      }

      // Early termination for multi-hole
      if (results.length > 0 && results[0].score >= thresholds.HDC_MATCH) {
        return results;
      }
    }
  }

  return results;
}

/**
 * Estimate query level for search optimization
 * @param {Session} session - Session
 * @param {string} operatorName - Operator
 * @param {Array} knowns - Known arguments
 * @returns {number} Estimated query level
 */
export function estimateQueryLevel(session, operatorName, knowns) {
  const componentKB = session.componentKB;
  if (!componentKB) return Infinity;

  let maxLevel = componentKB.getConceptLevel(operatorName);

  for (const known of knowns) {
    const level = componentKB.getConceptLevel(known.name);
    maxLevel = Math.max(maxLevel, level);
  }

  return maxLevel + 1;
}
