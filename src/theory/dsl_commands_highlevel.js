/**
 * DS(/theory/dsl_commands_highlevel.js) - High-Level Sys2DSL Commands
 *
 * Wraps existing granular commands into a smaller set that tries multiple
 * strategies internally (ask → infer → geometric retrieval, etc.). This keeps
 * backward compatibility while enabling simpler NL→DSL generation.
 */

class DSLCommandsHighLevel {
  constructor({
    coreCommands,
    inferenceCommands,
    reasoningCommands,
    memoryCommands,
    theoryCommands,
    outputCommands,
    parser
  }) {
    this.core = coreCommands;
    this.infer = inferenceCommands;
    this.reason = reasoningCommands;
    this.memory = memoryCommands;
    this.theory = theoryCommands;
    this.output = outputCommands;
    this.parser = parser;
  }

  // ---------------------------------------------------------------------------
  // QUERY: ask → infer fallback (optional mask, proof)
  // ---------------------------------------------------------------------------
  cmdQuery(argTokens, env, facts) {
    const { args, mode, proof, maskVar } = this._parseQueryOptions(argTokens, env);
    if (args.length < 3) {
      throw new Error('QUERY expects at least Subject Relation Object');
    }

    // 1) Direct ASK (with optional mask)
    let askResult;
    if (maskVar) {
      askResult = this.core.cmdAskMasked([maskVar, ...args], env);
    } else {
      askResult = this.core.cmdAsk(args, env);
    }
    if (!askResult || askResult.truth !== 'UNKNOWN' || mode === 'geometric') {
      return { ...askResult, method: 'ask' };
    }

    // 2) Logical inference (if allowed)
    if (mode === 'logical' || mode === 'both') {
      const inferTokens = [...args];
      if (proof) {
        inferTokens.push('proof=true');
      }
      const inferResult = this.infer.cmdInfer(inferTokens, env, facts);
      if (inferResult && inferResult.truth !== 'UNKNOWN') {
        return { ...inferResult, method: inferResult.method || 'infer' };
      }
    }

    // Fallback to the original ASK result
    return { ...askResult, method: 'ask' };
  }

  // ---------------------------------------------------------------------------
  // WHATIF: counterfactual wrapper
  // ---------------------------------------------------------------------------
  cmdWhatif(argTokens, env) {
    // Reuse CF syntax: "<question> | fact1 ; fact2"
    return this.core.cmdCounterfactual(argTokens, env);
  }

