# Sys2DSL Topological Evaluation and Performance

ID: DS(/theory/topological_eval)

This document explains how Sys2DSL scripts are evaluated using dependency-aware, topological ordering, and why this remains compatible with the MLP non-functional requirements (CPU-only, deterministic, no GPU or heavy accelerators required).

It complements the `TheoryDSLEngine` and `Sys2DSL_arch` design specs by focusing on:
- the evaluation model (statement splitting, dependency graph, ordering);
- complexity and performance bounds;
- determinism and error handling (cycles, undefined variables).

## Evaluation Model

### Statements and Dependencies

- Sys2DSL programmes consist of **statements** of the form:
  - `@varName action param1 param2 ...`
  - Multiple statements may appear on the same line, separated by `;` or by additional `@varName` markers.
- Each statement is identified by:
  - its **output variable** (`varName`), if any;
  - the set of **input variables** it references via `$name` tokens in its parameters.
- From a script, the engine constructs a **dependency graph**:
  - nodes = statements (or their output variables),
  - directed edges `A → B` when statement B depends on the value produced by statement A (for example, `@b ... $a ...`).

### Topological Ordering

- Once the graph is built, evaluation proceeds in a **topological order**:
  - all statements with no incoming edges (no `$` dependencies) are evaluated first;
  - statements whose dependencies are satisfied are evaluated next, and so on.
- The textual order of statements in a file does **not** determine evaluation order; only the dependency structure does.
- This model allows Sys2DSL programmes to:
  - declare variables in a logical order (even if used earlier in the file);
  - express more complex dataflows without having to re-order lines manually.

### Cycles and Errors

- If the dependency graph contains a cycle (for example `@a` uses `$b` and `@b` uses `$a`), a topological order does not exist.
- In such cases, the interpreter:
  - deterministically detects the cycle,
  - reports a clear error (including the variables involved),
  - and refuses to execute the script.
- References to variables that are never produced by any statement are also errors unless the implementation chooses to treat them as a special constant (the design encourages explicit producer statements to keep programmes auditable).

## Complexity and Performance

### Graph Construction

- Let:
  - `N` = number of statements in a Sys2DSL script,
  - `E` = number of dependency edges (variable references),
  - `L` = total length (in tokens) of the script.
- Tokenisation and statement splitting are **O(L)**.
- Dependency extraction (finding `$name` tokens) is also **O(L)**.
- Building the dependency graph is **O(N + E)**.

### Topological Sorting

- Standard algorithms (e.g. Kahn’s algorithm or DFS-based ordering) run in **O(N + E)** time and **O(N + E)** memory.
- In typical scripts:
  - `N` is expected to be small to moderate (dozens to a few hundreds of statements for most theories),
  - `E` is of the same order of magnitude (each statement depends on a handful of previous variables).
- As a result, the overhead of topological sorting is linear in the size of the script and is dominated by the cost of the reasoning operations themselves (distance calculations, retrieval, validation), not by dependency resolution.

### Resource Requirements

- The entire evaluation pipeline (tokenisation, graph construction, topological sort, execution) is designed for **CPU-only Node.js**:
  - it uses simple arrays and maps of strings/integers;
  - no GPU, SIMD, or native extensions are required;
  - memory usage scales linearly with `N + E`, with small constants.
- This is fully aligned with the MLP non-functional requirements (NFS):
  - deterministic execution on commodity CPUs;
  - no dependency on accelerators;
  - predictable performance for interactive use.

## Determinism and Reproducibility

- Given:
  - the same Sys2DSL script (same statements and order),
  - the same engine configuration (Config, seeds, theory files),
  - and the same data (concepts, facts),
- the dependency graph and topological order are uniquely determined:
  - statement parsing and tokenisation are deterministic;
  - the set of edges is derived solely from `$name` occurrences;
  - tie-breaking between independent statements (those with no edges between them) is done in a fixed, deterministic order (for example, lexical order of variable names or original appearance order).
- This ensures that:
  - evaluation is reproducible across runs and instances;
  - provenance logs can be correlated back to the original Sys2DSL script and configuration.

## Relationship to Reasoning Costs

- Topological evaluation is a **front-end scheduling step**; it does not change the underlying reasoning complexity:
  - the cost of each statement still depends on the action (`ASK`, `ASSERT`, `FACTS_MATCHING`, `MASK_*`, etc.) and the size of the knowledge base;
  - the ordering guarantees only that inputs are available when a statement runs.
- In practice:
  - a single pass of topological scheduling is cheap compared with geometric operations (distance computations, clustering, retrieval);
  - the overhead remains negligible even for larger theory files, as long as scripts remain reasonably sized and structured.

## Summary

- Sys2DSL uses a dependency-aware, topological evaluation model:
  - scripts are turned into a graph of statements,
  - variables may reference future definitions as long as there are no cycles,
  - execution order is determined by data dependencies, not by line order.
- Complexity is linear in the script size (**O(N + E)**), and the implementation relies only on standard CPU data structures.
- This approach is fully compatible with the MLP constraints:
  - no GPU or specialised hardware required,
  - deterministic, reproducible behaviour,
  - overhead negligible compared to the actual reasoning work.***

