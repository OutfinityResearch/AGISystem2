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

1. Collect all requirements: facts matching `"$procId REQUIRES ?"`
2. Collect all satisfied conditions via `"? GIVEN yes"` or `"? PRESENT yes"`
3. Merge satisfaction lists
4. Check if every requirement has a matching satisfaction fact

## Script Content

```sys2dsl
# Health procedure compliance macro
@reqs FACTS_MATCHING "$procId REQUIRES ?"
@satGiven FACTS_MATCHING "? GIVEN yes"
@satPresent FACTS_MATCHING "? PRESENT yes"
@allSat MERGE_LISTS $satGiven $satPresent
@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat
```

## Example Usage

```sys2dsl
# Setup facts
@_ ASSERT ProcedureX REQUIRES Consent
@_ ASSERT ProcedureX REQUIRES AuditTrail
@_ ASSERT Consent GIVEN yes
@_ ASSERT AuditTrail PRESENT yes

# Run macro with procId=ProcedureX
@procId LITERAL "ProcedureX"
# ... include macro ...
# $result will be TRUE_CERTAIN
```

## Commands Used

- `FACTS_MATCHING`: Query facts by pattern
- `MERGE_LISTS`: Combine two fact lists
- `ALL_REQUIREMENTS_SATISFIED`: Check requirement coverage

## Requirements Trace

- FS-05: Reasoning engine (requirement satisfaction)
- FS-14: Sys2DSL theory programs
- URS-013: Narrative consultation with confidence bands
