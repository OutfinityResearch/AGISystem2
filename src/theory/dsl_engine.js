class TheoryDSLEngine {
  constructor({ api, conceptStore, config }) {
    this.api = api;
    this.conceptStore = conceptStore;
    this.config = config;
  }

  runScript(lines, options = {}) {
    const env = { ...(options.initialEnv || {}) };
    const contextFacts = Array.isArray(options.contextFacts)
      ? options.contextFacts.slice()
      : [];
    const facts = this._getFacts(contextFacts);

    const statements = this._splitIntoStatements(lines || []);
    const order = this._topologicalOrder(statements);
    for (const stmt of order) {
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
        if (parts.length < 3 || !parts[0].startsWith('@')) {
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
}

module.exports = TheoryDSLEngine;
