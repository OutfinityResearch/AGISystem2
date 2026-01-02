# Core / Config Semantic–Pragmatic Initialization (AGISystem2)

This note explains what you see in KBExplorer’s unified tree (KB facts, graphs, vocabulary, scope), why the same names appear in multiple places, and what is defined in code vs configuration.

All content below is based on the current repository state (no external sources).

## 1) The “Session state” has multiple stores (why duplicates exist)

In a running `Session`, the same surface token (e.g. `isA`, `Pos1`, `StressCompat`) can exist in multiple *different* stores with different meanings:

1. **KB Facts (`session.kbFacts`)**
   - Persisted statements that the system “believes”.
   - Created by `learn(...)` when a statement has no `@var` destination, or uses `@:name`, or uses `@var:name`.
   - Each fact has an `id`, an optional `name`, a `vector`, and structured `metadata` (operator + args).

2. **Graphs (`session.graphs`)**
   - Executable definitions declared by `@name[:persistName] graph ... end`.
   - Used to expand/macros/compute vectors during execution.
   - Graphs are *not* KB facts by default; they are stored in a separate map.

3. **Vocabulary atoms (`session.vocabulary`)**
   - The name → vector mapping for every token that ever gets referenced/created in this session.
   - It is *not* a “knowledge base”; it’s a vector dictionary.
   - Many tokens appear here just because they were mentioned in Core, in a learned file, or in a query.

4. **Scope (`session.scope`)**
   - Temporary variable bindings created by `@var ...` (without persisting to KB) and graph parameters.
   - This is “working memory”, not the KB.

Because these are separate stores, **it is normal that the same string appears multiple times**:
- `isA` appears as:
  - a vocabulary atom (vector for the token `isA`),
  - a KB fact name if Core declared `@isA:isA __TransitiveRelation` (that declaration is itself a KB fact),
  - and it may also appear as a graph name in other theories (not necessarily in Core).
- `StressCompat` appears as:
  - a vocabulary atom (because Core references it),
  - and in many KB facts’ *encodings* because graphs in `config/Core/15-stress-compat.sys2` add it as a context argument.

## 2) What the KBExplorer tree categories mean

KBExplorer is a “session browser”: it tries to show **everything that exists in the session**, grouped by the store it belongs to.

### KB bundle
- This is the **superposition vector** of all KB facts (`session.kb` / `session.getKBBundle()`).
- It is not a list of facts; it is one vector.

### Long-Term Memory (Facts)
- These are entries from `session.kbFacts` (persisted facts).
- Note: Core is loaded via `learn(...)`, so **Core declarations are also KB facts** and therefore show up here.

### Procedural Memory (Graphs)
- These are entries from `session.graphs` (executable graph definitions).
- They include Core graphs and any graphs learned at runtime.

### Lexicon (Symbols)
- This is `session.vocabulary.names()` (name → vector dictionary).
- It can be huge because every referenced token can create an atom vector.
- It is split by the naming convention (“layers”) to make it navigable:

#### Role/slot markers (PosN)
Includes argument-position markers:
- `Pos1`, `Pos2`, … `Pos20`

These are **runtime-reserved** and are created at session start (see Section 4.1).

#### L0 / L1 / L2 / L3+
This is a *convention* from the DSL specs:
- **L0 (`___`)**: HDC primitives (e.g. `___Bind`, `___Bundle`, `___NewVector`) implemented by the runtime.
- **L1 (`__`)**: structural/type-level constructs used to build higher-level semantics (e.g. `__Role`, `__Pair`, `__Bundle`).
- **L2 (`_`)**: semantic primitives (Conceptual Dependency verbs, etc.).
- **L3+ (no prefix)**: domain-level vocabulary (“normal words”).

Important: you will see “a lot” in these buckets because **Core references many tokens**, and the vocabulary records them all.

### Working Memory (Bindings)
- This is the current content of `session.scope` (temporary bindings / working memory).
- Examples:
  - `@x isA Alice Person` creates `x` in scope, but if it is not persisted it may not show as a KB fact.
  - Graph parameters (`graph a b`) create bindings inside graph execution scopes.

## 3) Why “everything in DSL” is not only “KB facts”

Sys2DSL mixes:
- **declarative knowledge** (facts you can query/prove),
- **procedural definitions** (graphs/macros),
- and **symbol atoms** (vocabulary vectors).

If we forced graphs and vocabulary into KB facts, we would lose separation of concerns:
- graphs need bodies/params/return and do not naturally fit the “fact vector + metadata” shape,
- vocabulary atoms are not claims; they are vector identities and can be created lazily at massive scale.

That’s why the unified browser groups them by store.

## 4) Where definitions come from (code vs config)

### 4.1 Defined in code (runtime)

These are not declared in `.sys2` files; they exist because of the JavaScript runtime:

- **L0 vector operations** (implemented in code):
  - `___Bind`, `___Bundle`, `___Similarity`, `___MostSimilar`, `___NewVector`, etc.
  - Implemented in `src/runtime/executor-builtins.mjs` and the HDC facade under `src/hdc/`.

