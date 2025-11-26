# Test Fixture: Health Compliance Facts

ID: DS(/tests/fixtures/health/compliance)

Status: STABLE

## Purpose

Fixture for health procedure compliance testing - establishes requirements and regulatory facts.

## Content

```
ProcedureX REQUIRES Consent
ProcedureX REQUIRES AuditTrail
ExportData PROHIBITED_BY GDPR
ExportData PERMITTED_BY HIPAA
```

## Facts

| Subject | Relation | Object | Domain |
|---------|----------|--------|--------|
| ProcedureX | REQUIRES | Consent | Medical prerequisite |
| ProcedureX | REQUIRES | AuditTrail | Compliance prerequisite |
| ExportData | PROHIBITED_BY | GDPR | EU regulation |
| ExportData | PERMITTED_BY | HIPAA | US regulation |

## Test Scenarios

### Procedure Compliance
```sys2dsl
# All requirements satisfied
@_ ASSERT Consent GIVEN yes
@_ ASSERT AuditTrail PRESENT yes
@result ALL_REQUIREMENTS_SATISFIED ...
# Returns: TRUE_CERTAIN

# Missing requirement
@_ RETRACT Consent GIVEN yes
# Returns: FALSE (Consent missing)
```

### Regulatory Conflict
```sys2dsl
# Only GDPR active
@regs LITERAL ["GDPR"]
@result POLARITY_DECIDE ... $regs
# Returns: FALSE (prohibited)

# Both active
@regs LITERAL ["GDPR", "HIPAA"]
@result POLARITY_DECIDE ... $regs
# Returns: CONFLICT
```

## Test Coverage

- Suite: `health_compliance`
- Tests: ALL_REQUIREMENTS_SATISFIED, POLARITY_DECIDE

## Related Files

- `health_procedure.dsl`: Uses REQUIRES facts
- `export_action.dsl`: Uses PROHIBITED_BY/PERMITTED_BY
- `health_compliance.sys2dsl`: Theory file with same facts

## Requirements Trace

- FS-05: Reasoning engine
- FS-14: Sys2DSL theory programs
- URS-013: Narrative consultation (compliance checking)
