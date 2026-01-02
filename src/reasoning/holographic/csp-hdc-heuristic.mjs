/**
 * AGISystem2 - Holographic CSP Solver (HDC Heuristic)
 * @module reasoning/holographic/csp-hdc-heuristic
 *
 * CSP solver with HDC-based heuristics using Constraint Satisfaction Vectors.
 *
 * Key concept: Build HDC vectors representing valid assignment states,
 * then use similarity to score and order domain values for faster search.
 *
 * Strategy:
 * 1. Build constraint satisfaction vectors from KB constraints
 * 2. Use HDC similarity to order domain values (prefer HDC-similar)
 * 3. Use HDC similarity to detect likely conflicts early
 * 4. Fall back to standard backtracking if HDC doesn't help
 *
 * Same interface as CSPSolver - drop-in replacement.
 */

import { bind, bundle, similarity, unbind } from '../../core/operations.mjs';
import { withPosition } from '../../core/position.mjs';
import { getThresholds, getHolographicThresholds } from '../../core/constants.mjs';
import { CSPSolver } from '../csp/solver.mjs';
import { debug_trace } from '../../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[HoloCSP:${category}]`, ...args);
}

/**
 * Build constraint satisfaction vector from valid assignments
 *
 * For each constraint that holds (e.g., "Alice not with Bob"),
 * we create vectors representing valid states and bundle them.
 *
 * @param {Session} session - Session with KB
 * @param {Array} constraints - Constraint definitions
 * @returns {Object} Constraint satisfaction bundle
 */
export function buildConstraintSatisfaction(session, constraints) {
  const validStates = [];

  for (const constraint of constraints) {
    if (constraint.type === 'noConflict') {
      // For conflict pairs (a, b), valid states are where they're at different tables
      const { person1, person2, tables } = constraint;

      for (const t1 of tables) {
        for (const t2 of tables) {
          if (t1 !== t2) {
            // Build vector: bind(person1, table1) XOR bind(person2, table2)
            const p1Vec = session.resolve({ name: person1, type: 'Identifier' });
            const p2Vec = session.resolve({ name: person2, type: 'Identifier' });
            const t1Vec = session.resolve({ name: t1, type: 'Identifier' });
            const t2Vec = session.resolve({ name: t2, type: 'Identifier' });

            if (p1Vec && p2Vec && t1Vec && t2Vec) {
              const assignment1 = bind(p1Vec, t1Vec);
              const assignment2 = bind(p2Vec, t2Vec);
              const validState = bind(assignment1, assignment2);
              validStates.push(validState);
            }
          }
        }
      }
    }
  }

  if (validStates.length === 0) {
    return null;
  }

  // Bundle all valid states
  return bundle(validStates);
}

/**
 * Score a candidate assignment against constraint satisfaction bundle
 *
 * Higher similarity = more likely valid
 *
 * @param {Session} session - Session
 * @param {Map} assignment - Current variable assignments
 * @param {Object} csBundle - Constraint satisfaction bundle
 * @returns {number} Score 0-1
 */
export function scoreCandidate(session, assignment, csBundle) {
  if (!csBundle || assignment.size === 0) {
    return 0.5; // Neutral score if no bundle
  }

  // Build vector for current assignment
  const assignmentVecs = [];
  for (const [variable, value] of assignment) {
    const varVec = session.resolve({ name: variable, type: 'Identifier' });
    const valVec = session.resolve({ name: value, type: 'Identifier' });
    if (varVec && valVec) {
      assignmentVecs.push(bind(varVec, valVec));
    }
  }

  if (assignmentVecs.length === 0) {
    return 0.5;
  }

  // Bundle current assignment
  const currentBundle = bundle(assignmentVecs);

  // Compare to valid states bundle
  const sim = similarity(currentBundle, csBundle);

  dbg('SCORE', `Assignment similarity: ${sim.toFixed(3)}`);

  return sim;
}

/**
 * Order domain values by HDC similarity to constraint satisfaction
 *
 * Prefer values that are more likely to satisfy constraints
 *
 * @param {Session} session - Session
 * @param {string} variable - Variable being assigned
 * @param {string[]} domain - Possible values
 * @param {Map} currentAssignment - Current partial assignment
 * @param {Object} csBundle - Constraint satisfaction bundle
 * @returns {string[]} Ordered domain values
 */
