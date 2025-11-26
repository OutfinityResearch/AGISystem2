class TheoryDSLEngine {
  constructor({ api, conceptStore, config }) {
    this.api = api;
    this.conceptStore = conceptStore;
    this.config = config;
  }

  runScript(lines, options = {}) {
    const env = { ...(options.initialEnv || {}) };
    this._contextFacts = Array.isArray(options.contextFacts)
      ? options.contextFacts.slice()
      : [];

    const statements = this._splitIntoStatements(lines || []);
    const order = this._topologicalOrder(statements);
    for (const stmt of order) {
      // Get fresh facts for each command (in case ASSERT/RETRACT modified them)
      const facts = this._getFacts(this._contextFacts);
      const value = this._executeCommand(stmt.command, stmt.args, env, facts);
      env[stmt.varName] = value;
    }

    return env;
  }

  _splitIntoStatements(lines) {
    const statements = [];
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const flushSegment = (segment) => {
        const seg = segment.trim();
        if (!seg) {
          return;
        }
        const parts = seg.split(/\s+/);
        // Minimum 2 parts: @varName COMMAND (args are optional)
        if (parts.length < 2 || !parts[0].startsWith('@')) {
          throw new Error(`Invalid Sys2DSL statement: '${seg}'`);
        }
        const varName = parts[0].slice(1);
        const command = parts[1].toUpperCase();
        const args = parts.slice(2);
        statements.push({ varName, command, args, raw: seg });
      };

      // Within each line, if additional '@' appear, treat them as new statements.
      let current = '';
      for (let pos = 0; pos < trimmed.length; pos += 1) {
        const ch = trimmed[pos];
        if (ch === '@' && current.trim().length > 0) {
          flushSegment(current);
          current = '@';
        } else {
          current += ch;
        }
      }
      if (current.trim().length > 0) {
        flushSegment(current);
      }
    }
    return statements;
  }

  _topologicalOrder(statements) {
    // Build dependency graph: each statement may depend on variables referenced via $name.
    const nameToStmt = new Map();
    for (const stmt of statements) {
      if (nameToStmt.has(stmt.varName)) {
        throw new Error(`Duplicate Sys2DSL variable '${stmt.varName}'`);
      }
      nameToStmt.set(stmt.varName, stmt);
      stmt.deps = new Set();
      stmt.dependents = [];
      stmt.inDegree = 0;
    }

    const varRefRegex = /\$([A-Za-z0-9_]+)/g;
    for (const stmt of statements) {
      const argsJoined = stmt.args.join(' ');
      let match;
      // eslint-disable-next-line no-cond-assign
      while ((match = varRefRegex.exec(argsJoined)) !== null) {
        const depName = match[1];
        if (depName === stmt.varName) {
          // Self-dependency is a cycle.
          throw new Error(`Cyclic Sys2DSL dependency on variable '${depName}'`);
        }
        if (nameToStmt.has(depName)) {
          stmt.deps.add(depName);
        }
      }
    }

    for (const stmt of statements) {
      for (const depName of stmt.deps) {
        const depStmt = nameToStmt.get(depName);
        depStmt.dependents.push(stmt);
        stmt.inDegree += 1;
      }
    }

    // Kahn's algorithm
    const queue = [];
    for (const stmt of statements) {
      if (stmt.inDegree === 0) {
        queue.push(stmt);
      }
    }

    const ordered = [];
    while (queue.length > 0) {
      const stmt = queue.shift();
      ordered.push(stmt);
      for (const dep of stmt.dependents) {
        dep.inDegree -= 1;
        if (dep.inDegree === 0) {
          queue.push(dep);
        }
      }
    }

    if (ordered.length !== statements.length) {
      const unresolved = statements
        .filter((s) => s.inDegree > 0)
        .map((s) => s.varName);
      throw new Error(`Cyclic Sys2DSL dependencies detected for variables: ${unresolved.join(', ')}`);
    }

    return ordered;
  }

  _getFacts(contextFacts) {
    const base = this.conceptStore && typeof this.conceptStore.getFacts === 'function'
      ? this.conceptStore.getFacts()
      : [];
    if (!contextFacts || contextFacts.length === 0) {
      return base;
    }
    return base.concat(contextFacts);
  }

  _executeCommand(command, argTokens, env, facts) {
    switch (command) {
      case 'ASK':
        return this._cmdAsk(argTokens, env);
      case 'ASSERT':
        return this._cmdAssert(argTokens, env);
      case 'CF':
        return this._cmdCounterfactual(argTokens, env);
      case 'ABDUCT':
        return this._cmdAbduct(argTokens, env);
      case 'FACTS_MATCHING':
        return this._cmdFactsMatching(argTokens, env, facts);
      case 'ALL_REQUIREMENTS_SATISFIED':
        return this._cmdAllRequirementsSatisfied(argTokens, env);
      case 'BOOL_AND':
        return this._cmdBoolAnd(argTokens, env);
      case 'NONEMPTY':
        return this._cmdNonEmpty(argTokens, env);
      case 'MERGE_LISTS':
        return this._cmdMergeLists(argTokens, env);
      case 'POLARITY_DECIDE':
        return this._cmdPolarityDecide(argTokens, env);
      case 'PICK_FIRST':
        return this._cmdPickFirst(argTokens, env);
      case 'BIND_CONCEPT':
        return this._cmdBindConcept(argTokens, env);
      case 'BIND_POINT':
        return this._cmdBindPoint(argTokens, env);
      case 'MASK_PARTITIONS':
        return this._cmdMaskPartitions(argTokens, env);
      case 'MASK_DIMS':
        return this._cmdMaskDims(argTokens, env);
      case 'ASK_MASKED':
        return this._cmdAskMasked(argTokens, env);

      // === Memory Management Commands (DS:/knowledge/usage_tracking, DS:/knowledge/forgetting) ===
      case 'RETRACT':
        return this._cmdRetract(argTokens, env);
      case 'GET_USAGE':
        return this._cmdGetUsage(argTokens, env);
      case 'FORGET':
        return this._cmdForget(argTokens, env);
      case 'BOOST':
        return this._cmdBoost(argTokens, env);
      case 'PROTECT':
        return this._cmdProtect(argTokens, env);

      // === Boolean Operations ===
      case 'BOOL_OR':
        return this._cmdBoolOr(argTokens, env);
      case 'BOOL_NOT':
        return this._cmdBoolNot(argTokens, env);

      // === List Operations ===
      case 'PICK_LAST':
        return this._cmdPickLast(argTokens, env);
      case 'COUNT':
        return this._cmdCount(argTokens, env);
      case 'FILTER':
        return this._cmdFilter(argTokens, env);

      // === Concept/Relation Management ===
      case 'DEFINE_CONCEPT':
        return this._cmdDefineConcept(argTokens, env);
      case 'INSPECT':
        return this._cmdInspect(argTokens, env);
      case 'BIND_RELATION':
        return this._cmdBindRelation(argTokens, env);
      case 'DEFINE_RELATION':
        return this._cmdDefineRelation(argTokens, env);

      // === Theory Management ===
      case 'LIST_THEORIES':
        return this._cmdListTheories(argTokens, env);
      case 'LOAD_THEORY':
        return this._cmdLoadTheory(argTokens, env);
      case 'SAVE_THEORY':
        return this._cmdSaveTheory(argTokens, env);
      case 'MERGE_THEORY':
        return this._cmdMergeTheory(argTokens, env);
      case 'THEORY_PUSH':
        return this._cmdTheoryPush(argTokens, env);
      case 'THEORY_POP':
        return this._cmdTheoryPop(argTokens, env);
      case 'RESET_SESSION':
        return this._cmdResetSession(argTokens, env);

      // === Reasoning Commands ===
      case 'VALIDATE':
        return this._cmdValidate(argTokens, env, facts);
      case 'PROVE':
        return this._cmdProve(argTokens, env, facts);
      case 'HYPOTHESIZE':
        return this._cmdHypothesize(argTokens, env, facts);
      case 'ANALOGICAL':
        return this._cmdAnalogical(argTokens, env);

      // === Output/Export Commands ===
      case 'TO_NATURAL':
        return this._cmdToNatural(argTokens, env);
      case 'TO_JSON':
        return this._cmdToJson(argTokens, env);
      case 'EXPLAIN':
        return this._cmdExplain(argTokens, env);

      // === Literal/Data Commands ===
      case 'LITERAL':
        return this._cmdLiteral(argTokens, env);

      default:
        throw new Error(`Unknown DSL command '${command}'`);
    }
  }

  _cmdAsk(argTokens, env) {
    const questionRaw = argTokens.join(' ');
    const question = this._expandString(questionRaw, env);
    return this.api.ask(question);
  }

  _cmdCounterfactual(argTokens, env) {
    const raw = argTokens.join(' ');
    const expanded = this._expandString(raw, env);
    const split = expanded.split('|');
    if (split.length < 2) {
      throw new Error('CF command expects "<question> | <fact1> ; <fact2> ; ..."');
    }
    const question = this._stripQuotes(split[0].trim());
    const factsPart = split.slice(1).join('|');
    const facts = factsPart
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return this.api.counterfactualAsk(question, facts);
  }

  _cmdAssert(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('ASSERT expects at least three tokens: Subject REL Object');
    }
    const subject = this._expandString(argTokens[0], env);
    const relation = this._expandString(argTokens[1], env);
    const object = this._expandString(argTokens.slice(2).join(' '), env);
    const sentence = `${subject} ${relation} ${object}`;
    this.api.ingest(sentence);
    return { ok: true, subject, relation, object };
  }

  _cmdAbduct(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('ABDUCT command expects at least an observation argument');
    }
    const observation = this._expandString(argTokens[0], env);
    const relation = argTokens.length >= 2
      ? this._expandString(argTokens[1], env)
      : null;
    return this.api.abduct(observation, relation);
  }

  _cmdFactsMatching(argTokens, env, facts) {
    const patternRaw = argTokens.join(' ');
    const pattern = this._expandString(patternRaw, env).trim();
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
      if (this._tokenMatches(subP, f.subject)
        && this._tokenMatches(relP, f.relation)
        && this._tokenMatches(objP, f.object)) {
        matches.push(f);
      }
    }
    return matches;
  }

  _cmdAllRequirementsSatisfied(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('ALL_REQUIREMENTS_SATISFIED expects <requirementsVar> <satisfiedVar>');
    }
    const reqList = this._resolveVarAsArray(argTokens[0], env);
    const satList = this._resolveVarAsArray(argTokens[1], env);
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

  _cmdBoolAnd(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('BOOL_AND expects two truth variables');
    }
    const a = this._resolveVar(argTokens[0], env);
    const b = this._resolveVar(argTokens[1], env);
    const truthA = a && a.truth ? a.truth : 'FALSE';
    const truthB = b && b.truth ? b.truth : 'FALSE';
    if (truthA === 'FALSE' || truthB === 'FALSE') {
      return { truth: 'FALSE' };
    }
    if (truthA === 'TRUE_CERTAIN' && truthB === 'TRUE_CERTAIN') {
      return { truth: 'TRUE_CERTAIN' };
    }
    // For now we do not surface PLAUSIBLE here; either both true or not.
    return { truth: 'FALSE' };
  }

  _cmdNonEmpty(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('NONEMPTY expects a list variable');
    }
    const list = this._resolveVarAsArray(argTokens[0], env);
    return { truth: list.length > 0 ? 'TRUE_CERTAIN' : 'FALSE' };
  }

  _cmdMergeLists(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('MERGE_LISTS expects two list variables');
    }
    const a = this._resolveVarAsArray(argTokens[0], env);
    const b = this._resolveVarAsArray(argTokens[1], env);
    return a.concat(b);
  }

  _cmdPolarityDecide(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('POLARITY_DECIDE expects <negListVar> <posListVar> <regsVar>');
    }
    const negList = this._resolveVarAsArray(argTokens[0], env);
    const posList = this._resolveVarAsArray(argTokens[1], env);
    const regsVal = this._resolveVar(argTokens[2], env);
    const regs = Array.isArray(regsVal) ? regsVal : [regsVal];

    let anyNeg = false;
    let anyPos = false;
    for (const reg of regs) {
      if (reg == null) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const regStr = String(reg);
      if (!anyNeg) {
        anyNeg = negList.some((f) => String(f.object) === regStr);
      }
      if (!anyPos) {
        anyPos = posList.some((f) => String(f.object) === regStr);
      }
    }

    if (anyNeg && anyPos) {
      return { truth: 'CONFLICT' };
    }
    if (anyNeg && !anyPos) {
      return { truth: 'FALSE' };
    }
    if (anyPos && !anyNeg) {
      return { truth: 'TRUE_CERTAIN' };
    }
    return { truth: 'FALSE' };
  }

  _cmdPickFirst(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PICK_FIRST expects a list variable');
    }
    const list = this._resolveVarAsArray(argTokens[0], env);
    return list.length > 0 ? list[0] : null;
  }

  _cmdBindConcept(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_CONCEPT expects a concept token');
    }
    const token = this._expandString(argTokens[0], env);
    const label = token;
    const concept = this.conceptStore.ensureConcept(label);
    return {
      kind: 'conceptRef',
      label,
      id: concept.label
    };
  }

  _cmdBindPoint(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_POINT expects a concept token or conceptRef');
    }
    const raw = this._resolveVar(argTokens[0], env) || this._expandString(argTokens[0], env);
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

  _cmdMaskPartitions(argTokens) {
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

  _cmdMaskDims(argTokens) {
    if (argTokens.length < 1) {
      throw new Error('MASK_DIMS expects at least one dimension name');
    }
    const dims = this.config.get('dimensions');
    const bytes = Math.ceil(dims / 8);
    const mask = new Uint8Array(bytes);
    const specParts = [];
    for (const rawName of argTokens) {
      const name = rawName.trim();
      if (!name) {
        // eslint-disable-next-line no-continue
        continue;
      }
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

  _cmdAskMasked(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('ASK_MASKED expects <maskVar> <question-string>');
    }
    const maskVarToken = argTokens[0];
    const maskVal = this._resolveVar(maskVarToken, env);
    if (!maskVal || maskVal.kind !== 'maskRef') {
      throw new Error(`ASK_MASKED expects a maskRef variable, got '${maskVarToken}'`);
    }
    const questionRaw = argTokens.slice(1).join(' ');
    const question = this._expandString(questionRaw, env);
    const base = this.api.ask(question, { mask: maskVal.dims });
    return { ...base, maskSpec: maskVal.spec };
  }

  _tokenMatches(patternToken, value) {
    if (patternToken === '?') {
      return true;
    }
    return String(patternToken) === String(value);
  }

  _expandString(str, env) {
    if (!str) {
      return '';
    }
    const unquoted = this._stripQuotes(str);
    return unquoted.replace(/\$([A-Za-z0-9_]+)/g, (match, name) => {
      if (Object.prototype.hasOwnProperty.call(env, name)) {
        const v = env[name];
        if (v == null) {
          return '';
        }
        return String(v);
      }
      return '';
    });
  }

  _stripQuotes(str) {
    if (
      (str.startsWith('"') && str.endsWith('"'))
      || (str.startsWith('\'') && str.endsWith('\''))
    ) {
      return str.slice(1, -1);
    }
    return str;
  }

  _resolveVar(token, env) {
    const name = token.startsWith('$') ? token.slice(1) : token;
    return Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
  }

  _resolveVarAsArray(token, env) {
    const value = this._resolveVar(token, env);
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }

  // =========================================================================
  // Memory Management Commands (DS:/knowledge/usage_tracking, DS:/knowledge/forgetting)
  // =========================================================================

  /**
   * RETRACT: Remove a fact from the knowledge base
   * Syntax: @var RETRACT Subject Relation Object
   */
  _cmdRetract(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('RETRACT expects at least three tokens: Subject REL Object');
    }
    const subject = this._expandString(argTokens[0], env);
    const relation = this._expandString(argTokens[1], env);
    const object = this._expandString(argTokens.slice(2).join(' '), env);

    // Find and remove matching facts
    const facts = this.conceptStore.getFacts();
    let removed = 0;
    for (let i = 0; i < facts.length; i++) {
      const f = facts[i];
      if (f.subject === subject && f.relation === relation && f.object === object) {
        this.conceptStore.removeFact(f._id !== undefined ? f._id : i);
        removed++;
      }
    }
    return { ok: removed > 0, removed, subject, relation, object };
  }

  /**
   * GET_USAGE: Get usage statistics for a concept
   * Syntax: @var GET_USAGE conceptLabel
   */
  _cmdGetUsage(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('GET_USAGE expects a concept label');
    }
    const label = this._expandString(argTokens[0], env);
    const stats = this.conceptStore.getUsageStats(label);
    return stats || { error: 'Concept not found', label };
  }

  /**
   * FORGET: Remove concepts based on criteria
   * Syntax: @var FORGET [threshold=N] [olderThan=Xd] [concept=label] [pattern=pat] [dryRun]
   */
  _cmdForget(argTokens, env) {
    const criteria = {};
    for (const token of argTokens) {
      const expanded = this._expandString(token, env);
      if (expanded === 'dryRun') {
        criteria.dryRun = true;
      } else if (expanded.startsWith('threshold=')) {
        criteria.threshold = parseInt(expanded.split('=')[1], 10);
      } else if (expanded.startsWith('olderThan=')) {
        criteria.olderThan = expanded.split('=')[1];
      } else if (expanded.startsWith('concept=')) {
        criteria.concept = expanded.split('=')[1];
      } else if (expanded.startsWith('pattern=')) {
        criteria.pattern = expanded.split('=')[1];
      }
    }
    return this.conceptStore.forget(criteria);
  }

  /**
   * BOOST: Increase usage count for a concept
   * Syntax: @var BOOST conceptLabel [amount]
   */
  _cmdBoost(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BOOST expects a concept label');
    }
    const label = this._expandString(argTokens[0], env);
    const amount = argTokens.length > 1 ? parseInt(this._expandString(argTokens[1], env), 10) : 10;
    this.conceptStore.boostUsage(label, amount);
    return { ok: true, label, amount };
  }

  /**
   * PROTECT: Mark concept as protected from forgetting
   * Syntax: @var PROTECT conceptLabel
   */
  _cmdProtect(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PROTECT expects a concept label');
    }
    const label = this._expandString(argTokens[0], env);
    this.conceptStore.protect(label);
    return { ok: true, label, protected: true };
  }

  // =========================================================================
  // Boolean Operations
  // =========================================================================

  /**
   * BOOL_OR: Logical OR of two truth values
   * Syntax: @var BOOL_OR $truthA $truthB
   */
  _cmdBoolOr(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('BOOL_OR expects two truth variables');
    }
    const a = this._resolveVar(argTokens[0], env);
    const b = this._resolveVar(argTokens[1], env);
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

  /**
   * BOOL_NOT: Logical NOT of a truth value
   * Syntax: @var BOOL_NOT $truth
   */
  _cmdBoolNot(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BOOL_NOT expects a truth variable');
    }
    const a = this._resolveVar(argTokens[0], env);
    const truth = a && a.truth ? a.truth : 'FALSE';

    if (truth === 'TRUE_CERTAIN') {
      return { truth: 'FALSE' };
    }
    if (truth === 'FALSE') {
      return { truth: 'TRUE_CERTAIN' };
    }
    // PLAUSIBLE or CONFLICT remain as is (negation is uncertain)
    return { truth: truth };
  }

  // =========================================================================
  // List Operations
  // =========================================================================

  /**
   * PICK_LAST: Get last element of a list
   * Syntax: @var PICK_LAST $listVar
   */
  _cmdPickLast(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PICK_LAST expects a list variable');
    }
    const list = this._resolveVarAsArray(argTokens[0], env);
    return list.length > 0 ? list[list.length - 1] : null;
  }

  /**
   * COUNT: Get count of elements in a list
   * Syntax: @var COUNT $listVar
   */
  _cmdCount(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('COUNT expects a list variable');
    }
    const list = this._resolveVarAsArray(argTokens[0], env);
    return { count: list.length };
  }

  /**
   * FILTER: Filter list by field value
   * Syntax: @var FILTER $listVar field=value
   */
  _cmdFilter(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('FILTER expects $listVar and field=value');
    }
    const list = this._resolveVarAsArray(argTokens[0], env);
    const filterExpr = this._expandString(argTokens[1], env);
    const [field, value] = filterExpr.split('=');

    return list.filter((item) => {
      if (item && typeof item === 'object') {
        return String(item[field]) === value;
      }
      return false;
    });
  }

  // =========================================================================
  // Concept/Relation Management
  // =========================================================================

  /**
   * DEFINE_CONCEPT: Create a new concept with optional vector
   * Syntax: @var DEFINE_CONCEPT label [vector=...]
   */
  _cmdDefineConcept(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_CONCEPT expects a label');
    }
    const label = this._expandString(argTokens[0], env);
    const concept = this.conceptStore.ensureConcept(label);

    // Optional vector initialization
    if (argTokens.length > 1) {
      const vectorStr = this._expandString(argTokens.slice(1).join(' '), env);
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

  /**
   * INSPECT: Get detailed info about a concept
   * Syntax: @var INSPECT conceptLabel
   */
  _cmdInspect(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('INSPECT expects a concept label');
    }
    const label = this._expandString(argTokens[0], env);
    return this.conceptStore.snapshot(label);
  }

  /**
   * BIND_RELATION: Bind a relation type for use in queries
   * Syntax: @var BIND_RELATION relationName
   */
  _cmdBindRelation(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BIND_RELATION expects a relation name');
    }
    const relation = this._expandString(argTokens[0], env);
    return {
      kind: 'relationRef',
      relation,
      properties: this._getRelationProperties(relation)
    };
  }

  /**
   * DEFINE_RELATION: Define a new relation type with properties
   * Syntax: @var DEFINE_RELATION name [symmetric] [transitive] [inverse=...]
   */
  _cmdDefineRelation(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_RELATION expects a relation name');
    }
    const name = this._expandString(argTokens[0], env);
    const properties = {
      symmetric: false,
      transitive: false,
      inverse: null
    };

    for (let i = 1; i < argTokens.length; i++) {
      const prop = this._expandString(argTokens[i], env).toLowerCase();
      if (prop === 'symmetric') properties.symmetric = true;
      else if (prop === 'transitive') properties.transitive = true;
      else if (prop.startsWith('inverse=')) {
        properties.inverse = prop.split('=')[1];
      }
    }

    // Store relation definition (in memory for now)
    if (!this._relationDefs) this._relationDefs = new Map();
    this._relationDefs.set(name, properties);

    return { ok: true, name, properties };
  }

  _getRelationProperties(relation) {
    if (this._relationDefs && this._relationDefs.has(relation)) {
      return this._relationDefs.get(relation);
    }
    // Default properties for known relations
    const defaults = {
      IS_A: { symmetric: false, transitive: true },
      HAS_PROPERTY: { symmetric: false, transitive: false },
      LOCATED_IN: { symmetric: false, transitive: true },
      DISJOINT_WITH: { symmetric: true, transitive: false }
    };
    return defaults[relation] || { symmetric: false, transitive: false };
  }

  // =========================================================================
  // Theory Management
  // =========================================================================

  /**
   * LIST_THEORIES: List available theories
   * Syntax: @var LIST_THEORIES
   */
  _cmdListTheories() {
    if (!this._theoryStack) this._theoryStack = [];
    return {
      active: this._theoryStack.map((t) => t.name),
      count: this._theoryStack.length
    };
  }

  /**
   * LOAD_THEORY: Load a theory by name
   * Syntax: @var LOAD_THEORY theoryName
   */
  _cmdLoadTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('LOAD_THEORY expects a theory name');
    }
    const name = this._expandString(argTokens[0], env);
    // Theory loading would typically involve file I/O
    // For now, return a placeholder
    return { ok: true, name, status: 'loaded' };
  }

  /**
   * SAVE_THEORY: Save current theory state
   * Syntax: @var SAVE_THEORY theoryName
   */
  _cmdSaveTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('SAVE_THEORY expects a theory name');
    }
    const name = this._expandString(argTokens[0], env);
    const facts = this.conceptStore.getFacts();
    const concepts = this.conceptStore.listConcepts();
    return {
      ok: true,
      name,
      factCount: facts.length,
      conceptCount: concepts.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * MERGE_THEORY: Merge another theory into current
   * Syntax: @var MERGE_THEORY theoryName
   */
  _cmdMergeTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('MERGE_THEORY expects a theory name');
    }
    const name = this._expandString(argTokens[0], env);
    return { ok: true, name, status: 'merged' };
  }

  /**
   * THEORY_PUSH: Push new theory layer for counterfactual reasoning
   * Syntax: @var THEORY_PUSH [name="layerName"]
   */
  _cmdTheoryPush(argTokens, env) {
    if (!this._theoryStack) this._theoryStack = [];
    if (!this._factSnapshots) this._factSnapshots = [];

    const name = argTokens.length > 0
      ? this._expandString(argTokens[0], env).replace(/^name=["']?|["']?$/g, '')
      : `layer_${this._theoryStack.length}`;

    // Snapshot current facts
    const snapshot = this.conceptStore.getFacts().map((f) => ({ ...f }));
    this._factSnapshots.push(snapshot);
    this._theoryStack.push({ name, pushedAt: new Date().toISOString() });

    return { ok: true, name, depth: this._theoryStack.length };
  }

  /**
   * THEORY_POP: Pop theory layer, restoring previous state
   * Syntax: @var THEORY_POP
   */
  _cmdTheoryPop() {
    if (!this._theoryStack || this._theoryStack.length === 0) {
      return { ok: false, error: 'No theory layer to pop' };
    }

    const popped = this._theoryStack.pop();
    const snapshot = this._factSnapshots.pop();

    // Restore facts (simplified - would need proper implementation)
    // This is a placeholder for actual state restoration

    return {
      ok: true,
      popped: popped.name,
      depth: this._theoryStack.length,
      restoredFacts: snapshot ? snapshot.length : 0
    };
  }

  /**
   * RESET_SESSION: Clear all session state
   * Syntax: @var RESET_SESSION
   */
  _cmdResetSession() {
    this._theoryStack = [];
    this._factSnapshots = [];
    this._relationDefs = new Map();
    return { ok: true, status: 'session_reset' };
  }

  // =========================================================================
  // Reasoning Commands
  // =========================================================================

  /**
   * VALIDATE: Check consistency of current theory
   * Syntax: @var VALIDATE [scope]
   */
  _cmdValidate(argTokens, env, facts) {
    const scope = argTokens.length > 0 ? this._expandString(argTokens[0], env) : 'all';
    const issues = [];

    // Check for obvious contradictions
    for (const fact of facts) {
      // Check DISJOINT_WITH violations
      if (fact.relation === 'LOCATED_IN') {
        const disjointFacts = facts.filter(
          (f) => f.relation === 'DISJOINT_WITH'
            && (f.subject === fact.object || f.object === fact.object)
        );
        for (const df of disjointFacts) {
          const otherZone = df.subject === fact.object ? df.object : df.subject;
          // Check if subject has properties requiring the other zone
          const conflicting = facts.filter(
            (f) => f.subject === fact.subject
              && f.relation === 'CASTS'
              && this._requiresZone(f.object, otherZone, facts)
          );
          if (conflicting.length > 0) {
            issues.push({
              type: 'DISJOINT_VIOLATION',
              subject: fact.subject,
              location: fact.object,
              conflictZone: otherZone,
              ability: conflicting[0].object
            });
          }
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
      scope,
      factCount: facts.length
    };
  }

  _requiresZone(ability, zone, facts) {
    // Simple heuristic: Magic requires MagicZone
    if (ability === 'Magic' && zone === 'MagicZone') return true;
    return false;
  }

  /**
   * PROVE: Attempt to prove a statement
   * Syntax: @var PROVE Subject Relation Object
   */
  _cmdProve(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('PROVE expects Subject Relation Object');
    }
    const subject = this._expandString(argTokens[0], env);
    const relation = this._expandString(argTokens[1], env);
    const object = this._expandString(argTokens.slice(2).join(' '), env);

    // Direct fact check
    const direct = facts.find(
      (f) => f.subject === subject && f.relation === relation && f.object === object
    );
    if (direct) {
      return { proven: true, method: 'direct', confidence: 1.0 };
    }

    // Transitive closure for transitive relations
    const props = this._getRelationProperties(relation);
    if (props.transitive) {
      const chain = this._findTransitiveChain(subject, relation, object, facts);
      if (chain) {
        return { proven: true, method: 'transitive', chain, confidence: 0.9 };
      }
    }

    // Symmetric check
    if (props.symmetric) {
      const reverse = facts.find(
        (f) => f.subject === object && f.relation === relation && f.object === subject
      );
      if (reverse) {
        return { proven: true, method: 'symmetric', confidence: 1.0 };
      }
    }

    return { proven: false, method: 'exhausted', confidence: 0 };
  }

  _findTransitiveChain(start, relation, end, facts, visited = new Set()) {
    if (visited.has(start)) return null;
    visited.add(start);

    const directLinks = facts.filter((f) => f.subject === start && f.relation === relation);
    for (const link of directLinks) {
      if (link.object === end) {
        return [start, end];
      }
      const subChain = this._findTransitiveChain(link.object, relation, end, facts, visited);
      if (subChain) {
        return [start, ...subChain];
      }
    }
    return null;
  }

  /**
   * HYPOTHESIZE: Generate hypotheses based on patterns
   * Syntax: @var HYPOTHESIZE Subject [Relation] [limit=N]
   */
  _cmdHypothesize(argTokens, env, facts) {
    if (argTokens.length < 1) {
      throw new Error('HYPOTHESIZE expects at least a subject');
    }
    const subject = this._expandString(argTokens[0], env);
    const relation = argTokens.length > 1 && !argTokens[1].startsWith('limit=')
      ? this._expandString(argTokens[1], env)
      : null;
    let limit = 5;
    for (const arg of argTokens) {
      if (arg.startsWith('limit=')) {
        limit = parseInt(arg.split('=')[1], 10);
      }
    }

    const hypotheses = [];

    // Find what the subject IS_A
    const types = facts.filter((f) => f.subject === subject && f.relation === 'IS_A');

    // For each type, find what other instances have
    for (const typeFact of types) {
      const sameType = facts.filter(
        (f) => f.relation === 'IS_A' && f.object === typeFact.object && f.subject !== subject
      );
      for (const peer of sameType) {
        const peerFacts = facts.filter(
          (f) => f.subject === peer.subject && (!relation || f.relation === relation)
        );
        for (const pf of peerFacts) {
          // Check if subject doesn't already have this
          const existing = facts.find(
            (f) => f.subject === subject && f.relation === pf.relation && f.object === pf.object
          );
          if (!existing) {
            hypotheses.push({
              subject,
              relation: pf.relation,
              object: pf.object,
              basis: `${peer.subject} (same ${typeFact.object})`,
              confidence: 0.6
            });
          }
        }
      }
    }

    // Deduplicate and limit
    const unique = [];
    const seen = new Set();
    for (const h of hypotheses) {
      const key = `${h.subject}:${h.relation}:${h.object}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(h);
      }
    }

    return {
      subject,
      hypotheses: unique.slice(0, limit),
      count: unique.length
    };
  }

  /**
   * ANALOGICAL: Perform analogical reasoning
   * Syntax: @var ANALOGICAL source_a=A source_b=B target_c=C
   */
  _cmdAnalogical(argTokens, env) {
    const params = {};
    for (const token of argTokens) {
      const expanded = this._expandString(token, env);
      if (expanded.includes('=')) {
        const [key, value] = expanded.split('=');
        params[key] = value;
      }
    }

    const { source_a, source_b, target_c } = params;
    if (!source_a || !source_b || !target_c) {
      throw new Error('ANALOGICAL requires source_a, source_b, and target_c parameters');
    }

    // Get concept vectors
    const conceptA = this.conceptStore.getConcept(source_a);
    const conceptB = this.conceptStore.getConcept(source_b);
    const conceptC = this.conceptStore.getConcept(target_c);

    if (!conceptA || !conceptB || !conceptC) {
      return { error: 'One or more concepts not found', params };
    }

    // Compute vector delta: B - A
    const centerA = conceptA.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerB = conceptB.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerC = conceptC.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);

    const delta = new Int8Array(centerA.length);
    const targetD = new Int8Array(centerC.length);

    for (let i = 0; i < centerA.length; i++) {
      delta[i] = centerB[i] - centerA[i];
      targetD[i] = Math.max(-127, Math.min(127, centerC[i] + delta[i]));
    }

    // Find nearest concept to targetD
    let nearest = null;
    let nearestDist = Infinity;
    for (const label of this.conceptStore.listConcepts()) {
      if (label === source_a || label === source_b || label === target_c) continue;
      const concept = this.conceptStore.getConcept(label);
      if (!concept || !concept.diamonds[0]) continue;

      const center = concept.diamonds[0].center;
      let dist = 0;
      for (let i = 0; i < center.length; i++) {
        dist += Math.abs(center[i] - targetD[i]);
      }
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = label;
      }
    }

    return {
      analogy: `${source_a} : ${source_b} :: ${target_c} : ${nearest || '?'}`,
      result: nearest,
      delta: Array.from(delta),
      confidence: nearest ? Math.max(0, 1 - nearestDist / (centerA.length * 128)) : 0
    };
  }

  // =========================================================================
  // Output/Export Commands
  // =========================================================================

  /**
   * TO_NATURAL: Convert result to natural language
   * Syntax: @var TO_NATURAL $resultVar
   */
  _cmdToNatural(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('TO_NATURAL expects a result variable');
    }
    const result = this._resolveVar(argTokens[0], env);
    if (!result) {
      return { text: 'No result to convert' };
    }

    // Generate natural language based on result type
    if (result.truth) {
      const truthMap = {
        TRUE_CERTAIN: 'Yes, this is definitely true.',
        FALSE: 'No, this is false.',
        PLAUSIBLE: 'This might be true, but I\'m not certain.',
        CONFLICT: 'There is a conflict in the available information.'
      };
      return { text: truthMap[result.truth] || `Truth value: ${result.truth}` };
    }

    if (result.proven !== undefined) {
      return {
        text: result.proven
          ? `Yes, this can be proven via ${result.method}.`
          : 'This cannot be proven with available facts.'
      };
    }

    if (result.hypotheses) {
      const lines = result.hypotheses.map(
        (h) => `${h.subject} may ${h.relation} ${h.object} (based on ${h.basis})`
      );
      return { text: lines.join('\n') || 'No hypotheses generated.' };
    }

    return { text: JSON.stringify(result) };
  }

  /**
   * TO_JSON: Convert result to JSON string
   * Syntax: @var TO_JSON $resultVar
   */
  _cmdToJson(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('TO_JSON expects a result variable');
    }
    const result = this._resolveVar(argTokens[0], env);
    return { json: JSON.stringify(result, null, 2) };
  }

  /**
   * EXPLAIN: Generate explanation for a result
   * Syntax: @var EXPLAIN $resultVar
   */
  _cmdExplain(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('EXPLAIN expects a result variable');
    }
    const result = this._resolveVar(argTokens[0], env);
    if (!result) {
      return { explanation: 'No result to explain' };
    }

    const steps = [];

    if (result.proven !== undefined) {
      steps.push(`Attempted to prove statement using ${result.method} method.`);
      if (result.chain) {
        steps.push(`Found transitive chain: ${result.chain.join(' → ')}`);
      }
      steps.push(result.proven ? 'Proof succeeded.' : 'Proof failed.');
    }

    if (result.issues) {
      steps.push(`Validation found ${result.issues.length} issue(s).`);
      for (const issue of result.issues) {
        steps.push(`- ${issue.type}: ${issue.subject} at ${issue.location}`);
      }
    }

    if (result.analogy) {
      steps.push(`Computed analogy: ${result.analogy}`);
      steps.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    return {
      explanation: steps.join('\n') || 'No detailed explanation available.',
      result
    };
  }

  // =========================================================================
  // Literal/Data Commands
  // =========================================================================

  /**
   * LITERAL: Create a literal value
   * Syntax: @var LITERAL value or @var LITERAL ["a", "b", "c"]
   */
  _cmdLiteral(argTokens, env) {
    const raw = argTokens.join(' ');
    const expanded = this._expandString(raw, env);

    // Try to parse as JSON
    try {
      return JSON.parse(expanded);
    } catch {
      // Return as string if not valid JSON
      return expanded;
    }
  }

  _resolveDimensionIndexByName(name) {
    // Map dimension names to indices based on config
    const dimNames = this.config.get('dimensionNames') || {};
    if (dimNames[name] !== undefined) {
      return dimNames[name];
    }
    // Try numeric
    const num = parseInt(name, 10);
    if (!isNaN(num) && num >= 0 && num < this.config.get('dimensions')) {
      return num;
    }
    return null;
  }
}

module.exports = TheoryDSLEngine;
