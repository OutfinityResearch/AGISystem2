/**
 * DS(/theory/dsl_commands_inference.js) - Inference DSL Commands
 *
 * Implements Sys2DSL commands for inference reasoning:
 * - INFER: Multi-method inference attempts
 * - FORWARD_CHAIN: Derive conclusions via forward chaining
 * - DEFINE_RULE: Define composition/inference rules
 * - DEFINE_DEFAULT: Define default reasoning rules
 * - WHY: Explain inference results
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
      derived: newFacts,
      count: newFacts.length,
      originalCount: facts.length
    };
  }

  /**
   * DEFINE_RULE: Define a composition/inference rule
   * Syntax: @var DEFINE_RULE name head=?x REL ?z body=?x REL1 ?y body=?y REL2 ?z
   */
  cmdDefineRule(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_RULE expects at least a rule name');
    }

    const name = this.parser.expandString(argTokens[0], env);
    let head = null;
    const body = [];

    for (let i = 1; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);

      if (arg.startsWith('head=')) {
        const parts = arg.substring(5).split(/\s+/);
        if (parts.length >= 3) {
          head = { subject: parts[0], relation: parts[1], object: parts[2] };
        }
      } else if (arg.startsWith('body=')) {
        const parts = arg.substring(5).split(/\s+/);
        if (parts.length >= 3) {
          body.push({ subject: parts[0], relation: parts[1], object: parts[2] });
        }
      }
    }

    if (!head || body.length === 0) {
      throw new Error('DEFINE_RULE requires head=... and at least one body=...');
    }

    this.inferenceEngine.registerRule({ name, head, body });

    return { ok: true, name, head, body };
  }

  /**
   * DEFINE_DEFAULT: Define a default reasoning rule
   * Syntax: @var DEFINE_DEFAULT name typical=Type property value exceptions=E1,E2
   */
  cmdDefineDefault(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DEFINE_DEFAULT expects a rule name');
    }

    const name = this.parser.expandString(argTokens[0], env);
    let typicalType = null;
    let property = null;
    let value = null;
    const exceptions = [];

    for (let i = 1; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);

      if (arg.startsWith('typical=')) {
        typicalType = arg.split('=')[1];
      } else if (arg.startsWith('property=')) {
        property = arg.split('=')[1];
      } else if (arg.startsWith('value=')) {
        value = arg.split('=')[1];
      } else if (arg.startsWith('exceptions=')) {
        const excs = arg.split('=')[1];
        exceptions.push(...excs.split(','));
      }
    }

    if (!typicalType || !property) {
      throw new Error('DEFINE_DEFAULT requires typical=... and property=...');
    }

    this.inferenceEngine.registerDefault({
      name,
      typicalType,
      property,
      value: value || property,
      exceptions
    });

    return { ok: true, name, typicalType, property, value, exceptions };
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
