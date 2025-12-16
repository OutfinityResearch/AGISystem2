/**
 * AGISystem2 - Text Generator
 * @module decoding/text-generator
 *
 * Generates human-readable text from vectors and proof results.
 */

import { StructuralDecoder } from './structural-decoder.mjs';
import { PhrasingEngine } from './phrasing.mjs';

export class TextGenerator {
  /**
   * Create text generator
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
    this.decoder = new StructuralDecoder(session);
    this.phrasing = new PhrasingEngine();
  }

  /**
   * Generate summary text from vector
   * @param {Vector} vector - Vector to summarize
   * @returns {Object} Summary result
   */
  summarize(vector) {
    const decoded = this.decoder.decode(vector);

    if (!decoded.success) {
      return {
        success: false,
        text: 'Unable to decode vector.',
        reason: decoded.reason
      };
    }

    const text = this.phrasing.generateText(decoded.structure);

    return {
      success: true,
      text,
      structure: decoded.structure,
      confidence: decoded.confidence
    };
  }

  /**
   * Elaborate a proof result into readable text
   * @param {ProveResult} proof - Proof result
   * @returns {Object} Elaboration
   */
  elaborate(proof) {
    if (!proof.valid) {
      return {
        text: `Proof failed: ${proof.reason || 'unknown reason'}`,
        success: false
      };
    }

    const lines = [];
    lines.push('Proof:');

    // Describe the proof method
    if (proof.proof) {
      lines.push(this.describeProofTree(proof.proof, 1));
    }

    // List proof steps if available
    if (proof.steps && proof.steps.length > 0) {
      lines.push('');
      lines.push('Steps:');
      for (let i = 0; i < proof.steps.length; i++) {
        const step = proof.steps[i];
        lines.push(`  ${i + 1}. ${this.describeStep(step)}`);
      }
    }

    lines.push('');
    lines.push(`Confidence: ${(proof.confidence * 100).toFixed(1)}%`);

    return {
      text: lines.join('\n'),
      success: true
    };
  }

  /**
   * Describe a proof tree node
   */
  describeProofTree(tree, indent = 0) {
    const pad = '  '.repeat(indent);
    const lines = [];

    lines.push(`${pad}Goal: ${tree.goal}`);
    lines.push(`${pad}Method: ${tree.method}`);

    if (tree.rule) {
      lines.push(`${pad}Rule: ${tree.rule}`);
    }

    if (tree.premises && tree.premises.length > 0) {
      lines.push(`${pad}Premises:`);
      for (const premise of tree.premises) {
        lines.push(this.describeProofTree(premise, indent + 1));
      }
    }

    return lines.join('\n');
  }

  /**
   * Describe a single proof step
   */
  describeStep(step) {
    switch (step.operation) {
      case 'direct':
      case 'direct_match':
        return `Found direct match for: ${step.goal}`;
      case 'direct_weak':
      case 'weak_match':
        return `Found weak match for: ${step.goal}`;
      case 'try_rule':
        return `Trying rule ${step.result} for: ${step.goal}`;
      case 'rule_success':
        return `Successfully applied rule ${step.result}`;
      case 'rule_match':
        return `Matched rule ${step.rule} for: ${step.goal}`;
      case 'depth_limit':
        return `Depth limit reached for: ${step.goal}`;
      case 'cycle':
        return `Cycle detected for: ${step.goal}`;
      case 'failed':
        return `No proof found for: ${step.goal}`;
      default:
        return `${step.operation}: ${step.goal}`;
    }
  }

  /**
   * Generate explanation for query result
   * @param {QueryResult} result - Query result
   * @param {string} originalQuery - Original query string
   * @returns {Object} Explanation
   */
  explainQuery(result, originalQuery) {
    if (!result.success) {
      return {
        text: `Query failed: ${result.reason || 'No matches found'}`,
        success: false
      };
    }

    const lines = [];
    lines.push(`Query: ${originalQuery}`);
    lines.push('');
    lines.push('Results:');

    if (result.bindings && result.bindings.size > 0) {
      for (const [hole, binding] of result.bindings) {
        const answer = binding.answer || 'unknown';
        const conf = (binding.similarity * 100).toFixed(1);
        lines.push(`  ?${hole} = ${answer} (${conf}% confidence)`);

        if (binding.alternatives && binding.alternatives.length > 0) {
          lines.push('    Alternatives:');
          for (const alt of binding.alternatives.slice(0, 2)) {
            const altConf = (alt.similarity * 100).toFixed(1);
            lines.push(`      - ${alt.value} (${altConf}%)`);
          }
        }
      }
    }

    if (result.ambiguous) {
      lines.push('');
      lines.push('Warning: Results may be ambiguous.');
    }

    lines.push('');
    lines.push(`Overall confidence: ${(result.confidence * 100).toFixed(1)}%`);

    return {
      text: lines.join('\n'),
      success: true
    };
  }

  /**
   * Register custom phrasing template
   */
  registerTemplate(operator, pattern) {
    this.phrasing.registerTemplate(operator, pattern);
  }
}

export default TextGenerator;
