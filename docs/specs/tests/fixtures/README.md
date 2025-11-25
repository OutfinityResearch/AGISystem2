# Fixtures Guide

ID: DS(/tests/fixtures/README)

Purpose: shared deterministic inputs/expected outcomes for suites. Real files live under `tests/fixtures/`. Use constrained grammar (simple English S-R-O) unless noted.

## Fixture Files and Contents (proposed)
- `fixtures/concepts/basic.txt`
  - Dog IS_A Animal
  - Water HAS_PROPERTY boiling_point=100
- `fixtures/counterfactual/boil50.txt`
  - Assume Water HAS_PROPERTY boiling_point=50
- `fixtures/causal/fire_smoke.txt`
  - Fire CAUSES Smoke
  - Smoke CAUSED_BY Fire
- `fixtures/deontic/law_minimal.txt`
  - Killing PROHIBITS permitted
  - Helping PERMITS permitted
- `fixtures/analogical/legal_penalty.txt`
  - Theft CAUSES Jail
  - Fraud RELATED_TO Theft
- `fixtures/bias/skills_only.txt`
  - Candidate HAS_PROPERTY Skills=SeniorEngineer
  - Candidate HAS_PROPERTY Age=30
- `fixtures/health/compliance.txt`
  - ProcedureX REQUIRES Consent
  - ProcedureX REQUIRES AuditTrail
  - ExportData PROHIBITED_BY GDPR
  - ExportData PERMITTED_BY HIPAA
- `fixtures/narrative/basics.txt`
  - Alice IS_A Human
  - Alice LOCATED_IN CityX
  - CityX DISJOINT_WITH MagicZone
  - Alice CASTS Magic
  - Chapter2 Alice IS_A Human
  - SciFi_TechMagic PERMITS Magic_IN CityX

## Expected Outcomes Reference
- basic: Query `Is Dog an Animal?` → TRUE_CERTAIN. Query `Is water boiling at 100?` → TRUE_CERTAIN.
- counterfactual: Base: `Is water boiling at 50?` → FALSE. With boil50 layer active: TRUE_CERTAIN.
- causal: Observation `Smoke` with hint CAUSES → abductive returns `Fire` (PLAUSIBLE/TRUE).
- analogical: Compute Jail - Theft + Fraud → nearest penalty concept (Jail/Fine) with PLAUSIBLE+ match.
- deontic: `Is killing permitted?` base FALSE; with War layer TRUE/PLAUSIBLE; conflicts flagged if no precedence.
- bias: Hiring query unchanged before/after veil-of-ignorance mask (Age zeroed) when skills dominate.
- health: `Is ProcedureX compliant without Consent?` → FALSE; with `Consent GIVEN` + `AuditTrail PRESENT` → TRUE_CERTAIN; `ExportData` under GDPR FALSE, under HIPAA TRUE/PLAUSIBLE; conflicts reported when both active without precedence.
- narrative: Base: `Alice CASTS Magic in CityX` conflicts with CityX DISJOINT_WITH MagicZone; with SciFi_TechMagic layer, conflict resolves; `Is Alice Human in Chapter2?` → TRUE_CERTAIN if not contradicted.***

## Usage
- Suites load fixture files from `tests/fixtures/...` and feed them through ingest/ask flows.
- Keep fixtures ASCII and deterministic; no random generation.***
