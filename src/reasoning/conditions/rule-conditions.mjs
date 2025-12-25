/**
 * Rule-condition proving (non-instantiated) used by KBMatcher.tryRuleMatch.
 *
 * Split out of `src/reasoning/conditions.mjs` to keep each file <500 LOC.
 */

import { similarity } from '../../core/operations.mjs';
import { Statement, Identifier } from '../../parser/ast.mjs';
import { instantiatePart } from './utils.mjs';

export function proveCondition(self, rule, depth) {
  if (self.engine.isTimedOut()) {
    throw new Error('Proof timed out');
  }

  self.engine.incrementSteps();
  if (self.engine.reasoningSteps > self.engine.maxSteps) {
    return { valid: false, reason: 'Step limit' };
  }

  if (depth > self.options.maxDepth) {
    return { valid: false, reason: 'Depth limit' };
  }

  if (rule.conditionParts) {
    return proveCompoundCondition(self, rule.conditionParts, depth);
  }

  // Avoid proving ground conditions via fuzzy vector similarity when we have an AST.
  // This prevents RuleTaker-style false positives (e.g., proving chase Rabbit Squirrel from chase Squirrel Rabbit).
  if (rule.conditionAST) {
    return provePart(self, { type: 'leaf', ast: rule.conditionAST, vector: rule.condition }, depth);
  }

  return proveSimpleCondition(self, rule.condition, depth);
}

export function proveSimpleCondition(self, conditionVec, depth) {
  // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
  if (!conditionVec || (!conditionVec.data && !conditionVec.exponents)) {
    return { valid: false, reason: 'Invalid condition' };
  }

  const condHash = self.engine.hashVector(conditionVec);
  const condKey = `cond:${condHash}`;
  if (self.engine.visited.has(condKey)) {
    return { valid: false, reason: 'Cycle' };
  }
  self.engine.visited.add(condKey);

  try {
    for (const fact of self.session.kbFacts) {
      self.session.reasoningStats.kbScans++;
      if (!fact.vector) continue;
      self.session.reasoningStats.similarityChecks++;
      const sim = similarity(conditionVec, fact.vector);
      if (sim > self.thresholds.CONCLUSION_MATCH) {
        let factStr = '';
        if (fact.metadata?.operator && fact.metadata?.args) {
          factStr = `${fact.metadata.operator} ${fact.metadata.args.join(' ')}`;
        }
        return {
          valid: true,
          method: 'direct',
          confidence: sim,
          steps: [{ operation: 'condition_satisfied', confidence: sim, fact: factStr }]
        };
      }
    }

    for (const rule of self.session.rules) {
      if (!rule.conclusion) continue;
      self.session.reasoningStats.similarityChecks++;
      const conclusionSim = similarity(conditionVec, rule.conclusion);
      if (conclusionSim > self.thresholds.CONCLUSION_MATCH) {
        const subResult = proveCondition(self, rule, depth + 1);
        if (subResult.valid) {
          let conclusionFact = '';
          if (rule.conclusionAST?.operator) {
            const op = rule.conclusionAST.operator.name || rule.conclusionAST.operator.value;
            const args = (rule.conclusionAST.args || []).map(a => a.name || a.value).filter(Boolean);
            conclusionFact = `${op} ${args.join(' ')}`;
          } else if (rule.source) {
            const match = rule.source.match(/Implies\s+[@$]?(\w+)\s+[@$]?(\w+)/i);
            if (match) {
              const refName = match[2];
              if (self.session.referenceTexts.has(refName)) {
                conclusionFact = self.session.referenceTexts.get(refName);
              } else {
                conclusionFact = refName;
              }
            } else {
              conclusionFact = rule.name || rule.source;
            }
          }

          return {
            valid: true,
            method: 'chained_rule',
            confidence: Math.min(conclusionSim, subResult.confidence) * self.thresholds.CONFIDENCE_DECAY,
            steps: [{ operation: 'chain_via_rule', rule: rule.name || rule.source, fact: conclusionFact }, ...subResult.steps]
          };
        }
      }
    }

    return { valid: false, reason: 'Cannot prove condition' };
  } finally {
    self.engine.visited.delete(condKey);
  }
}

