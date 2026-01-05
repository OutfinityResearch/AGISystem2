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
      hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0,
      hdcBindOps: 0, hdcBundleOps: 0, hdcUnbindOps: 0, topKSimilarCalls: 0,
	      hdcUsefulOps: 0,
	      hdcEquivalentOps: 0,
	      hdcComparedOps: 0,
	      holographicQueries: 0, holographicQueryHdcSuccesses: 0, holographicProofs: 0,
	      hdcUnbindAttempts: 0, hdcUnbindSuccesses: 0,
	      hdcValidationAttempts: 0, hdcValidationSuccesses: 0,
      hdcProofSuccesses: 0, symbolicProofFallbacks: 0,
      holographicCSP: 0, cspBundleBuilt: 0, cspSymbolicFallback: 0,
      cspNodesExplored: 0, cspBacktracks: 0, cspPruned: 0, cspHdcPruned: 0,
      timersEnabled: false,
      timers: {}
    };
  }

  return stats;
}

export function isHdcMethod(method) {
  if (!method || typeof method !== 'string') return false;
  return method === 'hdc' || method === 'hdc_level' || method.startsWith('hdc_');
}
