/**
 * ValidationEngine - Formal verification and consistency checking for geometric reasoning
 *
 * Provides:
 * - Consistency checking for concepts and theory stacks
 * - Inclusion proofs (point-in-diamond tests)
 * - Abstract query execution with constraint propagation
 * - Counterexample generation for falsification
 * - Theory stack integration for layered validation
 *
 * All methods return structured results with detailed diagnostics.
 */
class ValidationEngine {
  constructor({ stack, store, math, bias, config, audit }) {
    this.stack = stack;
    this.store = store;
    this.math = math;
    this.bias = bias;
    this.config = config;
    this.audit = audit;

    // Configuration
    this.dimensions = config ? config.get('dimensions') : 128;

    // Validation statistics
    this._stats = {
      consistencyChecks: 0,
      inclusionProofs: 0,
      abstractQueries: 0,
      counterexamplesFound: 0
    };
  }

  /**
   * Check consistency of a concept's diamonds
   * Validates that all diamonds have valid bounds (min <= max)
   *
   * @param {string} conceptId - Concept label to check
   * @param {Object} options - { useStack: boolean } - whether to apply theory stack
   * @returns {Object} { consistent: boolean, details: string, violations: Array }
   */
  checkConsistency(conceptId, options = {}) {
    this._stats.consistencyChecks++;
    const { useStack = true } = options;

    const concept = this.store.getConcept(conceptId);
    if (!concept) {
      return {
        consistent: false,
        error: true,
        details: `Concept '${conceptId}' not found`,
        violations: []
      };
    }

    if (!concept.diamonds || concept.diamonds.length === 0) {
      return {
        consistent: false,
        error: true,
        details: `Concept '${conceptId}' has no diamonds`,
        violations: []
      };
    }

    const violations = [];

    for (let dIdx = 0; dIdx < concept.diamonds.length; dIdx++) {
      let diamond = concept.diamonds[dIdx];

      // Apply theory stack if enabled and available
      if (useStack && this.stack && this.stack.compose) {
        try {
          diamond = this.stack.compose(diamond);
        } catch (e) {
          violations.push({
            type: 'stack_error',
            diamond: dIdx,
            message: `Theory stack error: ${e.message}`
          });
        }
      }

      // Check min <= max for all dimensions
      for (let i = 0; i < diamond.minValues.length; i++) {
        if (diamond.minValues[i] > diamond.maxValues[i]) {
          violations.push({
            type: 'bounds_inversion',
            diamond: dIdx,
            dimension: i,
            min: diamond.minValues[i],
            max: diamond.maxValues[i],
            message: `Diamond ${dIdx}: min(${diamond.minValues[i]}) > max(${diamond.maxValues[i]}) at dimension ${i}`
          });
        }
      }

      // Check radius consistency with bounds
      if (diamond.radius !== undefined) {
        for (let i = 0; i < diamond.minValues.length; i++) {
          const expectedRadius = Math.floor((diamond.maxValues[i] - diamond.minValues[i]) / 2);
          if (Math.abs(diamond.radius[i] - expectedRadius) > 1) {
            violations.push({
              type: 'radius_mismatch',
              diamond: dIdx,
              dimension: i,
              radius: diamond.radius[i],
              expected: expectedRadius,
              message: `Diamond ${dIdx}: radius mismatch at dimension ${i}`
            });
          }
        }
      }

      // Check center is within bounds
      if (diamond.center) {
        for (let i = 0; i < diamond.center.length; i++) {
          if (diamond.center[i] < diamond.minValues[i] || diamond.center[i] > diamond.maxValues[i]) {
            violations.push({
              type: 'center_out_of_bounds',
              diamond: dIdx,
              dimension: i,
              center: diamond.center[i],
              min: diamond.minValues[i],
              max: diamond.maxValues[i],
              message: `Diamond ${dIdx}: center out of bounds at dimension ${i}`
            });
          }
        }
      }
    }

    // Check for theory stack conflicts if available
    if (useStack && this.stack && this.stack.conflicts) {
      try {
        const stackConflicts = this.stack.conflicts();
        for (const conflict of stackConflicts) {
          violations.push({
            type: 'stack_conflict',
            dimension: conflict.dimension,
            layers: conflict.layers,
            message: `Theory stack conflict at dimension ${conflict.dimension}`
          });
        }
      } catch (e) {
        // Stack may not have conflicts() method
      }
    }

    return {
      consistent: violations.length === 0,
      details: violations.length === 0 ? 'OK' : `Found ${violations.length} violation(s)`,
      violations,
      diamondsChecked: concept.diamonds.length
    };
  }

