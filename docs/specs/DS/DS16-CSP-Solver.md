# AGISystem2 - System Specifications

# Chapter 16: Constraint Satisfaction Problem Solver

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification

---

## 16.1 Overview

AGISystem2 includes a Constraint Satisfaction Problem (CSP) solver that enables finding ALL valid solutions to combinatorial problems, not just the best match. This complements the similarity-based query system with exhaustive search capabilities.

**Key Difference from Query:**

| Feature | Query | CSP Solver |
|---------|-------|------------|
| Returns | Best match + alternatives | ALL valid solutions |
| Method | Similarity search | Backtracking with pruning |
| Use case | "What is X?" | "What are all X that satisfy constraints?" |

**Example Problem:** Wedding Seating

Given guests with conflict relationships and available tables, find ALL seating arrangements where no conflicting guests share a table.

```
Guests: Alice, Bob, Carol, Dave
Tables: Table1, Table2
Conflicts: Alice-Bob, Carol-Dave

Solutions:
1. Alice@T1, Bob@T2, Carol@T1, Dave@T2
2. Alice@T1, Bob@T2, Carol@T2, Dave@T1
3. Alice@T2, Bob@T1, Carol@T1, Dave@T2
4. Alice@T2, Bob@T1, Carol@T2, Dave@T1
```

---

## 16.2 Architecture

The CSP module consists of four components:

```
┌─────────────────────────────────────────────────────────────┐
│                      Session API                             │
│   findAll(), solveWeddingSeating(), solveCSP()              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      CSP Solver                              │
│   Variable domains, constraint collection, solution output   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backtracking Search                        │
│   MRV heuristic, forward checking, pruning                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Domain & Constraints                       │
│   Domain management, constraint satisfaction checking        │
└─────────────────────────────────────────────────────────────┘
```

**Files:**
- `src/reasoning/csp/solver.mjs` - Main CSPSolver class
- `src/reasoning/csp/domain.mjs` - Variable domains
- `src/reasoning/csp/constraint.mjs` - Constraint types
- `src/reasoning/csp/backtrack.mjs` - Search algorithm
- `src/reasoning/find-all.mjs` - Enumeration helpers

---

## 16.3 FindAll Engine

Before CSP, we need enumeration. The `findAll` functions retrieve ALL matches, not just the best.

### 16.3.1 findAllOfType

Find all entities of a given type in the knowledge base.

```javascript
session.learn(`
  isA Alice Guest
  isA Bob Guest
  isA Carol Guest
`);

const guests = session.findAllOfType('Guest');
// Returns: ['Alice', 'Bob', 'Carol']
```

**Implementation:** Scans KB facts for `isA X Type` patterns.

### 16.3.2 findAll Pattern

Find all matches for a pattern with holes.

```javascript
session.learn(`
  seatedAt Alice Table1
  seatedAt Bob Table1
  seatedAt Carol Table2
`);

const result = session.findAll('seatedAt ?person Table1');
// Returns: { success: true, count: 2, results: [
//   { bindings: { person: 'Alice' } },
//   { bindings: { person: 'Bob' } }
// ]}
```

### 16.3.3 findAllRelated

Find all entities related via a specific relation.

```javascript
session.learn(`
  conflictsWith Alice Bob
  conflictsWith Alice Carol
`);

const enemies = session.findAllRelated('conflictsWith', 'Alice', 0);
// Returns: ['Bob', 'Carol']
```

---

## 16.4 Domain Management

Variables in CSP have domains - the set of possible values.

### 16.4.1 Explicit Domains

```javascript
solver.addVariable('color', ['red', 'green', 'blue']);
```

### 16.4.2 Type-Inferred Domains

Domains can be inferred from KB types:

```javascript
session.learn(`
  isA Table1 Table
  isA Table2 Table
  isA Table3 Table
`);

solver.addVariableFromType('table', 'Table');
// Domain automatically set to ['Table1', 'Table2', 'Table3']
```

### 16.4.3 Domain Operations

| Operation | Description |
|-----------|-------------|
| `getValues()` | Get all remaining values |
| `assign(value)` | Fix variable to a value |
| `unassign()` | Remove assignment |
| `remove(value)` | Remove value from domain (pruning) |
| `isEmpty()` | Check if domain is empty (dead end) |
| `save()` / `restore()` | Save/restore state for backtracking |

---

## 16.5 Constraint Types

### 16.5.1 AllDifferent

All variables must have different values.