- **Built-in operators / meta-ops** (recognized by the executor / DSL checker):
  - `Load`, `Unload`, `Set`, `solve`, `abduce`, `bundle`, `induce`, etc.
  - `Load` / `Unload` perform real file I/O via `src/runtime/executor-io.mjs`.

- **Runtime-reserved atoms** (auto-initialized at Session construction):
  - `BOTTOM_IMPOSSIBLE`, `TOP_INEFFABLE` (reserved sentinels)
  - `Pos1..Pos20` (argument-position markers)
  - `__EMPTY_BUNDLE__`, `__CANONICAL_REWRITE__`, etc.
  - Configured by `config/runtime/reserved-atoms.json` and loaded by `src/runtime/runtime-reserved-atoms.mjs`.

- **Semantic index bootstrap** (theory-aware behavior in code):
  - The semantic index is derived from Core config files (relations + constraints) and used for contradiction checking, canonicalization, and operator typing.
  - Implemented in `src/runtime/semantic-index.mjs`.

### 4.2 Defined in `config/Core` (always loaded as “Core”)

Core is loaded into every KBExplorer session via `session.loadCore({ includeIndex: true })`.

Core defines:
- Type markers, roles, relations (including transitive/symmetric/etc.)
- Structural graphs/macros (`__Role`, `__Pair`, `__Bundle`, …)
- Logic/temporal/modal/default reasoning graphs
- Property/state graphs
- Bootstrap verbs and reasoning verbs
- Canonicalization declarations and theory-driven constraints

High-level file breakdown (counts are approximate; “defs” counts lines beginning with `@`, “graphs” counts occurrences of the word `graph`):

| File | Purpose | defs | graphs |
|---|---|---:|---:|
| `config/Core/00-types.sys2` | type markers | 19 | 0 |
| `config/Core/00-relations.sys2` | relation properties | 52 | 0 |
| `config/Core/03-structural.sys2` | structural graphs | 6 | 6 |
| `config/Core/05-logic.sys2` | logic atoms/graphs | 18 | 9 |
| `config/Core/14-constraints.sys2` | general constraints (mutual exclusion / inverses) | 15 | 0 |
| `config/Core/15-stress-compat.sys2` | stress-compat graphs | 45 | 44 |
| … | … | … | … |

Notes:
- Core is loaded via `learn(...)`, so its declarations become KB facts (that’s why Core content appears under “KB facts”).
- Core graphs are stored in `session.graphs` and appear under “Graphs”.
- Every token referenced by Core becomes a vocabulary atom and appears under “Vocabulary”.

### 4.3 Defined in `config/Constraints` (optional “constraint modeling” pack)

This folder is **not** part of Core and is **not auto-loaded** by `session.loadCore`.
It is used by some evaluation suites (example: `evals/fastEval/suite21_goat_cabbage_plus/cases.mjs` loads `Constraints/01-relations.sys2`).

What it contains:
- `config/Constraints/00-lexicon-constraints.sys2`
  - “value vocabulary” atoms for constraint tasks (e.g. `Safe`, `Unsafe`).
- `config/Constraints/01-relations.sys2`
  - domain-friendly alias graphs like `conflicts`, `location`, `safe`, `unsafe`, `boatCapacity`, `mustBe`.

So “Constraints” here means: *a small convenience theory pack for constraint-style problems*, not the same thing as Core’s general constraint primitives in `config/Core/14-constraints.sys2`.

## 5) Why both “Core” and “Constraints” exist

Rationale:
- **Core** is the minimal, stable foundation needed for the system to run and to interpret/execute DSL in a general way.
  - It defines primitives, roles, logic, and generic constraint declarations used by the runtime (e.g. mutually exclusive states).
  - KBExplorer loads Core automatically because otherwise many examples and NL→DSL behavior degrade.

- **Constraints (config/Constraints)** is an *optional* pack of higher-level modeling helpers for specific tasks (especially CSP-like / planning-like puzzles).
  - It provides extra vocabulary (`Safe/Unsafe`) and alias graphs (`location`, `conflicts`) that make those domains easier to write/read.
  - It is not always appropriate to force into every session, so it is separated.

In practice:
- If you are exploring constraint-style problems, you can `Load` the Constraints theory pack in your session.
- If you are exploring general reasoning, Core is enough.

## 6) Known source of confusion: multiple “position” names

Previously, the repo could produce multiple “position” families (e.g., `Pos1`, `__Pos1__`, `__POS_1__`), which made the lexicon look duplicated.

The current codebase normalizes this to a single canonical family:
- `Pos1..Pos20` are the only argument-position markers.
- They are runtime-reserved and initialized at session start from `config/runtime/reserved-atoms.json`.

This removes “position duplication” noise from both reasoning outputs and KBExplorer navigation.

## 7) Naming proposal (UI labels only)

To make browsing the Session state less confusing, KBExplorer uses cognitive-style labels while keeping the underlying field names unchanged:

- `session.kbFacts` → “Long-Term Memory (Facts)”
- `session.graphs` → “Procedural Memory (Graphs)”
- `session.vocabulary` → “Lexicon (Symbols)”
- `session.scope` → “Working Memory (Bindings)”
