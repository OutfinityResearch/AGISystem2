# Base Theory Specifications Index

ID: DS(/theory/base/index)

Status: v3.0

## Overview

This directory contains specifications for the **base theory files** - the foundational Sys2DSL definitions that implement the v3.0 unified triple syntax paradigm.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   BASE THEORY STACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 4: Domain Theories (user-defined)                        │
│           medical_domain.sys2dsl, legal_domain.sys2dsl, ...     │
│                         ▲                                       │
│  ───────────────────────┼───────────────────────────────────    │
│                         │                                       │
│  Layer 3: Output & Control                                      │
│           output.sys2dsl, control.sys2dsl                       │
│                         ▲                                       │
│  ───────────────────────┼───────────────────────────────────    │
│                         │                                       │
│  Layer 2: Operations (depend on primitives + constants)         │
│           logic.sys2dsl, modal.sys2dsl, query.sys2dsl           │
│           reasoning.sys2dsl, memory.sys2dsl, theory.sys2dsl     │
│                         ▲                                       │
│  ───────────────────────┼───────────────────────────────────    │
│                         │                                       │
│  Layer 1: Foundations                                           │
│           primitives.sys2dsl, constants.sys2dsl                 │
│                         ▲                                       │
│  ───────────────────────┼───────────────────────────────────    │
│                         │                                       │
│  Layer 0: Knowledge Base                                        │
│           ontology_base.sys2dsl, axiology_base.sys2dsl          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## File Catalog

### Foundation Files

| File | Spec | Purpose |
|------|------|---------|
| `primitives.sys2dsl` | [primitives.sys2dsl.md](./primitives.sys2dsl.md) | Hardcoded geometric primitive declarations |
| `constants.sys2dsl` | [constants.sys2dsl.md](./constants.sys2dsl.md) | Standard numeric constants |

### Operation Files

| File | Spec | Purpose |
|------|------|---------|
| `logic.sys2dsl` | [logic.sys2dsl.md](./logic.sys2dsl.md) | Boolean logic: AND, OR, NOT, IMPLIES |
| `modal.sys2dsl` | [modal.sys2dsl.md](./modal.sys2dsl.md) | Modal logic: POSSIBLY, NECESSARILY, PERMITTED |
| `query.sys2dsl` | [query.sys2dsl.md](./query.sys2dsl.md) | Query operations: IS_A, HAS, FACTS |
| `reasoning.sys2dsl` | [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) | Inference: INFER, PROVE, ABDUCT |
| `memory.sys2dsl` | [memory.sys2dsl.md](./memory.sys2dsl.md) | Memory management: FORGET, BOOST, PROTECT |
| `theory.sys2dsl` | [theory.sys2dsl.md](./theory.sys2dsl.md) | Theory layers: PUSH, POP, SAVE, LOAD |

### System Files

| File | Spec | Purpose |
|------|------|---------|
| `output.sys2dsl` | [output.sys2dsl.md](./output.sys2dsl.md) | Output formatting: TO_NATURAL, EXPLAIN |
| `control.sys2dsl` | [control.sys2dsl.md](./control.sys2dsl.md) | Execution control: depth, timeout, mode |
| `search.sys2dsl` | [search.sys2dsl.md](./search.sys2dsl.md) | Search strategies: DFS, BFS, beam, backtracking |

### Knowledge Base Files

| File | Spec | Purpose |
|------|------|---------|
| `ontology_base.sys2dsl` | [ontology_base.sys2dsl.md](./ontology_base.sys2dsl.md) | Foundational facts about the world |
| `axiology_base.sys2dsl` | [axiology_base.sys2dsl.md](./axiology_base.sys2dsl.md) | Values, ethics, and norms |

## Load Order

Base theories must be loaded in dependency order:

```
1. primitives.sys2dsl     # Declares NUMERIC_VALUE, READ_DIM, CHOICE_POINT, etc.
2. constants.sys2dsl      # Uses NUMERIC_VALUE to define positive, negative, zero
3. logic.sys2dsl          # Uses constants for truth operations
4. modal.sys2dsl          # Uses logic + constants
5. query.sys2dsl          # Uses primitives for geometric queries
6. search.sys2dsl         # Uses primitives for backtracking/exploration
7. reasoning.sys2dsl      # Uses query + logic + search for inference
8. memory.sys2dsl         # Uses primitives for lifecycle management
9. theory.sys2dsl         # Uses memory for layer management
10. output.sys2dsl        # Uses all above for formatting
11. control.sys2dsl       # Sets execution parameters
12. ontology_base.sys2dsl # Knowledge (uses query verbs)
13. axiology_base.sys2dsl # Values (uses query verbs)
```

## Design Principles

### 1. Everything is a Point

