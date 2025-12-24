/**
 * ProofEngine default/exception reasoning.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

export function tryDefaultReasoning(self, goal) {
  const op = self.extractOperatorName(goal);

  const semanticIndex = self.session?.semanticIndex;
  const isDefaultable = semanticIndex?.isInheritableProperty
    ? semanticIndex.isInheritableProperty(op)
    : new Set(['can', 'has', 'likes', 'knows', 'owns', 'uses']).has(op);

  if (!isDefaultable) {
    return { valid: false };
  }

  const args = (goal.args || []).map(a => self.extractArgName(a)).filter(Boolean);
  if (args.length < 2) {
    return { valid: false };
  }

  const entity = args[0];
  const value = args[1];
  const result = self.defaults.resolveDefaults(entity, op, value);
  if (!result.success) {
    return { valid: false };
  }

  if (result.value === true) {
    return {
      valid: true,
      confidence: result.confidence,
      method: result.method,
      steps: [{
        operation: 'default_reasoning',
        fact: `Default ${op} ${result.fromType} ${value}`,
        appliedTo: entity,
        confidence: result.confidence
      }],
      goal: self.goalToFact(goal)
    };
  }

  if (result.value === false) {
    const types = self.defaults.getTypeHierarchy(entity);
    const typeChain = types.slice(1, 4).map(t => `${entity} isA ${t}`).join('. ');
    const blocked = Array.isArray(result.blocked) ? result.blocked[0] : null;
    const defaultType = blocked?.default?.forType || result.fromType;
    const exceptionType = blocked?.blockedBy?.forType || result.fromType;
    const searchTrace = `Search: ${typeChain}. Default ${op} ${defaultType} ${value} blocked by exception for ${exceptionType}.`;

    return {
      valid: false,
      reason: result.reason || 'Blocked by exception',
      goal: self.goalToFact(goal),
      searchTrace,
      method: result.method,
      definitive: true,
      steps: [{
        operation: 'exception_blocks',
        fact: `Exception ${op} ${result.fromType} ${value}`,
        appliedTo: entity,
        reason: result.reason
      }]
    };
  }

  return { valid: false };
}

