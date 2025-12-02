# Suite: sys2dsl_commands

ID: DS(/tests/sys2dsl_commands/runSuite)

Scope: Tests all command categories from DS(/theory/Sys2DSL_commands) - knowledge commands, query commands, reasoning commands, theory commands, mask commands, and meta commands.

Fixtures: In-memory session with basic ontology.

Profile: `auto_test`.

Steps/Assertions:

## Knowledge Commands

- Triple Syntax (using @_ for assertion without capture):
  - `@f Water IS_A liquid` creates fact and returns success
  - `@bp_val boiling_point DIM_PAIR 100` then `@f Water SET_DIM @bp_val` creates property fact
  - Duplicate assertion returns existing fact reference
  - Verify fact is retrievable via FACTS_MATCHING

- RETRACT:
  - After triple assertion, `@r RETRACT Water IS_A liquid` removes fact
  - Retract non-existent fact returns empty/no-op
  - Verify fact no longer appears in FACTS_MATCHING

- DEFINE_CONCEPT:
  - `@c DEFINE_CONCEPT vehicle "a means of transport"` creates concept
  - Verify concept appears in concept store
  - Duplicate definition throws error or updates

## Query Commands

- Query (queries use triple syntax):
  - `@q Water IS_A liquid` returns truth verdict (TRUE_CERTAIN after assertion)
  - `@q Fire IS_A liquid` returns FALSE or UNKNOWN
  - Verify response includes provenance fields

- FACTS_MATCHING (Polymorphic):
  - `@facts INSTANCES_OF liquid` returns all X where X IS_A liquid
  - `@facts FACTS_MATCHING Water` returns facts about Water (1-arg)
  - `@facts FACTS_MATCHING Water IS_A` returns facts matching Water IS_A (2-arg)
  - `@facts FACTS_MATCHING` returns all facts (0-arg)

- CONCEPTS_SIMILAR:
  - After ingesting Water and Ice, `@similar CONCEPTS_SIMILAR Water limit=5` returns related concepts
  - Verify similarity is based on geometric proximity

## Theory Commands

- PUSH / POP:
  - `@_ test_layer PUSH any` creates new theory layer
  - Assertions in pushed layer are isolated
  - `@_ any POP any` removes layer and its facts
  - Verify base facts remain after pop

- SAVE / LOAD:
  - `@_ my_theory SAVE any` persists current theory
  - After clearing, `@_ my_theory LOAD any` restores it
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

- MASK_PARTITIONS:
  - `@m MASK_PARTITIONS ontology` creates ontology mask
  - `@q Water IS_A liquid` with mask `$m` uses masked reasoning
  - Verify result includes maskSpec field

## Meta Commands

- ECHO / LITERAL:
  - `@e ECHO $var` returns value of variable
  - `@l LITERAL 42` stores literal value
  - Verify type preservation (number vs string)

Sample Outputs:
- Triple syntax assertion returns `{success: true, factId: "..."}`
- Triple syntax query returns `{truth: "TRUE_CERTAIN", confidence: 1.0, provenance: {...}}`
- FACTS_MATCHING returns array of fact objects
- VALIDATE returns `{consistent: true, conflicts: []}`
