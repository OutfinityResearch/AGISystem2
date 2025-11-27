const MathEngine = require('../core/math_engine');

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
    } else {
      this.conceptStore = storeOrDeps;
      this.stack = null;
      this.math = MathEngine;
      this.bias = null;
      this.retriever = null;
      this.temporal = null;
      this.config = null;
      this.permuter = null;
    }
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

  answer(queryVector, conceptId, options = {}) {
    const contextStack = options.contextStack || (this.stack && this.stack.getActiveLayers && this.stack.getActiveLayers()) || null;
    const maskOverride = options.mask || null;
    const diamond = this.composeConcept(conceptId, contextStack);
    if (!diamond) {
      return {
        result: 'UNKNOWN',
        band: 'FALSE',
        provenance: {
          conceptId,
          reason: 'NO_CONCEPT'
        }
      };
    }
    const check = this.adversarialCheck(queryVector, diamond, maskOverride);
    return {
      result: check.truth,
      band: check.band,
      provenance: {
        conceptId,
        distance: check.distance,
        scepticRadius: check.scepticRadius,
        optimistRadius: check.optimistRadius
      }
    };
  }

  deduceIsA(subject, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const target = norm(object);
    const visited = new Set();
    const stack = [norm(subject)];
    const maxSteps = this.config && this.config.get('maxReasonerIterations')
      ? this.config.get('maxReasonerIterations')
      : Number.MAX_SAFE_INTEGER;
    let steps = 0;
    while (stack.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        return { truth: 'UNKNOWN_TIMEOUT' };
      }
      const current = stack.pop();
      if (current === target) {
        return { truth: 'TRUE_CERTAIN' };
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const fact of facts) {
        if (fact.relation === 'IS_A' && norm(fact.subject) === current) {
          stack.push(norm(fact.object));
        }
      }
    }
    return { truth: 'FALSE' };
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

  factExists(subject, relation, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const sNorm = norm(subject);
    const oNorm = norm(object);
    const exists = facts.some((f) => {
      const fSub = norm(f.subject);
      const fRel = f.relation;
      const fObj = norm(f.object);
      return fSub === sNorm && fRel === relation && fObj === oNorm;
    });
    return { truth: exists ? 'TRUE_CERTAIN' : 'FALSE' };
  }
}

module.exports = Reasoner;
