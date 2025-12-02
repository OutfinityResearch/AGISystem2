# Theory Spec: Sci-Fi Tech Magic

ID: DS(/init/theories/scifi_magic.sys2dsl)

Status: STABLE

## Purpose

Narrative theory for sci-fi/fantasy scenarios demonstrating location-based magic permissions and character abilities.

## Content

```sys2dsl
# Sci-fi tech-magic theory (Sys2DSL)
@f1 Alice IS_A Human
@f2 Alice LOCATED_IN CityX
@f3 Alice CASTS Magic
@f4 SciFi_TechMagic PERMITS Magic_IN_CityX
```

## Facts Defined

| Fact | Relation | Semantics |
|------|----------|-----------|
| `Alice IS_A Human` | IS_A | Character type classification |
| `Alice LOCATED_IN CityX` | LOCATED_IN | Spatial positioning |
| `Alice CASTS Magic` | CASTS | Ability possession |
| `SciFi_TechMagic PERMITS Magic_IN CityX` | PERMITS | World rule allowing magic |

## World Rules

This theory establishes:
1. A character (Alice) who can cast magic
2. A location (CityX) where she resides
3. A world rule (SciFi_TechMagic) that permits magic in that location

## Usage with Macro

```sys2dsl
# Load theory
# ... theory facts loaded ...

# Use narrative_magic.dsl macro
@actorId LITERAL "Alice"
@cityId LITERAL "CityX"
# ... run macro ...
# Result: TRUE_CERTAIN (Alice can cast magic in CityX)
```

## Test Scenarios

1. **Permitted**: All conditions met → TRUE_CERTAIN
2. **No permission**: Remove PERMITS fact → FALSE
3. **Wrong location**: Alice in different city → FALSE
4. **No ability**: Alice doesn't cast magic → FALSE

## Related Files

- `narrative_magic.dsl`: Macro that uses these facts
- `tests/fixtures/narrative/basics.txt`: Test fixture

## Test Coverage

- Suite: `narrative_consistency`

## Requirements Trace

- FS-02: Theory layering
- FS-14: Sys2DSL theory programs
- URS-013: Narrative consultation
