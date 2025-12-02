# Design Spec: Sys2DSL Command Reference (Index)

ID: DS(/theory/Sys2DSL_commands)

Status: DRAFT v2.2 (updated)

## Overview
The full Sys2DSL command reference has been split into focused specs for readability. This index lists all **67 commands** and links to the detailed documents. Syntax follows `@var COMMAND args…` as defined in DS(/theory/Sys2DSL_syntax).

- **Recommended (NL-friendly) surface**: `QUERY`, `WHATIF`, `SUGGEST`, `SUMMARIZE_FACTS`, `MANAGE_THEORY`, `MEMORY`, `MASK`, `FORMAT_RESULT`, `EXPLAIN_QUERY` — see `Sys2DSL_highlevel.md`. These fan out into the granular commands automatically.
- **Granular commands**: Listed below for precision and direct access.

## Split Specifications
- **Query & Mask** — ASK, ASK_MASKED, FACTS_MATCHING, MASK_PARTITIONS, MASK_DIMS, MASK_CONCEPT  
  See `Sys2DSL_commands_queries_masks.md`
- **Assertion, Concepts & Relations** — ASSERT, RETRACT, BIND/DEFINE/INSPECT (concepts), BIND/DEFINE/MODIFY (relations)  
  See `Sys2DSL_commands_assertions_entities.md`
- **Theory Management & Memory** — LIST/LOAD/SAVE/MERGE/RESET, GET_USAGE, FORGET, BOOST  
  See `Sys2DSL_commands_theory_memory.md`
- **Reasoning** — VALIDATE, PROVE, HYPOTHESIZE, CF, ABDUCT  
  See `Sys2DSL_commands_reasoning.md`
- **Utility, Output & Ontology** — BOOL_*, MERGE_LISTS, PICK_*, NONEMPTY, COUNT, FILTER, TO_NATURAL, TO_JSON, EXPLAIN, EXPLAIN_CONCEPT, MISSING, WHAT_IS  
  See `Sys2DSL_commands_util_output_ontology.md`

## Command Summary Table

| Command | Category | Purpose |
|---------|----------|---------|
| **QUERY** | High-Level | Multi-strategy query (ASK → INFER) |
| **WHATIF** | High-Level | Counterfactual reasoning |
| **SUGGEST** | High-Level | Generate hypotheses (abduct/analogical) |
| **MANAGE_THEORY** | High-Level | Theory storage operations |
| **MEMORY** | High-Level | Memory lifecycle operations |
| **MASK** | High-Level | Build dimension masks |
| **FORMAT_RESULT** | High-Level | Format results |
| **SUMMARIZE_FACTS** | High-Level | Find and summarize facts |
| **EXPLAIN_QUERY** | High-Level | Proof with explanation |
| ASK | Query | Query truth of statement |
| ASK_MASKED | Query | Query with dimension mask |
| FACTS_MATCHING | Query | Find matching facts (polymorphic) |
| FACTS_WITH_RELATION | Query | Find facts by relation |
| FACTS_WITH_OBJECT | Query | Find facts by object |
| INSTANCES_OF | Query | Find instances of type |
| ALL_REQUIREMENTS_SATISFIED | Query | Check requirements |
| ASSERT | Assertion | Add fact |
| RETRACT | Assertion | Remove fact |
| BIND_CONCEPT | Concept | Get concept reference |
| DEFINE_CONCEPT | Concept | Create new concept |
| INSPECT | Concept | Get detailed info |
| LITERAL | Concept | Create literal value |
| BIND_RELATION | Relation | Get relation reference |
| DEFINE_RELATION | Relation | Create new relation |
| BIND_POINT | Relation | Create point in vector space |
| LIST_THEORIES | Theory | List available theories |
| LOAD_THEORY | Theory | Load theory |
| SAVE_THEORY | Theory | Save working theory |
| MERGE_THEORY | Theory | Merge theories |
| DELETE_THEORY | Theory | Delete theory |
| THEORY_INFO | Theory | Get theory metadata |
| THEORY_PUSH | Theory | Push new theory layer |
| THEORY_POP | Theory | Pop theory layer |
| RESET_SESSION | Theory | Clear working theory |
| VALIDATE | Reasoning | Check consistency |
| PROVE | Reasoning | Prove statement |
| HYPOTHESIZE | Reasoning | Generate hypotheses |
| CF | Reasoning | Counterfactual query |
| ABDUCT | Reasoning | Abductive reasoning |
| ANALOGICAL | Reasoning | Analogical reasoning |
| CHECK_CONTRADICTION | Reasoning | Detect contradictions |
| CHECK_WOULD_CONTRADICT | Reasoning | Check if fact would contradict |
| REGISTER_FUNCTIONAL | Reasoning | Mark relation as functional |
| REGISTER_CARDINALITY | Reasoning | Set cardinality constraints |
| INFER | Inference | Multi-method inference |
| FORWARD_CHAIN | Inference | Derive conclusions |
| WHY | Inference | Explain inference |
| DEFINE_RULE | Inference | Register composition rule |
| DEFINE_DEFAULT | Inference | Register default rule |
| CLEAR_RULES | Inference | Clear all rules |
| MASK_PARTITIONS | Mask | Mask by partition |
| MASK_DIMS | Mask | Mask by dimensions |
| BOOL_AND/OR/NOT | Utility | Boolean operations |
| MERGE_LISTS | Utility | Combine lists |
| PICK_FIRST/LAST | Utility | List access |
| NONEMPTY | Utility | List check |
| COUNT | Utility | List count |
| FILTER | Utility | List filter |
| POLARITY_DECIDE | Utility | Decide based on polarity |
| GET_USAGE | Memory | Get usage stats |
| FORGET | Memory | Remove unused |
| BOOST | Memory | Increase priority |
| PROTECT | Memory | Protect from forgetting |
| UNPROTECT | Memory | Remove protection |
| TO_NATURAL | Output | Convert to text |
| TO_JSON | Output | Export JSON |
| EXPLAIN | Output | Detailed explanation |
| FORMAT | Output | Format with template |
| SUMMARIZE | Output | Summarize results |
| EXPLAIN_CONCEPT | Ontology | Explain known facts about concept |
| MISSING | Ontology | Find undefined concepts in statement |
| WHAT_IS | Ontology | Simple identity query |

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial command set |
| 2.0 | Added: DEFINE_RELATION, VALIDATE, PROVE, HYPOTHESIZE, memory commands, output commands |
| 2.1 | Added ontology introspection commands |
| 2.2 | Split into five focused specs; this file now serves as index + summary |
| 2.3 | Added: FACTS_WITH_RELATION, FACTS_WITH_OBJECT, INSTANCES_OF, INFER, FORWARD_CHAIN, WHY, DEFINE_RULE, DEFINE_DEFAULT, CLEAR_RULES, high-level commands (QUERY, WHATIF, SUGGEST, etc.). Total: 67 commands. Removed deprecated MODIFY_RELATION, MASK_CONCEPT (not implemented). |
