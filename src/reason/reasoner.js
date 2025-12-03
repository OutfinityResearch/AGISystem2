const MathEngine = require('../core/math_engine');
const PluginRegistry = require('../plugins/registry');
const MathPlugin = require('../plugins/math');
const DimensionRegistry = require('../core/dimension_registry');

class Reasoner {
  constructor(storeOrDeps) {
    if (storeOrDeps && storeOrDeps.store) {
      const deps = storeOrDeps;
      this.conceptStore = deps.store;
      this.stack = deps.stack || null;
      this.math = deps.math || MathEngine;
      this.bias = deps.bias || null;
      this.retriever = deps.retriever || null;
      this.temporal = deps.temporal || null;
      this.config = deps.config || null;
      this.permuter = deps.permuter || null;
      this.dimRegistry = deps.dimRegistry || DimensionRegistry.getShared();
    } else {
      this.conceptStore = storeOrDeps;
      this.stack = null;
      this.math = MathEngine;
      this.bias = null;
      this.retriever = null;
      this.temporal = null;
      this.config = null;
      this.permuter = null;
      this.dimRegistry = DimensionRegistry.getShared();
    }

    // Initialize compute plugin registry
    this.pluginRegistry = new PluginRegistry();
    this.pluginRegistry.register('math', new MathPlugin());
  }

