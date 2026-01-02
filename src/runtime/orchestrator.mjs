/**
 * AGISystem2 - Orchestrator (v0)
 * @module runtime/orchestrator
 *
 * URC direction (DS49/DS73):
 * - build an explicit plan,
 * - select a backend from fragment + goal kind,
 * - produce artifacts/evidence.
 *
 * v0 is intentionally minimal: it can classify fragments and compile to SMT-LIB2,
 * but does not execute external solvers.
 */

export function buildPlan({ goalKind, fragment, steps }) {
  return {
    id: `Plan_${Date.now()}`,
    goalKind: String(goalKind || ''),
    fragment: String(fragment || ''),
    steps: Array.isArray(steps) ? steps : []
  };
}

