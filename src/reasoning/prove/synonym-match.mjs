/**
 * ProofEngine synonym-based matching.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

export function trySynonymMatch(self, goal) {
  const componentKB = self.session?.componentKB;
  if (!componentKB) {
    return { valid: false };
  }

  // Extract operator and args
  const op = goal.operator?.name || goal.operator?.value;
  const args = goal.args?.map(a => a.name || a.value) || [];

  if (args.length < 2) {
    return { valid: false };
  }

  // Try synonym expansion on arg1 (the second argument)
  const arg0 = args[0];
  const arg1 = args[1];
  const synonyms = componentKB.expandSynonyms(arg1);
  synonyms.delete(arg1);

  if (synonyms.size === 0) {
    return { valid: false };
  }

  for (const synonym of synonyms) {
    self.session.reasoningStats.kbScans++;
    const candidates = componentKB.findByOperatorAndArg0(op, arg0);

    for (const fact of candidates) {
      self.session.reasoningStats.kbScans++;
      if (fact.args?.[1] === synonym) {
        return {
          valid: true,
          confidence: 0.95,
          method: 'synonym_match',
          matchedFact: `${fact.operator} ${fact.args.join(' ')}`,
          steps: [{
            operation: 'synonym_match',
            fact: `${fact.operator} ${fact.args.join(' ')}`,
            synonymUsed: `${arg1} <-> ${synonym}`,
            confidence: 0.95
          }]
        };
      }
    }
  }

  return { valid: false };
}

