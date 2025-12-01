# DSL Macro Spec: Narrative Magic Permission

ID: DS(/init/macros/narrative_magic.dsl)

Status: STABLE

## Purpose

Reusable Sys2DSL macro for narrative/fiction scenarios that checks if a character can cast magic in a given location based on world rules.

## Interface

### Inputs (Environment Variables)

| Variable | Type | Description |
|----------|------|-------------|
| `$actorId` | string | Identifier of the character/agent (e.g., "Alice") |
| `$cityId` | string | Identifier of the location (e.g., "CityX") |

### Output

| Variable | Type | Description |
|----------|------|-------------|
| `$result` | TruthValue | `TRUE_CERTAIN` if all conditions met, `FALSE` otherwise |

## Algorithm

Three conditions must ALL hold:
1. Actor casts magic: `$actorId CASTS Magic`
2. Actor is in the city: `$actorId LOCATED_IN $cityId`
3. Magic is permitted in city (check for PERMITS relation facts with target city)

## Script Content

```sys2dsl
# Narrative magic permission macro
@casts FACTS_MATCHING $actorId CASTS Magic
@locs FACTS_MATCHING $actorId LOCATED_IN $cityId
@permAll FACTS_WITH_RELATION PERMITS
@permCity FILTER $permAll object=Magic_IN_$cityId
@hasMagic NONEMPTY $casts
@hasLoc NONEMPTY $locs
@perm NONEMPTY $permCity
@both BOOL_AND $hasMagic $hasLoc
@result BOOL_AND $both $perm
```

## Example Usage

```sys2dsl
# Setup world facts
@_ ASSERT Alice IS_A Human
@_ ASSERT Alice LOCATED_IN CityX
@_ ASSERT Alice CASTS Magic
@_ ASSERT SciFi_TechMagic PERMITS Magic_IN CityX

# Run macro
@actorId LITERAL "Alice"
@cityId LITERAL "CityX"
# ... include macro ...
# $result will be TRUE_CERTAIN (Alice can cast magic in CityX)

# Without permission fact:
@_ RETRACT SciFi_TechMagic PERMITS Magic_IN CityX
# $result will be FALSE (no permission theory active)
```

## Commands Used

- `FACTS_MATCHING`: Query facts by subject+relation+object (polymorphic)
- `FACTS_WITH_RELATION`: Query facts by relation type
- `FILTER`: Filter list by attribute
- `NONEMPTY`: Check if list has elements
- `BOOL_AND`: Logical conjunction

## Use Cases

- Interactive fiction consistency checking
- Game rule validation
- Narrative constraint satisfaction

## Requirements Trace

- FS-05: Reasoning engine
- FS-14: Sys2DSL theory programs
- URS-013: Narrative consultation
- URS-015: Reasoning modes (deductive for rule checking)
