# Design Spec: Sys2DSL Utility, Output, and Ontology Introspection Commands

ID: DS(/theory/Sys2DSL_commands_util_output_ontology)

Status: DRAFT v1.0

## Scope
Commands that manipulate lists/booleans, emit results, and introspect ontology knowledge. These are granular/legacy surfaces; for NL-friendly usage prefer the high-level commands in `Sys2DSL_highlevel.md` (QUERY, SUMMARIZE_FACTS, FORMAT_RESULT, MASK, etc.), which call these internally.

---

## 1. Utility Commands
- **BOOL_AND / BOOL_OR / BOOL_NOT** – boolean operations on truthy/falsy inputs.
  ```sys2dsl
  @isAllowed BOOL_AND $cond1 $cond2
  ```
- **MERGE_LISTS** – concatenate lists.
  ```sys2dsl
  @all MERGE_LISTS $l1 $l2
  ```
- **PICK_FIRST / PICK_LAST** – pick first/last element from list.
- **NONEMPTY** – check list length > 0.
- **COUNT** – length of list.
- **FILTER** – filter list by predicate (simple equality).

---

## 2. Output Commands
- **TO_NATURAL** – render a value to natural language.
  ```sys2dsl
  @txt TO_NATURAL $result
  ```
- **TO_JSON** – serialize to JSON string.
- **EXPLAIN** – produce human-readable explanation of a result/proof.

---

## 3. Ontology Introspection Commands
- **EXPLAIN_CONCEPT** – explain what the system knows about a concept (facts, diamonds, relations).
- **MISSING** – find undefined concepts in a statement.
- **WHAT_IS** – quick lookup of a concept’s identity/parents.

---

## Verb Coverage Checklist (v3.0)
All verbs from DS(/theory/Sys2DSL_commands) covered across split specs:

**Note:** In v3.0, everything is a **verb** in triple syntax `@var Subject VERB Object`. There are no "commands".

**High-Level Verbs (9):** QUERY, WHATIF, SUGGEST, MANAGE_THEORY, MEMORY, MASK, FORMAT_RESULT, SUMMARIZE_FACTS, EXPLAIN_QUERY

**Query Verbs (6):** IS_A, FACTS, INSTANCES (via `any IS_A Type`), ALL_REQUIREMENTS_SATISFIED, FACTS_WITH_RELATION, FACTS_WITH_OBJECT

**Assertion Verbs (2):** IS_A (assertion), HAS, CAUSES, RETRACT

**Concept Verbs (4):** BIND_CONCEPT, DEFINE_CONCEPT, INSPECT, LITERAL

**Relation Verbs (3):** BIND_RELATION, DEFINE_RELATION, BIND_POINT

**Theory Verbs (9):** THEORIES, LOAD, SAVE, MERGE_THEORY, DELETE_THEORY, THEORY_INFO, PUSH, POP, RESET_SESSION

**Reasoning Verbs (10):** VALIDATE, PROVE, HYPOTHESIZE, CF, ABDUCT, ANALOGICAL, CHECK_CONTRADICTION, CHECK_WOULD_CONTRADICT, REGISTER_FUNCTIONAL, REGISTER_CARDINALITY

**Inference Verbs (6):** INFER, FORWARD_CHAIN, WHY, DEFINE_RULE, DEFINE_DEFAULT, CLEAR_RULES

**Mask Verbs (1):** MASK (replaces MASK_PARTITIONS and MASK_DIMS)

**Memory Verbs (5):** GET_USAGE, FORGET, BOOST, PROTECT, UNPROTECT

**Utility Verbs (10):** BOOL_AND, BOOL_OR, BOOL_NOT, NONEMPTY, MERGE_LISTS, PICK_FIRST, PICK_LAST, COUNT, FILTER, POLARITY_DECIDE

**Output (5):** TO_NATURAL, TO_JSON, EXPLAIN, FORMAT, SUMMARIZE

**Ontology (3):** EXPLAIN_CONCEPT, MISSING, WHAT_IS

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted utility/output/ontology commands from DS(/theory/Sys2DSL_commands); added coverage checklist. |
