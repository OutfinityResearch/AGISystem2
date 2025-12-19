# AGISystem2 - System Specifications

# Chapter 7: Core Theory Reference (Index)

**Document Version:** 2.1
**Status:** Draft Specification
**Refactored:** This document was split into smaller, focused documents for clarity.

---

## 7.1 Purpose of Core Theory

Core is the foundational theory that is **always loaded** and **cannot be unloaded**. It provides:

1. **HDC Primitives** (L0) — raw vector operations
2. **Type System** (L1) — typed atom constructors
3. **Structural Operations** (L1) — building blocks
4. **Semantic Primitives** (L2) — Conceptual Dependency verbs
5. **Logic Primitives** — And, Or, Not, Implies, quantifiers
6. **Temporal Primitives** — Before, After, Causes
7. **Modal Primitives** — Possible, Necessary, Permitted
8. **Default Reasoning** — normally, except, unless
9. **Standard Roles** — Agent, Theme, Goal, etc.
10. **Bootstrap Verbs** (L3) — tell, give, buy, go, see, want
11. **Reasoning Verbs** — abduce, induce, whatif, etc.
12. **Meta-Query Operators** — similar, bundle, induce, analogy

---

## 7.2 Document Structure

This chapter has been refactored into the following documents:

| Document | Content | Config Files |
|----------|---------|--------------|
| [DS07a-HDC-Primitives](DS07a-HDC-Primitives.md) | L0 primitives, binding formula, position vectors | `01-positions.sys2` |
| [DS07b-Type-System](DS07b-Type-System.md) | Type hierarchy, markers, constructors, structural ops | `00-types.sys2`, `02-constructors.sys2`, `03-structural.sys2` |
| [DS07c-Semantic-Primitives](DS07c-Semantic-Primitives.md) | L2 CD primitives (_ptrans, _atrans, _mtrans, etc.) | `04-semantic-primitives.sys2` |
| [DS07d-Logic](DS07d-Logic.md) | Logic atoms, graphs, negation | `05-logic.sys2` |
| [DS07e-Temporal-Modal](DS07e-Temporal-Modal.md) | Temporal, modal, and default primitives | `06-temporal.sys2`, `07-modal.sys2`, `08-defaults.sys2` |
| [DS07f-Roles-Properties](DS07f-Roles-Properties.md) | Semantic roles, property relations, relation types | `09-roles.sys2`, `10-properties.sys2`, `00-relations.sys2` |
| [DS07g-Bootstrap-Verbs](DS07g-Bootstrap-Verbs.md) | L3 verbs built from L2 | `11-bootstrap-verbs.sys2` |
| [DS07h-Reasoning](DS07h-Reasoning.md) | Reasoning verbs, meta-operators, dual-layer arch | `12-reasoning.sys2` |
| [DS17-Meta-Query-Operators](DS17-Meta-Query-Operators.md) | Detailed meta-operator specs | N/A (implementation) |

---

## 7.3 Config Files → Document Mapping

| Config File | Document | Purpose |
|-------------|----------|---------|
| `00-types.sys2` | DS07b | Type markers |
| `00-relations.sys2` | DS07f | Transitive/symmetric relations |
| `01-positions.sys2` | DS07a | Position vectors |
| `02-constructors.sys2` | DS07b | Typed constructors |
| `03-structural.sys2` | DS07b | __Role, __Pair, __Bundle |
| `04-semantic-primitives.sys2` | DS07c | L2 CD primitives |
| `05-logic.sys2` | DS07d | Logic atoms/graphs |
| `06-temporal.sys2` | DS07e | Temporal relations |
| `07-modal.sys2` | DS07e | Modal operators |
| `08-defaults.sys2` | DS07e | Default reasoning |
| `09-roles.sys2` | DS07f | Semantic roles |
| `10-properties.sys2` | DS07f | Property graphs |
| `11-bootstrap-verbs.sys2` | DS07g | L3 verbs |
| `12-reasoning.sys2` | DS07h | Reasoning verbs |
| `index.sys2` | N/A | Load order |

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
| Position Vectors | 20 | DS07a |
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

## 7.6 Resolved Gaps

The following relations were identified as "hardcoded" in the [hardcoded_theory_analysis.md](../../../hardcoded_theory_analysis.md) review and have been added to core theory:

### Added to `10-properties.sys2`

| Relation | Type | Purpose |
|----------|------|---------|
| `can` | Graph + Atom | Capability relation |
| `has` | Graph + Atom | Possession relation |
| `synonym` | Graph + Atom | Synonym for fuzzy matching |

### Added to `00-relations.sys2`

| Relation | Type | Purpose |
|----------|------|---------|
| `parent`, `child` | __Relation | Family relations |
| `loves`, `hates` | __Relation | Emotional relations |
| `owns` | __Relation | Ownership |
| `likes`, `trusts` | __Relation | Social relations |
| `conflictsWith` | __SymmetricRelation | Conflict |

### Remaining Action Items

1. [x] Add `can` and `has` graphs to `10-properties.sys2` ✓
2. [x] Add `parent`, `child` relations to `00-relations.sys2` ✓
3. [ ] Update phrasing.mjs to derive templates from theory
4. [ ] Add validation for undefined relations

See DS07f Section 7f.5 for details.

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
- Meta-Operators → [DS17](DS17-Meta-Query-Operators.md)

**By Use Case:**
- "How do I create a person?" → DS07b (Type System)
- "How do I express 'John gave Mary a book'?" → DS07g (give graph)
- "How do I express 'before' and 'after'?" → DS07e (Temporal)
- "How do I define a rule?" → DS07d (implies graph)
- "How do I find similar concepts?" → DS17 (similar operator)

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
| DS17 Meta-Query Operators | Detailed meta-operator specs |

---

*End of DS07 Index*
