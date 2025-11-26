/**
 * DS(/theory/dsl_commands_core.js) - Core DSL Commands
 *
 * Implements fundamental Sys2DSL commands for knowledge manipulation:
 * - ASK, ASSERT, CF, ABDUCT
 * - FACTS_MATCHING, ALL_REQUIREMENTS_SATISFIED
 * - Boolean operations, list operations
 * - Concept/relation binding
 *
 * @module theory/dsl_commands_core
 */

class DSLCommandsCore {
  constructor({ api, conceptStore, config, parser }) {
    this.api = api;
    this.conceptStore = conceptStore;
    this.config = config;
    this.parser = parser;
    this._relationDefs = new Map();
  }

  // =========================================================================
  // Query Commands
  // =========================================================================

  cmdAsk(argTokens, env) {
    const questionRaw = argTokens.join(' ');
    const question = this.parser.expandString(questionRaw, env);

    const parts = question.replace(/[?"]/g, '').trim().split(/\s+/);
    if (parts.length >= 3) {
      this.parser.validateNoPropertyValue(parts[0], 'subject');
      this.parser.validateNoPropertyValue(parts.slice(2).join(' '), 'object');
    }

    return this.api.ask(question);
  }

  cmdCounterfactual(argTokens, env) {
    const raw = argTokens.join(' ');
    const expanded = this.parser.expandString(raw, env);
    const split = expanded.split('|');
    if (split.length < 2) {
      throw new Error('CF command expects "<question> | <fact1> ; <fact2> ; ..."');
    }
    const question = this.parser.stripQuotes(split[0].trim());
    const factsPart = split.slice(1).join('|');
    const facts = factsPart
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return this.api.counterfactualAsk(question, facts);
  }

  cmdAssert(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('ASSERT expects at least three tokens: Subject REL Object');
    }
    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    this.parser.validateNoPropertyValue(subject, 'subject');
    this.parser.validateNoPropertyValue(object, 'object');

    const sentence = `${subject} ${relation} ${object}`;
    this.api.ingest(sentence);
    return { ok: true, subject, relation, object };
  }

  cmdAbduct(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('ABDUCT command expects at least an observation argument');
    }
    const observation = this.parser.expandString(argTokens[0], env);
    const relation = argTokens.length >= 2
      ? this.parser.expandString(argTokens[1], env)
      : null;
    return this.api.abduct(observation, relation);
  }

  cmdFactsMatching(argTokens, env, facts) {
    const patternRaw = argTokens.join(' ');
    const pattern = this.parser.expandString(patternRaw, env).trim();
    if (!pattern) {
      return [];
    }
    const parts = pattern.split(/\s+/);
    if (parts.length < 3) {
      throw new Error(`FACTS_MATCHING pattern must have at least three tokens: '${pattern}'`);
    }
    const subP = parts[0];
    const relP = parts[1];
    const objP = parts.slice(2).join(' ');
    const matches = [];
    for (const f of facts) {
      if (this.parser.tokenMatches(subP, f.subject)
        && this.parser.tokenMatches(relP, f.relation)
        && this.parser.tokenMatches(objP, f.object)) {
        matches.push(f);
      }
    }
    return matches;
  }

