# Fixtures Guide

ID: DS(/tests/fixtures/README)

Purpose: shared deterministic inputs/expected outcomes for suites. Real files live under `tests/fixtures/`. Use constrained grammar (simple English S-R-O) unless noted.

## Fixture Files and Contents (proposed)
- `fixtures/concepts/basic.txt`
  - @_ Dog IS_A Animal
  - @bp_val boiling_point DIM_PAIR 100
  - @_ Water SET_DIM @bp_val
- `fixtures/counterfactual/boil50.txt`
  - @bp50 boiling_point DIM_PAIR 50
  - @_ Water SET_DIM @bp50
- `fixtures/causal/fire_smoke.txt`
  - @_ Fire CAUSES Smoke
  - @_ Smoke CAUSED_BY Fire
- `fixtures/deontic/law_minimal.txt`
  - @_ Killing PROHIBITS permitted
  - @_ Helping PERMITS permitted
- `fixtures/analogical/legal_penalty.txt`
  - @_ Theft CAUSES Jail
  - @_ Fraud RELATED_TO Theft
- `fixtures/bias/skills_only.txt`
  - @skills_val Skills DIM_PAIR SeniorEngineer
  - @_ Candidate SET_DIM @skills_val
  - @age_val Age DIM_PAIR 30
  - @_ Candidate SET_DIM @age_val
- `fixtures/health/compliance.txt`
  - @_ ProcedureX REQUIRES Consent
  - @_ ProcedureX REQUIRES AuditTrail
  - @_ ExportData PROHIBITED_BY GDPR
  - @_ ExportData PERMITTED_BY HIPAA
- `fixtures/narrative/basics.txt`
  - @_ Alice IS_A Human
  - @_ Alice LOCATED_IN CityX
  - @_ CityX DISJOINT_WITH MagicZone
  - @_ Alice CASTS Magic
  - @_ Chapter2 Alice IS_A Human
  - @_ SciFi_TechMagic PERMITS Magic_IN CityX

## Expected Outcomes Reference
- basic: Query `@q Dog IS_A Animal` → TRUE_CERTAIN. Query with DIM_GREATER → TRUE_CERTAIN.
- counterfactual: Base: query with `@check50 boiling_point DIM_PAIR 50`, `@q Water HAS_DIM @check50` → FALSE. With boil50 layer active: TRUE_CERTAIN.
- causal: Observation `Smoke` with hint CAUSES → abductive returns `Fire` (PLAUSIBLE/TRUE).
- analogical: Compute Jail - Theft + Fraud → nearest penalty concept (Jail/Fine) with PLAUSIBLE+ match.
- deontic: Query killing permitted base FALSE; with War layer TRUE/PLAUSIBLE; conflicts flagged if no precedence.
- bias: Hiring query unchanged before/after veil-of-ignorance mask (Age zeroed) when skills dominate.
- health: Query ProcedureX compliance → FALSE; with `@gv GIVEN DIM_PAIR yes; @_ Consent SET_DIM @gv` + `@pv PRESENT DIM_PAIR yes; @_ AuditTrail SET_DIM @pv` → TRUE_CERTAIN; `ExportData` under GDPR FALSE, under HIPAA TRUE/PLAUSIBLE; conflicts reported when both active without precedence.
- narrative: Base: `Alice CASTS Magic in CityX` conflicts with CityX DISJOINT_WITH MagicZone; with SciFi_TechMagic layer, conflict resolves; query via triple syntax → TRUE_CERTAIN if not contradicted.***

## Usage
- Suites load fixture files from `tests/fixtures/...` and feed them through ingest/ask flows.
- Keep fixtures ASCII and deterministic; no random generation.***
