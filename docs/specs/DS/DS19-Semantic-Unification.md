# AGISystem2 - System Specifications

# Chapter 19: Semantic Unification & Canonicalization

**Document Version:** 1.0  
**Status:** Draft Specification  
**Scope:** Core runtime + reasoning engines + theory integration  

---

## 19.1 Goal

AGISystem2 SHALL ensure **semantic unification**:

> If two DSL formulations express the same semantic object, the system SHALL produce the same **canonical representation**, and MUST be able to return a **verifiable proof object** for any reasoning output.

This chapter defines the canonicalization pipeline, how it integrates with the **two reasoning modes**:
- **Symbolic Priority** (symbolic reasoning first, HDC as fast intuition / storage)
- **Holographic Priority** (HDC-first candidate generation, always symbolically validated)

and what “proof real” means for both.

---

## 19.2 Definitions

| Term | Meaning |
|------|---------|
| **Atom** | A canonical, typed concept identity (entity, property, category, relation, event, etc.). |
| **Canonical DSL** | A normalized DSL form that is the unique “official” encoding for an intended semantics. |
| **Canonical Metadata** | Structured `{ operator, args, ... }` metadata for each stored fact, after canonicalization (including alias resolution and Not expansion). |
| **Semantic Class** | A tag grouping alternative encodings that MUST be normalized to a canonical form (e.g., Communication, Ownership, DefaultReasoning). |
| **Proof Object** | A structured, machine-checkable proof tree describing exactly which facts/rules/operators were used and why the conclusion holds (or fails). |
| **Validation** | Symbolic verification that the proof object is consistent with stored facts, relation properties, and inference rules. |

---

## 19.3 System Requirements

### 19.3.1 Canonicalization Invariants

The system SHALL enforce these invariants:

1. **Canonical Atom Identity**
   - Any atom created by name MUST be deterministic (same name + same theory → same atom vector).
   - Atoms MUST be typed (e.g., PersonType, PlaceType) and optionally class-tagged (SemanticClass).

2. **Canonical Fact Representation**
   - Every stored fact MUST have canonical metadata.
   - Canonical metadata MUST be sufficient to reconstruct the canonical DSL form.

3. **Canonical Negation**
   - `Not` MUST be normalized so that `Not $ref` and `Not (operator args...)` represent the same canonical object.

4. **Alias/Synonym Normalization**
   - If `synonym A B` exists (or a configured alias set exists), queries and proofs MUST treat `A` and `B` as equivalent under canonicalization rules (with traceable steps in the proof).

5. **Theory-Driven Operator Properties**
   - Relation properties (transitive, symmetric, reflexive) MUST come from the loaded theories (not from hardcoded JS lists).

### 19.3.2 Proof Requirements (“proof real”)

Any `prove(...)` result SHALL include a proof object that is:
- **Traceable:** references the exact supporting facts/rules (by metadata name or stable IDs).
- **Replayable:** can be re-validated by a proof validator without rerunning the whole search.
- **Complete:** includes all steps, including synonym expansions, default overrides, transitive chain links, and negation-as-failure assumptions.
- **Sound under selected mode:** in holographic mode, the proof MUST include a symbolic validation step for any HDC-generated candidate.

### 19.3.3 Dual-Engine Consistency

Both reasoning engines MUST produce proofs in the same proof schema:
- Symbolic priority engine: proof produced directly by symbolic search.
- Holographic priority engine: proof produced by (1) HDC candidate generation, then (2) symbolic validation producing the same proof schema.

The engines MAY differ in how they propose candidates and how they rank them, but MUST NOT differ in proof format.

---

## 19.4 Architecture Overview

### 19.4.1 Canonicalization Pipeline

The runtime SHALL have a canonicalization pipeline that runs before facts are committed to KB and before queries/proofs are executed:

1. **Parse DSL → AST**
2. **SemanticIndex load**
   - Extract operator properties, semantic class hints, aliases/synonyms, and template hints from loaded theory files.
3. **Canonicalize AST**
   - Normalize atom identities (`__Named` style) where required.
   - Apply alias mapping to canonical names.
    - Rewrite recognized equivalence patterns into canonical macros.
    - Normalize negation into canonical metadata form.
4. **Execute**
   - Evaluate builtins (L0 `___*`) where applicable.
   - Store vector + canonical metadata in KB.