Every entity - verbs, concepts, facts, constants - is a point in conceptual space:

```sys2dsl
@AND        # verb point (kind: "verb")
@animal     # concept point (kind: "concept")
@Dog        # fact point (kind: "fact")
@positive   # constant point (kind: "constant")
```

### 2. Naming Determines Type

The case convention of a name determines the point type:

| Pattern | Type | Example |
|---------|------|---------|
| `ALL_CAPS` | verb | `@IS_A`, `@AND`, `@PROVES` |
| `all_lower` | concept | `@animal`, `@truth` |
| `First_cap` | fact | `@Dog`, `@Paris` |

### 3. Minimal Primitives

Only operations that cannot be defined in DSL are primitives:
- Geometric operations (READ_DIM, PROJECT_DIM, ATTRACT, EXTEND)
- Numeric operations (PLUS, MINUS, MIN, MAX)
- Reasoning primitives (INDUCT, DEDUCT, ABDUCT_PRIM)
- System operations (CONTROLS, INSPECT)

Everything else is defined as DSL verbs in these base theories.

### 4. Declarative Execution

Statement order doesn't matter. Dependencies are resolved via topological sort:

```sys2dsl
@result $a AND $b      # Executes THIRD
@a Dog IS_A animal     # Executes FIRST
@b Cat IS_A animal     # Executes FIRST
```

## Verb Count by Category

| Category | Count | Examples |
|----------|-------|----------|
| Logic | 10 | AND, OR, NOT, IMPLIES, IFF, XOR, NONEMPTY, EMPTY, ALL_TRUE, ANY_TRUE |
| Modal | 15 | POSSIBLY, NECESSARILY, PERMITTED, PROHIBITED, OBLIGATORY, KNOWN, BELIEVED, ALWAYS, SOMETIMES, NEVER, EVENTUALLY, MORE_THAN, LESS_THAN_MOD, EQUAL_TO, CONTINGENTLY |
| Query | 18 | IS_A, HAS, RELATES, FACTS, INSTANCES, SUBTYPES, SUPERTYPES, MATCHING, WITH_RELATION, WITH_OBJECT, FILTER, COUNT_RESULTS, FIRST, LAST, CAUSES, PART_OF, LOCATED_IN, BEFORE, AFTER, EXISTS, UNKNOWN_Q |
| Reasoning | 18 | INFER, INFER_TRANSITIVE, INFER_DEFAULT, PROVE, DISPROVE, VALIDATE, ABDUCT, HYPOTHESIZE, BEST_EXPLANATION, ANALOGIZE, SIMILAR_TO, CHECK_CONTRADICTION, WOULD_CONTRADICT, RESOLVE_CONFLICT, CF, WHATIF, APPLY_RULE, FORWARD_CHAIN, BACKWARD_CHAIN |
| Memory | 14 | FORGET, FORGET_COMPLETELY, RETRACT, DECAY, BOOST, REINFORCE, PRIME, PROTECT, UNPROTECT, IS_PROTECTED, CORE, GET_USAGE, RECORD_USE, USAGE_RANK, COLLECT_GARBAGE, COMPACT, VERSION, ROLLBACK, SNAPSHOT |
| Theory | 16 | PUSH, POP, COMMIT, DISCARD, SAVE, LOAD, DELETE, MERGE, THEORIES, THEORY_INFO, CURRENT_THEORY, LAYER_DEPTH, RESET_SESSION, NEW_SESSION, CHECKPOINT, RESTORE, SET_READONLY, SET_WRITABLE, IS_READONLY, TAG |
| Output | 14 | TO_NATURAL, EXPLAIN, DESCRIBE, SUMMARIZE, TO_JSON, TO_TRIPLE, TO_GRAPH, FORMAT, INDENT, TRUNCATE, SHOW_PROOF, SHOW_CHAIN, SHOW_WHY, EXPORT, RENDER, PRINT, DIFF, COMPARE |
| Control | 15 | SET_DEPTH, GET_DEPTH, SET_BACKTRACK, GET_BACKTRACK, SET_TIMEOUT, GET_TIMEOUT, SET_CONFIDENCE, GET_CONFIDENCE, SET_STRATEGY, GET_STRATEGY, SET_MODE, GET_MODE, ENABLE_TRACE, DISABLE_TRACE, SET_VERBOSITY, SET_MAX_FACTS, SET_MAX_RESULTS, MASK_PARTITION, MASK_DIMENSION, UNMASK_ALL |

**Total Base Verbs**: ~120 verbs

## See Also

- [Sys2DSL-grammar.md](../../Sys2DSL-grammar.md) - v3.0 syntax specification
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - v3.0 semantic specification
- [conceptual_space.md](../../core/conceptual_space.md) - Geometric model