  /**
   * Prove that a point is included in a concept's geometric region
   *
   * @param {Int8Array|Array} point - Query point
   * @param {string} conceptId - Concept label
   * @param {Object} options - { useStack: boolean, allDiamonds: boolean }
   * @returns {Object} { result: boolean, distance: number, reason: string, details: Object }
   */
  proveInclusion(point, conceptId, options = {}) {
    this._stats.inclusionProofs++;
    const { useStack = true, allDiamonds = false } = options;

    const concept = this.store.getConcept(conceptId);
    if (!concept) {
      return {
        result: false,
        error: true,
        reason: `Concept '${conceptId}' not found`,
        distance: Infinity
      };
    }

    if (!concept.diamonds || concept.diamonds.length === 0) {
      return {
        result: false,
        error: true,
        reason: `Concept '${conceptId}' has no diamonds`,
        distance: Infinity
      };
    }

    const results = [];
    let anyIncluded = false;
    let bestDistance = Infinity;

    for (let dIdx = 0; dIdx < concept.diamonds.length; dIdx++) {
      let diamond = concept.diamonds[dIdx];

      // Apply theory stack if enabled
      if (useStack && this.stack && this.stack.compose) {
        try {
          diamond = this.stack.compose(diamond);
        } catch (e) {
          results.push({
            diamond: dIdx,
            included: false,
            error: `Stack error: ${e.message}`
          });
          continue;
        }
      }

      // Compute distance using masked L1
      const dist = this.math.distanceMaskedL1(point, diamond);
      const included = Number.isFinite(dist) && dist === 0;

      results.push({
        diamond: dIdx,
        included,
        distance: dist
      });

      if (included) {
        anyIncluded = true;
      }

      if (dist < bestDistance) {
        bestDistance = dist;
      }

      // If not checking all diamonds and found one, return early
      if (!allDiamonds && included) {
        return {
          result: true,
          distance: 0,
          reason: `Point is within diamond ${dIdx}`,
          diamondIndex: dIdx,
          details: results
        };
      }
    }

    return {
      result: anyIncluded,
      distance: bestDistance,
      reason: anyIncluded
        ? `Point is within ${results.filter(r => r.included).length} diamond(s)`
        : `Point is outside all ${results.length} diamond(s)`,
      details: results
    };
  }

  /**
   * Execute an abstract query with constraint propagation
   * Supports queries like: "find all X where X IS_A Animal and X HAS Fur"
   *
   * @param {Object} spec - Query specification
   * @param {string} spec.type - Query type: 'intersection', 'union', 'subsumption', 'nearest'
   * @param {Array} spec.concepts - Concept labels to query
   * @param {Object} spec.constraints - Additional constraints
   * @returns {Object} Query result with matches
   */
  abstractQuery(spec) {
    this._stats.abstractQueries++;

    if (!spec || !spec.type) {
      return {
        error: true,
        result: null,
        reason: 'Query specification must include type'
      };
    }

    switch (spec.type) {
      case 'intersection':
        return this._queryIntersection(spec);
      case 'union':
        return this._queryUnion(spec);
      case 'subsumption':
        return this._querySubsumption(spec);
      case 'nearest':
        return this._queryNearest(spec);
      case 'exists':
        return this._queryExists(spec);
      default:
        return {
          error: true,
          result: null,
          reason: `Unknown query type: ${spec.type}`,
          supportedTypes: ['intersection', 'union', 'subsumption', 'nearest', 'exists']
        };
    }
  }

