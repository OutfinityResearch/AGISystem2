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

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        // Comment or blank line.
        continue;
      }
      if (line.startsWith('@')) {
        this._executeAssignment(line, env, facts);
      } else {
        // Plain fact lines are ignored at DSL execution time.
        // They should have been ingested separately if needed.
        continue;
      }
    }

    return env;
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

  _executeAssignment(line, env, facts) {
    const tokens = line.split(/\s+/);
    if (tokens.length < 3) {
      throw new Error(`Invalid DSL assignment line: '${line}'`);
    }
    const varToken = tokens[0];
    const commandToken = tokens[1];
    const argTokens = tokens.slice(2);
    const varName = varToken.slice(1); // Drop leading '@'
    const command = commandToken.toUpperCase();
    const value = this._executeCommand(command, argTokens, env, facts);
    env[varName] = value;
  }

  _executeCommand(command, argTokens, env, facts) {
    switch (command) {
      case 'ASK':
        return this._cmdAsk(argTokens, env);
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
    const question = split[0].trim();
    const factsPart = split.slice(1).join('|');
    const facts = factsPart
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return this.api.counterfactualAsk(question, facts);
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
