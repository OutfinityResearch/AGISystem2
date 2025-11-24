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

  checkProcedureCompliance(procedureId, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const requirements = facts
      .filter((f) => f.subject === procedureId && f.relation === 'REQUIRES')
      .map((f) => f.object);
    if (requirements.length === 0) {
      return { truth: 'TRUE_CERTAIN' };
    }
    for (const req of requirements) {
      const satisfied = facts.some(
        (f) =>
          f.subject === req &&
          (f.relation === 'GIVEN' || f.relation === 'PRESENT') &&
          String(f.object).toLowerCase() === 'yes'
      );
      if (!satisfied) {
        return { truth: 'FALSE' };
      }
    }
    return { truth: 'TRUE_CERTAIN' };
  }

  checkExportAction(actionId, activeRegulations, contextStack = null) {
    const facts = this._getFacts(contextStack);
    let anyProhibit = false;
    let anyPermit = false;
    for (const reg of activeRegulations) {
      if (
        facts.some(
          (f) =>
            f.subject === actionId &&
            f.relation === 'PROHIBITED_BY' &&
            f.object === reg
        )
      ) {
        anyProhibit = true;
      }
      if (
        facts.some(
          (f) =>
            f.subject === actionId &&
            f.relation === 'PERMITTED_BY' &&
            f.object === reg
        )
      ) {
        anyPermit = true;
      }
    }
    if (anyPermit && anyProhibit) {
      return { truth: 'CONFLICT' };
    }
    if (anyProhibit && !anyPermit) {
      return { truth: 'FALSE' };
    }
    if (anyPermit && !anyProhibit) {
      return { truth: 'TRUE_CERTAIN' };
    }
    return { truth: 'FALSE' };
  }

  magicAllowed(actorId, cityId, contextStack = null) {
    const facts = this._getFacts(contextStack);
    const castsMagic = facts.some(
      (f) => f.subject === actorId && f.relation === 'CASTS' && f.object === 'Magic'
    );
    const located = facts.some(
      (f) => f.subject === actorId && f.relation === 'LOCATED_IN' && f.object === cityId
    );
    if (!castsMagic || !located) {
      return { truth: 'FALSE' };
    }
    const permitted = facts.some(
      (f) =>
        f.relation === 'PERMITS' &&
        (f.object === `Magic_IN ${cityId}` || f.object === `Magic_IN_${cityId}`)
    );
    if (permitted) {
      return { truth: 'TRUE_CERTAIN' };
    }
    return { truth: 'FALSE' };
  }
}

module.exports = Reasoner;
