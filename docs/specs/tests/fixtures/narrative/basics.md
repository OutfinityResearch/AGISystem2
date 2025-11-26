# Test Fixture: Narrative Basics

ID: DS(/tests/fixtures/narrative/basics)

Status: STABLE

## Purpose

Fixture for narrative consistency testing - establishes character, location, and world rule facts.

## Content

```
Alice IS_A Human
Alice LOCATED_IN CityX
CityX DISJOINT_WITH MagicZone
Alice CASTS Magic
```

## Facts

| Subject | Relation | Object | Domain |
|---------|----------|--------|--------|
| Alice | IS_A | Human | Character ontology |
| Alice | LOCATED_IN | CityX | Spatial relation |
| CityX | DISJOINT_WITH | MagicZone | Spatial constraint |
| Alice | CASTS | Magic | Character ability |

## Narrative Constraints

This fixture establishes a scenario with potential inconsistency:
- Alice can cast magic
- Alice is in CityX
- CityX is disjoint from MagicZone (implies magic may not work there)

## Test Scenarios

### Consistency Check
```sys2dsl
# Is Alice's magic valid in CityX?
# Depends on whether any theory PERMITS Magic_IN CityX

# Without permission:
@_ VALIDATE
# May flag: Alice CASTS Magic in location DISJOINT_WITH MagicZone
```

### With Permission Theory
```sys2dsl
# Add permissive theory
@_ ASSERT SomeTheory PERMITS Magic_IN CityX

# Now narrative is consistent
@result VALIDATE
# Returns: {consistent: true}
```

## Test Coverage

- Suite: `narrative_consistency`
- Tests: Spatial constraints, ability validation, world rule checking

## Related Files

- `narrative_magic.dsl`: Macro checking magic permissions
- `scifi_magic.sys2dsl`: Theory with permission facts

## Requirements Trace

- FS-05: Reasoning engine
- FS-13: Validation & abstract interpretation
- URS-013: Narrative consultation
- URS-021: Refuse on contradictions
