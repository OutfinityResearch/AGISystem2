/**
 * AGISystem2 - CSP Solver
 * @module reasoning/csp/solver
 *
 * Main solver for Constraint Satisfaction Problems.
 * Finds all solutions that satisfy given constraints.
 */

import { DomainManager } from './domain.mjs';
import { BacktrackSearch } from './backtrack.mjs';
import {
  RelationalConstraint,
  NotConstraint,
  AndConstraint,
  NoConflictConstraint,
  AllDifferentConstraint,
  PredicateConstraint
} from './constraint.mjs';
import { findAllOfType, findAllRelated } from '../find-all.mjs';

/**
 * CSP Solver
 */
export class CSPSolver {
  /**
   * @param {Session} session - Session with KB
   * @param {Object} options - Solver options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxSolutions: options.maxSolutions || 100,
      timeout: options.timeout || 10000,
      enableForwardCheck: options.enableForwardCheck ?? true,
      heuristic: options.heuristic || 'mrv'
    };

    this.domainManager = new DomainManager(session);
    this.constraints = [];
  }

  /**
   * Add a variable with explicit domain values
   * @param {string} variable - Variable name
   * @param {string[]} values - Possible values
   */
  addVariable(variable, values) {
    this.domainManager.addExplicit(variable, values);
    return this;
  }

  /**
   * Add a variable with domain inferred from KB type
   * @param {string} variable - Variable name
   * @param {string} typeName - Type to query (e.g., 'Guest', 'Table')
   */
  addVariableFromType(variable, typeName) {
    this.domainManager.addFromType(variable, typeName);
    return this;
  }

  /**
   * Add a relational constraint (fact must exist in KB)
   * @param {string} relation - Relation name
   * @param {...(string|{variable:string})} args - Arguments
   */
  addRelational(relation, ...args) {
    const pattern = args.map(a => {
      if (typeof a === 'string' && a.startsWith('?')) {
        return { variable: a.substring(1) };
      }
      return { value: a };
    });
    this.constraints.push(new RelationalConstraint(this.session, relation, pattern));
    return this;
  }

  /**
   * Add a no-conflict constraint (two people who conflict can't share table)
   * @param {string} person1Var - Variable for first person (with ?)
   * @param {string} person2Var - Variable for second person (with ?)
   */
  addNoConflict(person1Var, person2Var) {
    const p1 = person1Var.startsWith('?') ? person1Var.substring(1) : person1Var;
    const p2 = person2Var.startsWith('?') ? person2Var.substring(1) : person2Var;
    this.constraints.push(new NoConflictConstraint(this.session, p1, p2));
    return this;
  }

  /**
   * Add all-different constraint
   * @param {...string} variables - Variables that must have different values
   */
  addAllDifferent(...variables) {
    const vars = variables.map(v => v.startsWith('?') ? v.substring(1) : v);
    this.constraints.push(new AllDifferentConstraint(vars));
    return this;
  }

  /**
   * Add custom predicate constraint
   * @param {string[]} variables - Variables involved
   * @param {Function} predicate - Function(assignment) -> boolean
   */
  addPredicate(variables, predicate) {
    const vars = variables.map(v => v.startsWith('?') ? v.substring(1) : v);
    this.constraints.push(new PredicateConstraint(vars, predicate));
    return this;
  }

  /**
   * Add negation constraint
   * @param {Constraint} inner - Constraint to negate
   */
  addNot(inner) {
    this.constraints.push(new NotConstraint(inner));
    return this;
  }

  /**
   * Solve the CSP
   * @returns {CSPResult}
   */
  solve() {
    const search = new BacktrackSearch(
      this.domainManager,
      this.constraints,
      {
        maxSolutions: this.options.maxSolutions,
        timeout: this.options.timeout,
        heuristic: this.options.heuristic
      }
    );

    const solutions = search.search();
    const stats = search.getStats();

    return {
      success: solutions.length > 0,
      solutions: solutions.map(s => this.solutionToObject(s)),
      solutionCount: solutions.length,
      stats,
      variables: this.domainManager.getVariables(),
      constraintCount: this.constraints.length
    };
  }

  /**
   * Convert Map solution to plain object
   */
  solutionToObject(solutionMap) {
    const obj = {};
    for (const [key, value] of solutionMap) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Reset solver state
   */
  reset() {
    this.domainManager = new DomainManager(this.session);
    this.constraints = [];
    return this;
  }
}

/**
 * Solve wedding seating problem
 * @param {Session} session - Session with KB containing guests, tables, conflicts
 * @param {Object} options - Options
 * @returns {CSPResult}
 */
export function solveWeddingSeating(session, options = {}) {
  const solver = new CSPSolver(session, options);

  // Get all guests and tables from KB
  const guests = findAllOfType(session, 'Guest');
  const tables = findAllOfType(session, 'Table');

  if (guests.length === 0) {
    return { success: false, error: 'No guests found in KB', solutions: [] };
  }
  if (tables.length === 0) {
    return { success: false, error: 'No tables found in KB', solutions: [] };
  }

  // Add a variable for each guest (their table assignment)
  for (const guest of guests) {
    solver.addVariable(guest, tables);
  }

  // Get all conflicts from KB
  const conflicts = [];
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === 'conflictsWith' && meta.args?.length === 2) {
      const [p1, p2] = meta.args;
      // Only add once (avoid duplicates from symmetric relation)
      if (!conflicts.some(c => (c[0] === p1 && c[1] === p2) || (c[0] === p2 && c[1] === p1))) {
        conflicts.push([p1, p2]);
      }
    }
  }

  // Add no-same-table constraints for conflicting pairs
  for (const [p1, p2] of conflicts) {
    if (guests.includes(p1) && guests.includes(p2)) {
      // These two guests can't be at the same table
      solver.addPredicate([p1, p2], (assignment) => {
        const t1 = assignment.get(p1);
        const t2 = assignment.get(p2);
        if (t1 === undefined || t2 === undefined) return true;
        return t1 !== t2; // Must be at different tables
      });
    }
  }

  return solver.solve();
}

export default { CSPSolver, solveWeddingSeating };
