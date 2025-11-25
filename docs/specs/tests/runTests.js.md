# Design Spec: tests/runTests.js

ID: DS(/tests/runTests.js)

Script `runTests.js`
- **Role**: Test harness to enumerate and run module test suites under `tests/<suite>/`. Supports running all suites or a named suite; defaults to list-only behavior unless instructed.
- **Pattern**: CLI orchestrator. SOLID: single responsibility for test discovery/execution.
- **Key Collaborators**: Per-module test suites; relies on real modules (minimal mocks) and environment-configured LLM keys when needed.

## Behavior
On start the harness discovers suites by scanning immediate subfolders of `tests/` and prints their names. If no additional argument is provided, it exits with status 0 after listing available suites. If the first argument is `all`, it prepares to run every discovered suite. If the first argument is the name of a suite, it validates that the folder exists and prepares to run only that suite. Each suite must expose an entrypoint (for example, `index.js`) that exports an async `run({profile})` function returning a structured pass/fail summary and an indication of success or failure.

The harness applies configuration profiles in a controlled way. By default it uses the `auto_test` profile (dimensions 512, recursionHorizon 2, SimHash indexing, in-memory persistence). A second CLI argument or an environment variable can select `manual_test` (dimensions 1024, recursionHorizon 3, p-stable LSH with 32 hashes in 8 bands and bucket width 8, file_binary with a temporary root) or `prod` (dimensions 2048, recursionHorizon 3, p-stable LSH with 64 hashes in 16 bands and width 6, file_binary at the configured root). Profiles are resolved through the Config module before any suite code runs so that all tests share the same deterministic configuration for a given invocation.

## Pseudocode (comments)
```js
// discover suites = fs.readdirSync('tests').filter(isDir)
// if !arg -> print suites and exit 0
// if arg == 'all' -> toRun = suites else toRun=[arg] (validate)
// for each suite in toRun:
//   cfgProfile = argProfile flag? default auto_test; allow env override
//   import(`./${suite}/index.js`).then(mod => mod.run({profile: cfgProfile}))
//   collect results; set exit code on failure
```

## Notes/Constraints
Tests favor developer and integration style: suites should exercise real modules and flows rather than heavy mocking, except where core math operations are concerned and focused unit tests make more sense. If an LLM or translator is required and environment keys are missing, the suite should be reported as skipped with a clear warning and a non-error exit code, not as a silent success. The harness must be deterministic: the set of suites, the order in which they run, the profile applied to each, and any skips must be fully determined by the arguments and environment and must be visible in the console output for reproducibility.***
