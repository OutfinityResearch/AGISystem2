/**
 * AGISystem2 - Compound Solution Query
 * @module reasoning/query-compound
 *
 * Searches compound CSP solutions using HDC similarity.
 * When CSP problems are solved, solutions are stored as bundled hypervectors.
 * This module extracts matching assignments from those compound vectors.
 *
 * HDC Compound Encoding:
 *   solution_vec = bundle([
 *     bind(seatedAt, pos1(Alice), pos2(T1)),
 *     bind(seatedAt, pos1(Bob), pos2(T2)),
 *     ...
 *   ])
 *
 * Query Process:
 *   1. Build query vector from pattern (e.g., "seatedAt Alice ?table")
 *   2. Calculate similarity with each compound solution
 *   3. Extract matching assignments from high-similarity solutions
 */

import { bind, bindAll, similarity } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { debug_trace } from '../utils/debug.js';

function dbg(...args) {
  debug_trace('[Query:COMPOUND]', ...args);
}

// Minimum similarity for compound solution match (must be very low for sparse strategies)
// Dense-binary typically has similarities 0.5-0.8, sparse-polynomial may be 0.05-0.2
const COMPOUND_THRESHOLD = 0.02;  // Very permissive - metadata extraction is authoritative

// Minimum similarity for verification (informational, not used for rejection)
const VERIFY_THRESHOLD_DENSE = 0.4;
const VERIFY_THRESHOLD_SPARSE = 0.05;

/**
 * Verify that an extracted fact is actually present in a compound solution
 * Uses HDC similarity to double-check against approximation errors.
 *
 * @param {Session} session - Parent session
 * @param {Object} solVector - Compound solution vector
 * @param {string} operatorName - Operator (e.g., "seatedAt")
 * @param {string} entity - Entity name (e.g., "Alice")
 * @param {string} value - Value name (e.g., "T1")
 * @returns {number} Verification similarity score (0 if fails)
 */
function verifyFactInCompound(session, solVector, operatorName, entity, value) {
  const opVec = session.vocabulary.getOrCreate(operatorName);
  const entityVec = session.vocabulary.getOrCreate(entity);
  const valueVec = session.vocabulary.getOrCreate(value);

  // Build the full fact vector: bind(operator, pos1(entity), pos2(value))
  const factVec = bind(bind(opVec, withPosition(1, entityVec)), withPosition(2, valueVec));

  // Check similarity with compound solution
  const sim = similarity(factVec, solVector);

  // Verification is informational only - metadata extraction is authoritative
  // Use a low threshold since sparse vectors may have very different similarity profiles
  const threshold = VERIFY_THRESHOLD_SPARSE; // Use lowest threshold to be permissive
  dbg(`Verify ${operatorName} ${entity} ${value}: similarity=${sim.toFixed(3)} threshold=${threshold}`);

  return sim >= threshold ? sim : 0;
}

/**
 * Search compound CSP solutions for matches
 *
 * @param {Session} session - Parent session
 * @param {string} operatorName - Operator name (e.g., "seatedAt")
 * @param {Array} knowns - Known arguments with vectors
 * @param {Array} holes - Holes to fill
 * @returns {Array} Matching results with bindings
 */
