/**
 * ResponseAnalyzer - Analyze and compare evaluation responses
 *
 * IMPORTANT: Responses are now POINTS (DSL format), not JSON!
 * Points are semantic triples: @varName subject RELATION object
 *
 * This module:
 * - Parses DSL points from responses
 * - Compares points against expected queries
 * - Validates proof results
 *
 * @module evalsuite/lib/evaluators/response_analyzer
 */

/**
 * Parse a DSL point from response
 *
 * Supports two formats:
 * - Classic: @varName subject RELATION object
 * - With truth: @varName subject RELATION object [truth:VALUE]
 *
 * @param {string} response - Response string (DSL point format)
 * @returns {Object} Parsed point { found, variable, subject, relation, object, truth, raw }
 */
function parsePoint(response) {
  const result = {
    found: false,
    variable: null,
    subject: null,
    relation: null,
    object: null,
    truth: null,
    raw: response
  };

  if (!response || typeof response !== 'string') {
    return result;
  }

  const trimmed = response.trim();

  // Pattern with truth: @varName subject RELATION object [truth:VALUE]
  const truthMatch = trimmed.match(/^@(\w+)\s+(\S+)\s+(\w+)\s+(\S+)\s+\[truth:(\w+)\]$/);
  if (truthMatch) {
    result.found = true;
    result.variable = truthMatch[1];
    result.subject = truthMatch[2];
    result.relation = truthMatch[3];
    result.object = truthMatch[4];
    result.truth = truthMatch[5];
    return result;
  }

  // Pattern: @varName subject RELATION object (classic, no truth)
  const pointMatch = trimmed.match(/^@(\w+)\s+(\S+)\s+(\w+)\s+(\S+)$/);
  if (pointMatch) {
    result.found = true;
    result.variable = pointMatch[1];
    result.subject = pointMatch[2];
    result.relation = pointMatch[3];
    result.object = pointMatch[4];
    return result;
  }

  // Try multiline - take first valid point
  const lines = trimmed.split('\n');
  for (const line of lines) {
    // Try with truth first
    const lineTruthMatch = line.trim().match(/^@(\w+)\s+(\S+)\s+(\w+)\s+(\S+)\s+\[truth:(\w+)\]$/);
    if (lineTruthMatch) {
      result.found = true;
      result.variable = lineTruthMatch[1];
      result.subject = lineTruthMatch[2];
      result.relation = lineTruthMatch[3];
      result.object = lineTruthMatch[4];
      result.truth = lineTruthMatch[5];
      return result;
    }

    // Then try classic
    const lineMatch = line.trim().match(/^@(\w+)\s+(\S+)\s+(\w+)\s+(\S+)$/);
    if (lineMatch) {
      result.found = true;
      result.variable = lineMatch[1];
      result.subject = lineMatch[2];
      result.relation = lineMatch[3];
      result.object = lineMatch[4];
      return result;
    }
  }

  return result;
}

/**
 * Parse expected DSL query
 *
 * @param {string} taskDSL - Expected task DSL (e.g., "@q1 Fido IS_A living_thing")
 * @returns {Object} Parsed query { variable, subject, relation, object }
 */
function parseExpectedQuery(taskDSL) {
  const result = {
    found: false,
    variable: null,
    subject: null,
    relation: null,
    object: null
  };

  if (!taskDSL) return result;

  const match = taskDSL.trim().match(/^@(\w+)\s+(\S+)\s+(\w+)\s+(\S+)$/);
  if (match) {
    result.found = true;
    result.variable = match[1];
    result.subject = match[2];
    result.relation = match[3];
    result.object = match[4];
  }

  return result;
}

/**
 * Compare a response point against expected query
 *
 * @param {string} response - Response point (DSL format)
 * @param {string} expectedDSL - Expected query DSL
 * @returns {Object} Comparison result { match, matchType, details }
 */
function comparePoints(response, expectedDSL) {
  const responsePoint = parsePoint(response);
  const expectedPoint = parseExpectedQuery(expectedDSL);

  if (!responsePoint.found) {
    return {
      match: false,
      matchType: 'no_response_point',
      details: 'Response is not a valid DSL point'
    };
  }

  if (!expectedPoint.found) {
    return {
      match: false,
      matchType: 'no_expected_point',
      details: 'Expected DSL is not a valid point'
    };
  }

  // Exact match (subject, relation, object)
  if (responsePoint.subject === expectedPoint.subject &&
      responsePoint.relation === expectedPoint.relation &&
      responsePoint.object === expectedPoint.object) {
    return {
      match: true,
      matchType: 'exact',
      details: 'Exact triple match'
    };
  }

  // Relation match (same relation, possibly different subject/object)
  if (responsePoint.relation === expectedPoint.relation) {
    // Check if subjects match (allowing for references)
    const subjectMatch = compareValues(responsePoint.subject, expectedPoint.subject);
    const objectMatch = compareValues(responsePoint.object, expectedPoint.object);

    if (subjectMatch && objectMatch) {
      return {
        match: true,
        matchType: 'semantic',
        details: 'Semantic match (values equivalent)'
      };
    }

    return {
      match: false,
      matchType: 'partial_relation',
      details: `Same relation ${responsePoint.relation}, but different subject/object`
    };
  }

  return {
    match: false,
    matchType: 'none',
    details: `No match: expected ${expectedPoint.relation}, got ${responsePoint.relation}`
  };
}

