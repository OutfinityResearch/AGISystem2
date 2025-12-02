# Suite: health_compliance

ID: DS(/tests/health_compliance/runSuite)

Scope: Health/medical compliance layers (SOPs, regulations), TheoryStack, ValidationEngine, exercised via Sys2DSL in a `System2Session`.

Fixtures: `fixtures/health/compliance.txt`, base/law_minimal theory (`law_minimal.sys2dsl`), health compliance theory (`health_compliance.sys2dsl`), optional GDPR/HIPAA theories (Sys2DSL text; binary caches optional).

Profile: `manual_test`.

Steps/Assertions:
- Create a `System2Session` seeded with the base `law_minimal.sys2dsl` theory and the `health_compliance.sys2dsl` layer.
- Ingest ProcedureX requirements from `fixtures/health/compliance.txt` using Sys2DSL triple syntax; query `"Is ProcedureX compliant without Consent?"` via triple syntax → FALSE (missing consent/audit).
- Append additional facts (e.g., `@gv GIVEN DIM_PAIR yes`, `@_ Consent SET_DIM @gv`) through Sys2DSL; re-query → TRUE_CERTAIN.
- GDPR vs HIPAA conflict:
  - Express GDPR- and HIPAA-specific export rules as Sys2DSL theories.
  - With GDPR precedence active in the session theory → ExportData query yields FALSE.
  - With only HIPAA layer active → ExportData query yields TRUE_CERTAIN or PLAUSIBLE.
  - With both layers active and no precedence → ValidationEngine reports a conflict; Sys2DSL results reflect `truth=CONFLICT`.
- Provenance must show active layers and relevant axiology dimensions.

Sample:
- Without consent/audit: FALSE with conflict detail.
- With consent/audit: TRUE_CERTAIN.
- ExportData under GDPR+HIPAA: conflict flagged unless precedence set; precedence=GDPR → FALSE.***