```javascript
solver.addAllDifferent('x', 'y', 'z');
// Ensures x ≠ y ≠ z
```

### 16.5.2 Predicate Constraint

Custom boolean function over assignments.

```javascript
solver.addPredicate(['a', 'b'], (assignment) => {
  return assignment.get('a') < assignment.get('b');
});
```

### 16.5.3 Relational Constraint

Fact must exist in KB.

```javascript
solver.addRelational('friendsWith', '?person', 'Alice');
// Person must be friends with Alice (per KB)
```

### 16.5.4 NoConflict Constraint

Two variables cannot have the same value if they conflict in KB.

```javascript
solver.addNoConflict('?person1', '?person2');
// If conflictsWith person1 person2, they need different tables
```

### 16.5.5 Logical Combinations

| Constraint | Description |
|------------|-------------|
| `NotConstraint(c)` | Negation of c |
| `AndConstraint(c1, c2)` | Both must be satisfied |
| `OrConstraint(c1, c2)` | At least one satisfied |

---

## 16.6 Backtracking Search

The search algorithm explores the solution space systematically.

### 16.6.1 Basic Algorithm

```
function backtrack(assignment):
    if complete(assignment):
        if satisfies_all_constraints(assignment):
            return [assignment]
        return []

    variable = select_unassigned()
    solutions = []

    for value in domain(variable):
        assignment[variable] = value
        if consistent(assignment):
            solutions.extend(backtrack(assignment))
        delete assignment[variable]

    return solutions
```

### 16.6.2 MRV Heuristic

**Minimum Remaining Values:** Select the variable with the fewest legal values remaining. This prunes the search tree early by identifying constrained variables first.

```javascript
function selectVariable() {
    return unassigned.reduce((best, v) =>
        domain(v).size < domain(best).size ? v : best
    );
}
```

### 16.6.3 Forward Checking

When a variable is assigned, immediately prune inconsistent values from other domains.

```
assign(X = a)
for each unassigned variable Y:
    for each value b in domain(Y):
        if inconsistent(X=a, Y=b):
            remove b from domain(Y)
    if domain(Y) is empty:
        backtrack immediately  // dead end
```

**Benefit:** Detects failures earlier, avoiding deep exploration of doomed branches.

### 16.6.4 Search Statistics

The solver tracks:

| Statistic | Description |
|-----------|-------------|
| `nodesExplored` | Total assignments tried |
| `backtracks` | Failed assignments |
| `pruned` | Branches cut by forward checking |
| `timeMs` | Total search time |

---

## 16.7 Session API

### 16.7.1 solveWeddingSeating

Specialized solver for the wedding seating problem.

```javascript
session.learn(`
  isA Alice Guest
  isA Bob Guest
  isA Table1 Table
  isA Table2 Table
  conflictsWith Alice Bob
  conflictsWith Bob Alice
`);

const result = session.solveWeddingSeating();
// Returns:
// {
//   success: true,
//   solutionCount: 2,
//   solutions: [
//     { Alice: 'Table1', Bob: 'Table2' },
//     { Alice: 'Table2', Bob: 'Table1' }
//   ],
//   stats: { nodesExplored: 4, backtracks: 2, timeMs: 1 }
// }
```

**Automatic Setup:**
1. Finds all `Guest` entities → creates one variable per guest
2. Finds all `Table` entities → sets domain to tables
3. Finds all `conflictsWith` relations → adds no-same-table constraints

### 16.7.2 solveCSP (Generic)

General-purpose CSP solver.

```javascript
const result = session.solveCSP({
  variables: {
    x: ['a', 'b', 'c'],
    y: ['a', 'b', 'c']
  },
  constraints: [
    (assignment) => assignment.get('x') !== assignment.get('y')
  ]
});
// Returns 6 solutions where x ≠ y
```

### 16.7.3 createCSPSolver (Fluent API)

Programmatic solver construction.

```javascript
const solver = session.createCSPSolver()
  .addVariable('x', [1, 2, 3])
  .addVariable('y', [1, 2, 3])
  .addPredicate(['x', 'y'], (a) => a.get('x') < a.get('y'))
  .addAllDifferent('x', 'y');

const result = solver.solve();
```

---

## 16.8 Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxSolutions` | 100 | Stop after finding N solutions |
| `timeout` | 10000 | Max search time in milliseconds |
| `heuristic` | 'mrv' | Variable selection heuristic |

**Example:**
```javascript
session.solveWeddingSeating({ maxSolutions: 50, timeout: 5000 });
```

---