/**
 * Compare two values (handles references and normalization)
 *
 * @param {string} val1 - First value
 * @param {string} val2 - Second value
 * @returns {boolean} Whether values match
 */
function compareValues(val1, val2) {
  if (val1 === val2) return true;

  // Normalize: remove $ prefix for references
  const norm1 = val1.startsWith('$') ? val1.slice(1) : val1;
  const norm2 = val2.startsWith('$') ? val2.slice(1) : val2;

  if (norm1 === norm2) return true;

  // Case insensitive
  if (norm1.toLowerCase() === norm2.toLowerCase()) return true;

  return false;
}

/**
 * Analyze if response matches expected answer
 * Updated to work with DSL points with truth values
 *
 * @param {string} response - Actual response (DSL point with truth)
 * @param {Object} expected - Expected answer object
 * @returns {Object} Analysis result with passed, reason, matchType, truth
 */
function analyzeResponse(response, expected) {
  // First, check if response is a DSL point
  const point = parsePoint(response);

  if (point.found) {
    // Check if point has truth value
    const truth = point.truth || null;
    const expectedTruth = expected.truth || 'TRUE_CERTAIN';

    // Response is a valid point - compare with expected DSL
    const expectedDSL = expected.expected_dsl || expected.dsl;
    if (expectedDSL) {
      const comparison = comparePoints(response, expectedDSL);

      // If triple matches, also verify truth value matches expected
      if (comparison.match && truth) {
        const truthMatches = compareTruthValues(truth, expectedTruth);
        return {
          passed: truthMatches,
          reason: truthMatches
            ? `Triple match with truth ${truth}`
            : `Triple matches but truth mismatch: expected ${expectedTruth}, got ${truth}`,
          matchType: truthMatches ? 'exact_with_truth' : 'truth_mismatch',
          responsePoint: point,
          truth,
          expectedDSL
        };
      }

      return {
        passed: comparison.match,
        reason: comparison.details,
        matchType: comparison.matchType,
        responsePoint: point,
        truth,
        expectedDSL
      };
    }

    // No expected DSL - use truth value to determine pass/fail
    if (truth) {
      const isPositive = ['TRUE_CERTAIN', 'TRUE_LIKELY', 'TRUE'].includes(truth.toUpperCase());
      const isNegative = ['FALSE', 'IMPOSSIBLE'].includes(truth.toUpperCase());

      if (isPositive) {
        return {
          passed: true,
          reason: `Fact confirmed with truth ${truth}`,
          matchType: 'truth_positive',
          responsePoint: point,
          truth
        };
      }

      if (isNegative) {
        // Negative truth - check if expected truth was also negative
        const expectedNegative = ['FALSE', 'IMPOSSIBLE'].includes(expectedTruth.toUpperCase());
        return {
          passed: expectedNegative,
          reason: expectedNegative
            ? `Negative fact confirmed: ${truth}`
            : `Unexpected negative truth: ${truth}`,
          matchType: expectedNegative ? 'truth_negative_match' : 'truth_negative',
          responsePoint: point,
          truth
        };
      }
    }

    // No expected DSL, check if point indicates success (fallback for old format)
    if (point.relation === 'IS_A') {
      const successTypes = ['direct_fact', 'transitive_chain', 'query_result', 'success'];
      if (successTypes.includes(point.object)) {
        return {
          passed: true,
          reason: `Point indicates ${point.object}`,
          matchType: 'type_success',
          responsePoint: point,
          truth
        };
      }

      const failTypes = ['failure', 'error', 'unresolved', 'execution_error'];
      if (failTypes.includes(point.object)) {
        return {
          passed: false,
          reason: `Point indicates ${point.object}`,
          matchType: 'type_failure',
          responsePoint: point,
          truth
        };
      }
    }

    // Point found with valid triple - pass if we have a reasonable truth
    return {
      passed: truth !== 'UNKNOWN' && truth !== 'FALSE',
      reason: truth ? `Valid point with truth ${truth}` : 'Valid point received',
      matchType: 'point_received',
      responsePoint: point,
      truth
    };
  }

  // Fallback: try legacy JSON parsing for backward compatibility
  return analyzeLegacyResponse(response, expected);
}

/**
 * Compare two truth values for equivalence
 *
 * @param {string} actual - Actual truth value
 * @param {string} expected - Expected truth value
 * @returns {boolean} Whether truth values are equivalent
 */
function compareTruthValues(actual, expected) {
  if (!actual || !expected) return true;  // Missing values don't cause mismatch

  const a = actual.toUpperCase();
  const e = expected.toUpperCase();

  // Exact match
  if (a === e) return true;

  // TRUE and TRUE_CERTAIN are equivalent
  if ((a === 'TRUE' || a === 'TRUE_CERTAIN') && (e === 'TRUE' || e === 'TRUE_CERTAIN')) return true;

  // Positive truths group
  const positives = ['TRUE', 'TRUE_CERTAIN', 'TRUE_LIKELY'];
  if (positives.includes(a) && positives.includes(e)) return true;

  return false;
}

