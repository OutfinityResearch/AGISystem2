# Orthogonal Architecture Layers

**Document ID:** ARCH-LAYERS
**Related:** URS-011, URS-016, URS-017, FS-03, FS-09

## Overview

AGISystem2 is built on **two orthogonal, independently testable layers**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NATURAL LANGUAGE LAYER                       │
│                   (Optional, LLM-dependent)                     │
│                                                                 │
│  ┌─────────────┐                      ┌─────────────┐          │
│  │   NL Input  │ ──── NL→DSL ────▶   │  Sys2DSL    │          │
│  │  (human)    │     Translation      │  Commands   │          │
│  └─────────────┘                      └──────┬──────┘          │
│                                              │                  │
│  ┌─────────────┐                      ┌──────▼──────┐          │
│  │  NL Output  │ ◀─── DSL→NL ────    │  Sys2DSL    │          │
│  │  (human)    │     Translation      │  Results    │          │
│  └─────────────┘                      └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Sys2DSL Interface
                      (the ONLY interface)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    REASONING ENGINE LAYER                       │
│              (Deterministic, LLM-independent)                   │
│                                                                 │
│  Input:  Sys2DSL triples (@var Subject VERB Object)             │
│  Output: Sys2DSL results (truth values, proofs, facts)          │
│                                                                 │
│  Components:                                                    │
│  - DSL Parser (dsl_engine.js)                                   │
│  - Inference Engine (inference_engine.js)                       │
│  - Theory Stack (theory_stack.js)                               │
│  - Geometric Encoder (encoder.js)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Reasoning Engine (DSL-in → DSL-out)

### Characteristics
- **Deterministic**: Same input always produces same output
- **LLM-independent**: No external AI/ML dependencies
- **Testable in isolation**: Direct DSL commands, no NL processing
- **Single interface**: All interactions via Sys2DSL syntax

### Input Format
```sys2dsl
@_ dog IS_A mammal
@_ Fido IS_A dog
@q Fido IS_A mammal
```

### Output Format
```sys2dsl
@q1 = { truth: "TRUE_CERTAIN", method: "transitive", confidence: 0.95 }
```

### Testing Mode
```bash
node evalsuite/runSuite.js           # Default: Direct DSL execution
```

## Layer 2: NL↔DSL Translation (Optional, LLM-dependent)

### Characteristics
- **Non-deterministic**: LLM outputs may vary
- **LLM-dependent**: Requires external translation service
- **Independently testable**: Compare generated DSL with expected DSL
- **Bidirectional**: NL→DSL (parsing) and DSL→NL (generation)

### NL→DSL Translation (Parsing)
```
Input:  "Is Fido a mammal?"
Output: @q Fido IS_A mammal    # v3 triple syntax
```

### DSL→NL Translation (Generation)
```
Input:  { truth: "TRUE_CERTAIN", method: "transitive" }
Output: "Yes, Fido is a mammal through transitive inheritance."
```

### Testing Mode
```bash
node evalsuite/runSuite.js --eval-llm    # Test NL→DSL translation quality
```

## Orthogonality Principle

<a id="ARCH-L-001"></a>**ARCH-L-001:** The Reasoning Engine MUST operate correctly without any NL translation layer. All reasoning logic receives and returns Sys2DSL.

<a id="ARCH-L-002"></a>**ARCH-L-002:** The NL↔DSL Translation Layer MUST be independently replaceable. Different LLMs or translation mechanisms can be swapped without affecting reasoning correctness.

<a id="ARCH-L-003"></a>**ARCH-L-003:** Evaluation suites MUST test each layer independently:
- Direct DSL mode tests reasoning correctness
- Eval-LLM mode tests translation quality
- Full mode tests end-to-end integration

<a id="ARCH-L-004"></a>**ARCH-L-004:** The Reasoning Engine output MUST always be expressible in Sys2DSL format, regardless of how it will be presented to users.

## Case Convention Semantics

The case convention distinguishes **universal statements** (about types) from **particular statements** (about instances):

| Case | Meaning | Example | Semantic |
|------|---------|---------|----------|
| `lowercase` | Type/Concept/Class | `dog IS_A mammal` | ∀x: dog(x) → mammal(x) |
| `Capitalized` | Instance/Individual | `Fido IS_A dog` | dog(Fido) |
| `UPPERCASE` | Relation/VERB | `IS_A`, `CAUSES` | Predicate or relation |

### Implications
- `dog IS_A mammal` applies to ALL dogs (type-level fact)
- `Fido IS_A dog` applies to ONE specific entity (instance-level fact)
- Inference engine uses these semantics for correct reasoning

## Evaluation Suite Modes

| Mode | Flag | Tests | LLM Required |
|------|------|-------|--------------|
| Direct DSL | (default) | Reasoning engine correctness | No |
| Eval-LLM | `--eval-llm` | NL→DSL translation quality | Yes |
| Full | `--full` | End-to-end pipeline | Yes |

## Implementation Notes

1. **chat_handlers.mjs**: Uses `buildQuestionPrompt` to get `{subject, relation, object}` from LLM
2. **chat_repl.mjs**: Uses `_formatAsDSL` to display DSL from reasoning results
3. **runSuite.js**: Supports all three evaluation modes independently
