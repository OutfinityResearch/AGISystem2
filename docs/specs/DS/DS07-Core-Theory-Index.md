# AGISystem2 - System Specifications

# Chapter 7: Core Theory Reference (Index)

**Document Version:** 2.1
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Refactored:** This document was split into smaller, focused documents for clarity.

---

## 7.1 Purpose of the Standard Library Packs (formerly “Core” / “Kernel”)

This chapter documents the **standard library theory packs** shipped with AGISystem2.

These packs are **not** part of Runtime Core (code). Under the DS49/DS51 direction:

- Runtime Core stays small, intelligible, and audit-friendly (code + reserved atoms).
- Semantic libraries (types, structure, logic, roles, etc.) are **packs** that can be loaded explicitly.

Historically, these theories lived under `config/Core` and were treated as always-loaded.
As of the DS51/URC migration, the canonical location is `config/Packs/*`.

The standard library is now split into explicit packs:

1. **HDC Primitives** (L0) — raw vector operations (`config/runtime/reserved-atoms.json`)
2. **Bootstrap** (L1) — type markers + typed constructors + structural ops + roles (`config/Packs/Bootstrap`)
3. **Relations** — relation property declarations (`config/Packs/Relations`)
4. **Logic** — connectives and quantifiers (`config/Packs/Logic`)
5. **Temporal** — temporal relations (`config/Packs/Temporal`)
6. **Modal** — modality operators (`config/Packs/Modal`)
7. **Defaults** — non-monotonic defaults (`config/Packs/Defaults`)
8. **Properties** — property/state macros and helpers (`config/Packs/Properties`)
9. **Numeric** — numeric helpers (`config/Packs/Numeric`)
10. **Semantics** — L2 conceptual dependency primitives (`config/Packs/Semantics`)
11. **Lexicon** — higher-level convenience verbs (`config/Packs/Lexicon`)
12. **Reasoning** — meta-level reasoning macros (`config/Packs/Reasoning`)
13. **Canonicalization** — alias/canonical mapping (`config/Packs/Canonicalization`)
14. **Consistency** — contradiction primitives (`config/Packs/Consistency`)

`config/Packs/Kernel` now exists only as a **legacy aggregate manifest** to preserve older load flows and tooling assumptions. New work should load packs explicitly.

---

## 7.2 Document Structure

This chapter has been refactored into the following documents:

| Document | Content | Pack Files (canonical) |
|----------|---------|--------------|
| [DS07a-HDC-Primitives](DS07a-HDC-Primitives.md) | L0 primitives, binding formula, position markers | `config/runtime/reserved-atoms.json` |
| [DS07b-Type-System](DS07b-Type-System.md) | Type hierarchy, markers, constructors, structural ops | `config/Packs/Bootstrap/*` |
| [DS07c-Semantic-Primitives](DS07c-Semantic-Primitives.md) | L2 CD primitives (_ptrans, _atrans, _mtrans, etc.) | `config/Packs/Semantics/04-semantic-primitives.sys2` |
| [DS07d-Logic](DS07d-Logic.md) | Logic atoms, graphs, negation | `config/Packs/Logic/05-logic.sys2` |
| [DS07e-Temporal-Modal](DS07e-Temporal-Modal.md) | Temporal, modal, and default primitives | `config/Packs/Temporal/*`, `config/Packs/Modal/*`, `config/Packs/Defaults/*` |
| [DS07f-Roles-Properties](DS07f-Roles-Properties.md) | Semantic roles, property relations, relation types | `config/Packs/Bootstrap/09-roles.sys2`, `config/Packs/Properties/10-properties.sys2`, `config/Packs/Relations/00-relations.sys2` |
| [DS07g-Bootstrap-Verbs](DS07g-Bootstrap-Verbs.md) | L3 verbs built from L2 | `config/Packs/Lexicon/11-bootstrap-verbs.sys2` |
| [DS07h-Reasoning](DS07h-Reasoning.md) | Reasoning verbs, meta-operators, dual-layer arch | `config/Packs/Reasoning/12-reasoning.sys2` |
| [DS17a-Meta-Query-Operators](DS17a-Meta-Query-Operators.md) | Detailed meta-operator specs | N/A (implementation) |

---

## 7.3 Pack Files → Document Mapping (canonical paths)

| Config File | Document | Purpose |
|-------------|----------|---------|
| `config/Packs/Bootstrap/00-types.sys2` | DS07b | Type markers |
| `config/Packs/Bootstrap/02-constructors.sys2` | DS07b | Typed constructors |
| `config/Packs/Bootstrap/03-structural.sys2` | DS07b | __Role, __Pair, __Bundle |
| `config/Packs/Bootstrap/09-roles.sys2` | DS07f | Semantic roles |
| `config/Packs/Relations/00-relations.sys2` | DS07f | Relation properties |
| `config/Packs/Properties/10-properties.sys2` | DS07f | Property graphs |
| `config/Packs/Numeric/04a-numeric.sys2` | DS07 (numeric) | Numeric layer |
| `config/Packs/Semantics/04-semantic-primitives.sys2` | DS07c | L2 CD primitives |
| `config/Packs/Logic/05-logic.sys2` | DS07d | Logic atoms/graphs |
| `config/Packs/Temporal/06-temporal.sys2` | DS07e | Temporal relations |
| `config/Packs/Modal/07-modal.sys2` | DS07e | Modal operators |
| `config/Packs/Defaults/08-defaults.sys2` | DS07e | Default reasoning |
| `config/Packs/Lexicon/11-bootstrap-verbs.sys2` | DS07g | Convenience verbs |
| `config/Packs/Reasoning/12-reasoning.sys2` | DS07h | Reasoning verbs |
| `config/Packs/Canonicalization/*` | DS19 | Canonicalization primitives |
| `config/Packs/Consistency/14-constraints.sys2` | DS19 | Contradiction primitives |