/**
 * Legacy response analysis (for backward compatibility with JSON responses)
 *
 * @param {string} response - Response text
 * @param {Object} expected - Expected answer
 * @returns {Object} Analysis result
 */
function analyzeLegacyResponse(response, expected) {
  const responseLower = (response || '').toLowerCase();
  const expectedLower = (expected.natural_language || '').toLowerCase();
  const expectedTruth = expected.truth;

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(response);
    if (parsed && (parsed.truth || parsed.band)) {
      const actualTruth = normalizeTruth(parsed.truth || parsed.band);
      const expTruth = normalizeTruth(expectedTruth);

      if (actualTruth === expTruth) {
        return {
          passed: true,
          reason: `JSON truth match: ${actualTruth}`,
          matchType: 'legacy_json'
        };
      }

      return {
        passed: false,
        reason: `JSON truth mismatch: expected ${expTruth}, got ${actualTruth}`,
        matchType: 'legacy_json_mismatch'
      };
    }
  } catch (e) {
    // Not JSON, continue with text analysis
  }

  // Text-based analysis (very basic)
  if (detectTruthFromText(response, expectedTruth)) {
    return {
      passed: true,
      reason: `Text indicators match ${expectedTruth}`,
      matchType: 'text_pattern'
    };
  }

  return {
    passed: false,
    reason: 'No valid point or matching pattern found',
    matchType: 'none'
  };
}

/**
 * Normalize truth value for comparison
 *
 * @param {string} truth - Truth value to normalize
 * @returns {string|null} Normalized truth value
 */
function normalizeTruth(truth) {
  if (!truth) return null;
  const t = truth.toUpperCase();
  // TRUE and TRUE_CERTAIN are considered equivalent
  if (t === 'TRUE') return 'TRUE_CERTAIN';
  return t;
}

/**
 * Check if response text indicates a specific truth value
 *
 * @param {string} text - Response text
 * @param {string} expectedTruth - Expected truth value
 * @returns {boolean} Whether text indicates expected truth
 */
function detectTruthFromText(text, expectedTruth) {
  if (!text || !expectedTruth) return false;

  const strongIndicators = {
    'TRUE_CERTAIN': [
      /\byes[,.]?\s/i,
      /\bthat is correct\b/i,
      /\bis true\b/i,
      /\bcan\s+\w+\b/i,
      /\bdoes\s+\w+\b/i
    ],
    'FALSE': [
      /\bno[,.]?\s/i,
      /\bcannot\b/i,
      /\bis not\b/i,
      /\bdoes not\b/i,
      /\bviolates?\b/i
    ],
    'UNKNOWN': [
      /\bunknown\b/i,
      /\buncertain\b/i,
      /\bcannot determine\b/i
    ]
  };

  const indicators = strongIndicators[expectedTruth] || [];
  for (const pattern of indicators) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyze proof execution result
 *
 * @param {Object} proofResult - Result from executeWithProof
 * @param {Object} task - Original task with PROOF_DSL
 * @returns {Object} Analysis result
 */
function analyzeProofResult(proofResult, task) {
  if (!proofResult) {
    return {
      passed: false,
      reason: 'No proof result',
      matchType: 'no_proof'
    };
  }

  if (proofResult.valid) {
    return {
      passed: true,
      reason: 'Proof executed successfully with @result and @proof',
      matchType: 'proof_valid',
      resultPoint: proofResult.proofResult?.result,
      proofPoint: proofResult.proofResult?.proof
    };
  }

  return {
    passed: false,
    reason: `Proof validation failed: ${proofResult.issues.join(', ')}`,
    matchType: 'proof_invalid',
    issues: proofResult.issues
  };
}

/**
 * Parse structured result from debug output (legacy support)
 *
 * @param {string} response - Response text to parse
 * @returns {Object} Parsed result with found, truth, method, confidence
 */
function parseStructuredResult(response) {
  // First try to parse as point
  const point = parsePoint(response);
  if (point.found) {
    return {
      found: true,
      point: point,
      truth: point.object === 'direct_fact' || point.object === 'transitive_chain' ? 'TRUE_CERTAIN' : null
    };
  }

  // Legacy JSON parsing
  const result = {
    found: false,
    truth: null,
    method: null,
    confidence: null
  };

  try {
    const parsed = JSON.parse(response);
    if (parsed && (parsed.truth || parsed.band)) {
      result.found = true;
      result.truth = parsed.truth || parsed.band;
      result.method = parsed.method;
      result.confidence = parsed.confidence;
    }
  } catch (e) {
    // Not JSON
  }

  return result;
}

module.exports = {
  parsePoint,
  parseExpectedQuery,
  comparePoints,
  compareValues,
  compareTruthValues,
  analyzeResponse,
  analyzeProofResult,
  parseStructuredResult,
  normalizeTruth,
  detectTruthFromText
};