export function orderDomainByHDC(session, variable, domain, currentAssignment, csBundle) {
  if (!csBundle) {
    return domain; // No reordering without bundle
  }

  const scored = domain.map(value => {
    // Create hypothetical assignment with this value
    const hypoAssignment = new Map(currentAssignment);
    hypoAssignment.set(variable, value);

    const score = scoreCandidate(session, hypoAssignment, csBundle);
    return { value, score };
  });

  // Sort by score descending (prefer higher similarity)
  scored.sort((a, b) => b.score - a.score);

  dbg('ORDER', `Variable ${variable}: ${scored.map(s => `${s.value}(${s.score.toFixed(2)})`).join(', ')}`);

  return scored.map(s => s.value);
}

/**
 * Holographic CSP Solver - Uses HDC heuristics for faster search
 */
export class HolographicCSPSolver {
  /**
   * @param {Session} session - Session with KB
   * @param {Object} options - Solver options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.symbolicSolver = new CSPSolver(session, options);

    this.options = {
      maxSolutions: options.maxSolutions || 100,
      timeout: options.timeout || 10000,
      enableForwardCheck: options.enableForwardCheck ?? true,
      hdcWeight: options.hdcWeight || 0.7
    };

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'exact';
    this.thresholds = getThresholds(strategy);
    this.config = getHolographicThresholds(strategy);

    // State
    this.constraints = [];
    this.variables = new Map(); // variable -> domain
    this.csBundle = null;

    dbg('INIT', `Strategy: ${strategy}, HDC weight: ${this.options.hdcWeight}`);
  }

  /**
   * Add a variable with explicit domain values
   */
  addVariable(variable, values) {
    this.variables.set(variable, [...values]);
    this.symbolicSolver.addVariable(variable, values);
    return this;
  }

  /**
   * Add a variable with domain inferred from KB type
   */
  addVariableFromType(variable, typeName) {
    this.symbolicSolver.addVariableFromType(variable, typeName);
    // Get domain from symbolic solver for our use
    const domain = this.symbolicSolver.domainManager.getDomain(variable);
    if (domain) {
      this.variables.set(variable, [...domain]);
    }
    return this;
  }

  /**
   * Add no-conflict constraint
   */
  addNoConflict(person1Var, person2Var) {
    const p1 = person1Var.startsWith('?') ? person1Var.substring(1) : person1Var;
    const p2 = person2Var.startsWith('?') ? person2Var.substring(1) : person2Var;

    // Get all possible tables (union of domains)
    const tables = new Set();
    for (const domain of this.variables.values()) {
      for (const v of domain) {
        tables.add(v);
      }
    }

    this.constraints.push({
      type: 'noConflict',
      person1: p1,
      person2: p2,
      tables: [...tables]
    });

    this.symbolicSolver.addNoConflict(person1Var, person2Var);
    return this;
  }

  /**
   * Add all-different constraint
   */
  addAllDifferent(...variables) {
    this.symbolicSolver.addAllDifferent(...variables);
    return this;
  }

  /**
   * Add relational constraint
   */
  addRelational(relation, ...args) {
    this.symbolicSolver.addRelational(relation, ...args);
    return this;
  }

  /**
   * Add custom predicate constraint
   */
  addPredicate(variables, predicate) {
    this.symbolicSolver.addPredicate(variables, predicate);
    return this;
  }

