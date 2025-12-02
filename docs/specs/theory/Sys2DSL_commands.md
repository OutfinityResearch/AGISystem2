# Design Spec: Sys2DSL Command Reference (Index)

ID: DS(/theory/Sys2DSL_commands)

Status: v3.0 - Unified Triple Syntax

## Overview
The full Sys2DSL verb reference has been organized into focused specs for readability. This index lists all verbs and links to the detailed documents.

**IMPORTANT**: In v3.0, there are NO "commands" - everything is a **verb** in the unified triple syntax `@variable Subject VERB Object`. What were previously called "commands" are now verbs defined in the base theory files.

**v3.0 Syntax Notes:**
- All statements: `@variable Subject VERB Object` (strict triple)
- No ASK/ASSERT commands - queries and assertions are implicit based on verb semantics
- `any` replaces wildcards (`*`, `?`)
- `@_` for throwaway results (side-effects only)
- No semicolons at end of statements (newline or `@` separates statements)

## Split Specifications
- **Query & Mask** — IS_A, FACTS, INSTANCES, MASK verbs
  See `Sys2DSL_commands_queries_masks.md`
- **Assertion, Concepts & Relations** — IS_A, HAS, BIND/DEFINE/INSPECT verbs
  See `Sys2DSL_commands_assertions_entities.md`
- **Theory Management & Memory** — PUSH, POP, LOAD, SAVE, FORGET, BOOST verbs
  See `Sys2DSL_commands_theory_memory.md`
- **Reasoning** — VALIDATE, PROVE, HYPOTHESIZE, ABDUCT verbs
  See `Sys2DSL_commands_reasoning.md`
- **Utility, Output & Ontology** — AND, OR, NOT, TO_NATURAL, SUMMARIZE verbs
  See `Sys2DSL_commands_util_output_ontology.md`

## Verb Summary Table (v3.0)

**Note:** Examples use v3.0 syntax: `@var Subject VERB Object`

| Verb | Category | v3.0 Syntax Example |
|------|----------|---------------------|
| **QUERY** | High-Level | `@r subject QUERY object` |
| **PROVE** | High-Level | `@p subject PROVE object` |
| **HYPOTHESIZE** | High-Level | `@h subject HYPOTHESIZE object` |
| **EXPLORE** | High-Level | `@e subject EXPLORE domain` |
| **SUMMARIZE** | High-Level | `@s subject SUMMARIZE any` |
| IS_A | Ontology | `@_ Dog IS_A animal` |
| HAS | Property | `@_ Dog HAS fur` |
| CAUSES | Causal | `@_ Fire CAUSES smoke` |
| FACTS | Query | `@f Dog FACTS any` |
| INSTANCES | Query | `@i any IS_A animal` (returns all instances) |
| RETRACT | Mutation | `@_ subject RETRACT object` (remove fact) |
| INSPECT | Concept | `@i Dog INSPECT any` |
| PUSH | Theory | `@_ theory_name PUSH any` |
| POP | Theory | `@_ any POP any` |
| LOAD | Theory | `@_ theory_name LOAD any` |
| SAVE | Theory | `@_ theory_name SAVE any` |
| THEORIES | Theory | `@list any THEORIES any` (list all theories) |
| MASK | Masking | `@m partition MASK any` |
| AND | Logic | `@r $a AND $b` |
| OR | Logic | `@r $a OR $b` |
| NOT | Logic | `@r $a NOT any` |
| IMPLIES | Logic | `@r $a IMPLIES $b` |
| FORGET | Memory | `@_ concept FORGET any` |
| BOOST | Memory | `@_ concept BOOST any` |
| PROTECT | Memory | `@_ concept PROTECT any` |
| TO_NATURAL | Output | `@text result TO_NATURAL any` |
| ABDUCT | Reasoning | `@h observation ABDUCT domain` |
| VALIDATE | Reasoning | `@v subject VALIDATE object` |
| ANALOGIZE | Reasoning | `@a source ANALOGIZE target` |

**Geometric Primitives** (hardcoded relations):
| Primitive | Purpose | Example |
|-----------|---------|---------|
| NUMERIC_VALUE | Create constant | `@n NUMERIC_VALUE 127` |
| READ_DIM | Read dimension | `@v Dog READ_DIM existence` |
| PROJECT_DIM | Set dimension | Use DIM_PAIR pattern |
| ATTRACT | Move point | `@_ point1 ATTRACT point2` |
| EXTEND | Expand diamond | `@_ concept EXTEND delta` |
| INDUCT | Generalize | `@g examples INDUCT any` |
| DEDUCT | Specialize | `@s parent DEDUCT any` |


## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial command set |
| 2.0 | Added: DEFINE_RELATION, VALIDATE, PROVE, HYPOTHESIZE, memory commands, output commands |
| 2.1 | Added ontology introspection commands |
| 2.2 | Split into five focused specs; this file now serves as index + summary |
| 2.3 | Added: FACTS_WITH_RELATION, FACTS_WITH_OBJECT, INSTANCES_OF, INFER, FORWARD_CHAIN, WHY, DEFINE_RULE, DEFINE_DEFAULT, CLEAR_RULES, high-level commands (QUERY, WHATIF, SUGGEST, etc.). Total: 67 commands. Removed deprecated MODIFY_RELATION, MASK_CONCEPT (not implemented). |
| **3.0** | **Complete redesign: All "commands" converted to verbs. Strict triple syntax: `@var Subject VERB Object`. No ASK/ASSERT - queries/assertions implicit. `any` replaces wildcards. Removed semicolons. Updated all documentation.** |
