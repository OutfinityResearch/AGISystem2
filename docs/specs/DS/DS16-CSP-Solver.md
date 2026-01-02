# AGISystem2 - System Specifications

# DS16: Constraint Programming / CSP Backend (Current Implementation)

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification (URC-aligned)

---

## 16.1 Overview

AGISystem2 includes a Constraint Satisfaction Problem (CSP) solver as a **Constraint Programming (CP) backend**. It enables enumerating **all** solutions that satisfy a set of constraints (and is extendable toward optimization and counting).

This backend is complementary to the retrieval-driven query engine:

| Feature | Query | CSP Solver |
|---------|-------|------------|
| Returns | Best match + alternatives | ALL valid solutions |
| Method | Candidate retrieval + matching | Backtracking search with pruning |
| Use case | "What is X?" | "What are all X that satisfy constraints?" |

This DS focuses on the **current implementation** in `src/reasoning/csp/*` and on how it should evolve under URC (DS49 / DS55).

---

## 16.2 URC integration (contract, not yet fully implemented)

URC treats CP as a backend selected for a constraint fragment.

### 16.2.1 Fragment and goals

- **Fragment:** `Frag_CP` (see `config/Packs/URC/03-capability-registry.sys2`)
- **Goal kinds:** `Find`, `OptimizeMin`, `OptimizeMax`, `Count` (future #CSP)

### 16.2.2 Evidence shapes

The CP backend should emit Evidence objects rather than ad-hoc text:

- satisfiable: `Model` / `Witness` assignment
- infeasible: `UnsatCore` (nogoods) or `Derivation` / propagation trace
- optional: `Trace` for explanation (propagation and branching decisions)

### 16.2.3 Pack-driven modeling helpers (optional)

Puzzle/domain-specific modeling aliases live in a pack, not in runtime core:

- `evals/domains/CSP/*` (domain relations and aliases used by evals/examples)

---

## 16.3 Architecture (current code)

The CSP module consists of four components:

```
┌─────────────────────────────────────────────────────────────┐
│                      Session API                             │
│   findAll(), createCSPSolver(), solve csp (DSL)             │
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

## 16.4 FindAll engine (enumeration primitive)

Before CSP, we need enumeration. The `findAll` functions retrieve ALL matches, not just the best.

### 16.4.1 findAllOfType

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

### 16.4.2 findAll pattern

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

### 16.4.3 findAllRelated

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

## 16.5 Domain management

Variables in CSP have domains - the set of possible values.

### 16.5.1 Explicit domains

```javascript
solver.addVariable('color', ['red', 'green', 'blue']);
```

### 16.5.2 Type-inferred domains

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

### 16.5.3 Domain operations

| Operation | Description |
|-----------|-------------|
| `getValues()` | Get all remaining values |
| `assign(value)` | Fix variable to a value |
| `unassign()` | Remove assignment |
| `remove(value)` | Remove value from domain (pruning) |
| `isEmpty()` | Check if domain is empty (dead end) |
| `save()` / `restore()` | Save/restore state for backtracking |

---

## 16.6 Constraint types (current)

### 16.6.1 AllDifferent

All variables must have different values.

```javascript
solver.addAllDifferent('x', 'y', 'z');
// Ensures x ≠ y ≠ z
```

### 16.6.2 Predicate constraint

Custom boolean function over assignments.

```javascript
solver.addPredicate(['a', 'b'], (assignment) => {
  return assignment.get('a') < assignment.get('b');
});
```

### 16.6.3 Relational constraint

Fact must exist in KB.

```javascript
solver.addRelational('friendsWith', '?person', 'Alice');
// Person must be friends with Alice (per KB)
```

### 16.6.4 NoConflict constraint

Two variables cannot have the same value if they conflict in KB.

```javascript
solver.addNoConflict('?person1', '?person2');
// If conflictsWith person1 person2, they need different tables
```

### 16.6.5 Logical combinations

| Constraint | Description |
|------------|-------------|
| `NotConstraint(c)` | Negation of c |
| `AndConstraint(c1, c2)` | Both must be satisfied |
| `OrConstraint(c1, c2)` | At least one satisfied |

---

## 16.7 Backtracking search

The search algorithm explores the solution space systematically.

### 16.7.1 Basic algorithm

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

---

## Appendix A: Example — Wedding seating (as a CP modeling case)

This example is intentionally not the definition of CP in AGISystem2; it is one modeling case that exercises:

- variable domains inferred from types (`Guest`, `Table`)
- relational constraints from KB (`conflictsWith`)
- `AllDifferent` / inequality constraints

Problem:

```
Guests: Alice, Bob, Carol, Dave
Tables: Table1, Table2
Conflicts: Alice-Bob, Carol-Dave
```

Find all seating assignments `seatedAt(guest) -> table` such that no conflicting pair shares a table.

Expected solutions (4):

1. Alice@T1, Bob@T2, Carol@T1, Dave@T2
2. Alice@T1, Bob@T2, Carol@T2, Dave@T1
3. Alice@T2, Bob@T1, Carol@T1, Dave@T2
4. Alice@T2, Bob@T1, Carol@T2, Dave@T1

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

### 16.7.1 createCSPSolver (Fluent API)

Programmatic solver construction (strategy-aware; returns either a symbolic or holographic CSP solver).

```javascript
import { createCSPSolver } from '../../src/reasoning/index.mjs';

const solver = createCSPSolver(session, { maxSolutions: 100, timeout: 10000 })
  .addVariable('x', [1, 2, 3])
  .addVariable('y', [1, 2, 3])
  .addPredicate(['x', 'y'], (a) => a.get('x') < a.get('y'))
  .addAllDifferent('x', 'y');

const result = solver.solve();
```

### 16.7.2 Sys2DSL solve blocks (`solve csp`)

The DSL also supports CSP solving inside `learn`:

```sys2dsl
@solutions solve csp [
  (variablesFrom Guest),
  (domainFrom Table),
  (noConflict conflictsWith)
]
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
import { createCSPSolver } from '../../src/reasoning/index.mjs';
createCSPSolver(session, { maxSolutions: 50, timeout: 5000 });
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

import { createCSPSolver } from '../../src/reasoning/index.mjs';
const solver = createCSPSolver(session)
  .addVariableFromType('Alice', 'Table')
  .addVariableFromType('Bob', 'Table')
  .addNoConflict('Alice', 'Bob');

const result = solver.solve();
// 2 solutions: Alice@T1+Bob@T2, Alice@T2+Bob@T1
```

### 16.9.2 Graph Coloring

```javascript
session.learn(`
  isA Red Color
  isA Green Color
  isA Blue Color
`);

import { createCSPSolver } from '../../src/reasoning/index.mjs';
const solver = createCSPSolver(session)
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
import { createCSPSolver } from '../../src/reasoning/index.mjs';
const solver = createCSPSolver(session)
  .addVariable('meeting1', ['9am', '10am', '11am'])
  .addVariable('meeting2', ['9am', '10am', '11am'])
  .addVariable('meeting3', ['10am', '11am', '12pm'])
  .addAllDifferent('meeting1', 'meeting2')
  .addAllDifferent('meeting2', 'meeting3');

const result = solver.solve();
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

import { createCSPSolver } from '../../src/reasoning/index.mjs';
const solver = createCSPSolver(session)
  .addVariableFromType('A', 'Table')
  .addVariableFromType('B', 'Table')
  .addVariableFromType('C', 'Table')
  .addNoConflict('A', 'B')
  .addNoConflict('B', 'C')
  .addNoConflict('C', 'A');

const result = solver.solve();
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
| “Wedding seating” | Modeling pattern (not a special solver) |

**Key API Methods:**
- `findAllOfType(session, type)` - enumerate KB entities
- `createCSPSolver(session, options)` - fluent builder API
- `solve csp [...]` - DSL solve blocks (modeling-focused)

**When to use CSP vs Query:**
- **Query:** "Who loves Mary?" → best match
- **CSP:** "Find all seating arrangements" → exhaustive search

---

## 16.14 Appendix: “Wedding seating” as a modeling example (not a solver mode)

The wedding seating problem is a convenient scenario for demonstrating:
- variable extraction from KB types,
- domain extraction from KB types,
- constraint injection from KB relations,
- witness extraction (assignments) in a generic CP backend.

Important rule:
- “Wedding seating” must remain a **modeling pattern**. The runtime must not contain a special-case solver for it.

### 16.14.1 Minimal Sys2DSL example

```sys2dsl
# Entities
isA Alice Guest
isA Bob Guest
isA Carol Guest

isA T1 Table
isA T2 Table

# Conflict relation (domain-specific)
conflictsWith Alice Bob
conflictsWith Bob Alice

# Solve (generic)
@seating solve csp [
  (variablesFrom Guest),
  (domainFrom Table),
  (noConflict conflictsWith)
]
```

Expected output shape:
- satisfiable: a list of assignments (e.g. `seatedAt Alice T1`, `seatedAt Bob T2`, ...), returned as witness evidence.
- infeasible: a failure result with a trace/nogoods surface (future URC evidence shape).

### 16.14.2 Repo reference

- Evaluation scenario: `evals/fastEval/suite11_wedding_seating`
- Generic CSP mini-problems: `evals/fastEval/suite30_csp_minis`
- Eval-only modeling helpers: `evals/domains/CSP/*`

*End of Chapter 16*