export function searchCompoundSolutions(session, operatorName, knowns, holes) {
  const results = [];

  // Find all compound CSP solutions in KB
  const compoundSolutions = session.kbFacts.filter(
    f => f.metadata?.operator === 'cspSolution'
  );

  if (compoundSolutions.length === 0) {
    dbg('No compound solutions in KB');
    return results;
  }

  dbg(`Found ${compoundSolutions.length} compound solutions`);

  // Build query vector from operator and known arguments
  const opVec = session.vocabulary.getOrCreate(operatorName);
  let queryVec = opVec;

  for (const known of knowns) {
    queryVec = bind(queryVec, withPosition(known.index, known.vector));
  }

  // Search each compound solution
  for (const sol of compoundSolutions) {
    const sim = similarity(queryVec, sol.vector);

    if (sim < COMPOUND_THRESHOLD) {
      continue;
    }

    dbg(`Solution ${sol.name} similarity: ${sim.toFixed(3)}`);

    // Extract assignments that match the pattern
    const assignments = sol.metadata?.assignments || [];
    const facts = sol.metadata?.facts || [];

    // For each assignment in this solution, check if it matches our query
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const fact = facts[i]; // "seatedAt Alice T1"

      // Parse the fact to check operator match
      const factParts = fact?.split(/\s+/) || [];
      if (factParts[0] !== operatorName) {
        continue;
      }

      // Check if knowns match
      let matches = true;
      for (const known of knowns) {
        const factArg = factParts[known.index];
        if (factArg !== known.name) {
          matches = false;
          break;
        }
      }

      if (!matches) {
        continue;
      }

      // Build bindings for holes
      const bindings = new Map();
      for (const hole of holes) {
        const holeValue = factParts[hole.index];
        if (holeValue) {
          const holeVec = session.vocabulary.getOrCreate(holeValue);
          bindings.set(hole.name, {
            answer: holeValue,
            vector: holeVec,
            similarity: sim,
            method: 'compound_csp',
            source: sol.name
          });
        }
      }

      // Only add if we have bindings for all holes
      if (bindings.size === holes.length) {
        // Since we extract from metadata (symbolic), the facts are guaranteed correct.
        // HDC verification is optional - we trust metadata over vector approximation.
        const entity = factParts[1];
        const value = factParts[2];

        // Try verification but don't reject if it fails (metadata is source of truth)
        const verifySim = verifyFactInCompound(session, sol.vector, operatorName, entity, value);
        const finalScore = verifySim > 0 ? verifySim : sim; // Use verified or initial similarity

        results.push({
          bindings,
          score: finalScore,
          method: 'compound_csp',
          source: sol.name,
          solutionFacts: facts,
          verified: verifySim > 0  // True if HDC verification passed
        });
      }
    }
  }

  // Deduplicate by binding values
  const seen = new Set();
  const uniqueResults = [];
  for (const r of results) {
    const key = [...r.bindings.values()].map(b => b.answer).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }

  dbg(`Returning ${uniqueResults.length} unique compound matches`);
  return uniqueResults;
}

/**
 * Decode compound vector to extract individual facts
 * Uses HDC unbind operation to extract arguments.
 *
 * @param {Session} session - Parent session
 * @param {Vector} compoundVec - Compound solution vector
 * @param {string} operatorName - Expected operator
 * @returns {Array} Extracted facts with confidence scores
 */
export function decodeCompoundSolution(session, compoundVec, operatorName) {
  const extracted = [];
  const opVec = session.vocabulary.getOrCreate(operatorName);

  // Unbind operator to get remainder
  const remainder = bind(compoundVec, opVec); // bind is self-inverse

  // Try to match each entity in vocabulary at position 1
  for (const [entityName, entityVec] of session.vocabulary.entries()) {
    const pos1Vec = withPosition(1, entityVec);
    const afterPos1 = bind(remainder, pos1Vec);

    // Try to match each value in vocabulary at position 2
    for (const [valueName, valueVec] of session.vocabulary.entries()) {
      if (valueName === entityName) continue;

      const pos2Vec = withPosition(2, valueVec);

      // Calculate similarity of full unbind
      const fullUnbind = bind(afterPos1, pos2Vec);
      const sim = similarity(fullUnbind, session.kb || compoundVec);

      if (sim > 0.4) {
        extracted.push({
          operator: operatorName,
          entity: entityName,
          value: valueName,
          confidence: sim,
          fact: `${operatorName} ${entityName} ${valueName}`
        });
      }
    }
  }

  // Sort by confidence
  extracted.sort((a, b) => b.confidence - a.confidence);

  return extracted;
}

export default { searchCompoundSolutions, decodeCompoundSolution };
