# AGISystem2 - System Specifications
#
# DS10: Codebase Map (Parser, Runtime, Reasoning, HDC)
#
# **Document Version:** 3.0
# **Status:** Implemented (living reference; reflects current codebase)
# **Audience:** Core developers, evaluation authors, integrators
# **Related:** DS02 (DSL), DS03 (Architecture), DS11 (Decoding), DS19 (Semantic Unification), DS26 (Session Universe)
#
# Purpose: provide a practical, up-to-date map of the codebase so contributors can find the right modules quickly.
# This document is not an implementation roadmap; it is a navigation guide aligned to the current runtime.

---

## 1. Orientation

AGISystem2 is structured around one central object: a `Session`. A session is an isolated “universe” that owns:

- the selected HDC strategy instance and HDC context (`session.hdc`),
- the vocabulary (name → vector),
- the KB facts + indices,
- the reasoning engines (query/prove/abduce/induce),
- the DSL executor (learn/load).

Most modules are designed to be session-local and injected (IoC) from `Session` construction. This is required for determinism when running many sessions sequentially in the same Node.js process (see DS26).

---

## 2. Top-level code map (current)

The codebase is ESM (`.mjs`) and organized into these major areas:

```
src/
├── parser/                 # Sys2DSL → AST
├── runtime/                # Session, executor, KB, vocabulary, canonicalization
├── reasoning/              # Query/prove engines, CSP, proof validation, meta-ops
├── hdc/                    # Strategy registry, session-local context, strategies
├── nlp/                    # NL→DSL translation (used by evals and tools)
├── output/                 # DSL/NL formatting and response translation
└── utils/                  # Debugging, env helpers, small utilities
```

`evals/` contains evaluation runners (FastEval, Saturation, etc.) that create sessions, load theories, and measure behavior.

---

## 3. Parser (Sys2DSL)

Sys2DSL parsing is isolated under `src/parser/`:

- `src/parser/lexer.mjs`: tokenization
- `src/parser/parser.mjs`: parse tokens into AST
- `src/parser/ast.mjs`: AST node types

The runtime typically calls parsing through session validation helpers:

- `Session.checkDSL(...)` (runtime-level validation and canonicalization boundaries)
- `src/runtime/session-check-dsl.mjs`

---

## 4. Runtime (Session + execution + KB)

### 4.1 Session API surface and implementation split

The public session interface is intentionally thin:

- `src/runtime/session.mjs`: the `Session` class (facade / IoC root)
- `src/runtime/session.impl.mjs`: heavy constructor logic + method implementations

Key session-owned components:

- `src/runtime/executor.mjs`: executes AST statements; adds facts to KB; supports `Load` via executor IO
- `src/runtime/executor-io.mjs`: implements `Load/Unload` file operations
- `src/runtime/scope.mjs`: variable scope (`@x` bindings)
- `src/runtime/vocabulary.mjs`: name→vector mapping (session-local; strategy-aware)

### 4.2 KB structures and indices

The runtime stores facts and maintains indices to avoid full scans when possible:

- `session.kbFacts`: canonical fact records (vector + metadata)
- `src/runtime/fact-index.mjs`: exact-match indexing for hot paths
- `src/reasoning/component-kb.mjs`: component-indexed KB for fuzzy matching / similarity-driven paths

### 4.3 Canonicalization and semantic rewrites

Canonicalization is core to making different surface spellings unify:

- `src/runtime/canonicalize.mjs`
- `src/runtime/canonical-rewrite-index.mjs`
- `src/runtime/semantic-index.mjs` (theory-driven relation properties and semantic classes)

---

## 5. HDC layer (strategies and session-local context)

The HDC layer is split into:

1) registry/facade (strategy selection),
2) a session-local context wrapper that binds a strategy instance to a session,
3) concrete strategies.

Key modules:

- `src/hdc/facade.mjs`: strategy registry + properties
- `src/hdc/context.mjs`: `createHDCContext(...)` creates a session-owned wrapper; supports `createInstance(...)` for stateful strategies
- `src/hdc/strategies/*`: implementations (dense, sparse, metric, elastic metric, EXACT)

This design is what allows strategies like EXACT to be session-local without leaking allocator state across sessions (DS26).

---

## 6. Reasoning layer (query/prove + holographic engines)

The reasoning layer contains both symbolic-first and holographic-first execution paths:

- `src/reasoning/index.mjs`: selects the query engine based on `session.reasoningPriority`
- `src/reasoning/query.mjs`: query engine facade (implementation lives in `src/reasoning/query/`)
- `src/reasoning/prove.mjs`: proof engine entry points (used by `Session.prove`)

Holographic-first query execution is under:

- `src/reasoning/holographic/query-hdc-first.mjs` (facade) and supporting modules

Meta operators (“analogy”, “difference”, “bundle”, etc.) are implemented as query-level operations and are kept separate from the core fact/rule engines for clarity.

Proof validation and DS19 alignment:

- `src/reasoning/proof-validator.mjs` and related modules

CSP:

- `src/reasoning/csp/*` and `src/reasoning/csp-hdc.mjs`

---

## 7. Output / phrasing

User-facing output is produced by:

- `src/output/text-generator.mjs` (operator → NL templates)
- `src/output/response-translator.mjs` (structured results → response payload)
- `src/output/result-formatter.mjs` (formatting wrappers)

Decoding and “vector inspection” utilities live under runtime helpers:

- `Session.decode(...)`, `Session.summarize(...)`
- `src/runtime/session-inspection.mjs`

---

## 8. Evaluation runners (how the project is validated)

The evaluation harness lives under `evals/` and is the primary regression safety net:

- `evals/runFastEval.mjs`: multi-suite benchmark runner
- `evals/saturation/*`: capacity/saturation experiments over synthetic “book” KBs
- `autoDiscovery/*`: automated case discovery and bug classification (DS20)

These runners create fresh sessions, load Core, load additional theories, run queries/proofs, and aggregate metrics.

---

## 9. Notes on “persistence”

AGISystem2 currently relies on reloading theories from text (`.sys2`) and re-vectorizing on each run. A disk persistence format for KB + dictionary/atoms is intentionally treated as a separate milestone; design documents describing “cold storage” formats are kept as research references (see DS03b’s obsolete memory model doc).

---

*End of DS10*

