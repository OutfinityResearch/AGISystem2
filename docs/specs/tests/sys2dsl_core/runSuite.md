# Suite: sys2dsl_core

ID: DS(/tests/sys2dsl_core/runSuite)

Scope: Core Sys2DSL engine behaviour (topological evaluation, cycle detection, basic mask control and masked queries).

Fixtures: Uses in-memory facts only.

Profile: `auto_test`.

Steps/Assertions:
- Topological evaluation:
  - Ingest a basic fact `dog IS_A Animal` via Sys2DSL triple syntax.
  - Run a Sys2DSL script where a variable depends on others declared later in the file:
    - `@b BOOL_AND $a $a`
    - `@a NONEMPTY $list`
    - `@list FACTS_MATCHING "dog IS_A Animal"`
  - Verify that the engine evaluates statements in a dependency-respecting order and that `b.truth === TRUE_CERTAIN`.
- Cycle detection:
  - Run a script with mutual dependencies:
    - `@a NONEMPTY $b`
    - `@b NONEMPTY $a`
  - Verify that the interpreter detects the cyclic dependency between `a` and `b` and throws a deterministic error.
- Masked queries:
  - Build an ontology mask via `@m MASK_PARTITIONS ontology`.
  - Run `@q dog IS_A animal` with mask `$m`.
  - Verify that the query returns a truth verdict and that the result object includes a `maskSpec` field equal to `"ontology"`.

Sample:
- Topological script returns `b = {truth: 'TRUE_CERTAIN'}`.
- Cyclic script raises an error mentioning variables `a` and `b`.
- Masked query returns a result with `maskSpec="ontology"`.***

