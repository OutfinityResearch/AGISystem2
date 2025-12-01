# Design Spec: Sys2DSL Command Reference (Index)

ID: DS(/theory/Sys2DSL_commands)

Status: DRAFT v2.1 (split)

## Overview
The full Sys2DSL command reference has been split into focused specs for readability. This index lists all commands and links to the detailed documents. Syntax follows `@var COMMAND args…` as defined in DS(/theory/Sys2DSL_syntax).

- **Recommended (NL-friendly) surface**: `QUERY`, `WHATIF`, `SUGGEST`, `SUMMARIZE_FACTS`, `MANAGE_THEORY`, `MEMORY`, `MASK`, `FORMAT_RESULT`, `EXPLAIN_QUERY` — see `Sys2DSL_highlevel.md`. These fan out into the granular commands automatically.
- **Granular/legacy commands**: Listed below for precision and backward compatibility.

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
| ASK | Query | Query truth of statement |
| ASK_MASKED | Query | Query with dimension mask |
| FACTS_MATCHING | Query | Find matching facts |
| ASSERT | Assertion | Add fact |
| RETRACT | Assertion | Remove fact |
| BIND_CONCEPT | Concept | Get concept reference |
| DEFINE_CONCEPT | Concept | Create new concept |
| INSPECT | Concept | Get detailed info |
| BIND_RELATION | Relation | Get relation reference |
| DEFINE_RELATION | Relation | Create new relation |
| MODIFY_RELATION | Relation | Override relation properties |
| LIST_THEORIES | Theory | List available theories |
| LOAD_THEORY | Theory | Load theory |
| SAVE_THEORY | Theory | Save working theory |
| MERGE_THEORY | Theory | Merge theories |
| RESET_SESSION | Theory | Clear working theory |
| VALIDATE | Reasoning | Check consistency |
| PROVE | Reasoning | Prove statement |
| HYPOTHESIZE | Reasoning | Generate hypotheses |
| CF | Reasoning | Counterfactual query |
| ABDUCT | Reasoning | Abductive reasoning |
| MASK_PARTITIONS | Mask | Mask by partition |
| MASK_DIMS | Mask | Mask by dimensions |
| MASK_CONCEPT | Mask | Mask by concept |
| BOOL_AND/OR/NOT | Utility | Boolean operations |
| MERGE_LISTS | Utility | Combine lists |
| PICK_FIRST/LAST | Utility | List access |
| NONEMPTY | Utility | List check |
| COUNT | Utility | List count |
| FILTER | Utility | List filter |
| GET_USAGE | Memory | Get usage stats |
| FORGET | Memory | Remove unused |
| BOOST | Memory | Increase priority |
| TO_NATURAL | Output | Convert to text |
| TO_JSON | Output | Export JSON |
| EXPLAIN | Output | Detailed explanation |
| EXPLAIN_CONCEPT | Ontology | Explain known facts about concept |
| MISSING | Ontology | Find undefined concepts in statement |
| WHAT_IS | Ontology | Simple identity query |

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial command set |
| 2.0 | Added: DEFINE_RELATION, MODIFY_RELATION, VALIDATE, PROVE, HYPOTHESIZE, memory commands, output commands |
| 2.1 | Added ontology introspection commands |
| 2.2 | Split into five focused specs; this file now serves as index + summary |
