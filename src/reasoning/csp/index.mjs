/**
 * AGISystem2 - CSP Module
 * @module reasoning/csp
 *
 * Constraint Satisfaction Problem solving.
 */

export { Domain, DomainManager } from './domain.mjs';
export {
  Constraint,
  RelationalConstraint,
  NotConstraint,
  AndConstraint,
  OrConstraint,
  AllDifferentConstraint,
  PredicateConstraint,
  NoConflictConstraint,
  CapacityConstraint
} from './constraint.mjs';
export { BacktrackSearch } from './backtrack.mjs';
export { CSPSolver, solveWeddingSeating } from './solver.mjs';
