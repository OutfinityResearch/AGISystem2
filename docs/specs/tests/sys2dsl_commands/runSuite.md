# Suite: sys2dsl_commands

ID: DS(/tests/sys2dsl_commands/runSuite)

Scope: Tests all command categories from DS(/theory/Sys2DSL_commands) - knowledge commands, query commands, reasoning commands, theory commands, mask commands, and meta commands.

Fixtures: In-memory session with basic ontology.

Profile: `auto_test`.

Steps/Assertions:

## Knowledge Commands

- ASSERT:
  - `@f ASSERT Water IS_A liquid` creates fact and returns success
  - `@f ASSERT Water HAS_PROPERTY boiling_point 100` creates property fact
  - Duplicate assertion returns existing fact reference
  - Verify fact is retrievable via FACTS_MATCHING

- RETRACT:
  - After ASSERT, `@r RETRACT Water IS_A liquid` removes fact
  - Retract non-existent fact returns empty/no-op
  - Verify fact no longer appears in FACTS_MATCHING

- DEFINE_CONCEPT:
  - `@c DEFINE_CONCEPT vehicle "a means of transport"` creates concept
  - Verify concept appears in concept store
  - Duplicate definition throws error or updates

## Query Commands

- ASK:
  - `@q ASK Water IS_A liquid` returns truth verdict (TRUE_CERTAIN after assertion)
  - `@q ASK Fire IS_A liquid` returns FALSE or UNKNOWN
  - Verify response includes provenance fields

- FACTS_MATCHING:
  - `@facts FACTS_MATCHING "? IS_A liquid"` returns list of matching facts
  - `@facts FACTS_MATCHING "Water ? ?"` returns facts about Water
  - Empty pattern returns all facts (with limit)

- CONCEPTS_SIMILAR:
  - After ingesting Water and Ice, `@similar CONCEPTS_SIMILAR Water limit=5` returns related concepts
  - Verify similarity is based on geometric proximity

## Theory Commands

- THEORY_PUSH / THEORY_POP:
  - `@t THEORY_PUSH "test_layer"` creates new theory layer
  - Assertions in pushed layer are isolated
  - `@t THEORY_POP` removes layer and its facts
  - Verify base facts remain after pop

- THEORY_SAVE / THEORY_LOAD:
  - `@s THEORY_SAVE "my_theory"` persists current theory
  - After clearing, `@l THEORY_LOAD "my_theory"` restores it
  - Verify facts are restored correctly

## Reasoning Commands

- ABDUCT:
  - Given facts about effects, `@h ABDUCT "observed_effect" relation=CAUSES` suggests causes
  - Verify returned hypotheses are plausible

- VALIDATE:
  - `@v VALIDATE` checks theory consistency
  - Returns list of contradictions if any
  - Empty list means consistent

## Mask Commands

- MASK_PARTITIONS / ASK_MASKED:
  - `@m MASK_PARTITIONS ontology` creates ontology mask
  - `@q ASK_MASKED $m "Water IS_A liquid"` uses masked reasoning
  - Verify result includes maskSpec field

## Meta Commands

- ECHO / LITERAL:
  - `@e ECHO $var` returns value of variable
  - `@l LITERAL 42` stores literal value
  - Verify type preservation (number vs string)

Sample Outputs:
- ASSERT returns `{success: true, factId: "..."}`
- ASK returns `{truth: "TRUE_CERTAIN", confidence: 1.0, provenance: {...}}`
- FACTS_MATCHING returns array of fact objects
- VALIDATE returns `{consistent: true, conflicts: []}`
