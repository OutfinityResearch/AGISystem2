class Reasoner {
  constructor(conceptStore) {
    this.conceptStore = conceptStore;
    this.config = null;
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
    // În MVP, luăm primul candidat, band PLAUSIBLE.
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