## 16.9 Examples

### 16.9.1 Simple Wedding (2 guests, 1 conflict)

```javascript
session.learn(`
  isA Alice Guest
  isA Bob Guest
  isA T1 Table
  isA T2 Table
  conflictsWith Alice Bob
`);

const result = session.solveWeddingSeating();
// 2 solutions: Alice@T1+Bob@T2, Alice@T2+Bob@T1
```

### 16.9.2 Graph Coloring

```javascript
session.learn(`
  isA Red Color
  isA Green Color
  isA Blue Color
`);

const solver = session.createCSPSolver()
  .addVariableFromType('A', 'Color')
  .addVariableFromType('B', 'Color')
  .addVariableFromType('C', 'Color')
  .addAllDifferent('A', 'B')   // A-B edge
  .addAllDifferent('B', 'C');  // B-C edge

const result = solver.solve();
// 12 solutions (3 colors, A≠B, B≠C, A and C can be same)
```

### 16.9.3 Scheduling with Constraints

```javascript
const result = session.solveCSP({
  variables: {
    meeting1: ['9am', '10am', '11am'],
    meeting2: ['9am', '10am', '11am'],
    meeting3: ['10am', '11am', '12pm']
  },
  constraints: [
    (a) => a.get('meeting1') !== a.get('meeting2'),
    (a) => a.get('meeting2') !== a.get('meeting3')
  ]
});
```

### 16.9.4 Unsatisfiable Problem

```javascript
session.learn(`
  isA A Guest
  isA B Guest
  isA C Guest
  isA T1 Table
  // Triangle of conflicts with only 1 table
  conflictsWith A B
  conflictsWith B C
  conflictsWith C A
`);

const result = session.solveWeddingSeating();
// { success: false, solutionCount: 0 }
```

---

## 16.10 Integration with HDC

The CSP solver integrates with the HDC-based knowledge base:

1. **Domain Inference:** Uses `findAllOfType()` which searches KB facts
2. **Constraint from KB:** `conflictsWith` relations read from KB vectors
3. **Metadata Access:** Extracts relation operator and arguments from fact metadata

**Note:** The CSP solver operates at the symbolic level (extracted atoms), not on raw HDC vectors. The KB stores facts as vectors; the CSP module extracts structured data for constraint solving.

---

## 16.11 Complexity Considerations

| Problem Size | Variables | Domain Size | Search Space |
|--------------|-----------|-------------|--------------|
| Small | 4 | 2 | 2^4 = 16 |
| Medium | 10 | 5 | 5^10 ≈ 10M |
| Large | 20 | 10 | 10^20 = huge |

**Mitigations:**
- MRV heuristic reduces average branching
- Forward checking prunes early
- `maxSolutions` limits output
- `timeout` prevents runaway search

**Practical Limits:**
- ~20 variables with small domains: fast
- ~50 variables: may need timeout
- Beyond: consider specialized algorithms

---

## 16.12 Future Extensions

### 16.12.1 DSL Syntax (Planned)

```
@solutions solve WeddingSeating
  domain ?guest from Guest
  domain ?table from Table
  constraint Not sameTable ?g1 ?g2 when conflictsWith ?g1 ?g2
end
```

### 16.12.2 Arc Consistency (AC-3)

More aggressive pruning than forward checking:

```
while changed:
    for each constraint C(X, Y):
        for each value a in domain(X):
            if no b in domain(Y) satisfies C(a, b):
                remove a from domain(X)
```

### 16.12.3 Optimization

Add objective function to find not just valid, but optimal solutions:

```javascript
solver.minimize('cost', (a) => calculateCost(a));
```

---

## 16.13 Summary

| Concept | Description |
|---------|-------------|
| CSP | Find ALL assignments satisfying constraints |
| Domain | Possible values for a variable |
| Constraint | Condition that must hold |
| Backtracking | Systematic search with undo |
| MRV | Choose most constrained variable first |
| Forward Checking | Prune inconsistent values early |
| Wedding Seating | Specialized solver: guests + tables + conflicts |

**Key API Methods:**
- `session.findAllOfType(type)` - enumerate KB entities
- `session.solveWeddingSeating(options)` - wedding problem
- `session.solveCSP({ variables, constraints })` - generic CSP
- `session.createCSPSolver()` - fluent builder API

**When to use CSP vs Query:**
- **Query:** "Who loves Mary?" → best match
- **CSP:** "Find all seating arrangements" → exhaustive search

---

*End of Chapter 16*
