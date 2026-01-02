/**
 * AGISystem2 - CSP Constraints
 * @module reasoning/csp/constraint
 *
 * Constraint types for constraint satisfaction problems.
 */

/**
 * Base constraint class
 */
export class Constraint {
  /**
   * @param {string[]} variables - Variables involved in this constraint
   */
  constructor(variables) {
    this.variables = variables;
  }

  /**
   * Check if constraint is satisfied with current assignment
   * @param {Map} assignment - variable -> value
   * @returns {boolean}
   */
  isSatisfied(assignment) {
    throw new Error('Subclass must implement isSatisfied');
  }

  /**
   * Check if all variables are bound
   */
  isFullyBound(assignment) {
    return this.variables.every(v => assignment.has(v));
  }
}

/**
 * Relational constraint - fact must exist in KB
 * Example: seatedAt ?guest ?table
 */
export class RelationalConstraint extends Constraint {
  /**
   * @param {Session} session - Session with KB
   * @param {string} relation - Relation name
   * @param {Array} argPattern - Arguments (strings or {variable: name})
   */
  constructor(session, relation, argPattern) {
    const variables = argPattern
      .filter(a => a.variable)
      .map(a => a.variable);

    super(variables);
    this.session = session;
    this.relation = relation;
    this.argPattern = argPattern;
  }

  isSatisfied(assignment) {
    // Build concrete args from pattern and assignment
    const args = this.argPattern.map(arg => {
      if (arg.variable) {
        return assignment.get(arg.variable);
      }
      return arg.value || arg;
    });

    // If any arg is undefined, constraint is not yet checkable
    if (args.some(a => a === undefined)) {
      return true; // Not yet falsifiable
    }

    // Check if fact exists in KB
    return this.checkInKB(args);
  }

  checkInKB(args) {
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== this.relation) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      let match = true;
      for (let i = 0; i < args.length; i++) {
        if (meta.args[i] !== args[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }
}

/**
 * Negation constraint - inner constraint must be FALSE
 */
export class NotConstraint extends Constraint {
  /**
   * @param {Constraint} inner - Constraint to negate
   */
  constructor(inner) {
    super(inner.variables);
    this.inner = inner;
  }

  isSatisfied(assignment) {
    // Only evaluate when fully bound
    if (!this.isFullyBound(assignment)) {
      return true; // Not yet checkable
    }
    return !this.inner.isSatisfied(assignment);
  }
}

/**
 * Conjunction constraint - all inner constraints must be TRUE
 */
export class AndConstraint extends Constraint {
  /**
   * @param {Constraint[]} constraints - Constraints to conjoin
   */
  constructor(constraints) {
    const allVars = new Set();
    for (const c of constraints) {
      c.variables.forEach(v => allVars.add(v));
    }
    super([...allVars]);
    this.constraints = constraints;
  }

  isSatisfied(assignment) {
    return this.constraints.every(c => c.isSatisfied(assignment));
  }
}

/**
 * Disjunction constraint - at least one inner constraint must be TRUE
 */
export class OrConstraint extends Constraint {
  /**
   * @param {Constraint[]} constraints - Constraints to disjoin
   */
  constructor(constraints) {
    const allVars = new Set();
    for (const c of constraints) {
      c.variables.forEach(v => allVars.add(v));
    }
    super([...allVars]);
    this.constraints = constraints;
  }

  isSatisfied(assignment) {
    // If not fully bound, can't determine
    if (!this.isFullyBound(assignment)) {
      return true;
    }
    return this.constraints.some(c => c.isSatisfied(assignment));
  }
}

/**
 * AllDifferent constraint - all variables must have different values
 */
export class AllDifferentConstraint extends Constraint {
  constructor(variables) {
    super(variables);
  }

  isSatisfied(assignment) {
    const values = new Set();
    for (const v of this.variables) {
      const val = assignment.get(v);
      if (val !== undefined) {
        if (values.has(val)) return false;
        values.add(val);
      }
    }
    return true;
  }
}

/**
 * Custom predicate constraint
 */
export class PredicateConstraint extends Constraint {
  /**
   * @param {string[]} variables - Variables involved
   * @param {Function} predicate - Function(assignment) -> boolean
   */
  constructor(variables, predicate) {
    super(variables);
    this.predicate = predicate;
  }

  isSatisfied(assignment) {
    if (!this.isFullyBound(assignment)) {
      return true;
    }
    return this.predicate(assignment);
  }
}

/**
 * No-conflict constraint (pairwise exclusion)
 * Two entities that conflict cannot share the same assigned value (e.g., same table/room).
 */
export class NoConflictConstraint extends Constraint {
  /**
   * @param {Session} session - Session with KB
   * @param {string} person1Var - Variable for first person
   * @param {string} person2Var - Variable for second person
   * @param {string} tableVar - Variable for table (optional, checks if same)
   */
  constructor(session, person1Var, person2Var, tableVar = null) {
    const vars = tableVar
      ? [person1Var, person2Var, tableVar]
      : [person1Var, person2Var];
    super(vars);
    this.session = session;
    this.person1Var = person1Var;
    this.person2Var = person2Var;
    this.tableVar = tableVar;
  }

  isSatisfied(assignment) {
    const p1 = assignment.get(this.person1Var);
    const p2 = assignment.get(this.person2Var);

    if (!p1 || !p2) return true; // Not yet checkable

    // If they're the same person, no conflict
    if (p1 === p2) return true;

    // Check if p1 and p2 conflict
    const hasConflict = this.checkConflict(p1, p2);
    if (!hasConflict) return true;

    // If no table var, just checking person conflict
    if (!this.tableVar) return false;

    // If table var exists, check if they're at same table
    const t = assignment.get(this.tableVar);
    if (!t) return true; // Not yet checkable

    // For table-based constraint, would need seating info
    // This is a simplified version
    return true;
  }

  checkConflict(p1, p2) {
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.operator === 'conflictsWith') {
        if ((meta.args[0] === p1 && meta.args[1] === p2) ||
            (meta.args[0] === p2 && meta.args[1] === p1)) {
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Table capacity constraint
 */
export class CapacityConstraint extends Constraint {
  /**
   * @param {Session} session - Session with KB
   * @param {string} tableVar - Variable for table
   * @param {string[]} guestVars - Variables for guests assigned to this table
   * @param {number} maxCapacity - Maximum guests per table
   */
  constructor(session, tableVar, guestVars, maxCapacity) {
    super([tableVar, ...guestVars]);
    this.session = session;
    this.tableVar = tableVar;
    this.guestVars = guestVars;
    this.maxCapacity = maxCapacity;
  }

  isSatisfied(assignment) {
    const table = assignment.get(this.tableVar);
    if (!table) return true;

    // Count guests assigned to this table
    let count = 0;
    for (const guestVar of this.guestVars) {
      const guestTable = assignment.get(guestVar);
      if (guestTable === table) count++;
    }

    return count <= this.maxCapacity;
  }
}

export default {
  Constraint,
  RelationalConstraint,
  NotConstraint,
  AndConstraint,
  OrConstraint,
  AllDifferentConstraint,
  PredicateConstraint,
  NoConflictConstraint,
  CapacityConstraint
};