  // ---------------------------------------------------------------------------
  // EXPLAIN: proof-oriented query + explanation
  // ---------------------------------------------------------------------------
  cmdExplain(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('EXPLAIN expects Subject Relation Object');
    }
    const proveResult = this.reason.cmdProve(argTokens, env, facts);
    const exp = this.output.cmdExplain(['_hlExplain'], {
      ...env,
      _hlExplain: proveResult
    });
    return {
      ...proveResult,
      explanation: exp.explanation
    };
  }

  // ---------------------------------------------------------------------------
  // SUGGEST: abduct first, then analogical if needed
  // ---------------------------------------------------------------------------
  cmdSuggest(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('SUGGEST expects at least one observation');
    }
    const abductResult = this.core.cmdAbduct(argTokens, env);
    if (abductResult && abductResult.hypotheses && abductResult.hypotheses.length > 0) {
      return { ...abductResult, method: 'abduct' };
    }

    // Analogical fallback requires three positional concepts A B C
    if (argTokens.length >= 3) {
      const analogical = this.reason.cmdAnalogical(argTokens.slice(0, 3), env);
      return { ...analogical, method: 'analogical' };
    }

    return {
      truth: 'UNKNOWN',
      method: 'abduct',
      note: 'No hypotheses generated'
    };
  }

  // ---------------------------------------------------------------------------
  // SUMMARIZE: facts matching + summarization
  // ---------------------------------------------------------------------------
  cmdSummarize(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('SUMMARIZE expects pattern: Subject Relation Object');
    }
    const matches = this.core.cmdFactsMatching(argTokens, env, facts);
    const envWithList = { ...env, _hlList: matches };
    const summary = this.output.cmdSummarize(['_hlList'], envWithList);
    return {
      ...summary,
      truth: matches.length > 0 ? 'TRUE_CERTAIN' : 'FALSE'
    };
  }

  // ---------------------------------------------------------------------------
  // MANAGE_THEORY: list/save/load/merge/delete
  // ---------------------------------------------------------------------------
  cmdManageTheory(argTokens, env) {
    const { action, name } = this._parseActionWithName(argTokens, env);
    switch (action) {
      case 'LIST':
      case 'LIST_THEORIES':
        return this.theory.cmdListTheories();
      case 'SAVE':
      case 'SAVE_THEORY':
        if (!name) throw new Error('MANAGE_THEORY SAVE requires name=');
        return this.theory.cmdSaveTheory([name], env);
      case 'LOAD':
      case 'LOAD_THEORY':
        if (!name) throw new Error('MANAGE_THEORY LOAD requires name=');
        return this.theory.cmdLoadTheory([name], env);
      case 'MERGE':
      case 'MERGE_THEORY':
        if (!name) throw new Error('MANAGE_THEORY MERGE requires name=');
        return this.theory.cmdMergeTheory([name], env);
      case 'DELETE':
      case 'DELETE_THEORY':
        if (!name) throw new Error('MANAGE_THEORY DELETE requires name=');
        return this.theory.cmdDeleteTheory([name], env);
      default:
        throw new Error('MANAGE_THEORY expects action=LIST|SAVE|LOAD|MERGE|DELETE');
    }
  }

  // ---------------------------------------------------------------------------
  // MEMORY: boost/forget/protect/unprotect/usage
  // ---------------------------------------------------------------------------
  cmdMemory(argTokens, env) {
    const { action, name, rest } = this._parseActionWithName(argTokens, env, true);
    switch (action) {
      case 'BOOST':
        return this.memory.cmdBoost([name, ...rest].filter(Boolean), env);
      case 'FORGET':
        return this.memory.cmdForget(rest, env);
      case 'PROTECT':
        return this.memory.cmdProtect([name].filter(Boolean), env);
      case 'UNPROTECT':
        return this.memory.cmdUnprotect([name].filter(Boolean), env);
      case 'USAGE':
      case 'GET_USAGE':
        return this.memory.cmdGetUsage([name].filter(Boolean), env);
      default:
        throw new Error('MEMORY expects action=BOOST|FORGET|PROTECT|UNPROTECT|USAGE');
    }
  }

  // ---------------------------------------------------------------------------
  // MASK: build partition/dimension masks
  // ---------------------------------------------------------------------------
  cmdMask(argTokens) {
    if (argTokens.length === 0) {
      throw new Error('MASK expects partition names or dims=');
    }
    const partitions = argTokens.filter((t) => !t.startsWith('dims='));
    const dimsArg = argTokens.find((t) => t.startsWith('dims='));

    if (partitions.length > 0) {
      return this.core.cmdMaskPartitions(partitions);
    }
    if (dimsArg) {
      const dimsList = dimsArg.replace('dims=', '').split(',').map((d) => d.trim()).filter(Boolean);
      return this.core.cmdMaskDims(dimsList);
    }
    throw new Error('MASK requires partitions or dims=<comma-separated>');
  }

  // ---------------------------------------------------------------------------
  // FORMAT: to natural/json/summary with preserved truth
  // ---------------------------------------------------------------------------
  cmdFormat(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('FORMAT expects style=<natural|json|summary> and a $var');
    }
    const styleToken = this.parser.expandString(argTokens[0], env);
    const style = styleToken.split('=').pop();
    const targetVar = argTokens[1];

    switch (style) {
      case 'natural':
        return this.output.cmdToNatural([targetVar], env);
      case 'json':
        return this.output.cmdToJson([targetVar, 'pretty'], env);
      case 'summary':
        return this.output.cmdSummarize([targetVar], env);
      default:
        throw new Error('FORMAT style must be natural|json|summary');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  _parseQueryOptions(argTokens, env) {
    const args = [];
    let mode = 'both';
    let proof = false;
    let maskVar = null;

    for (const tok of argTokens) {
      const expanded = this.parser.expandString(tok, env);
      if (expanded.startsWith('mode=')) {
        mode = expanded.split('=')[1];
      } else if (expanded === 'proof=true') {
        proof = true;
      } else if (expanded.startsWith('mask=')) {
        maskVar = expanded.split('=')[1];
      } else {
        args.push(expanded);
      }
    }

    return { args, mode, proof, maskVar };
  }

  _parseActionWithName(argTokens, env, keepRest = false) {
    let action = null;
    let name = null;
    const rest = [];
    for (const tok of argTokens) {
      const expanded = this.parser.expandString(tok, env);
      if (expanded.startsWith('action=')) {
        action = expanded.split('=')[1].toUpperCase();
      } else if (!action && !name && ['LIST', 'SAVE', 'LOAD', 'MERGE', 'DELETE', 'BOOST', 'FORGET', 'PROTECT', 'UNPROTECT', 'USAGE'].includes(expanded.toUpperCase())) {
        action = expanded.toUpperCase();
      } else if (expanded.startsWith('name=')) {
        name = expanded.split('=')[1];
      } else if (!name) {
        name = expanded;
      } else if (keepRest) {
        rest.push(tok);
      }
    }
    return { action, name, rest };
  }
}

module.exports = DSLCommandsHighLevel;
