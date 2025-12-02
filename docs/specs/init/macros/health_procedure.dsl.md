# DSL Macro Spec: Health Procedure Compliance

ID: DS(/init/macros/health_procedure.dsl)

Status: STABLE

## Purpose

Reusable Sys2DSL macro that checks whether all requirements for a medical/health procedure are satisfied based on current facts.

## Interface

### Inputs (Environment Variables)

| Variable | Type | Description |
|----------|------|-------------|
| `$procId` | string | Identifier of the procedure to check (e.g., "ProcedureX") |

### Output

| Variable | Type | Description |
|----------|------|-------------|
| `$result` | TruthValue | `TRUE_CERTAIN` if all requirements met, `FALSE` otherwise |

## Algorithm

1. Collect all requirements: facts matching `$procId REQUIRES` (polymorphic 2-arg form)
2. Collect all satisfied conditions via `GIVEN` and `PRESENT` relations, filtered for object=yes
3. Merge satisfaction lists
4. Check if every requirement has a matching satisfaction fact

## Script Content

```sys2dsl
# Health procedure compliance macro
@reqs FACTS_MATCHING $procId REQUIRES
@givenAll FACTS_WITH_RELATION GIVEN
@satGiven FILTER $givenAll object=yes
@presentAll FACTS_WITH_RELATION PRESENT
@satPresent FILTER $presentAll object=yes
@allSat MERGE_LISTS $satGiven $satPresent
@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat
```

## Example Usage

```sys2dsl
# Setup facts
@_ ProcedureX REQUIRES Consent
@_ ProcedureX REQUIRES AuditTrail
@_ Consent GIVEN yes
@_ AuditTrail PRESENT yes

# Run macro with procId=ProcedureX
@procId ProcedureX LITERAL any
# ... include macro ...
# $result will be TRUE_CERTAIN
```

## Commands Used

- `FACTS_MATCHING`: Query facts by subject+relation (polymorphic)
- `FACTS_WITH_RELATION`: Query facts by relation type
- `FILTER`: Filter list by attribute
- `MERGE_LISTS`: Combine two fact lists
- `ALL_REQUIREMENTS_SATISFIED`: Check requirement coverage

## Requirements Trace

- FS-05: Reasoning engine (requirement satisfaction)
- FS-14: Sys2DSL theory programs
- URS-013: Narrative consultation with confidence bands
