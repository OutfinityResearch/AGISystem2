# AGISystem2 — System Specifications
#
# DS26: Session Universe, IoC, and Runtime-Reserved Atoms
#
# Status: Draft (implemented in code)
# Audience: Core developers, evaluation authors
# Author: Sînică Alboaie

## 1. Summary

AGISystem2 treats a `Session` as an isolated “universe”:

- session-local HDC strategy instance (IoC)
- session-local vocabulary (name → vector)
- session-local KB / indices / graphs / rewrites

This DS clarifies:

1) **why** some strategies (e.g., EXACT) require session-local state,
2) how `Session` constructs and injects (IoC) strategy instances,
3) which atoms are **runtime-reserved** (internal) vs. **Core theory** (semantic),
4) how Core is loaded by default,
5) how evaluation runners remain deterministic across sequential sessions.

## 2. Terminology

- **Runtime-reserved atom**: an internal token required by the runtime/engines (not a semantic symbol). Examples: `Pos1`, `__EMPTY_BUNDLE__`.
- **Core semantic atom / macro**: symbols and graphs defined in `config/Core/*.sys2` (e.g., `__Sequence`, `__Role`, relation declarations).
- **IoC (Inversion of Control)**: the runtime creates a session-local strategy instance and passes it into dependent components (Vocabulary, engines).

## 3. The Session Universe Model

### 3.1 Session isolation

A new `Session()` MUST be isolated from any previous session running in the same Node.js process:

- no shared vocabulary mappings
- no shared allocator state for strategies that allocate IDs (EXACT)
- no shared KB contents or indexes

The evaluation harness relies on this property when running many sessions sequentially.

### 3.2 Why EXACT cannot be “stateless”

EXACT assigns atoms a session-local **appearance index** (`0,1,2,...`) and encodes them as one-hot BigInt bits.

If the allocator were process-global, the index assignment would depend on prior sessions, breaking determinism and making results non-reproducible across runs.

## 4. HDC IoC: per-Session strategy instances

### 4.1 Strategy registry vs. strategy instances

The strategy registry returns a *base* object for a strategy ID.

If a strategy exports:

```js
createInstance({ strategyId, geometry, session })
```

then the runtime MUST construct a session-local instance and use it for all operations in that session.

### 4.2 Implementation mapping

- `src/hdc/context.mjs` creates the session-local HDC context and calls `createInstance()` when available.
- `src/runtime/vocabulary.mjs` uses the session’s HDC context (`session.hdc.createFromName`) so stateful strategies remain session-local.

## 5. Runtime-reserved atoms vs. Core theory symbols

### 5.1 Two categories

**A) Runtime-reserved atoms (internal):**

- `BOTTOM_IMPOSSIBLE`, `TOP_INEFFABLE` (reserved semantic sentinels for downstream strategy policies)
- `Pos1..Pos20` (argument-position markers used by the runtime)
- `__EMPTY_BUNDLE__` (bundle of an empty list)
- `__CANONICAL_REWRITE__` (internal marker for metadata-only canonical rewrite facts)

These tokens are not part of the semantic DSL; they are implementation details required for consistent vector construction and engine behavior.

**B) Core semantic atoms/macros (theory):**

- graphs/macros like `__Sequence`, `__Bundle`, `__Role`, relation declarations, etc.

These are part of the semantic library and live in `.sys2` files.

### 5.2 Why both exist

Argument positions are encoded using `PosN` markers to avoid permutation (which breaks extension) while keeping encoding deterministic and strategy-compatible.

## 6. Non-DSL configuration for runtime-reserved atoms

Runtime-reserved atoms are configured in a **non-DSL** file:

- `config/runtime/reserved-atoms.json`

The Session reads this file (with a safe fallback) and pre-creates the atoms in the vocabulary at session start.

Goal: keep “mandatory internals” out of `.sys2` theories and reduce hard-coded lists in JS.

## 7. Core auto-load policy

### 7.1 Default behavior

By default, `Session` loads Core theories from `./config/Core` at initialization (theory-driven semantics without relying on runners).

### 7.2 Opt-out and test mode

Core auto-load can be disabled:

- explicitly: `new Session({ autoLoadCore: false })`
- via env: `SYS2_AUTO_LOAD_CORE=0`

Under `node --test`, auto-load defaults to OFF unless explicitly enabled, to keep unit tests fast and focused.

## 8. Required invariant tests

For appearance-index strategies (EXACT), we enforce:

- runtime-reserved atoms are created **before** user atoms

This keeps early indices stable and reduces BigInt limb growth.

Implementation reference: `tests/unit/runtime/runtime-reserved-atoms.test.mjs`.

## 9. References (implementation)

- `src/runtime/session.mjs`
- `src/hdc/context.mjs`
- `src/runtime/vocabulary.mjs`
- `src/runtime/runtime-reserved-atoms.mjs`
- `config/runtime/reserved-atoms.json`
