/**
 * DS(/theory/dsl_commands_inference.js) - Inference DSL Commands
 *
 * Implements Sys2DSL commands for inference reasoning:
 * - INFER: Multi-method inference attempts
 * - FORWARD_CHAIN: Derive conclusions via forward chaining
 * - WHY: Explain inference results
 * - DEFINE_RULE: Register composition rules
 * - DEFINE_DEFAULT: Register default reasoning rules
 * - CLEAR_RULES: Clear all registered rules
 *
 * See also: DS(/reason/inference_engine), DS(/theory/dsl_commands_reasoning)
 *
 * @module theory/dsl_commands_inference
 */

class DSLCommandsInference {
  constructor({ inferenceEngine, parser }) {
    this.inferenceEngine = inferenceEngine;
    this.parser = parser;
  }

  /**
   * DEFINE_RULE: Register a composition/inference rule
   * Syntax: @var DEFINE_RULE name=ruleName head="?x REL ?z" body="?x REL1 ?y" body="?y REL2 ?z"
   *
   * Example: @r1 DEFINE_RULE name=grandparent head="?x GRANDPARENT_OF ?z" body="?x PARENT_OF ?y" body="?y PARENT_OF ?z"
   */
  cmdDefineRule(argTokens, env) {
    let name = null;
    let head = null;
    const bodyPatterns = [];

    for (const arg of argTokens) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded.startsWith('name=')) {
        name = expanded.split('=')[1];
      } else if (expanded.startsWith('head=')) {
        head = this._parsePattern(expanded.substring(5).replace(/^"|"$/g, ''));
      } else if (expanded.startsWith('body=')) {
        const pattern = this._parsePattern(expanded.substring(5).replace(/^"|"$/g, ''));
        if (pattern) bodyPatterns.push(pattern);
      }
    }

    if (!name || !head || bodyPatterns.length === 0) {
      throw new Error('DEFINE_RULE requires name=X head="pattern" body="pattern" [body="pattern"...]');
    }

    const rule = {
      name,
      head,
      body: bodyPatterns
    };

    this.inferenceEngine.registerRule(rule);

    return {
      ok: true,
      rule: name,
      head: `${head.subject} ${head.relation} ${head.object}`,
      bodyCount: bodyPatterns.length
    };
  }

  /**
   * DEFINE_DEFAULT: Register a default reasoning rule with exceptions
   * Syntax: @var DEFINE_DEFAULT name=ruleName type=TypeName property=REL value=VAL [exception=E1] [exception=E2]
   *
   * Example: @d1 DEFINE_DEFAULT name=birds_fly type=bird property=CAN value=fly exception=penguin exception=ostrich
   */
  cmdDefineDefault(argTokens, env) {
    let name = null;
    let typicalType = null;
    let property = null;
    let value = null;
    const exceptions = [];

    for (const arg of argTokens) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded.startsWith('name=')) {
        name = expanded.split('=')[1];
      } else if (expanded.startsWith('type=')) {
        typicalType = expanded.split('=')[1];
      } else if (expanded.startsWith('property=')) {
        property = expanded.split('=')[1];
      } else if (expanded.startsWith('value=')) {
        value = expanded.split('=')[1];
      } else if (expanded.startsWith('exception=')) {
        exceptions.push(expanded.split('=')[1]);
      }
    }

    if (!name || !typicalType || !property || !value) {
      throw new Error('DEFINE_DEFAULT requires name=X type=T property=P value=V [exception=E...]');
    }

    const defaultRule = {
      name,
      typicalType,
      property,
      value,
      exceptions
    };

    this.inferenceEngine.registerDefault(defaultRule);

    return {
      ok: true,
      rule: name,
      typicalType,
      property,
      value,
      exceptions
    };
  }

  /**
   * CLEAR_RULES: Clear all registered rules and defaults
   * Syntax: @var CLEAR_RULES
   */
  cmdClearRules() {
    this.inferenceEngine.rules = [];
    this.inferenceEngine.defaults = [];
    return { ok: true, cleared: true };
  }

  /**
   * Parse a pattern string like "?x REL ?y" into {subject, relation, object}
   */
  _parsePattern(patternStr) {
    const parts = patternStr.trim().split(/\s+/);
    if (parts.length < 3) return null;
    return {
      subject: parts[0],
      relation: parts[1],
      object: parts.slice(2).join(' ')
    };
  }

  /**
   * INFER: Attempt to infer a statement using all methods
   * Syntax: @var INFER Subject Relation Object [method=X] [proof=true]
   */
  cmdInfer(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('INFER expects Subject Relation Object');
    }

    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);

    let objectParts = [];
    const options = {};
    for (let i = 2; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);
      if (arg.startsWith('method=')) {
        options.methods = [arg.split('=')[1]];
      } else if (arg === 'proof=true') {
        options.includeProof = true;
      } else if (arg.startsWith('maxDepth=')) {
        options.maxDepth = parseInt(arg.split('=')[1], 10);
      } else {
        objectParts.push(arg);
      }
    }
    const object = objectParts.join(' ');

    const result = this.inferenceEngine.infer(subject, relation, object, facts, options);

    return {
      truth: result.truth,
      method: result.method,
      confidence: result.confidence,
      proof: options.includeProof ? result.proof : undefined,
      query: { subject, relation, object }
    };
  }

  /**
   * FORWARD_CHAIN: Derive all possible conclusions
   * Syntax: @var FORWARD_CHAIN [maxIterations=N]
   */
  cmdForwardChain(argTokens, env, facts) {
    let maxIterations = 100;

    for (const arg of argTokens) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded.startsWith('maxIterations=')) {
        maxIterations = parseInt(expanded.split('=')[1], 10);
      }
    }

    const newFacts = this.inferenceEngine.forwardChain(facts, maxIterations);

    return {
      truth: newFacts.length > 0 ? 'TRUE_CERTAIN' : 'FALSE',
      derived: newFacts,
      count: newFacts.length,
      originalCount: facts.length
    };
  }

  /**
   * WHY: Explain why something is true/false
   * Syntax: @var WHY Subject Relation Object
   */
  cmdWhy(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('WHY expects Subject Relation Object');
    }

    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    const result = this.inferenceEngine.infer(subject, relation, object, facts, {
      includeProof: true
    });

    const lines = [];
    lines.push(`Query: ${subject} ${relation} ${object}`);
    lines.push(`Result: ${result.truth}`);

    if (result.proof && result.proof.steps) {
      lines.push('');
      lines.push('Reasoning chain:');
      for (const step of result.proof.steps) {
        if (step.fact) {
          const f = step.fact;
          lines.push(`  - ${f.subject || f.from} ${f.relation || '→'} ${f.object || f.to} (${step.justification})`);
        } else if (step.rule) {
          lines.push(`  - Applied rule: ${step.rule}`);
        } else if (step.assumption) {
          lines.push(`  - Assumed: ${step.assumption}`);
        }
      }
    }

    if (result.method) {
      lines.push('');
      lines.push(`Method: ${result.method}`);
    }

    if (result.confidence !== undefined) {
      lines.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    return {
      explanation: lines.join('\n'),
      truth: result.truth,
      proof: result.proof,
      query: { subject, relation, object }
    };
  }
}

module.exports = DSLCommandsInference;
