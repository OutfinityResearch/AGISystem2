/**
 * DS(/theory/dsl_commands_core.js) - Core DSL Commands v3.0
 *
 * Implements fundamental Sys2DSL v3.0 commands for knowledge manipulation.
 *
 * v3.0 Changes:
 * - ASK/ASSERT are deprecated (implicit via @varName vs @_ prefix)
 * - New dimension operations: DIM_PAIR, SET_DIM, HAS_DIM
 * - All commands use strict triple syntax: @var Subject VERB Object
 *
 * Command categories:
 * - Fact queries: FACTS, INSTANCES_OF, ALL_REQUIREMENTS_SATISFIED
 * - Boolean operations: AND, OR, NOT, NONEMPTY
 * - List operations: MERGE, FIRST, LAST, COUNT, FILTER
 * - Concept/relation binding: BIND_CONCEPT, DEFINE_CONCEPT, etc.
 * - Dimension operations: DIM_PAIR, SET_DIM, HAS_DIM
 * - Reasoning: CF (counterfactual), ABDUCT
 *
 * @module theory/dsl_commands_core
 */

const DimensionRegistry = require('../core/dimension_registry');

class DSLCommandsCore {
  constructor({ api, conceptStore, config, parser, dimensionRegistry }) {
    this.api = api;
    this.conceptStore = conceptStore;
    this.config = config;
    this.parser = parser;
    this._relationDefs = new Map();
    this.dimRegistry = dimensionRegistry || DimensionRegistry.getShared();
  }

  // =========================================================================
  // Query Commands
  // =========================================================================

  /**
   * @deprecated v3.0 - Use @varName Subject VERB Object syntax instead
   * In v3.0, queries are implicit when varName !== '_'
   */
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

  /**
   * @deprecated v3.0 - Use @_ Subject VERB Object syntax instead
   * In v3.0, assertions are implicit when varName === '_'
   */
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

  /**
   * FACTS_MATCHING - Polymorphic fact query command
   *
   * Accepts 1, 2, or 3 arguments:
   *   FACTS_MATCHING Subject                    - all facts about Subject
   *   FACTS_MATCHING Subject RELATION           - all facts: Subject RELATION ?
   *   FACTS_MATCHING Subject RELATION Object    - exact match
   *
   * Composes with variables:
   *   @dogs FACTS_MATCHING Dog IS_A
   *   @first PICK_FIRST $dogs
   *   @related FACTS_MATCHING $first.object     - chain queries
   */
  cmdFactsMatching(argTokens, env, facts) {
    if (argTokens.length === 0) {
      return facts; // Return all facts if no arguments
    }

    // Expand all tokens with variable substitution
    const expandedTokens = argTokens.map(t => this.parser.expandString(t, env).trim());

    // Handle variable references that might be fact objects
    const resolveFactField = (token) => {
      if (token.startsWith('$')) {
        const resolved = this.parser.resolveVar(token, env);
        if (resolved && typeof resolved === 'object') {
          // If it's a fact object, we might want subject/object/relation
          return resolved.subject || resolved.object || resolved.relation || String(resolved);
        }
        return String(resolved || '');
      }
      return token;
    };

    // In v3 syntax, "any" is a wildcard placeholder - filter it out
    const tokens = expandedTokens
      .map(resolveFactField)
      .filter(t => t.length > 0 && t.toLowerCase() !== 'any');

    if (tokens.length === 0) {
      return facts; // "any any" means return all facts
    }

    const matches = [];

    if (tokens.length === 1) {
      // FACTS_MATCHING Subject - all facts where subject OR object matches
      const pattern = tokens[0];
      for (const f of facts) {
        if (String(f.subject) === pattern || String(f.object) === pattern) {
          matches.push(f);
        }
      }
    } else if (tokens.length === 2) {
      // FACTS_MATCHING Subject RELATION - all facts matching subject and relation
      const subP = tokens[0];
      const relP = tokens[1];
      for (const f of facts) {
        if (String(f.subject) === subP && String(f.relation) === relP) {
          matches.push(f);
        }
      }
    } else {
      // FACTS_MATCHING Subject RELATION Object - exact match
      const subP = tokens[0];
      const relP = tokens[1];
      const objP = tokens.slice(2).join(' ');
      for (const f of facts) {
        if (String(f.subject) === subP
            && String(f.relation) === relP
            && String(f.object) === objP) {
          matches.push(f);
        }
      }
    }

    return matches;
  }

  /**
   * FACTS_WITH_RELATION - Find all facts with a specific relation
   *   FACTS_WITH_RELATION IS_A              - all IS_A facts
   *   FACTS_WITH_RELATION CAUSES            - all CAUSES facts
   */
  cmdFactsWithRelation(argTokens, env, facts) {
    if (argTokens.length === 0) {
      return facts;
    }
    const relation = this.parser.expandString(argTokens[0], env).trim();
    return facts.filter(f => String(f.relation) === relation);
  }

