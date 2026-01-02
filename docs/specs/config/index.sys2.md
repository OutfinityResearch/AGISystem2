# Spec: config/Core/index.sys2

## Purpose
Defines the load order for Core theories when a `Load` statement references the directory. This file is intended to be the canonical “Core bootstrap” for sessions that want theory-driven semantics without directory scanning.

## Key Constructs
- `@_ Load "./00-types.sys2"`
- `@_ Load "./02-constructors.sys2"`
- `@_ Load "./03-structural.sys2"`
- `@_ Load "./00-relations.sys2"`
- `@_ Load "./04a-numeric.sys2"`
- `@_ Load "./04-semantic-primitives.sys2"`
- `@_ Load "./05-logic.sys2"`
- `@_ Load "./06-temporal.sys2"`
- `@_ Load "./07-modal.sys2"`
- `@_ Load "./08-defaults.sys2"`
- `@_ Load "./09-roles.sys2"`
- `@_ Load "./10-properties.sys2"`
- `@_ Load "./11-bootstrap-verbs.sys2"`
- `@_ Load "./12-reasoning.sys2"`
- `@_ Load "./13-canonicalization.sys2"`
- `@_ Load "./13c-canonical-rewrites.sys2"`
- `@_ Load "./14-constraints.sys2"`
- `@_ Load "./15-stress-compat.sys2"`

## Runtime Integration
- `Session.loadCore({ includeIndex: true })` uses this file to load Core in a stable dependency order.
- Some evaluation and test runners choose to enumerate `.sys2` files directly; those should keep their own ordering consistent with this index.

## Design Rationale
- Maintain a deterministic and dependency-safe load order (types → constructors → structural ops → relations → reasoning).
- Keep position markers out of `.sys2`: `Pos1..PosN` are runtime-reserved atoms initialized by the Session from `config/runtime/reserved-atoms.json`.

## Status
Implemented.
