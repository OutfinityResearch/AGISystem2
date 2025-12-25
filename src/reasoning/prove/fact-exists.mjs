/**
 * ProofEngine fact-existence helper (metadata-based).
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

export function factExists(self, op, arg0, arg1) {
  if (!arg0 || !op) return false;
  if (self.session?.componentKB) {
    const candidates = self.session.componentKB.findByOperatorAndArg0(op, arg0);
    if (arg1 === undefined || arg1 === null) {
      return candidates.some(c => (c.metadata?.args?.length || 0) < 2 || c.metadata?.args?.[1] === undefined);
    }
    return candidates.some(c => (c.metadata?.args?.[1] || '') === arg1);
  }
  for (const fact of self.session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === op && meta.args?.[0] === arg0) {
      if (!arg1 || meta.args?.[1] === arg1) return true;
    }
  }
  return false;
}