### 19.4.2 Builtins as Executable L0

The runtime SHALL support execution of L0 primitives used by theory macros:
- `___NewVector(name, theory)` deterministic
- `___Bind(a,b)` associative bind
- `___Bundle(items...)`
- `___Similarity(a,b)`
- `___MostSimilar(query, set)`
- `___GetType(v)` if type embedding is supported
- `___Extend(v, geometry)`

If the DSL uses a primitive that is not implemented, the runtime MUST raise a deterministic error at learn time (not silently store garbage vectors).

### 19.4.3 Proof Schema

Proof object format SHALL be stable and machine-checkable. Minimal shape:

```js
{
  valid: boolean,
  goal: { operator, args },
  method: "symbolic" | "holographic",
  confidence: number,
  steps: [
    {
      kind: "fact" | "rule" | "transitive" | "default" | "synonym" | "negation" | "validation",
      // evidence references:
      usesFacts?: [ { id, operator, args } ],
      usesRules?: [ { id, operator, args } ],
      detail?: object
    }
  ],
  assumptions?: [
    { kind: "closed_world_negation", target: { operator, args } }
  ]
}
```

The validator MUST be able to check:
- each `fact` step corresponds to an existing KB entry (or a canonical reconstruction),
- each `rule` step references a known `Implies` rule,
- each `transitive` chain step corresponds to relation properties from theory,
- each `default` step records overrides (exception blocks default),
- each `synonym` step references a synonym/alias mapping from theory or KB,
- each holographic candidate includes a symbolic `validation` step.

---

## 19.5 Canonicalization Rules (Normative)

### 19.5.1 Atom Unification Rule

For any identifier `X` intended as a named entity:
- The canonical form SHALL be `@x:X __PersonNamed "X"` (or equivalent typed constructor), not a raw vocabulary atom.
- Implementations MAY keep vocabulary atoms for performance but MUST normalize metadata names to the canonical atom identity and record the mapping in proofs.

### 19.5.2 Macro Canonicalization Rule

For each semantic class, define canonical macro forms. Example (Communication):
- Canonical: `tell speaker info listener`
- Non-canonical forms such as explicit `_mtrans` patterns SHALL be rewritten into the canonical form when they match the canonical template, or rejected in `enforceCanonical` mode.

**Theory-driven rewrite declarations.** Canonical rewrites SHOULD be declared in theory (Core or domain packs), not hardcoded in JS.  
The canonical format is a fact:

```
canonicalRewrite fromOp toOp [argMap...] [[i,j]...]
```

Where:
- `argMap` selects output arguments by index from the input arguments (e.g. `[0,1,3]`),
- `[[i,j]...]` are equality constraints over the input arguments that MUST hold for the rewrite to apply.

In strict mode, if `enforceCanonical` is enabled, the runtime MUST reject any persisted non-canonical primitive fact unless a matching `canonicalRewrite` rule is present and applicable (unambiguous).

### 19.5.3 Negation Canonicalization Rule

All negations SHALL be stored in canonical metadata:
- `Not` operator stores inner operator + inner args (not a pointer-only form).
- When input uses `$ref`, the ref is expanded to the inner metadata.
- When input uses inline `Not (Op args...)`, it is normalized to the same metadata shape.

### 19.5.4 Synonym Canonicalization Rule

The system SHALL maintain a canonicalization map for synonyms:
- Either via explicit `synonym` facts or via theory-provided alias lists.
- Queries and proofs SHALL normalize to canonical names and include `synonym` steps when the input used a non-canonical alias.

---

## 19.6 Implementation Plan (High-Level)

This chapter is normative; the implementation plan lives in `docs/specs/semantic_unification_implementation_plan.md`.

Exit criteria:
- Theory-derived operator properties (no hardcoded transitive/symmetric lists).
- Builtin L0 evaluation enabled for theory macros.
- Canonicalization pipeline present and test-covered.
- Both reasoning engines return proof objects in the unified schema.

---

## 19.7 Test Requirements

Minimum tests SHALL exist:
- Canonical equivalence tests: alternative DSL encodings normalize to identical canonical metadata and vectors.
- Proof validation tests: returned proof objects validate successfully.
- Dual-engine consistency tests: symbolicPriority and holographicPriority return compatible proofs.