export function proveCompoundCondition(self, conditionParts, depth) {
  const { type, parts, inner } = conditionParts;

  if (type === 'And') return proveAndCondition(self, parts, depth);
  if (type === 'Or') return proveOrCondition(self, parts, depth);
  if (type === 'Not') return proveNotCondition(self, inner, depth);
  if (type === 'leaf') return proveSimpleCondition(self, conditionParts.vector, depth);

  return { valid: false, reason: 'Unknown condition type' };
}

export function proveNotCondition(self, inner, depth) {
  self.engine.logStep('proving_not', 'inner condition');

  let innerResult;
  if (inner.type === 'And' || inner.type === 'Or' || inner.type === 'Not') {
    innerResult = proveCompoundCondition(self, inner, depth);
  } else if (inner.type === 'leaf' && inner.vector) {
    innerResult = proveSimpleCondition(self, inner.vector, depth);
  } else {
    innerResult = { valid: false };
  }

  if (!innerResult.valid) {
    self.engine.logStep('not_success', 'inner cannot be proved');
    return {
      valid: true,
      method: 'not_condition',
      confidence: self.thresholds.CONDITION_CONFIDENCE,
      steps: [{ operation: 'proving_not_condition' }]
    };
  }

  self.engine.logStep('not_failed', 'inner is provable');
  return { valid: false, reason: 'Not condition failed - inner is provable' };
}

export function proveAndCondition(self, parts, depth) {
  const allSteps = [];
  let minConfidence = 1.0;

  self.engine.logStep('proving_and', `${parts.length} conditions`);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const result = provePart(self, part, depth);

    if (!result.valid) {
      self.engine.logStep('and_failed', `condition ${i + 1}`);
      return { valid: false, reason: `And condition ${i + 1} failed` };
    }

    allSteps.push(...(result.steps || []));
    if (result.confidence < minConfidence) minConfidence = result.confidence;
  }

  self.engine.logStep('and_success', `${parts.length} conditions`);
  const detail = parts.map(p => instantiatePart(self, p, new Map())).filter(Boolean).join(', ');
  return {
    valid: true,
    method: 'and_condition',
    confidence: minConfidence * self.thresholds.CONFIDENCE_DECAY,
    steps: [{ operation: 'proving_and_condition', parts: parts.length }, ...allSteps, { operation: 'and_satisfied', detail }]
  };
}

export function proveOrCondition(self, parts, depth) {
  self.engine.logStep('proving_or', `${parts.length} conditions`);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const result = provePart(self, part, depth);

    if (result.valid) {
      self.engine.logStep('or_success', `condition ${i + 1}`);
      return {
        valid: true,
        method: 'or_condition',
        confidence: result.confidence * self.thresholds.CONFIDENCE_DECAY,
        steps: [{ operation: 'proving_or_condition' }, ...(result.steps || []), { operation: 'or_satisfied', detail: instantiatePart(self, part, new Map()) }]
      };
    }
  }

  self.engine.logStep('or_failed', `${parts.length} conditions`);
  return { valid: false, reason: 'No Or branch succeeded' };
}

export function provePart(self, part, depth) {
  if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
    return proveCompoundCondition(self, part, depth);
  }

  if (part.type === 'leaf' && part.ast) {
    const argInfo = self.engine.unification.extractArgsFromAST(part.ast);
    const hasVars = argInfo.some(a => a.isVariable);
    if (!hasVars) {
      const condStr = self.engine.unification.instantiateAST(part.ast, new Map());
      if (condStr) {
        return self.proveSingleCondition(condStr, new Map(), depth);
      }
    }
    const op = self.engine.extractOperatorName(part.ast);
    if (op === 'Exists') {
      const result = self.engine.proveGoal(part.ast, depth + 1);
      if (result.valid) {
        return { valid: true, confidence: result.confidence, steps: result.steps };
      }
      return { valid: false, reason: result.reason || 'Exists condition failed' };
    }
    if (op === 'holds') {
      const result = self.engine.proveGoal(part.ast, depth + 1);
      if (result.valid) {
        return { valid: true, confidence: result.confidence, steps: result.steps };
      }
    }
  }

  if (part.type === 'leaf' && part.vector) {
    return proveSimpleCondition(self, part.vector, depth);
  }

  if (part.data || part.exponents) {
    return proveSimpleCondition(self, part, depth);
  }

  return { valid: false, reason: 'Invalid part structure' };
}
