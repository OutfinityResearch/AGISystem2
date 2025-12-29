# Module: `src/runtime/runtime-reserved-atoms.mjs`

**Purpose:** Define and initialize **runtime-reserved atoms** (internal tokens) from a non-DSL configuration file.

## Why this exists

Some runtime tokens are mandatory for correct and deterministic behavior but are not “semantic knowledge” and should not live in `.sys2` theories.

In particular, appearance-index strategies (EXACT) benefit from reserving low indices for these atoms to keep BigInt limbs small and stable.

## Configuration

- `config/runtime/reserved-atoms.json`

Schema (v0):

```json
{
  "positionAtoms": { "count": 20, "template": "__POS_{n}__" },
  "atoms": ["__EMPTY_BUNDLE__", "__CANONICAL_REWRITE__"]
}
```

## Exports

- `getRuntimeReservedAtomNames({ maxPositions? })`
- `initRuntimeReservedAtoms(session, { maxPositions? })`

## Behavior

- Loads config once (safe fallback to defaults).
- Computes the final list of token names.
- Pre-creates tokens via `session.vocabulary.getOrCreate(name)`.

## Related specs

- `docs/specs/DS/DS26-Session-Universe.md`