  /**
   * Find intersection of concept diamonds
   */
  _queryIntersection(spec) {
    const { concepts = [] } = spec;

    if (concepts.length < 2) {
      return {
        error: true,
        result: null,
        reason: 'Intersection requires at least 2 concepts'
      };
    }

    // Get all diamonds
    const diamondSets = [];
    for (const cid of concepts) {
      const concept = this.store.getConcept(cid);
      if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
        return {
          error: false,
          result: { empty: true },
          reason: `Concept '${cid}' has no diamonds - intersection is empty`
        };
      }
      diamondSets.push({ label: cid, diamonds: concept.diamonds });
    }

    // Compute intersection bounds
    const first = diamondSets[0].diamonds[0];
    const dims = first.minValues.length;

    const resultMin = new Int8Array(dims);
    const resultMax = new Int8Array(dims);

    // Initialize with first diamond
    for (let i = 0; i < dims; i++) {
      resultMin[i] = first.minValues[i];
      resultMax[i] = first.maxValues[i];
    }

    // Intersect with all other diamonds
    for (let s = 1; s < diamondSets.length; s++) {
      const d = diamondSets[s].diamonds[0];
      for (let i = 0; i < dims; i++) {
        resultMin[i] = Math.max(resultMin[i], d.minValues[i]);
        resultMax[i] = Math.min(resultMax[i], d.maxValues[i]);
      }
    }

    // Check if intersection is non-empty
    let isEmpty = false;
    for (let i = 0; i < dims; i++) {
      if (resultMin[i] > resultMax[i]) {
        isEmpty = true;
        break;
      }
    }

