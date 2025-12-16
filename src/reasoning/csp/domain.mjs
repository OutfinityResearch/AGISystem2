/**
 * AGISystem2 - CSP Domain Management
 * @module reasoning/csp/domain
 *
 * Manages variable domains for constraint satisfaction problems.
 */

import { findAllOfType } from '../find-all.mjs';

/**
 * Domain for a single CSP variable
 */
export class Domain {
  /**
   * @param {string} variable - Variable name
   * @param {string[]} values - Possible values
   */
  constructor(variable, values) {
    this.variable = variable;
    this.originalValues = [...values];
    this.currentValues = new Set(values);
    this.assigned = null;
  }

  /**
   * Remove a value from domain
   * @param {string} value - Value to remove
   * @returns {boolean} True if domain still has values
   */
  remove(value) {
    this.currentValues.delete(value);
    return this.currentValues.size > 0;
  }

  /**
   * Check if domain is empty
   */
  isEmpty() {
    return this.currentValues.size === 0;
  }

  /**
   * Check if domain has single value
   */
  isSingleton() {
    return this.currentValues.size === 1;
  }

  /**
   * Get remaining values
   */
  getValues() {
    return [...this.currentValues];
  }

  /**
   * Get domain size
   */
  size() {
    return this.currentValues.size;
  }

  /**
   * Assign a value
   */
  assign(value) {
    this.assigned = value;
  }

  /**
   * Unassign (for backtracking)
   */
  unassign() {
    this.assigned = null;
  }

  /**
   * Check if assigned
   */
  isAssigned() {
    return this.assigned !== null;
  }

  /**
   * Save state for backtracking
   */
  saveState() {
    return {
      values: new Set(this.currentValues),
      assigned: this.assigned
    };
  }

  /**
   * Restore state after backtracking
   */
  restoreState(state) {
    this.currentValues = new Set(state.values);
    this.assigned = state.assigned;
  }

  /**
   * Reset to original values
   */
  reset() {
    this.currentValues = new Set(this.originalValues);
    this.assigned = null;
  }
}

/**
 * Manages all variable domains for a CSP
 */
export class DomainManager {
  /**
   * @param {Session} session - Session with KB
   */
  constructor(session) {
    this.session = session;
    this.domains = new Map(); // variable name -> Domain
  }

  /**
   * Add a domain with explicit values
   * @param {string} variable - Variable name
   * @param {string[]} values - Possible values
   */
  addExplicit(variable, values) {
    this.domains.set(variable, new Domain(variable, values));
  }

  /**
   * Add a domain inferred from KB type
   * @param {string} variable - Variable name
   * @param {string} typeName - Type to query from KB
   */
  addFromType(variable, typeName) {
    const values = findAllOfType(this.session, typeName);
    if (values.length === 0) {
      throw new Error(`No entities found for type: ${typeName}`);
    }
    this.domains.set(variable, new Domain(variable, values));
  }

  /**
   * Get domain for variable
   */
  get(variable) {
    return this.domains.get(variable);
  }

  /**
   * Check if variable exists
   */
  has(variable) {
    return this.domains.has(variable);
  }

  /**
   * Get all variable names
   */
  getVariables() {
    return [...this.domains.keys()];
  }

  /**
   * Get all unassigned variables
   */
  getUnassigned() {
    return this.getVariables().filter(v => !this.domains.get(v).isAssigned());
  }

  /**
   * Check if all variables are assigned
   */
  isComplete() {
    return this.getUnassigned().length === 0;
  }

  /**
   * Get current assignment as Map
   */
  getAssignment() {
    const assignment = new Map();
    for (const [variable, domain] of this.domains) {
      if (domain.isAssigned()) {
        assignment.set(variable, domain.assigned);
      }
    }
    return assignment;
  }

  /**
   * Save all domain states
   */
  saveAllStates() {
    const states = new Map();
    for (const [variable, domain] of this.domains) {
      states.set(variable, domain.saveState());
    }
    return states;
  }

  /**
   * Restore all domain states
   */
  restoreAllStates(states) {
    for (const [variable, state] of states) {
      this.domains.get(variable).restoreState(state);
    }
  }

  /**
   * Reset all domains
   */
  resetAll() {
    for (const domain of this.domains.values()) {
      domain.reset();
    }
  }

  /**
   * Select next variable using MRV (Minimum Remaining Values) heuristic
   * @returns {string|null} Variable name or null if all assigned
   */
  selectMRV() {
    let best = null;
    let minSize = Infinity;

    for (const [variable, domain] of this.domains) {
      if (!domain.isAssigned()) {
        const size = domain.size();
        if (size < minSize) {
          minSize = size;
          best = variable;
        }
      }
    }

    return best;
  }
}

export default { Domain, DomainManager };
