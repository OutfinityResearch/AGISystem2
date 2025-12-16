/**
 * AGISystem2 - CSP Backtracking Search
 * @module reasoning/csp/backtrack
 *
 * Backtracking search algorithm for constraint satisfaction.
 */

/**
 * Backtracking search engine
 */
export class BacktrackSearch {
  /**
   * @param {DomainManager} domainManager - Domain manager
   * @param {Constraint[]} constraints - Constraints to satisfy
   * @param {Object} options - Search options
   */
  constructor(domainManager, constraints, options = {}) {
    this.domainManager = domainManager;
    this.constraints = constraints;
    this.options = {
      maxSolutions: options.maxSolutions || 100,
      timeout: options.timeout || 10000,
      heuristic: options.heuristic || 'mrv' // minimum remaining values
    };

    this.solutions = [];
    this.stats = {
      nodesExplored: 0,
      backtracks: 0,
      pruned: 0
    };
    this.startTime = 0;
  }

  /**
   * Run search and find all solutions
   * @returns {Array<Map>} Array of solution assignments
   */
  search() {
    this.solutions = [];
    this.startTime = Date.now();
    this.stats = { nodesExplored: 0, backtracks: 0, pruned: 0 };

    // Reset all domains
    this.domainManager.resetAll();

    // Start recursive backtracking
    this.backtrack();

    return this.solutions;
  }

  /**
   * Recursive backtracking
   */
  backtrack() {
    // Check timeout
    if (Date.now() - this.startTime > this.options.timeout) {
      return;
    }

    // Check solution limit
    if (this.solutions.length >= this.options.maxSolutions) {
      return;
    }

    this.stats.nodesExplored++;

    // Check if complete (all variables assigned)
    if (this.domainManager.isComplete()) {
      const assignment = this.domainManager.getAssignment();
      // Final constraint check
      if (this.allConstraintsSatisfied(assignment)) {
        this.solutions.push(new Map(assignment));
      }
      return;
    }

    // Select next variable (MRV heuristic)
    const variable = this.selectVariable();
    if (!variable) return;

    const domain = this.domainManager.get(variable);
    const values = this.orderValues(variable, domain.getValues());

    for (const value of values) {
      // Try this assignment
      domain.assign(value);

      const assignment = this.domainManager.getAssignment();

      // Check consistency
      if (this.isConsistent(assignment)) {
        // Save states for potential backtracking
        const savedStates = this.domainManager.saveAllStates();

        // Optional: forward checking (prune inconsistent values)
        const pruned = this.forwardCheck(variable, value);

        if (!pruned) {
          // Recurse
          this.backtrack();
        } else {
          this.stats.pruned++;
        }

        // Restore states
        this.domainManager.restoreAllStates(savedStates);
      } else {
        this.stats.backtracks++;
      }

      // Undo assignment
      domain.unassign();
    }
  }

  /**
   * Select next variable to assign
   */
  selectVariable() {
    if (this.options.heuristic === 'mrv') {
      return this.domainManager.selectMRV();
    }
    // Default: first unassigned
    const unassigned = this.domainManager.getUnassigned();
    return unassigned.length > 0 ? unassigned[0] : null;
  }

  /**
   * Order domain values (can implement LCV - Least Constraining Value)
   */
  orderValues(variable, values) {
    // Default: original order
    return values;
  }

  /**
   * Check if current partial assignment is consistent with all constraints
   */
  isConsistent(assignment) {
    for (const constraint of this.constraints) {
      if (!constraint.isSatisfied(assignment)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if all constraints are satisfied (for complete assignments)
   */
  allConstraintsSatisfied(assignment) {
    return this.isConsistent(assignment);
  }

  /**
   * Forward checking: prune values inconsistent with current assignment
   * @returns {boolean} True if any domain became empty (dead end)
   */
  forwardCheck(assignedVar, assignedValue) {
    // Simple forward checking - for each unassigned variable,
    // remove values that would immediately violate a constraint

    for (const variable of this.domainManager.getUnassigned()) {
      const domain = this.domainManager.get(variable);
      const toRemove = [];

      for (const value of domain.getValues()) {
        // Temporarily assign
        domain.assign(value);
        const testAssignment = this.domainManager.getAssignment();

        // Check binary constraints between assigned and this variable
        let consistent = true;
        for (const constraint of this.constraints) {
          // Only check constraints involving both variables
          if (constraint.variables.includes(assignedVar) &&
              constraint.variables.includes(variable)) {
            if (!constraint.isSatisfied(testAssignment)) {
              consistent = false;
              break;
            }
          }
        }

        domain.unassign();

        if (!consistent) {
          toRemove.push(value);
        }
      }

      // Remove inconsistent values
      for (const value of toRemove) {
        domain.remove(value);
      }

      // If domain is empty, dead end
      if (domain.isEmpty()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      ...this.stats,
      solutionsFound: this.solutions.length,
      timeMs: Date.now() - this.startTime
    };
  }
}

export default BacktrackSearch;
