/**
 * AGISystem2 - Structural Decoder
 * @module decoding/structural-decoder
 *
 * Decodes hypervectors back into structured representations.
 */

import { bind, similarity, topKSimilar } from '../core/operations.mjs';
import { removePosition } from '../core/position.mjs';
import { MAX_NESTING_DEPTH, SIMILARITY_THRESHOLD } from '../core/constants.mjs';
import { createTracer } from '../util/trace.mjs';

const trace = createTracer('decoder');

export class StructuralDecoder {
  /**
   * Create decoder
   * @param {Session} session - Parent session
   * @param {Object} options - Decoder options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxNesting: options.maxNesting || MAX_NESTING_DEPTH,
      operatorThreshold: options.operatorThreshold || 0.5,
      argThreshold: options.argThreshold || 0.45
    };
    this.currentDepth = 0;
  }

  /**
   * Decode vector to structure
   * @param {Vector} vector - Vector to decode
   * @returns {DecodeResult}
   */
  decode(vector) {
    trace('decode() START, depth:', this.currentDepth);

    // Step 1: Find operator
    trace('Step 1: Finding operator candidates');
    const operatorCandidates = [];

    // Check reserved operators
    for (const [name, opVec] of this.session.operators) {
      const sim = similarity(vector, opVec);
      if (sim > this.options.operatorThreshold) {
        operatorCandidates.push({ name, similarity: sim, reserved: true });
      }
    }

    // Check vocabulary atoms
    for (const [name, atomVec] of this.session.vocabulary.entries()) {
      if (!this.session.operators.has(name)) {
        const sim = similarity(vector, atomVec);
        if (sim > this.options.operatorThreshold) {
          operatorCandidates.push({ name, similarity: sim, reserved: false });
        }
      }
    }

    if (operatorCandidates.length === 0) {
      return {
        success: false,
        structure: null,
        confidence: 0,
        reason: 'No operator found'
      };
    }

    operatorCandidates.sort((a, b) => b.similarity - a.similarity);
    const operator = operatorCandidates[0];
    trace('Step 1: Found operator:', operator.name, 'sim:', operator.similarity.toFixed(3));

    // Step 2: Unbind operator
    const opVector = this.session.vocabulary.get(operator.name);
    const remainder = bind(vector, opVector);

    // Step 3: Extract arguments at each position
    trace('Step 3: Extracting arguments');
    const args = [];
    for (let pos = 1; pos <= 20; pos++) {
      const posUnbound = removePosition(pos, remainder);
      const matches = topKSimilar(posUnbound, this.session.vocabulary.atoms, 3);

      if (matches.length > 0 && matches[0].similarity > this.options.argThreshold) {
        // Check if argument might be compound
        const argVector = this.session.vocabulary.get(matches[0].name);
        const isCompound = this.mightBeCompound(posUnbound, argVector);

        if (isCompound && this.currentDepth < this.options.maxNesting) {
          this.currentDepth++;
          const nested = this.decode(posUnbound);
          this.currentDepth--;

          if (nested.success && nested.confidence > matches[0].similarity) {
            args.push({
              position: pos,
              value: null,
              nested: nested.structure,
              confidence: nested.confidence,
              alternatives: []
            });
            continue;
          }
        }

        args.push({
          position: pos,
          value: matches[0].name,
          confidence: matches[0].similarity,
          alternatives: matches.slice(1).map(m => ({
            value: m.name,
            confidence: m.similarity
          }))
        });
      }
    }

    // Step 4: Calculate overall confidence
    const argConfidences = args.map(a => a.confidence);
    const avgArgConf = argConfidences.length > 0
      ? argConfidences.reduce((a, b) => a + b, 0) / argConfidences.length
      : 0;

    const confidence = (operator.similarity + avgArgConf) / 2;

    trace('decode() END - operator:', operator.name, 'args:', args.length, 'conf:', confidence.toFixed(3));
    return {
      success: true,
      structure: {
        operator: operator.name,
        operatorConfidence: operator.similarity,
        arguments: args,
        confidence,
        type: this.inferType(operator.name),
        raw: vector
      },
      confidence
    };
  }

  /**
   * Check if vector might be compound structure
   * More conservative check to avoid excessive recursion
   */
  mightBeCompound(extracted, directMatch) {
    // Only check compounds if we're at depth 0 and have a clear indicator
    if (this.currentDepth > 0) {
      return false; // Disable nested compound detection for now
    }

    const directSim = similarity(extracted, directMatch);

    // Only consider compound if very low similarity to direct match
    // AND we detect a known compound operator (Implies, And, Or, Not)
    if (directSim >= 0.45) {
      return false;
    }

    // Check if extracted looks like a compound (has operator-like pattern)
    // This is expensive so we're conservative
    for (const [name] of this.session.operators) {
      const opVec = this.session.vocabulary.get(name);
      if (opVec) {
        const opSim = similarity(extracted, opVec);
        if (opSim > 0.6) {
          return true; // Likely a compound with this operator
        }
      }
    }

    return false;
  }

  /**
   * Infer statement type from operator
   */
  inferType(operatorName) {
    if (operatorName === 'Implies' || operatorName.endsWith('Rule')) {
      return 'rule';
    }
    return 'fact';
  }
}

export default StructuralDecoder;
