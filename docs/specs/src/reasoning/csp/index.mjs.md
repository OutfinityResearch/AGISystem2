# Module: src/reasoning/csp/

**Document Version:** 1.0
**Status:** Implemented
**Traces To:** DS16-CSP-Solver

---

## 1. Purpose

Constraint Satisfaction Problem (CSP) solver for AGISystem2. Handles complex multi-variable queries where standard reasoning approaches are insufficient.

---

## 2. Module Files

### 2.1 solver.mjs

Main CSP solver with backtracking.

```javascript
export class CSPSolver {
  constructor(session: Session, options?: SolverOptions)

  // Solve CSP problem
  solve(problem: CSPProblem): Solution[]

  // Add variable
  addVariable(name: string, domain: Value[]): void

  // Add constraint
  addConstraint(constraint: Constraint): void

  // Find all solutions
  findAllSolutions(maxSolutions?: number): Solution[]
}

// Pre-built solver for wedding seating
export function solveWeddingSeating(session, guests, constraints): Solution

interface SolverOptions {
  maxSolutions?: number;      // Maximum solutions to find
  timeout?: number;           // Timeout in ms
  useHDCHeuristics?: boolean; // Enable HDC-based ordering
}
```

### 2.2 constraint.mjs

Constraint representation.

```javascript
export class Constraint {
  constructor(variables: string[], predicate: (values: Value[]) => boolean)

  // Check if constraint is satisfied
  isSatisfied(assignment: Assignment): boolean

  // Get involved variables
  getVariables(): string[]
}

// Pre-defined constraint types
export function allDifferent(variables: string[]): Constraint
export function notEqual(var1: string, var2: string): Constraint
export function lessThan(var1: string, var2: string): Constraint
export function equals(var1: string, value: Value): Constraint
```

### 2.3 domain.mjs

Variable domain management.

```javascript
export class Domain {
  constructor(values: Value[])

  // Get current values
  getValues(): Value[]

  // Remove value
  remove(value: Value): void

  // Check if empty
  isEmpty(): boolean

  // Clone domain
  clone(): Domain
}

export class VariableDomain {
  constructor(name: string, domain: Domain)

  // Get variable name
  getName(): string

  // Get domain
  getDomain(): Domain

  // Prune domain based on constraint
  prune(constraint: Constraint, assignment: Assignment): boolean
}
```

### 2.4 backtrack.mjs

Backtracking algorithm implementation.

```javascript
export class Backtracker {
  constructor(variables: VariableDomain[], constraints: Constraint[])

  // Run backtracking search
  search(assignment?: Assignment): Solution | null

  // Select next variable (MRV heuristic)
  selectVariable(assignment: Assignment): VariableDomain | null

  // Order domain values (LCV heuristic)
  orderDomainValues(variable: VariableDomain, assignment: Assignment): Value[]

  // Check consistency
  isConsistent(variable: string, value: Value, assignment: Assignment): boolean
}
```

---

## 3. DSL Integration

CSP problems can be defined in DSL using `solve` blocks:

```
solve WeddingSeating
  from guests: [Alice, Bob, Carol, Dave]
  from tables: [Table1, Table2]

  allDifferent seating
  noConflict Alice Bob    # Alice and Bob can't sit together

  return seating
end
```

---

## 4. Algorithm

### 4.1 Basic Backtracking

1. Select unassigned variable (MRV: Minimum Remaining Values)
2. Order domain values (LCV: Least Constraining Value)
3. For each value:
   - Check consistency with constraints
   - If consistent: recurse
   - If solution found: return
   - Else: backtrack
4. No value works: return failure

### 4.2 Constraint Propagation

- Arc consistency (AC-3) for binary constraints
- Forward checking for early pruning
- Node consistency for unary constraints

### 4.3 HDC Enhancement (Holographic Mode)

When `useHDCHeuristics: true`:
- Order domains by HDC similarity to constraints
- Score candidates using vector similarity
- Prune early based on HDC distance

---

## 5. Dependencies

- `../../runtime/session.mjs` - Session for KB access
- `../../hdc/facade.mjs` - HDC operations (for heuristics)

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CSP-01 | Simple 2-variable | Returns valid assignment |
| CSP-02 | allDifferent constraint | No duplicate values |
| CSP-03 | No solution exists | Returns null/empty |
| CSP-04 | Multiple solutions | Returns all solutions |
| CSP-05 | Wedding seating | Valid seating plan |
| CSP-06 | Timeout handling | Respects timeout |
| CSP-07 | HDC heuristics | Faster convergence |
| CSP-08 | Large domain | Handles efficiently |

---

## 7. Performance

| Problem Size | Variables | Constraints | Typical Time |
|--------------|-----------|-------------|--------------|
| Small | 2-5 | 1-5 | < 10ms |
| Medium | 5-20 | 5-20 | < 100ms |
| Large | 20-50 | 20-100 | < 1000ms |
| Very Large | 50+ | 100+ | May timeout |

---

*End of Module Specification*
