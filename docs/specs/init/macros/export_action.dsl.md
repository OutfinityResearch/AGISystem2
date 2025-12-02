# DSL Macro Spec: Export Action Decision

ID: DS(/init/macros/export_action.dsl)

Status: STABLE

## Purpose

Reusable Sys2DSL macro that determines if an export action is permitted, prohibited, or in conflict based on active regulations.

## Interface

### Inputs (Environment Variables)

| Variable | Type | Description |
|----------|------|-------------|
| `$actionId` | string | Identifier of the export action (e.g., "ExportData") |
| `$regs` | array | List of active regulation identifiers to consider |

### Output

| Variable | Type | Description |
|----------|------|-------------|
| `$result` | TruthValue | `TRUE_CERTAIN`, `FALSE`, or `CONFLICT` |

## Algorithm

1. Find all prohibitions: facts matching `"$actionId PROHIBITED_BY *"`
2. Find all permissions: facts matching `"$actionId PERMITTED_BY *"`
3. Apply polarity decision logic:
   - If any regulation both prohibits AND permits → `CONFLICT`
   - If any regulation prohibits and none permits → `FALSE`
   - If any regulation permits and none prohibits → `TRUE_CERTAIN`
   - If no matching permits or prohibitions → `FALSE`

## Script Content

```sys2dsl
# Export action decision macro
@prohib FACTS_MATCHING "$actionId PROHIBITED_BY"
@permit FACTS_MATCHING "$actionId PERMITTED_BY"
@result POLARITY_DECIDE $prohib $permit $regs
```

## Example Usage

```sys2dsl
# Setup regulatory facts
@_ ExportData PROHIBITED_BY GDPR
@_ ExportData PERMITTED_BY HIPAA

# Check with only GDPR active
@actionId ExportData LITERAL any
@regs GDPR LITERAL any
# $result will be FALSE (prohibited by GDPR, not permitted)

# Check with only HIPAA active
@regs HIPAA LITERAL any
# $result will be TRUE_CERTAIN (permitted by HIPAA, not prohibited)

# Check with both active
@regs GDPR,HIPAA LITERAL any
# $result will be CONFLICT (both prohibit and permit)
```

## Commands Used

- `FACTS_MATCHING`: Query facts by pattern
- `POLARITY_DECIDE`: Deontic polarity resolution

## Requirements Trace

- FS-05: Reasoning engine (deontic reasoning)
- FS-12: Safety & bias controls
- FS-14: Sys2DSL theory programs
- URS-015: Deontic/normative reasoning modes