    return {
      result: {
        empty: isEmpty,
        bounds: isEmpty ? null : { min: resultMin, max: resultMax }
      },
      concepts: concepts,
      reason: isEmpty ? 'Intersection is empty' : 'Intersection computed successfully'
    };
  }

  /**
   * Find union bounds of concept diamonds
   */
  _queryUnion(spec) {
    const { concepts = [] } = spec;

    if (concepts.length === 0) {
      return {
        error: true,
        result: null,
        reason: 'Union requires at least 1 concept'
      };
    }

    let resultMin = null;
    let resultMax = null;
    const included = [];

    for (const cid of concepts) {
      const concept = this.store.getConcept(cid);
      if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
        continue;
      }

      included.push(cid);
      const d = concept.diamonds[0];

      if (!resultMin) {
        resultMin = new Int8Array(d.minValues);
        resultMax = new Int8Array(d.maxValues);
      } else {
        for (let i = 0; i < d.minValues.length; i++) {
          resultMin[i] = Math.min(resultMin[i], d.minValues[i]);
          resultMax[i] = Math.max(resultMax[i], d.maxValues[i]);
        }
      }
    }

    if (!resultMin) {
      return {
        error: false,
        result: { empty: true },
        reason: 'No valid concepts found for union'
      };
    }

    return {
      result: {
        empty: false,
        bounds: { min: resultMin, max: resultMax }
      },
      concepts: included,
      reason: `Union of ${included.length} concept(s)`
    };
  }

  /**
   * Check if one concept subsumes another (A includes B)
   */
  _querySubsumption(spec) {
    const { parent, child } = spec;

    if (!parent || !child) {
      return {
        error: true,
        result: null,
        reason: 'Subsumption requires parent and child concept labels'
      };
    }

    const parentConcept = this.store.getConcept(parent);
    const childConcept = this.store.getConcept(child);

    if (!parentConcept || !parentConcept.diamonds) {
      return {
        error: true,
        result: null,
        reason: `Parent concept '${parent}' not found or has no diamonds`
      };
    }

    if (!childConcept || !childConcept.diamonds) {
      return {
        error: true,
        result: null,
        reason: `Child concept '${child}' not found or has no diamonds`
      };
    }

    // Check if child is fully contained within parent
    // For each dimension, child's bounds must be within parent's bounds
    const pDiamond = parentConcept.diamonds[0];
    const cDiamond = childConcept.diamonds[0];

    const violations = [];
    for (let i = 0; i < pDiamond.minValues.length; i++) {
      if (cDiamond.minValues[i] < pDiamond.minValues[i]) {
        violations.push({ dimension: i, type: 'min', parent: pDiamond.minValues[i], child: cDiamond.minValues[i] });
      }
      if (cDiamond.maxValues[i] > pDiamond.maxValues[i]) {
        violations.push({ dimension: i, type: 'max', parent: pDiamond.maxValues[i], child: cDiamond.maxValues[i] });
      }
    }

    return {
      result: {
        subsumes: violations.length === 0,
        violations
      },
      parent,
      child,
      reason: violations.length === 0
        ? `'${parent}' subsumes '${child}'`
        : `'${parent}' does NOT subsume '${child}' - ${violations.length} violation(s)`
    };
  }

  /**
   * Find nearest concepts to a query point
   */
  _queryNearest(spec) {
    const { point, k = 5 } = spec;

    if (!point) {
      return {
        error: true,
        result: null,
        reason: 'Nearest query requires a point'
      };
    }

    const results = [];
    const concepts = this.store._concepts || new Map();

    for (const [label, concept] of concepts.entries()) {
      if (!concept.diamonds) continue;

      for (const d of concept.diamonds) {
        let diamond = d;

        // Apply stack if available
        if (this.stack && this.stack.compose) {
          try {
            diamond = this.stack.compose(d);
          } catch (e) {
            continue;
          }
        }

        const dist = this.math.distanceMaskedL1(point, diamond);
        if (Number.isFinite(dist)) {
          results.push({ label, distance: dist });
        }
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    const topK = results.slice(0, k);

    return {
      result: {
        matches: topK,
        totalConcepts: concepts.size
      },
      k,
      reason: `Found ${topK.length} nearest concept(s)`
    };
  }

  /**
   * Check if a concept exists with certain properties
   */
  _queryExists(spec) {
    const { concept, properties = {} } = spec;

    if (!concept) {
      return {
        error: true,
        result: null,
        reason: 'Exists query requires a concept label'
      };
    }

    const found = this.store.getConcept(concept);

    if (!found) {
      return {
        result: { exists: false },
        concept,
        reason: `Concept '${concept}' does not exist`
      };
    }

    // Check properties if specified
    const propertyResults = {};
    let allMatch = true;

    for (const [key, expected] of Object.entries(properties)) {
      const actual = found[key];
      const matches = actual === expected;
      propertyResults[key] = { expected, actual, matches };
      if (!matches) allMatch = false;
    }

    return {
      result: {
        exists: true,
        propertiesMatch: allMatch,
        properties: propertyResults
      },
      concept,
      reason: allMatch
        ? `Concept '${concept}' exists with matching properties`
        : `Concept '${concept}' exists but properties differ`
    };
  }

  /**
   * Find a counterexample that falsifies an assertion
   * Used for theorem falsification
   *
   * @param {Object} assertion - The assertion to falsify
   * @param {string} assertion.type - 'inclusion', 'exclusion', 'subsumption'
   * @param {Object} options - Search options
   * @returns {Object|null} Counterexample or null if none found
   */
  findCounterexample(assertion, options = {}) {
    if (!assertion || !assertion.type) {
      return {
        error: true,
        counterexample: null,
        reason: 'Assertion must include type'
      };
    }

    const { maxIterations = 1000, seed } = options;

    switch (assertion.type) {
      case 'inclusion':
        return this._findInclusionCounterexample(assertion, maxIterations, seed);
      case 'exclusion':
        return this._findExclusionCounterexample(assertion, maxIterations, seed);
      case 'subsumption':
        return this._findSubsumptionCounterexample(assertion, maxIterations);
      default:
        return {
          error: true,
          counterexample: null,
          reason: `Unknown assertion type: ${assertion.type}`
        };
    }
  }

  /**
   * Find a point that should be included but isn't
   */
  _findInclusionCounterexample(assertion, maxIterations, seed) {
    const { concept, expectedRegion } = assertion;

    const conceptData = this.store.getConcept(concept);
    if (!conceptData || !conceptData.diamonds) {
      return {
        counterexample: null,
        reason: `Concept '${concept}' not found`
      };
    }

    const diamond = conceptData.diamonds[0];
    const dims = diamond.minValues.length;

    // Generate random points within expected region and check inclusion
    for (let iter = 0; iter < maxIterations; iter++) {
      const point = new Int8Array(dims);

      // Generate point within diamond bounds
      for (let i = 0; i < dims; i++) {
        const range = diamond.maxValues[i] - diamond.minValues[i];
        point[i] = diamond.minValues[i] + Math.floor(Math.random() * (range + 1));
      }

      // Check if point is actually included
      const dist = this.math.distanceMaskedL1(point, diamond);
      if (!Number.isFinite(dist) || dist > 0) {
        this._stats.counterexamplesFound++;
        return {
          counterexample: {
            point: Array.from(point),
            distance: dist,
            iteration: iter
          },
          reason: `Found point within bounds but with distance ${dist}`
        };
      }
    }

    return {
      counterexample: null,
      reason: `No counterexample found in ${maxIterations} iterations`
    };
  }

  /**
   * Find a point that should be excluded but isn't
   */
  _findExclusionCounterexample(assertion, maxIterations) {
    const { concept, excludedRegion } = assertion;

    const conceptData = this.store.getConcept(concept);
    if (!conceptData || !conceptData.diamonds) {
      return {
        counterexample: null,
        reason: `Concept '${concept}' not found`
      };
    }

    const diamond = conceptData.diamonds[0];
    const dims = diamond.minValues.length;

    // Generate random points outside expected region and check exclusion
    for (let iter = 0; iter < maxIterations; iter++) {
      const point = new Int8Array(dims);

      // Generate point outside diamond bounds
      for (let i = 0; i < dims; i++) {
        // Randomly choose to be below min or above max
        if (Math.random() < 0.5 && diamond.minValues[i] > -127) {
          point[i] = diamond.minValues[i] - 1 - Math.floor(Math.random() * 10);
          point[i] = Math.max(-127, point[i]);
        } else if (diamond.maxValues[i] < 127) {
          point[i] = diamond.maxValues[i] + 1 + Math.floor(Math.random() * 10);
          point[i] = Math.min(127, point[i]);
        } else {
          point[i] = diamond.center ? diamond.center[i] : 0;
        }
      }

      // Check if point is incorrectly included
      const dist = this.math.distanceMaskedL1(point, diamond);
      if (Number.isFinite(dist) && dist === 0) {
        this._stats.counterexamplesFound++;
        return {
          counterexample: {
            point: Array.from(point),
            distance: dist,
            iteration: iter
          },
          reason: 'Found point outside expected bounds but included in diamond'
        };
      }
    }

    return {
      counterexample: null,
      reason: `No counterexample found in ${maxIterations} iterations`
    };
  }

  /**
   * Find a dimension where subsumption fails
   */
  _findSubsumptionCounterexample(assertion) {
    const { parent, child } = assertion;

    // Just delegate to subsumption query which already finds violations
    const result = this._querySubsumption({ parent, child });

    if (result.result && result.result.violations && result.result.violations.length > 0) {
      this._stats.counterexamplesFound++;
      return {
        counterexample: result.result.violations[0],
        reason: 'Subsumption fails at reported dimension'
      };
    }

    return {
      counterexample: null,
      reason: 'Subsumption holds - no counterexample exists'
    };
  }

  /**
   * Validate the entire knowledge base for consistency
   * @returns {Object} Overall validation report
   */
  validateAll() {
    const concepts = this.store._concepts || new Map();
    const report = {
      totalConcepts: concepts.size,
      consistent: 0,
      inconsistent: 0,
      errors: [],
      warnings: []
    };

    for (const [label] of concepts.entries()) {
      const result = this.checkConsistency(label, { useStack: true });

      if (result.error) {
        report.errors.push({ concept: label, details: result.details });
      } else if (result.consistent) {
        report.consistent++;
      } else {
        report.inconsistent++;
        report.errors.push({ concept: label, violations: result.violations });
      }
    }

    report.overallConsistent = report.inconsistent === 0 && report.errors.length === 0;

    return report;
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this._stats = {
      consistencyChecks: 0,
      inclusionProofs: 0,
      abstractQueries: 0,
      counterexamplesFound: 0
    };
  }
}

module.exports = ValidationEngine;
