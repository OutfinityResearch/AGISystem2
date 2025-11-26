/**
 * DS(/theory/dsl_commands_output.js) - Output/Export DSL Commands
 *
 * Implements Sys2DSL commands for result formatting:
 * - TO_NATURAL: Convert to human-readable text
 * - TO_JSON: Convert to JSON format
 * - EXPLAIN: Generate detailed explanations
 *
 * @module theory/dsl_commands_output
 */

class DSLCommandsOutput {
  constructor({ parser }) {
    this.parser = parser;
  }

  /**
   * TO_NATURAL: Convert result to natural language
   * Syntax: @var TO_NATURAL $resultVar
   */
  cmdToNatural(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('TO_NATURAL expects a result variable');
    }
    const result = this.parser.resolveVar(argTokens[0], env);
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

    if (result.analogy) {
      return { text: `Analogy: ${result.analogy}` };
    }

    if (result.consistent !== undefined) {
      return {
        text: result.consistent
          ? 'The knowledge base is consistent.'
          : `Inconsistencies found: ${result.contradictions.length} contradiction(s).`
      };
    }

    if (result.explanation) {
      return { text: result.explanation };
    }

    return { text: JSON.stringify(result) };
  }

  /**
   * TO_JSON: Convert result to JSON string
   * Syntax: @var TO_JSON $resultVar [pretty]
   */
  cmdToJson(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('TO_JSON expects a result variable');
    }
    const result = this.parser.resolveVar(argTokens[0], env);
    const pretty = argTokens.length > 1 && argTokens[1] === 'pretty';
    return { json: JSON.stringify(result, null, pretty ? 2 : 0) };
  }

  /**
   * EXPLAIN: Generate explanation for a result
   * Syntax: @var EXPLAIN $resultVar
   */
  cmdExplain(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('EXPLAIN expects a result variable');
    }
    const result = this.parser.resolveVar(argTokens[0], env);
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

    if (result.contradictions && result.contradictions.length > 0) {
      steps.push(`Found ${result.contradictions.length} contradiction(s):`);
      for (const c of result.contradictions) {
        steps.push(`- ${c.type}: ${c.subject || c.entity} (${c.relation || c.details})`);
      }
    }

    if (result.analogy) {
      steps.push(`Computed analogy: ${result.analogy}`);
      steps.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }

    if (result.hypotheses && result.hypotheses.length > 0) {
      steps.push(`Generated ${result.hypotheses.length} hypothesis(es):`);
      for (const h of result.hypotheses) {
        steps.push(`- ${h.subject} ${h.relation} ${h.object} (confidence: ${(h.confidence * 100).toFixed(0)}%)`);
      }
    }

    if (result.derived && result.derived.length > 0) {
      steps.push(`Forward chaining derived ${result.derived.length} new fact(s).`);
    }

    if (result.proof && result.proof.steps) {
      steps.push('Proof steps:');
      for (const step of result.proof.steps) {
        if (step.fact) {
          steps.push(`  ${step.fact.subject} ${step.fact.relation} ${step.fact.object}`);
        }
        if (step.justification) {
          steps.push(`    (${step.justification})`);
        }
      }
    }

    return {
      explanation: steps.join('\n') || 'No detailed explanation available.',
      result
    };
  }

  /**
   * FORMAT: Format a template with variables
   * Syntax: @var FORMAT "template with $var1 and $var2"
   */
  cmdFormat(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('FORMAT expects a template string');
    }
    const template = argTokens.join(' ');
    const formatted = this.parser.expandString(template, env);
    return { text: formatted };
  }

  /**
   * SUMMARIZE: Create a summary of facts/results
   * Syntax: @var SUMMARIZE $listVar [maxItems=N]
   */
  cmdSummarize(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('SUMMARIZE expects a variable');
    }

    const value = this.parser.resolveVar(argTokens[0], env);
    let maxItems = 5;

    for (const arg of argTokens.slice(1)) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded.startsWith('maxItems=')) {
        maxItems = parseInt(expanded.split('=')[1], 10);
      }
    }

    if (Array.isArray(value)) {
      const items = value.slice(0, maxItems);
      const summary = items.map((item) => {
        if (item.subject && item.relation && item.object) {
          return `${item.subject} ${item.relation} ${item.object}`;
        }
        return JSON.stringify(item);
      });

      return {
        summary: summary.join('\n'),
        total: value.length,
        shown: items.length,
        truncated: value.length > maxItems
      };
    }

    return {
      summary: JSON.stringify(value, null, 2),
      total: 1,
      shown: 1,
      truncated: false
    };
  }
}

module.exports = DSLCommandsOutput;
