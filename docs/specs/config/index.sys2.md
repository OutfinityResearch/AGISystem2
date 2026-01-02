# Spec: `config/Packs/Kernel/index.sys2` (legacy aggregate manifest)

## Purpose

Defines a deterministic load order for the classic “Kernel stack” as a **backwards-compatible aggregate manifest**.

Per DS51, new code should prefer explicit pack loading (e.g. `Bootstrap` + selected packs, or `URC` + domain packs) rather than depending on this legacy aggregate.

## Key Constructs

This file is intentionally simple: it is a list of `@_ Load` statements pointing at other packs, for example:

- `@_ Load "../Bootstrap/00-types.sys2"`
- `@_ Load "../Relations/00-relations.sys2"`
- `@_ Load "../Logic/05-logic.sys2"`
- `@_ Load "../Canonicalization/13-canonicalization.sys2"`
- `@_ Load "../Consistency/14-constraints.sys2"`

## Runtime Integration

- `Session.loadCore({ includeIndex: true })` loads `config/Packs/Kernel/index.sys2` and then learns the referenced pack files.
- Evaluation suites and tooling may load packs explicitly (recommended) and should not rely on `Kernel/index.sys2` for domain vocabularies.

## Design Rationale

- Preserve a stable entrypoint for legacy workflows while moving semantics into explicit packs.
- Keep argument position markers out of `.sys2`: `Pos1..PosN` are runtime-reserved atoms initialized by the Session from `config/runtime/reserved-atoms.json`.

## Status

Implemented; treated as legacy compatibility glue.
