# Theory Spec: Health Compliance

ID: DS(/init/theories/health_compliance.sys2dsl)

Status: STABLE

## Purpose

Base theory file containing facts for health/medical compliance testing. Establishes procedure requirements and regulatory permissions/prohibitions.

## Content

```sys2dsl
# Health compliance theory (Sys2DSL)
@f1 ASSERT ProcedureX REQUIRES Consent
@f2 ASSERT ProcedureX REQUIRES AuditTrail
@f3 ASSERT ExportData PROHIBITED_BY GDPR
@f4 ASSERT ExportData PERMITTED_BY HIPAA
```

## Facts Defined

| Fact | Relation | Semantics |
|------|----------|-----------|
| `ProcedureX REQUIRES Consent` | REQUIRES | Medical consent prerequisite |
| `ProcedureX REQUIRES AuditTrail` | REQUIRES | Audit documentation prerequisite |
| `ExportData PROHIBITED_BY GDPR` | PROHIBITED_BY | EU data export restriction |
| `ExportData PERMITTED_BY HIPAA` | PERMITTED_BY | US health data exception |

## Usage

Load as base theory for health compliance tests:
```javascript
session.appendTheory(fs.readFileSync('data/init/theories/health_compliance.sys2dsl', 'utf8'));
```

## Related Macros

- `health_procedure.dsl`: Uses REQUIRES facts
- `export_action.dsl`: Uses PROHIBITED_BY/PERMITTED_BY facts

## Test Coverage

- Suite: `health_compliance`
- Fixture: `tests/fixtures/health/compliance.txt`

## Requirements Trace

- FS-02: Theory layering
- FS-10: Persistence & versioning
- FS-14: Sys2DSL theory programs