  cmdAllRequirementsSatisfied(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('ALL_REQUIREMENTS_SATISFIED expects <requirementsVar> <satisfiedVar>');
    }
    const reqList = this.parser.resolveVarAsArray(argTokens[0], env);
    const satList = this.parser.resolveVarAsArray(argTokens[1], env);
    if (reqList.length === 0) {
      return { truth: 'TRUE_CERTAIN' };
    }
    for (const req of reqList) {
      const needed = req && req.object;
      if (typeof needed === 'undefined') {
        continue;
      }
      const covered = satList.some((f) => f && f.subject === needed);
      if (!covered) {
        return { truth: 'FALSE' };
      }
    }
    return { truth: 'TRUE_CERTAIN' };
  }

  // =========================================================================
  // Boolean Operations
  // =========================================================================

  cmdBoolAnd(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('BOOL_AND expects two truth variables');
    }
    const a = this.parser.resolveVar(argTokens[0], env);
    const b = this.parser.resolveVar(argTokens[1], env);
    const truthA = a && a.truth ? a.truth : 'FALSE';
    const truthB = b && b.truth ? b.truth : 'FALSE';
    if (truthA === 'FALSE' || truthB === 'FALSE') {
      return { truth: 'FALSE' };
    }
    if (truthA === 'TRUE_CERTAIN' && truthB === 'TRUE_CERTAIN') {
      return { truth: 'TRUE_CERTAIN' };
    }
    return { truth: 'FALSE' };
  }

  cmdBoolOr(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('BOOL_OR expects two truth variables');
    }
    const a = this.parser.resolveVar(argTokens[0], env);
    const b = this.parser.resolveVar(argTokens[1], env);
    const truthA = a && a.truth ? a.truth : 'FALSE';
    const truthB = b && b.truth ? b.truth : 'FALSE';

    if (truthA === 'TRUE_CERTAIN' || truthB === 'TRUE_CERTAIN') {
      return { truth: 'TRUE_CERTAIN' };
    }
    if (truthA === 'PLAUSIBLE' || truthB === 'PLAUSIBLE') {
      return { truth: 'PLAUSIBLE' };
    }
    return { truth: 'FALSE' };
  }

  cmdBoolNot(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BOOL_NOT expects a truth variable');
    }
    const a = this.parser.resolveVar(argTokens[0], env);
    const truth = a && a.truth ? a.truth : 'FALSE';

    if (truth === 'TRUE_CERTAIN') {
      return { truth: 'FALSE' };
    }
    if (truth === 'FALSE') {
      return { truth: 'TRUE_CERTAIN' };
    }
    return { truth: truth };
  }

  cmdNonEmpty(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('NONEMPTY expects a list variable');
    }
    const list = this.parser.resolveVarAsArray(argTokens[0], env);
    return { truth: list.length > 0 ? 'TRUE_CERTAIN' : 'FALSE' };
  }

  // =========================================================================
  // List Operations
  // =========================================================================

  cmdMergeLists(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('MERGE_LISTS expects two list variables');
    }
    const a = this.parser.resolveVarAsArray(argTokens[0], env);
    const b = this.parser.resolveVarAsArray(argTokens[1], env);
    return a.concat(b);
  }

  cmdPickFirst(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PICK_FIRST expects a list variable');
    }
    const list = this.parser.resolveVarAsArray(argTokens[0], env);
    return list.length > 0 ? list[0] : null;
  }

  cmdPickLast(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PICK_LAST expects a list variable');
    }
    const list = this.parser.resolveVarAsArray(argTokens[0], env);
    return list.length > 0 ? list[list.length - 1] : null;
  }

  cmdCount(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('COUNT expects a list variable');
    }
    const list = this.parser.resolveVarAsArray(argTokens[0], env);
    return { count: list.length };
  }

  cmdFilter(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('FILTER expects $listVar and field=value');
    }
    const list = this.parser.resolveVarAsArray(argTokens[0], env);
    const filterExpr = this.parser.expandString(argTokens[1], env);
    const [field, value] = filterExpr.split('=');

    return list.filter((item) => {
      if (item && typeof item === 'object') {
        return String(item[field]) === value;
      }
      return false;
    });
  }

  cmdPolarityDecide(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('POLARITY_DECIDE expects <negListVar> <posListVar> <regsVar>');
    }
    const negList = this.parser.resolveVarAsArray(argTokens[0], env);
    const posList = this.parser.resolveVarAsArray(argTokens[1], env);
    const regsVal = this.parser.resolveVar(argTokens[2], env);
    const regs = Array.isArray(regsVal) ? regsVal : [regsVal];

    let anyNeg = false;
    let anyPos = false;
    for (const reg of regs) {
      if (reg == null) continue;
      const regStr = String(reg);
      if (!anyNeg) {
        anyNeg = negList.some((f) => String(f.object) === regStr);
      }
      if (!anyPos) {
        anyPos = posList.some((f) => String(f.object) === regStr);
      }
    }

    if (anyNeg && anyPos) return { truth: 'CONFLICT' };
    if (anyNeg && !anyPos) return { truth: 'FALSE' };
    if (anyPos && !anyNeg) return { truth: 'TRUE_CERTAIN' };
    return { truth: 'FALSE' };
  }

  // =========================================================================
  // Concept/Relation Binding
  // =========================================================================

  cmdBindConcept(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_CONCEPT expects a concept token');
    }
    const token = this.parser.expandString(argTokens[0], env);
    const label = token;
    const concept = this.conceptStore.ensureConcept(label);
    return {
      kind: 'conceptRef',
      label,
      id: concept.label
    };
  }

  cmdBindPoint(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_POINT expects a concept token or conceptRef');
    }
    const raw = this.parser.resolveVar(argTokens[0], env) || this.parser.expandString(argTokens[0], env);
    let label;
    if (raw && raw.kind === 'conceptRef') {
      label = raw.label;
    } else {
      label = String(raw);
    }
    const concept = this.conceptStore.getConcept(label) || this.conceptStore.ensureConcept(label);
    const centers = concept.diamonds.map((d) => new Int8Array(d.center));
    return {
      kind: 'pointRef',
      conceptId: label,
      centers,
      meta: { diamondCount: concept.diamonds.length }
    };
  }

  cmdBindRelation(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_RELATION expects a relation name');
    }
    const relation = this.parser.expandString(argTokens[0], env);
    return {
      kind: 'relationRef',
      relation,
      properties: this.getRelationProperties(relation)
    };
  }

  cmdDefineConcept(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_CONCEPT expects a label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    const concept = this.conceptStore.ensureConcept(label);

    if (argTokens.length > 1) {
      const vectorStr = this.parser.expandString(argTokens.slice(1).join(' '), env);
      if (vectorStr.startsWith('vector=')) {
        const vecData = vectorStr.replace('vector=', '').replace(/[\[\]]/g, '').split(',');
        const vector = new Int8Array(vecData.map((v) => parseInt(v.trim(), 10)));
        if (concept.diamonds.length > 0) {
          concept.diamonds[0].initialiseFromVector(vector);
        }
      }
    }

    return { ok: true, label, id: concept.label };
  }

  cmdDefineRelation(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_RELATION expects a relation name');
    }
    const name = this.parser.expandString(argTokens[0], env);
    const properties = {
      symmetric: false,
      transitive: false,
      inverse: null
    };

    for (let i = 1; i < argTokens.length; i++) {
      const prop = this.parser.expandString(argTokens[i], env).toLowerCase();
      if (prop === 'symmetric') properties.symmetric = true;
      else if (prop === 'transitive') properties.transitive = true;
      else if (prop.startsWith('inverse=')) {
        properties.inverse = prop.split('=')[1];
      }
    }

    this._relationDefs.set(name, properties);
    return { ok: true, name, properties };
  }

  cmdInspect(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('INSPECT expects a concept label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    return this.conceptStore.snapshot(label);
  }

  cmdLiteral(argTokens, env) {
    const raw = argTokens.join(' ');
    const expanded = this.parser.expandString(raw, env);

    try {
      return JSON.parse(expanded);
    } catch {
      return expanded;
    }
  }

  // =========================================================================
  // Masking Commands
  // =========================================================================

  cmdMaskPartitions(argTokens) {
    if (argTokens.length < 1) {
      throw new Error('MASK_PARTITIONS expects at least one partition name');
    }
    const dims = this.config.get('dimensions');
    const bytes = Math.ceil(dims / 8);
    const mask = new Uint8Array(bytes);
    const specParts = [];
    for (const rawName of argTokens) {
      const name = rawName.toLowerCase();
      const part = this.config.getPartition(name);
      specParts.push(name);
      for (let i = part.start; i <= part.end && i < dims; i += 1) {
        const byteIndex = (i / 8) | 0;
        const bitIndex = i % 8;
        mask[byteIndex] |= 1 << bitIndex;
      }
    }
    return {
      kind: 'maskRef',
      dims: mask,
      spec: specParts.join(',')
    };
  }

  cmdMaskDims(argTokens) {
    if (argTokens.length < 1) {
      throw new Error('MASK_DIMS expects at least one dimension name');
    }
    const dims = this.config.get('dimensions');
    const bytes = Math.ceil(dims / 8);
    const mask = new Uint8Array(bytes);
    const specParts = [];
    for (const rawName of argTokens) {
      const name = rawName.trim();
      if (!name) continue;
      const index = this._resolveDimensionIndexByName(name);
      if (index == null) {
        throw new Error(`Unknown dimension name '${name}' for MASK_DIMS`);
      }
      const byteIndex = (index / 8) | 0;
      const bitIndex = index % 8;
      mask[byteIndex] |= 1 << bitIndex;
      specParts.push(name);
    }
    return {
      kind: 'maskRef',
      dims: mask,
      spec: specParts.join(',')
    };
  }

  cmdAskMasked(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('ASK_MASKED expects <maskVar> <question-string>');
    }
    const maskVarToken = argTokens[0];
    const maskVal = this.parser.resolveVar(maskVarToken, env);
    if (!maskVal || maskVal.kind !== 'maskRef') {
      throw new Error(`ASK_MASKED expects a maskRef variable, got '${maskVarToken}'`);
    }
    const questionRaw = argTokens.slice(1).join(' ');
    const question = this.parser.expandString(questionRaw, env);
    const base = this.api.ask(question, { mask: maskVal.dims });
    return { ...base, maskSpec: maskVal.spec };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  getRelationProperties(relation) {
    if (this._relationDefs.has(relation)) {
      return this._relationDefs.get(relation);
    }
    const defaults = {
      IS_A: { symmetric: false, transitive: true },
      HAS_PROPERTY: { symmetric: false, transitive: false },
      LOCATED_IN: { symmetric: false, transitive: true },
      DISJOINT_WITH: { symmetric: true, transitive: false }
    };
    return defaults[relation] || { symmetric: false, transitive: false };
  }

  _resolveDimensionIndexByName(name) {
    const dimNames = this.config.get('dimensionNames') || {};
    if (dimNames[name] !== undefined) {
      return dimNames[name];
    }
    const num = parseInt(name, 10);
    if (!isNaN(num) && num >= 0 && num < this.config.get('dimensions')) {
      return num;
    }
    return null;
  }
}

module.exports = DSLCommandsCore;
