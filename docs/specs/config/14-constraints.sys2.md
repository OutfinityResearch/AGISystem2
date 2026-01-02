# Spec: `config/Packs/Consistency/14-constraints.sys2`

## Purpose

Defines lightweight, theory-declared consistency constraints that the runtime can extract into the semantic index for:

- contradiction warnings,
- rule validation,
- and later integration with CSP / policy materialization.

The intent is to keep this pack **minimal and domain-agnostic**.

## Key Constructs

- Constraint relations:
  - `mutuallyExclusive(op, a, b)` for same-subject contradictions
  - `contradictsSameArgs(op1, op2)` for operator-level contradictions
  - `inverseRelation(op1, op2)` for explicit inverse pairs
- A small set of baseline property/state tokens used by constraints:
  - states: `Open/Closed`, `Alive/Dead`, `PoweredOn/PoweredOff`, `Full/Empty`
  - properties: `Hot/Cold`, `Wet/Dry`

## Runtime Integration

- `src/runtime/semantic-index.mjs` extracts these constraint lines using lightweight parsing (no execution required).
- Engines can use the extracted index for early contradiction detection and for canonical inverse handling.

## Design Rationale

Constraints are kept as plain DSL facts so they can be inspected and modified as part of the semantic library, rather than being hard-coded in JavaScript.

