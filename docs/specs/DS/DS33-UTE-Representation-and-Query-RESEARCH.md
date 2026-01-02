# AGISystem2 - System Specifications
#
# DS33: UTE — Representation & Query — Research
#
# **Document Version:** 0.1
# **Author:** Sînică Alboaie
# **Status:** Research (proposed; not implemented)
# **Audience:** DSL, indexing, and reasoning developers
#
# Focus: compositional representation + generalization-aware retrieval beyond pure lookup.

---

## 1. Executive Summary

UTE requires a representation that is:

1) **compositional** (relations, events, conditions, roles/slots), and  
2) **queryable under generalization** (holes, partial observables, similarity with guardrails), and  
3) **stable across engines** (symbolic proofs and holographic decoding agree on structure).

This DS proposes a minimal set of extension points to improve UTE readiness without introducing a separate backend:

- structure signatures (fast structural checks),
- semantic index contracts (multiple indexes over the same KB),
- query compilation into retrieval sketches + symbolic constraints + evidence requirements.

---

## 2. Problem Statement

AGISystem2 can already express compositional facts and run hole-filling queries. The limitation for UTE is that “retrieval” is currently
too tightly coupled to a single similarity-based candidate generator in some modes.

UTE needs:

- multiple “views” over the KB (operator-centric, role-centric, entity-centric, time-centric, mechanism-centric),
- a way to constrain holographic candidate generation before symbolic validation (to reduce wasted scans),
- an explicit intermediate representation for queries (“compiled query”) that both engines can consume.

---

## 3. Proposed Extensions

### 3.1 Structure signatures

Introduce a normalized signature for structured facts and queries, such that we can check:

- required operator family,
- required role/slot atoms,
- required position markers,
- presence/absence of forbidden categories,

without fully decoding or proving.

The signature is not a proof; it is a fast filter whose false positives are acceptable but false negatives are not.

### 3.2 Semantic index contracts

Define a pluggable indexing interface where a Session can maintain multiple indexes over the same KB:

- by operator,
- by role/slot,
- by entity IDs,
- by time markers,
- by mechanism/module IDs.

The indexing layer must remain optional and must not change semantics; it only changes retrieval cost.

### 3.3 Query compilation

Compile a DSL query into:

1) **symbolic constraints** (what must be true),
2) **retrieval sketch** (what to fetch / which index to use / what signature to match),
3) **evidence requirements** (what provenance/evidence the answer must attach).

This makes it possible for a “RAG-like” workflow to ask many questions over the same loaded theories and obtain structured answers.

---

## 4. Compatibility Notes

These changes are designed to layer on top of existing DS02/DS05 semantics:

- Symbolic validation remains the semantic authority when required.
- Holographic retrieval is used when it can reduce search cost and still produce safe candidates.
- In future work, strategy contracts may expose “witness-like” checks to strengthen signatures.

---

## 5. URC linkage (DS49/DS51/DS52)

This DS is “UTE-facing”, but it should be implementable through URC contracts rather than as one-off engine behavior.

URC mapping:

- **URC Content (DS49):** a compiled query should be representable as Content IR + a retrieval sketch (index hints are non-authoritative).
- **URC Goals (DS49):** queries should declare explicit result requirements (e.g., “must provide a proof”, “must provide evidence anchors”, budget/timeout).
- **URC Evidence/Artifacts (DS49):** answers should attach at least one evidence anchor (proof trace, retrieval witness, or failure artifact).
- **Capability registry (DS52):** retrieval + validation steps are routed to backends based on fragment classification (symbolic, HDC-first, CSP, etc.).
- **Pack taxonomy (DS51):** structure signatures and indexing rules must not silently depend on eval-only vocab; any domain-specific signatures live in explicit packs.

---

*End of DS33*
