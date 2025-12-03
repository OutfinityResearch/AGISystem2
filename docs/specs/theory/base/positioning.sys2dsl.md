# Design Spec: data/init/theories/positioning.sys2dsl

ID: DS(/theory/base/positioning.sys2dsl)

Status: v1.0 – Sample Positioning Theory

## Purpose

`data/init/theories/positioning.sys2dsl` defines a small, reusable theory focused on spatial/positional relations. It is used primarily for:
- Demonstrating how spatial relations (for example `LOCATED_IN`, `NEAR`, `CONTAINS`) are expressed in Sys2DSL v3.0 triple syntax.
- Providing deterministic fixtures for tests that exercise spatial reasoning, masks, and ontology/axiology separation.
- Serving as a template for domain-specific positioning theories (e.g., network topology, UI layouts).

## Content Overview

The theory contains:
- Core entities (for example `CityA`, `CityB`, `RegionX`, `Warehouse1`) declared via `IS_A` relations.
- Spatial layout facts using relations like:
  - `LOCATED_IN` and `CONTAINS` for region membership.
  - Optional `NEAR` / `FAR_FROM` examples for proximity.
- A small number of higher-level composite facts that tests can rely on (e.g. "CityA is in RegionX and near CityB").

All facts use strict triple syntax:

```sys2dsl
@_ CityA IS_A city
@_ RegionX IS_A region
@_ CityA LOCATED_IN RegionX
@_ CityB LOCATED_IN RegionX
@_ CityA NEAR CityB
```

## Usage

- Loaded by test harnesses or sample scenarios via:
  - CLI: `@_ positioning LOAD any`
  - API/Session: `System2Session.loadTheory('positioning')` (depending on mapping).
- May be referenced from `meta_registry.json` so that higher-level tools can discover it by ID.

## Constraints

- The theory is intentionally small and deterministic so that:
  - Tests can assert specific distances, mask behaviour, and transitivity of `LOCATED_IN`.
  - Documentation can include complete snippets without overwhelming readers.
- It must remain compatible with Sys2DSL v3.0 grammar and semantics (no legacy commands, no property=value syntax).

## Related Documents

- DS(/knowledge/default_relations) — relation catalogue including spatial relations.
- DS(/Sys2DSL-grammar.md) — formal grammar for triple syntax.
- DS(/specs/matrix) — specification matrix that tracks this theory’s coverage and tests.