  /**
   * Solve the CSP using HDC-guided search
   */
  solve() {
    // Track stats
    this.session.reasoningStats.holographicCSP =
      (this.session.reasoningStats.holographicCSP || 0) + 1;

    // Step 1: Build constraint satisfaction bundle
    this.csBundle = buildConstraintSatisfaction(this.session, this.constraints);

    if (this.csBundle) {
      dbg('SOLVE', 'Built constraint satisfaction bundle');
      this.session.reasoningStats.cspBundleBuilt =
        (this.session.reasoningStats.cspBundleBuilt || 0) + 1;
    }

    // Step 2: Solve with HDC-guided backtracking
    const startTime = Date.now();
    const solutions = [];
    const stats = {
      nodesExplored: 0,
      backtracks: 0,
      hdcPruned: 0
    };

    const variableList = [...this.variables.keys()];
    const assignment = new Map();

    this.hdcBacktrack(
      variableList,
      0,
      assignment,
      solutions,
      stats,
      startTime
    );

    if (this.session?.reasoningStats) {
      this.session.reasoningStats.cspNodesExplored += stats.nodesExplored || 0;
      this.session.reasoningStats.cspBacktracks += stats.backtracks || 0;
      this.session.reasoningStats.cspHdcPruned += stats.hdcPruned || 0;
    }

    const result = {
      success: solutions.length > 0,
      solutions,
      solutionCount: solutions.length,
      stats,
      variables: variableList,
      constraintCount: this.constraints.length
    };

    // If HDC found no solutions, try symbolic fallback
    if (!result.success && this.config.FALLBACK_TO_SYMBOLIC) {
      dbg('FALLBACK', 'HDC search found no solutions, trying symbolic');
      this.session.reasoningStats.cspSymbolicFallback =
        (this.session.reasoningStats.cspSymbolicFallback || 0) + 1;

      return this.symbolicSolver.solve();
    }

    return result;
  }

  /**
   * HDC-guided backtracking search
   * @private
   */
  hdcBacktrack(variables, index, assignment, solutions, stats, startTime) {
    // Check timeout
    if (Date.now() - startTime > this.options.timeout) {
      return;
    }

    // Check solution limit
    if (solutions.length >= this.options.maxSolutions) {
      return;
    }

    // Found a complete assignment
    if (index >= variables.length) {
      // Validate with symbolic constraints
      if (this.validateAssignment(assignment)) {
        solutions.push(this.assignmentToObject(assignment));
        dbg('SOLUTION', `Found solution ${solutions.length}`);
      }
      return;
    }

    stats.nodesExplored++;
    const variable = variables[index];
    const domain = this.variables.get(variable) || [];

    // Order domain by HDC similarity (heuristic)
    const orderedDomain = orderDomainByHDC(
      this.session,
      variable,
      domain,
      assignment,
      this.csBundle
    );

    for (const value of orderedDomain) {
      // HDC-based pruning: skip if similarity too low
      assignment.set(variable, value);
      const score = scoreCandidate(this.session, assignment, this.csBundle);

      if (this.csBundle && score < this.thresholds.VERIFICATION) {
        stats.hdcPruned++;
        assignment.delete(variable);
        continue;
      }

      // Check consistency with current assignment
      if (this.isConsistent(assignment)) {
        this.hdcBacktrack(variables, index + 1, assignment, solutions, stats, startTime);
      } else {
        stats.backtracks++;
      }

      assignment.delete(variable);
    }
  }

  /**
   * Check if current assignment is consistent with constraints
   * @private
   */
  isConsistent(assignment) {
    for (const constraint of this.constraints) {
      if (constraint.type === 'noConflict') {
        const v1 = assignment.get(constraint.person1);
        const v2 = assignment.get(constraint.person2);

        // If both assigned, they must be different
        if (v1 !== undefined && v2 !== undefined && v1 === v2) {
          return false;
        }
      }
    }

    // Also check symbolic constraints
    return this.symbolicSolver.constraints.every(c => {
      if (typeof c.check === 'function') {
        return c.check(assignment);
      }
      return true;
    });
  }

  /**
   * Validate complete assignment
   * @private
   */
  validateAssignment(assignment) {
    // All constraints must be satisfied
    for (const constraint of this.constraints) {
      if (constraint.type === 'noConflict') {
        const v1 = assignment.get(constraint.person1);
        const v2 = assignment.get(constraint.person2);

        if (v1 === v2) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Convert assignment map to object
   * @private
   */
  assignmentToObject(assignment) {
    const obj = {};
    for (const [key, value] of assignment) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Reset solver state
   */
  reset() {
    this.constraints = [];
    this.variables = new Map();
    this.csBundle = null;
    this.symbolicSolver.reset();
    return this;
  }
}

export default { HolographicCSPSolver, buildConstraintSatisfaction, scoreCandidate, orderDomainByHDC };