  analogical(sourceA, sourceB, targetC, options = {}) {
    const dims = sourceA.length;
    const delta = new Int8Array(dims);
    for (let i = 0; i < dims; i += 1) {
      let value = sourceB[i] - sourceA[i];
      if (value > 127) {
        value = 127;
      } else if (value < -127) {
        value = -127;
      }
      delta[i] = value;
    }
    const predicted = this.math.addSaturated
      ? this.math.addSaturated(targetC, delta)
      : MathEngine.addSaturated(targetC, delta);
    if (!this.retriever) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE',
        predicted
      };
    }
    const k = options.k && Number.isInteger(options.k) ? options.k : 1;
    const candidates = this.retriever.nearest(predicted, { k });
    if (!candidates || candidates.length === 0) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE',
        predicted
      };
    }
    const best = candidates[0];
    const bandInfo = this.adversarialCheck(predicted, best.diamond);
    return {
      concept: best.label,
      distance: best.distance,
      band: bandInfo.band,
      predicted
    };
  }

  /**
   * Geometric abductive reasoning with priority-weighted ranking
   *
   * Given an observation vector and a relation, finds candidate hypotheses
   * that could explain the observation via inverse permutation.
   *
   * Ranking combines:
   * - Geometric score (70%): How well the hypothesis geometrically explains observation
   * - Priority score (30%): Usage-based priority from ConceptStore
   *
   * @param {Int8Array} observationVector - The observation to explain
   * @param {string} relationName - The relation to invert (e.g., 'CAUSES')
   * @param {Object} options - Options
   * @param {number} [options.k=5] - Number of candidates to return
   * @param {number} [options.geometricWeight=0.7] - Weight for geometric score
   * @param {number} [options.priorityWeight=0.3] - Weight for priority score
   * @returns {Object} Result with hypotheses array and best hypothesis
   */
  abductive(observationVector, relationName, options = {}) {
    const k = options.k || 5;
    const geometricWeight = options.geometricWeight ?? 0.7;
    const priorityWeight = options.priorityWeight ?? 0.3;

    if (!this.permuter || !relationName || !this.retriever) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE',
        hypotheses: []
      };
    }

    let table;
    try {
      table = this.permuter.get(relationName);
    } catch {
      return {
        concept: null,
        distance: null,
        band: 'FALSE',
        hypotheses: []
      };
    }

    const hypVector = this.math.inversePermute
      ? this.math.inversePermute(observationVector, table)
      : MathEngine.inversePermute(observationVector, table);

    // Get more candidates than needed for re-ranking
    const candidates = this.retriever.nearest(hypVector, { k: Math.max(k * 2, 10) });
    if (!candidates || candidates.length === 0) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE',
        hypotheses: []
      };
    }

    // Calculate max distance for normalization
    const maxDistance = Math.max(...candidates.map(c => c.distance), 1);

    // Rank candidates by combined score
    const rankedHypotheses = candidates.map(candidate => {
      const bandInfo = this.adversarialCheck(hypVector, candidate.diamond);

      // Geometric score: closer = higher score (0 to 1)
      const geometricScore = 1 - (candidate.distance / maxDistance);

      // Priority score from usage tracking (0 to 1)
      let priorityScore = 0.5; // default for unknown concepts
      if (this.conceptStore && this.conceptStore.getUsageStats) {
        const stats = this.conceptStore.getUsageStats(candidate.label);
        if (stats && stats.priority !== undefined) {
          priorityScore = stats.priority;
        }
      }

      // Combined score
      const combinedScore = (geometricScore * geometricWeight) + (priorityScore * priorityWeight);

      return {
        concept: candidate.label,
        distance: candidate.distance,
        band: bandInfo.band,
        geometricScore: Math.round(geometricScore * 100) / 100,
        priorityScore: Math.round(priorityScore * 100) / 100,
        combinedScore: Math.round(combinedScore * 100) / 100
      };
    });

    // Sort by combined score (descending)
    rankedHypotheses.sort((a, b) => b.combinedScore - a.combinedScore);

    // Take top k
    const topHypotheses = rankedHypotheses.slice(0, k);
    const best = topHypotheses[0] || null;

    return {
      concept: best ? best.concept : null,
      distance: best ? best.distance : null,
      band: best ? best.band : 'FALSE',
      hypotheses: topHypotheses
    };
  }

  _getFacts(contextStack) {
    const base = this.conceptStore.getFacts();
    if (!contextStack || contextStack.length === 0) {
      return base;
    }
    const extras = [];
    for (const layer of contextStack) {
      if (layer && Array.isArray(layer.facts)) {
        extras.push(...layer.facts);
      }
    }
    return base.concat(extras);
  }

  /**
   * Compose a concept's diamond with theory layer overrides
   * @param {string} conceptId - Concept to compose
   * @param {TheoryStack|Array} stack - Theory stack or array of layers
   * @returns {BoundedDiamond|null} Composed diamond with overrides applied
   */
  composeConcept(conceptId, stack) {
    const concept = this.conceptStore.getConcept(conceptId);
    if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
      return null;
    }

    const baseDiamond = concept.diamonds[0];

    // If no stack provided, return base diamond
    if (!stack) {
      return baseDiamond;
    }

    // If stack is a TheoryStack instance with compose method, use it
    if (stack.compose && typeof stack.compose === 'function') {
      return stack.compose(baseDiamond);
    }

    // If stack is an array of layers (legacy/contextStack format), apply them manually
    if (Array.isArray(stack) && stack.length > 0) {
      let result = baseDiamond;
      for (const layer of stack) {
        if (layer && layer.applyTo && typeof layer.applyTo === 'function') {
          result = layer.applyTo(result);
        }
      }
      return result;
    }

    // If stack has getActiveLayers method (TheoryStack), use compose
    if (stack.getActiveLayers && typeof stack.getActiveLayers === 'function') {
      const layers = stack.getActiveLayers();
      if (layers.length === 0) {
        return baseDiamond;
      }
      // Sort by priority and apply
      const sorted = [...layers].sort((a, b) => (a.priority || 0) - (b.priority || 0));
      let result = baseDiamond;
      for (const layer of sorted) {
        if (layer.applyTo) {
          result = layer.applyTo(result);
        }
      }
      return result;
    }

    return baseDiamond;
  }

  adversarialCheck(vector, diamond, maskOverride) {
    if (!diamond) {
      return {
        truth: 'FALSE',
        band: 'FALSE',
        distance: Infinity,
        scepticRadius: 0,
        optimistRadius: 0
      };
    }
    const distance = this.math.distanceMaskedL1(vector, diamond, maskOverride);
    if (!Number.isFinite(distance)) {
      return {
        truth: 'FALSE',
        band: 'FALSE',
        distance,
        scepticRadius: 0,
        optimistRadius: 0
      };
    }
    const radius = diamond.l1Radius || 0;
    const scepticRadius = radius * 0.8;
    const optimistRadius = radius * 1.2;
    if (radius === 0) {
      const truth = distance === 0 ? 'TRUE_CERTAIN' : 'FALSE';
      return {
        truth,
        band: truth,
        distance,
        scepticRadius: 0,
        optimistRadius: 0
      };
    }
    if (distance <= scepticRadius) {
      return {
        truth: 'TRUE_CERTAIN',
        band: 'TRUE_CERTAIN',
        distance,
        scepticRadius,
        optimistRadius
      };
    }
    if (distance <= optimistRadius) {
      return {
        truth: 'PLAUSIBLE',
        band: 'PLAUSIBLE',
        distance,
        scepticRadius,
        optimistRadius
      };
    }
    return {
      truth: 'FALSE',
      band: 'FALSE',
      distance,
      scepticRadius,
      optimistRadius
    };
  }

  /**
   * Answer a geometric query with full provenance (FS-05/FS-07)
   *
   * @param {Int8Array} queryVector - Query vector
   * @param {string} conceptId - Concept to check against
   * @param {Object} [options] - Options
   * @param {Array} [options.contextStack] - Theory context
   * @param {Uint8Array} [options.mask] - Dimension mask
   * @returns {Object} Result with provenance including active theories, dimensions, acceptance band
   */
  answer(queryVector, conceptId, options = {}) {
    const contextStack = options.contextStack || (this.stack && this.stack.getActiveLayers && this.stack.getActiveLayers()) || null;
    const maskOverride = options.mask || null;
    const diamond = this.composeConcept(conceptId, contextStack);

    // Build active theories provenance (FS-05)
    const activeTheories = [];
    if (contextStack && Array.isArray(contextStack)) {
      for (const layer of contextStack) {
        activeTheories.push({
          id: layer.id,
          label: layer.label,
          priority: layer.priority,
          source: layer.metadata?.source || 'unknown'
        });
      }
    }

    if (!diamond) {
      return {
        result: 'UNKNOWN',
        band: 'FALSE',
        provenance: {
          conceptId,
          reason: 'NO_CONCEPT',
          activeTheories,
          contributingDimensions: [],
          acceptanceBand: null,
          overrides: []
        }
      };
    }

    const check = this.adversarialCheck(queryVector, diamond, maskOverride);

    // Build contributing dimensions list (FS-07)
    const contributingDimensions = this._getContributingDimensions(queryVector, diamond, maskOverride);

    // Build overrides list from layers
    const overrides = this._getLayerOverrides(contextStack, diamond);

    return {
      result: check.truth,
      band: check.band,
      provenance: {
        conceptId,
        distance: check.distance,
        scepticRadius: check.scepticRadius,
        optimistRadius: check.optimistRadius,
        // FS-05/FS-07 Enhanced provenance:
        activeTheories,
        contributingDimensions,
        acceptanceBand: {
          sceptic: check.scepticRadius,
          optimist: check.optimistRadius,
          bandUsed: check.band
        },
        overrides,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get dimensions that contributed most to the distance calculation
   * @private
   */
  _getContributingDimensions(queryVector, diamond, mask) {
    const contributions = [];
    const dims = queryVector.length;

    for (let i = 0; i < dims; i++) {
      // Skip masked dimensions
      if (mask) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        if ((mask[byteIndex] & (1 << bitIndex)) === 0) {
          continue;
        }
      }

      // Calculate contribution to distance
      const qVal = queryVector[i];
      const dMin = diamond.minValues[i];
      const dMax = diamond.maxValues[i];
      const dCenter = diamond.center ? diamond.center[i] : Math.floor((dMin + dMax) / 2);

      let contribution = 0;
      if (qVal < dMin) {
        contribution = dMin - qVal;
      } else if (qVal > dMax) {
        contribution = qVal - dMax;
      }

      if (contribution > 0) {
        contributions.push({
          dimension: i,
          contribution,
          queryValue: qVal,
          diamondMin: dMin,
          diamondMax: dMax,
          diamondCenter: dCenter
        });
      }
    }

    // Sort by contribution (descending) and return top contributors
    contributions.sort((a, b) => b.contribution - a.contribution);
    return contributions.slice(0, 10);  // Top 10 contributors
  }

  /**
   * Get overrides from theory layers
   * @private
   */
  _getLayerOverrides(contextStack, diamond) {
    const overrides = [];

    if (!contextStack || !Array.isArray(contextStack)) {
      return overrides;
    }

    for (const layer of contextStack) {
      if (!layer.definitionMask) continue;

      const layerOverrides = {
        layerId: layer.id,
        dimensions: []
      };

      for (let i = 0; i < layer.dimensions; i++) {
        if (layer.covers && layer.covers(i)) {
          layerOverrides.dimensions.push({
            dimension: i,
            overrideMin: layer.overrideMin ? layer.overrideMin[i] : null,
            overrideMax: layer.overrideMax ? layer.overrideMax[i] : null
          });
        }
      }

      if (layerOverrides.dimensions.length > 0) {
        overrides.push(layerOverrides);
      }
    }

    return overrides;
  }

  /**
   * Build active theories list for provenance (FS-05)
   * @private
   */
  _buildActiveTheories(contextStack) {
    const activeTheories = [];
    if (contextStack && Array.isArray(contextStack)) {
      for (const layer of contextStack) {
        activeTheories.push({
          id: layer.id,
          label: layer.label,
          priority: layer.priority,
          source: layer.metadata?.source || 'unknown'
        });
      }
    }
    return activeTheories;
  }

  /**
   * Check if subject IS_A object via transitive chain
   *
   * Returns:
   * - TRUE_CERTAIN with confidence when found via chain
   * - FALSE when DISJOINT_WITH relation exists
   * - UNKNOWN when no evidence found (subject exists but no path to object)
   *
   * @param {string} subject - The subject to check
   * @param {string} object - The type to check against
   * @param {Array} contextStack - Optional theory context
   * @returns {Object} Result with truth, confidence, and method
   */
  deduceIsA(subject, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const target = norm(object);
    const subjectNorm = norm(subject);
    const visited = new Set();
    const stack = [{ node: subjectNorm, depth: 0 }];
    const maxSteps = this.config && this.config.get('maxReasonerIterations')
      ? this.config.get('maxReasonerIterations')
      : Number.MAX_SAFE_INTEGER;
    let steps = 0;

    // Check if subject even exists in the knowledge base
    const subjectExists = facts.some(f =>
      norm(f.subject) === subjectNorm || norm(f.object) === subjectNorm
    );

    // Check for explicit DISJOINT_WITH relations (FALSE case)
    const disjoint = facts.some(f => {
      if (f.relation !== 'DISJOINT_WITH') return false;
      const s = norm(f.subject);
      const o = norm(f.object);
      // subject's type is disjoint with target type
      return (s === subjectNorm && o === target) || (s === target && o === subjectNorm);
    });
    if (disjoint) {
      return { truth: 'FALSE', confidence: 1.0, method: 'disjoint' };
    }

    while (stack.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        return { truth: 'UNKNOWN', confidence: 0, method: 'timeout' };
      }
      const { node: current, depth } = stack.pop();
      if (current === target) {
        // Confidence decays slightly with chain depth (0.95^depth)
        const confidence = Math.pow(0.95, depth);
        return {
          truth: 'TRUE_CERTAIN',
          confidence: Math.round(confidence * 100) / 100,
          method: depth === 0 ? 'direct' : 'transitive',
          depth
        };
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const fact of facts) {
        if (fact.relation === 'IS_A' && norm(fact.subject) === current) {
          stack.push({ node: norm(fact.object), depth: depth + 1 });
        }
      }
    }

    // No path found - return UNKNOWN if subject exists, FALSE if subject is completely unknown
    if (subjectExists) {
      return { truth: 'UNKNOWN', confidence: 0, method: 'no_path' };
    }
    return { truth: 'UNKNOWN', confidence: 0, method: 'unknown_subject' };
  }

  /**
   * Check if subject IS_A object via transitive chain with existence tracking
   *
   * This is the existence-aware version of deduceIsA that:
   * - Searches all IS_A variants (IS_A_CERTAIN, IS_A_PROVEN, IS_A_POSSIBLE, IS_A_UNPROVEN)
   * - Tracks existence levels through the chain
   * - Uses min(existence) for transitive paths (conservative approach)
   * - Returns the path with highest existence level
   *
   * @param {string} subject - The subject to check
   * @param {string} object - The type to check against
   * @param {Object} [options] - Options
   * @param {number} [options.minExistence] - Minimum existence level to accept
   * @param {Array} [options.contextStack] - Theory context
   * @returns {Object} Result with truth, confidence, existence, method, and path
   */
  deduceIsAWithExistence(subject, object, options = {}) {
    const contextStack = options.contextStack || null;
    const minExistence = options.minExistence !== undefined ? options.minExistence : -128;

    // Get facts from store with existence info
    const storeFacts = this.conceptStore.getFactsBySubject
      ? this._getFactsWithExistence(contextStack)
      : this._getFacts(contextStack);

    // Build active theories for provenance (FS-05)
    const activeTheories = this._buildActiveTheories(contextStack);

    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const target = norm(object);
    const subjectNorm = norm(subject);

    // IS_A relation variants (all mapped to IS_A base relation)
    const isARelations = ['IS_A', 'IS_A_CERTAIN', 'IS_A_PROVEN', 'IS_A_POSSIBLE', 'IS_A_UNPROVEN'];

    // Existence level map for explicit relation variants
    const relationExistenceMap = {
      'IS_A': null, // Uses fact's _existence
      'IS_A_CERTAIN': 127,
      'IS_A_PROVEN': 64,
      'IS_A_POSSIBLE': 0,
      'IS_A_UNPROVEN': -64
    };

    // Check if subject exists in the knowledge base
    const subjectExists = storeFacts.some(f =>
      norm(f.subject) === subjectNorm || norm(f.object) === subjectNorm
    );

    // Check for DISJOINT_WITH relations (explicit FALSE)
    const disjoint = storeFacts.some(f => {
      if (f.relation !== 'DISJOINT_WITH') return false;
      const s = norm(f.subject);
      const o = norm(f.object);
      return (s === subjectNorm && o === target) || (s === target && o === subjectNorm);
    });
    if (disjoint) {
      return {
        truth: 'FALSE',
        confidence: 1.0,
        existence: this.conceptStore.EXISTENCE ? this.conceptStore.EXISTENCE.IMPOSSIBLE : -127,
        method: 'disjoint',
        provenance: {
          activeTheories,
          query: { subject, relation: 'IS_A', object },
          reason: 'DISJOINT_WITH relation exists',
          timestamp: new Date().toISOString()
        }
      };
    }

    // BFS with existence tracking
    // Each queue entry tracks: node, path existence (min so far), depth, path
    const maxSteps = this.config && this.config.get('maxReasonerIterations')
      ? this.config.get('maxReasonerIterations')
      : Number.MAX_SAFE_INTEGER;
    let steps = 0;

    // Track best path to each node (by existence level)
    const visited = new Map(); // node -> { bestExistence, depth, path }

    // Priority queue (sorted by existence descending)
    // Start with CERTAIN existence (127) for the subject itself
    const queue = [{
      node: subjectNorm,
      pathExistence: 127, // Subject itself is certain
      depth: 0,
      path: [subject]
    }];

    let bestResult = null;

    while (queue.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        return bestResult || {
          truth: 'UNKNOWN',
          confidence: 0,
          existence: 0,
          method: 'timeout',
          provenance: {
            activeTheories,
            query: { subject, relation: 'IS_A', object },
            reason: 'Max iterations exceeded',
            stepsExecuted: steps,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Sort queue by pathExistence descending (explore best paths first)
      queue.sort((a, b) => b.pathExistence - a.pathExistence);
      const { node: current, pathExistence, depth, path } = queue.shift();

      // Found target!
      if (current === target) {
        // Only accept if above minimum existence threshold
        if (pathExistence >= minExistence) {
          // Track best result (highest existence)
          if (!bestResult || pathExistence > bestResult.existence) {
            const confidence = Math.pow(0.95, depth);
            bestResult = {
              truth: 'TRUE_CERTAIN',
              confidence: Math.round(confidence * 100) / 100,
              existence: pathExistence,
              method: depth === 0 ? 'direct' : 'transitive',
              depth,
              path,
              provenance: {
                activeTheories,
                query: { subject, relation: 'IS_A', object },
                chainLength: depth,
                pathExistence,
                stepsExecuted: steps,
                timestamp: new Date().toISOString()
              }
            };
          }
        }
        continue;
      }

      // Skip if we've visited this node with equal or better existence
      const visitedEntry = visited.get(current);
      if (visitedEntry && visitedEntry.bestExistence >= pathExistence) {
        continue;
      }
      visited.set(current, { bestExistence: pathExistence, depth, path });

      // Explore all IS_A edges from current node
      for (const fact of storeFacts) {
        const factSubject = norm(fact.subject);
        if (factSubject !== current) continue;
        if (!isARelations.includes(fact.relation)) continue;

        // Determine fact's existence level
        let factExistence;
        if (relationExistenceMap[fact.relation] !== null) {
          // Explicit IS_A variant - use relation's defined existence
          factExistence = relationExistenceMap[fact.relation];
        } else {
          // Plain IS_A - use fact's _existence field or default to CERTAIN
          factExistence = fact._existence !== undefined
            ? fact._existence
            : (this.conceptStore.EXISTENCE ? this.conceptStore.EXISTENCE.CERTAIN : 127);
        }

        // New path existence is min of current path and this edge
        const newPathExistence = Math.min(pathExistence, factExistence);

        // Only follow if above minimum threshold
        if (newPathExistence >= minExistence) {
          const nextNode = norm(fact.object);
          const nextVisited = visited.get(nextNode);

          // Only queue if we have a better path
          if (!nextVisited || newPathExistence > nextVisited.bestExistence) {
            queue.push({
              node: nextNode,
              pathExistence: newPathExistence,
              depth: depth + 1,
              path: [...path, fact.object]
            });
          }
        }
      }
    }

    // Return best result if found
    if (bestResult) {
      return bestResult;
    }

    // No path found
    if (subjectExists) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        existence: 0,
        method: 'no_path',
        provenance: {
          activeTheories,
          query: { subject, relation: 'IS_A', object },
          reason: 'No IS_A path found from subject to target',
          stepsExecuted: steps,
          nodesVisited: visited.size,
          timestamp: new Date().toISOString()
        }
      };
    }
    return {
      truth: 'UNKNOWN',
      confidence: 0,
      existence: 0,
      method: 'unknown_subject',
      provenance: {
        activeTheories,
        query: { subject, relation: 'IS_A', object },
        reason: 'Subject not found in knowledge base',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get facts with existence information preserved
   * @private
   */
  _getFactsWithExistence(contextStack) {
    // Get base facts from store (with _existence field)
    let facts;
    if (this.conceptStore._facts) {
      facts = this.conceptStore._facts
        .filter(f => !f._deleted)
        .map(f => ({
          subject: f.subject,
          relation: f.relation,
          object: f.object,
          _existence: f._existence !== undefined
            ? f._existence
            : (this.conceptStore.EXISTENCE ? this.conceptStore.EXISTENCE.CERTAIN : 127)
        }));
    } else {
      facts = this.conceptStore.getFacts().map(f => ({
        ...f,
        _existence: 127 // Default for legacy stores
      }));
    }

    // Add context stack facts
    if (contextStack && contextStack.length > 0) {
      for (const layer of contextStack) {
        if (layer && Array.isArray(layer.facts)) {
          for (const f of layer.facts) {
            facts.push({
              subject: f.subject,
              relation: f.relation,
              object: f.object,
              _existence: f._existence !== undefined ? f._existence : 127
            });
          }
        }
      }
    }

    return facts;
  }

  /**
   * Fact-based abductive reasoning with priority-weighted ranking
   *
   * Given an observation, finds candidate causes from CAUSES/CAUSED_BY facts,
   * ranked by usage priority. This is the "backward chaining" approach.
   *
   * @param {string} observation - The effect/observation to explain
   * @param {Array} contextStack - Optional theory context
   * @param {Object} options - Options
   * @param {number} [options.k=5] - Number of candidates to return
   * @param {boolean} [options.transitive=true] - Follow transitive causes
   * @param {number} [options.maxDepth=3] - Max depth for transitive search
   * @returns {Object} Result with hypotheses array ranked by priority
   */
  abductCause(observation, contextStack = null, options = {}) {
    const k = options.k || 5;
    const transitive = options.transitive !== false;
    const maxDepth = options.maxDepth || 3;

    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const targetNorm = norm(observation);

    // Collect all candidate causes with their depth
    const candidateMap = new Map(); // cause -> { depth, directFact }
    const visited = new Set();
    const queue = [{ obs: targetNorm, depth: 0 }];

    while (queue.length > 0) {
      const { obs, depth } = queue.shift();

      if (visited.has(obs)) continue;
      visited.add(obs);

      for (const fact of facts) {
        const subjectNorm = norm(fact.subject);
        const objectNorm = norm(fact.object);

        // Find causes: X CAUSES observation OR observation CAUSED_BY X
        if (fact.relation === 'CAUSES' && objectNorm === obs) {
          if (!candidateMap.has(subjectNorm)) {
            candidateMap.set(subjectNorm, {
              cause: fact.subject, // preserve original case
              depth,
              fact,
              isTransitive: depth > 0
            });
          }
          // Queue for transitive search if enabled
          if (transitive && depth < maxDepth) {
            queue.push({ obs: subjectNorm, depth: depth + 1 });
          }
        } else if (fact.relation === 'CAUSED_BY' && subjectNorm === obs) {
          if (!candidateMap.has(objectNorm)) {
            candidateMap.set(objectNorm, {
              cause: fact.object, // preserve original case
              depth,
              fact,
              isTransitive: depth > 0
            });
          }
          if (transitive && depth < maxDepth) {
            queue.push({ obs: objectNorm, depth: depth + 1 });
          }
        }
      }
    }

    if (candidateMap.size === 0) {
      return {
        hypothesis: null,
        band: 'FALSE',
        hypotheses: []
      };
    }

    // Rank candidates by priority (from usage tracking)
    const rankedHypotheses = [];
    for (const [causeNorm, info] of candidateMap) {
      let priorityScore = 0.5; // default
      if (this.conceptStore && this.conceptStore.getUsageStats) {
        const stats = this.conceptStore.getUsageStats(info.cause);
        if (stats && stats.priority !== undefined) {
          priorityScore = stats.priority;
        }
      }

      // Depth penalty: direct causes rank higher than transitive
      const depthPenalty = info.depth * 0.1;
      const adjustedScore = Math.max(0, priorityScore - depthPenalty);

      rankedHypotheses.push({
        hypothesis: info.cause,
        band: 'PLAUSIBLE',
        priorityScore: Math.round(priorityScore * 100) / 100,
        depth: info.depth,
        isTransitive: info.isTransitive,
        combinedScore: Math.round(adjustedScore * 100) / 100,
        viaFact: {
          subject: info.fact.subject,
          relation: info.fact.relation,
          object: info.fact.object
        }
      });
    }

    // Sort by combined score (descending)
    rankedHypotheses.sort((a, b) => b.combinedScore - a.combinedScore);

    // Take top k
    const topHypotheses = rankedHypotheses.slice(0, k);
    const best = topHypotheses[0] || null;

    return {
      hypothesis: best ? best.hypothesis : null,
      band: best ? best.band : 'FALSE',
      hypotheses: topHypotheses
    };
  }

  /**
   * Check if a fact exists directly in the knowledge base
   *
   * Returns:
   * - TRUE_CERTAIN with confidence 1.0 when fact exists directly
   * - FALSE when explicit negation exists (NOT_R or PROHIBITED relations)
   * - UNKNOWN when no evidence either way
   *
   * For computable relations (LESS_THAN, PLUS, etc.), delegates to the
   * appropriate compute plugin which returns computed results.
   *
   * @param {string} subject - The subject
   * @param {string} relation - The relation
   * @param {string} object - The object
   * @param {Array} contextStack - Optional theory context
   * @returns {Object} Result with truth, confidence, and method
   */
  factExists(subject, relation, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const sNorm = norm(subject);
    const oNorm = norm(object);

    // Check for direct fact first (even for computable relations)
    const exists = facts.some((f) => {
      const fSub = norm(f.subject);
      const fRel = f.relation;
      const fObj = norm(f.object);
      return fSub === sNorm && fRel === relation && fObj === oNorm;
    });

    if (exists) {
      return { truth: 'TRUE_CERTAIN', confidence: 1.0, method: 'direct' };
    }

    // Check if this is a computable relation - delegate to plugin
    if (this.pluginRegistry && this.pluginRegistry.isComputable(relation)) {
      // Extract numeric values for subject and object
      const subjectValue = this.pluginRegistry.extractNumericValue(subject, this.conceptStore);
      const objectValue = this.pluginRegistry.extractNumericValue(object, this.conceptStore);

      // If we can extract values, compute the result
      if (subjectValue !== null || objectValue !== null) {
        return this.pluginRegistry.evaluate(relation, subjectValue || subject, objectValue || object);
      }
    }

    // Check for explicit negation (NOT_R pattern or PROHIBITED_FROM)
    const negationRelation = 'NOT_' + relation;
    const hasNegation = facts.some((f) => {
      const fSub = norm(f.subject);
      const fRel = f.relation;
      const fObj = norm(f.object);
      return fSub === sNorm && fRel === negationRelation && fObj === oNorm;
    });

    if (hasNegation) {
      return { truth: 'FALSE', confidence: 1.0, method: 'explicit_negation' };
    }

    // Check if PROHIBITED_FROM exists for permission-related queries
    if (relation === 'PERMITTED_TO' || relation === 'CAN') {
      const isProhibited = facts.some((f) => {
        const fSub = norm(f.subject);
        const fRel = f.relation;
        const fObj = norm(f.object);
        return fSub === sNorm && fRel === 'PROHIBITED_FROM' && fObj === oNorm;
      });
      if (isProhibited) {
        return { truth: 'FALSE', confidence: 1.0, method: 'prohibited' };
      }
    }

    // Check symmetric relation: if R is symmetric and B R A exists, then A R B is true
    const relProps = this.dimRegistry ? this.dimRegistry.getRelationProperties(relation) : null;
    if (relProps && relProps.symmetric) {
      const symmetricExists = facts.some((f) => {
        const fSub = norm(f.subject);
        const fRel = f.relation;
        const fObj = norm(f.object);
        return fSub === oNorm && fRel === relation && fObj === sNorm;
      });
      if (symmetricExists) {
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, method: 'symmetric' };
      }
    }

    // Check inverse relation: if R has inverse R', and B R' A exists, then A R B is true
    if (relProps && relProps.inverse) {
      const inverseRel = relProps.inverse;
      const inverseExists = facts.some((f) => {
        const fSub = norm(f.subject);
        const fRel = f.relation;
        const fObj = norm(f.object);
        return fSub === oNorm && fRel === inverseRel && fObj === sNorm;
      });
      if (inverseExists) {
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, method: 'inverse', inverseRelation: inverseRel };
      }
    }

    // Check if subject exists in knowledge base at all
    const subjectExists = facts.some(f =>
      norm(f.subject) === sNorm || norm(f.object) === sNorm
    );

    // No evidence found - return UNKNOWN
    return {
      truth: 'UNKNOWN',
      confidence: 0,
      method: subjectExists ? 'no_evidence' : 'unknown_subject'
    };
  }

  /**
   * Type inheritance reasoning - check if subject has relation via IS_A chain
   *
   * If X IS_A Y and Y has relation R to Z, then X inherits that relation.
   * Example: Tesla IS_A car, car HAS wheel → Tesla HAS wheel
   *          doctor IS_A medical_professional, medical_professional HELPS patient → doctor HELPS patient
   *
   * Returns:
   * - TRUE_CERTAIN with confidence when found (direct or inherited)
   * - FALSE when explicit negation found
   * - UNKNOWN when no evidence found
   *
   * @param {string} subject - The subject to check
   * @param {string} relation - The relation to look for
   * @param {string} object - The object in the relation
   * @param {Array} contextStack - Optional theory context
   * @returns {Object} Result with truth, confidence, and method
   */
  deduceWithInheritance(subject, relation, object, contextStack = null) {
    // First check direct fact
    const direct = this.factExists(subject, relation, object, contextStack);
    if (direct.truth === 'TRUE_CERTAIN') {
      return direct;
    }
    // If explicitly negated, return FALSE
    if (direct.truth === 'FALSE' && direct.method !== 'no_evidence') {
      return direct;
    }

    // Then check via IS_A chain: find all types that subject IS_A
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const subjectNorm = norm(subject);
    const visited = new Set();
    const stack = [{ node: subjectNorm, depth: 0 }];
    const maxSteps = this.config && this.config.get('maxReasonerIterations')
      ? this.config.get('maxReasonerIterations')
      : Number.MAX_SAFE_INTEGER;
    let steps = 0;

    while (stack.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        return { truth: 'UNKNOWN', confidence: 0, method: 'timeout' };
      }
      const { node: current, depth } = stack.pop();
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Check if current type has the relation to object
      const hasRelation = facts.some((f) => {
        const fSub = norm(f.subject);
        const fRel = f.relation;
        const fObj = norm(f.object);
        return fSub === current && fRel === relation && fObj === norm(object);
      });
      if (hasRelation) {
        // Confidence decays with inheritance depth
        const confidence = Math.pow(0.95, depth);
        return {
          truth: 'TRUE_CERTAIN',
          confidence: Math.round(confidence * 100) / 100,
          method: depth === 0 ? 'direct' : 'inheritance',
          inheritedFrom: current,
          depth
        };
      }

      // Find IS_A parents to continue traversal
      for (const fact of facts) {
        if (fact.relation === 'IS_A' && norm(fact.subject) === current) {
          stack.push({ node: norm(fact.object), depth: depth + 1 });
        }
      }
    }

    // Check if subject exists in knowledge base
    const subjectExists = facts.some(f =>
      norm(f.subject) === subjectNorm || norm(f.object) === subjectNorm
    );

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      method: subjectExists ? 'no_evidence' : 'unknown_subject'
    };
  }

  /**
   * Transitive relation reasoning - follows chains for configurable relations
   *
   * Works like deduceIsA but for any transitive relation.
   * Example: Paris LOCATED_IN France, France LOCATED_IN Europe
   *          → Paris LOCATED_IN Europe (via transitivity)
   *
   * Returns:
   * - TRUE_CERTAIN with confidence when path found
   * - FALSE when explicit negation exists
   * - UNKNOWN when no path found but subject exists
   *
   * @param {string} subject - Starting subject
   * @param {string} relation - The relation to traverse (LOCATED_IN, HAS_PART, etc.)
   * @param {string} object - Target object to reach
   * @param {Array} contextStack - Optional theory context
   * @returns {Object} Result with truth, confidence, and method
   */
  deduceTransitive(subject, relation, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const target = norm(object);
    const subjectNorm = norm(subject);
    const visited = new Set();
    const stack = [{ node: subjectNorm, depth: 0 }];
    const maxSteps = this.config && this.config.get('maxReasonerIterations')
      ? this.config.get('maxReasonerIterations')
      : Number.MAX_SAFE_INTEGER;
    let steps = 0;

    // Check for explicit negation (NOT_LOCATED_IN, etc.)
    const negationRelation = 'NOT_' + relation;
    const hasNegation = facts.some((f) => {
      const fSub = norm(f.subject);
      const fRel = f.relation;
      const fObj = norm(f.object);
      return fSub === subjectNorm && fRel === negationRelation && fObj === target;
    });
    if (hasNegation) {
      return { truth: 'FALSE', confidence: 1.0, method: 'explicit_negation' };
    }

    while (stack.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        return { truth: 'UNKNOWN', confidence: 0, method: 'timeout' };
      }
      const { node: current, depth } = stack.pop();
      if (current === target) {
        // Confidence decays with chain depth
        const confidence = Math.pow(0.95, depth);
        return {
          truth: 'TRUE_CERTAIN',
          confidence: Math.round(confidence * 100) / 100,
          method: depth === 0 ? 'direct' : 'transitive',
          depth
        };
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Find all facts where current is the subject with the given relation
      for (const fact of facts) {
        if (fact.relation === relation && norm(fact.subject) === current) {
          stack.push({ node: norm(fact.object), depth: depth + 1 });
        }
      }
    }

    // Check if subject exists in knowledge base
    const subjectExists = facts.some(f =>
      norm(f.subject) === subjectNorm || norm(f.object) === subjectNorm
    );

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      method: subjectExists ? 'no_path' : 'unknown_subject'
    };
  }
}

module.exports = Reasoner;
