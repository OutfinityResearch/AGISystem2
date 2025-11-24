# Suite: health_compliance

Scope: Health/medical compliance layers (SOPs, regulations), TheoryStack, ValidationEngine.

Fixtures: `fixtures/health/compliance.txt`, base/law_minimal layer, `health_compliance.bin`, optional GDPR/HIPAA layers.

Profile: `manual_test`.

Steps/Assertions:
- Load base + health_compliance layer.
- Ingest ProcedureX requirements; query "Is ProcedureX compliant without Consent?" → FALSE (missing consent/audit).
- Add facts "Consent GIVEN", "AuditTrail PRESENT" → query → TRUE_CERTAIN.
- GDPR vs HIPAA conflict: ExportData prohibited by GDPR, permitted by HIPAA; with GDPR precedence → FALSE; with HIPAA only → TRUE/PLAUSIBLE; ValidationEngine reports conflict when both active without precedence.
- Provenance must show active layers and axiology dims involved.

Sample:
- Without consent/audit: FALSE with conflict detail.
- With consent/audit: TRUE_CERTAIN.
- ExportData under GDPR+HIPAA: conflict flagged unless precedence set; precedence=GDPR → FALSE.***
