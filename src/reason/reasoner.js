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

  abductive(observationVector, relationName) {
    if (!this.permuter || !relationName || !this.retriever) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE'
      };
    }
    let table;
    try {
      table = this.permuter.get(relationName);
    } catch {
      return {
        concept: null,
        distance: null,
        band: 'FALSE'
      };
    }
    const hypVector = this.math.inversePermute
      ? this.math.inversePermute(observationVector, table)
      : MathEngine.inversePermute(observationVector, table);
    const candidates = this.retriever.nearest(hypVector, { k: 1 });
    if (!candidates || candidates.length === 0) {
      return {
        concept: null,
        distance: null,
        band: 'FALSE'
      };
    }
    const best = candidates[0];
    const bandInfo = this.adversarialCheck(hypVector, best.diamond);
    return {
      concept: best.label,
      distance: best.distance,
      band: bandInfo.band
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

  composeConcept(conceptId, stack) {
    const concept = this.conceptStore.getConcept(conceptId);
    if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
      return null;
    }
    return concept.diamonds[0];
  }

  adversarialCheck(vector, diamond) {
    if (!diamond) {
      return {
        truth: 'FALSE',
        band: 'FALSE',
        distance: Infinity,
        scepticRadius: 0,
        optimistRadius: 0
      };
    }
    const distance = this.math.distanceMaskedL1(vector, diamond);
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
    const check = this.adversarialCheck(queryVector, diamond);
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
    const visited = new Set();
    const stack = [subject];
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
      if (current === object) {
        return { truth: 'TRUE_CERTAIN' };
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const fact of facts) {
        if (fact.relation === 'IS_A' && fact.subject === current) {
          stack.push(fact.object);
        }
      }
    }
    return { truth: 'FALSE' };
  }

  abductCause(observation, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const candidates = [];
    for (const fact of facts) {
      if (fact.relation === 'CAUSES' && fact.object === observation) {
        candidates.push(fact.subject);
      } else if (fact.relation === 'CAUSED_BY' && fact.subject === observation) {
        candidates.push(fact.object);
      }
    }
    if (candidates.length === 0) {
      return { hypothesis: null, band: 'FALSE' };
    }
    return { hypothesis: candidates[0], band: 'PLAUSIBLE' };
  }

  factExists(subject, relation, object, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const exists = facts.some(
      (f) => f.subject === subject && f.relation === relation && f.object === object
    );
    return { truth: exists ? 'TRUE_CERTAIN' : 'FALSE' };
  }
}

module.exports = Reasoner;
