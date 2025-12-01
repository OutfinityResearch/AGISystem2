# Design Spec: Sys2DSL Utility, Output, and Ontology Introspection Commands

ID: DS(/theory/Sys2DSL_commands_util_output_ontology)

Status: DRAFT v1.0

## Scope
Commands that manipulate lists/booleans, emit results, and introspect ontology knowledge.

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

## Command Coverage Checklist
All commands from DS(/theory/Sys2DSL_commands) covered across split specs:
ASK, ASK_MASKED, FACTS_MATCHING, ASSERT, RETRACT, BIND_CONCEPT, DEFINE_CONCEPT, INSPECT, BIND_RELATION, DEFINE_RELATION, MODIFY_RELATION, LIST_THEORIES, LOAD_THEORY, SAVE_THEORY, MERGE_THEORY, RESET_SESSION, VALIDATE, PROVE, HYPOTHESIZE, CF, ABDUCT, MASK_PARTITIONS, MASK_DIMS, MASK_CONCEPT, BOOL_AND/OR/NOT, MERGE_LISTS, PICK_FIRST/LAST, NONEMPTY, COUNT, FILTER, GET_USAGE, FORGET, BOOST, TO_NATURAL, TO_JSON, EXPLAIN, EXPLAIN_CONCEPT, MISSING, WHAT_IS.

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted utility/output/ontology commands from DS(/theory/Sys2DSL_commands); added coverage checklist. |
