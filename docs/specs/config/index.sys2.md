# Spec: config/Core/index.sys2

## Purpose
Defines the load order for Core theories when a `Load` statement references the directory.  Currently loads a minimal subset (`00-types`, `01-positions`, `09-roles`), with the rest loaded by runners (`evals/fastEval/lib/runner.mjs`, tests) that iterate over the directory.

## Key Constructs
- `@_ Load "./00-types.sys2"`
- `@_ Load "./01-positions.sys2"`
- `@_ Load "./09-roles.sys2"`

## Runtime Integration
- `evals/fastEval/lib/loader.mjs` and `tests/unit/runtime/core-theories.test.mjs` bypass this file and load every `.sys2` except `index.sys2` to avoid nested `Load` statements.
- `config/Core/index.sys2` is kept minimal to avoid recursive load storms when the runtime already enumerates files.

## Design Rationale
The file documents canonical load order (types → positions → roles) for interpreters that cannot scan directories.  Other theories are intentionally omitted to let host code decide if experimental modules should be included.

## Status
Implemented but outdated relative to DS07-Core-Theory-Index, which expects the index to include all subtheories.  Decide whether to update the file or keep automation-based loaders; track the decision in DS07 index backlog.