---

## 7.4 Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│ L3: Bootstrap Verbs (tell, give, buy, go, see, want)    │ DS07g
├─────────────────────────────────────────────────────────┤
│ L2: Semantic Primitives (_ptrans, _atrans, _mtrans)     │ DS07c
├─────────────────────────────────────────────────────────┤
│ L1: Types + Structure (__Person, __Role, __Pair)        │ DS07b
├─────────────────────────────────────────────────────────┤
│ L0: HDC Primitives (___Bind, ___Bundle, ___Similarity)  │ DS07a
└─────────────────────────────────────────────────────────┘
```

Cross-cutting concerns:
- **Logic** (DS07d): Used at all levels
- **Temporal/Modal** (DS07e): Event modification
- **Roles** (DS07f): Event structure
- **Reasoning** (DS07h): Meta-level operations

---

## 7.5 Comprehensive Statistics

| Category | Count | Reference |
|----------|-------|-----------|
| Type Markers | 19 | DS07b |
| Position Markers | 20 | DS07a |
| Typed Constructors | 16 | DS07b |
| Structural Operations | 5 | DS07b |
| L2 Primitives | 11 | DS07c |
| Logic Atoms | 8 | DS07d |
| Logic Graphs | 8 | DS07d |
| Temporal Atoms | 10 | DS07e |
| Temporal Graphs | 10 | DS07e |
| Modal Atoms | 9 | DS07e |
| Modal Graphs | 6 | DS07e |
| Default Atoms | 5 | DS07e |
| Default Graphs | 4 | DS07e |
| Semantic Roles | 26 | DS07f |
| Property Graphs | 11 | DS07f |
| Relation Types | 19 | DS07f |
| L3 Bootstrap Verbs | 17 | DS07g |
| Reasoning Verbs | 7 | DS07h |
| Meta-Query Operators | 5 | DS17 |

**Total: ~216 definitions**

---

## 7.6 Policy: packs must stay universal

We do not promote evaluation- or test-driven vocabulary into universal packs.

Rules:

- If a test or eval needs a convenience relation/verb, it must ship it as a suite-local theory file.
- Packs under `config/Packs/*` should remain domain-agnostic and long-horizon stable.

This aligns with DS49 (URC) and DS51 (taxonomy) to avoid “eval-driven vocabulary creep”.

---

## 7.7 Quick Navigation

**By Topic:**
- HDC/Vectors → [DS07a](DS07a-HDC-Primitives.md)
- Types/Constructors → [DS07b](DS07b-Type-System.md)
- Events/Actions → [DS07c](DS07c-Semantic-Primitives.md)
- Logic/Rules → [DS07d](DS07d-Logic.md)
- Time/Modality → [DS07e](DS07e-Temporal-Modal.md)
- Roles/Relations → [DS07f](DS07f-Roles-Properties.md)
- Common Verbs → [DS07g](DS07g-Bootstrap-Verbs.md)
- Reasoning → [DS07h](DS07h-Reasoning.md)
- Meta-Operators → [DS17a](DS17a-Meta-Query-Operators.md)

**By Use Case:**
- "How do I create a person?" → DS07b (Type System)
- "How do I express 'John gave Mary a book'?" → DS07g (give graph)
- "How do I express 'before' and 'after'?" → DS07e (Temporal)
- "How do I define a rule?" → DS07d (implies graph)
- "How do I find similar concepts?" → DS17a (similar operator)

---

## 7.8 Key Design Decisions

1. **No Permutation** — breaks vector extension; use position vectors instead
2. **ASCII Stamping** — deterministic, extensible initialization
3. **Strong Types** — catches errors, guides LLM translation
4. **Dual-Layer Operators** — declaration in theory + implementation in code
5. **Layered Primitives** — L0 → L1 → L2 → L3 hierarchy

---

## 7.9 Related Specifications

| Document | Relationship |
|----------|--------------|
| DS02 DSL Syntax | DSL syntax for all primitives |
| DS05 Basic Reasoning | How primitives are used in reasoning |
| DS06 Advanced Reasoning | Complex reasoning with primitives |
| DS17a Meta-Query Operators | Detailed meta-operator specs |
| DS49 Universal Reasoning Core | Long-horizon storage/evidence/orchestration contract |
| DS51 Config Taxonomy | Core vs optional domain packs |

---

*End of DS07 Index*