  /**
   * FACTS_WITH_OBJECT - Find all facts with a specific object
   *   FACTS_WITH_OBJECT Animal             - all facts where object=Animal
   */
  cmdFactsWithObject(argTokens, env, facts) {
    if (argTokens.length === 0) {
      return facts;
    }
    const object = this.parser.expandString(argTokens.join(' '), env).trim();
    return facts.filter(f => String(f.object) === object);
  }

  /**
   * INSTANCES_OF - Shorthand for finding all subjects with IS_A relation to object
   *   INSTANCES_OF Animal                  - all X where X IS_A Animal
   */
  cmdInstancesOf(argTokens, env, facts) {
    if (argTokens.length === 0) {
      return [];
    }
    const type = this.parser.expandString(argTokens.join(' '), env).trim();
    return facts.filter(f => String(f.relation) === 'IS_A' && String(f.object) === type);
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
    // Return first element directly for backward compatibility
    // Callers expect the raw element, not a wrapped object
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
      throw new Error('INSPECT expects a concept label or variable reference');
    }
    const token = argTokens[0];

    // If it's a variable reference, return the resolved object directly
    if (token && token.startsWith('$')) {
      const resolved = this.parser.resolveVar(token, env);
      if (resolved !== undefined) {
        return resolved;
      }
    }

    // Otherwise, treat as concept label and get snapshot
    const label = this.parser.expandString(token, env);
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
    // First check local overrides
    if (this._relationDefs.has(relation)) {
      return this._relationDefs.get(relation);
    }
    // Then use DimensionRegistry (single source of truth)
    return this.dimRegistry.getRelationProperties(relation);
  }

  _resolveDimensionIndexByName(name) {
    // First try DimensionRegistry for axis lookup by name
    const axisIndex = this.dimRegistry.getAxisIndex(name);
    if (axisIndex !== undefined) {
      return axisIndex;
    }
    // Fallback to legacy config dimensionNames
    const dimNames = this.config.get('dimensionNames') || {};
    if (dimNames[name] !== undefined) {
      return dimNames[name];
    }
    // Try parsing as numeric index
    const num = parseInt(name, 10);
    if (!isNaN(num) && num >= 0 && num < this.config.get('dimensions')) {
      return num;
    }
    return null;
  }

  // =========================================================================
  // v3.0 Dimension Operations
  // =========================================================================

  /**
   * DIM_PAIR - Create a dimension-value pair
   * v3.0 Syntax: @bp boiling_point DIM_PAIR 100
   *
   * Creates a reference that can be used with SET_DIM and HAS_DIM.
   * Returns: { dimension: string, value: string }
   */
  cmdDimPair(dimension, value, env) {
    this.parser.validateNoPropertyValue(dimension, 'dimension');
    this.parser.validateNoPropertyValue(value, 'value');

    return {
      type: 'dim_pair',
      dimension,
      value
    };
  }

  /**
   * SET_DIM - Set a dimension on a concept
   * v3.0 Syntax: @_ Water SET_DIM $bp
   *
   * Applies a dimension-value pair to a concept.
   * The dimPair argument should be a result from DIM_PAIR command.
   */
  cmdSetDim(concept, dimPairRef, env) {
    this.parser.validateNoPropertyValue(concept, 'concept');

    // Resolve dimPair reference
    let dimPair = dimPairRef;
    if (typeof dimPairRef === 'string' && dimPairRef.startsWith('$')) {
      dimPair = this.parser.resolveVar(dimPairRef, env);
    }

    if (!dimPair || dimPair.type !== 'dim_pair') {
      throw new Error(
        `SET_DIM expects a dimension pair from DIM_PAIR command. ` +
        `Got: ${JSON.stringify(dimPair)}`
      );
    }

    // Add the dimension as a fact: concept HAS_DIMENSION dimension:value
    const sentence = `${concept} HAS_${dimPair.dimension.toUpperCase()} ${dimPair.value}`;
    this.api.ingest(sentence);

    return {
      ok: true,
      concept,
      dimension: dimPair.dimension,
      value: dimPair.value
    };
  }

  /**
   * HAS_DIM - Query if a concept has a dimension value
   * v3.0 Syntax: @q Water HAS_DIM $bp
   *
   * Checks if a concept has the specified dimension value.
   * Returns query result (TRUE_CERTAIN, FALSE, UNKNOWN).
   */
  cmdHasDim(concept, dimPairRef, env) {
    // Resolve dimPair reference
    let dimPair = dimPairRef;
    if (typeof dimPairRef === 'string' && dimPairRef.startsWith('$')) {
      dimPair = this.parser.resolveVar(dimPairRef, env);
    }

    if (!dimPair || dimPair.type !== 'dim_pair') {
      throw new Error(
        `HAS_DIM expects a dimension pair from DIM_PAIR command. ` +
        `Got: ${JSON.stringify(dimPair)}`
      );
    }

    // Query: concept HAS_DIMENSION value
    const question = `${concept} HAS_${dimPair.dimension.toUpperCase()} ${dimPair.value}`;
    return this.api.ask(question);
  }
}

module.exports = DSLCommandsCore;
