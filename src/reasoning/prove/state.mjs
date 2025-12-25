/**
 * ProofEngine state management helpers.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

export function resetState(self) {
  self.steps = [];
  self.visited = new Set();
  self.memo = new Map();
  self.startTime = Date.now();
  self.reasoningSteps = 0;
}

export function isTimedOut(self) {
  return Date.now() - self.startTime > self.options.timeout;
}

export function incrementSteps(self) {
  self.reasoningSteps++;
}

export function logStep(self, operation, detail) {
  self.steps.push({
    operation,
    detail,
    timestamp: Date.now() - self.startTime
  });
}
