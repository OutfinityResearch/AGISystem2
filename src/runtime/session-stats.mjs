export function trackMethod(session, method) {
  session.reasoningStats.methods[method] = (session.reasoningStats.methods[method] || 0) + 1;
}

export function trackOperation(session, operation) {
  session.reasoningStats.operations[operation] = (session.reasoningStats.operations[operation] || 0) + 1;
}

export function getReasoningStats(session, reset = false) {
  const stats = { ...session.reasoningStats };
  stats.avgProofLength = stats.proofLengths.length > 0
    ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
    : 0;

  if (stats.minProofDepth === Infinity) {
    stats.minProofDepth = 0;
  }
  delete stats.proofLengths;

  if (reset) {
    session.reasoningStats = {
      queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
      ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
      minProofDepth: Infinity, totalProofSteps: 0, totalReasoningSteps: 0,
      proofLengths: [], methods: {}, operations: {},
      hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0
    };
  }

  return stats;
}

