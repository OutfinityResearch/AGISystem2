# Suite: forgetting

ID: DS(/tests/forgetting/runSuite)

Scope: Tests forgetting mechanisms from DS(/knowledge/forgetting) - threshold-based removal, time-based decay, protection, and audit trail.

Fixtures: Session with pre-populated concepts at varying usage levels.

Profile: `auto_test`.

Steps/Assertions:

## Threshold-Based Forgetting

- Usage threshold:
  - Create concepts with usageCount: 2, 5, 10, 20
  - `@f FORGET threshold=5` removes concepts with usageCount < 5
  - Verify concept with count=2 is forgotten
  - Verify concepts with count >= 5 remain

- Dry run mode:
  - `@preview FORGET threshold=5 dry_run=true` returns list without deleting
  - Verify original concepts still exist
  - Verify preview list matches what would be deleted

## Time-Based Forgetting

- Age threshold:
  - Create concepts with varying lastUsedAt timestamps
  - `@f FORGET older_than=7d` removes unused concepts older than 7 days
  - Verify old unused concepts are removed
  - Verify recently used concepts remain

- Combined criteria:
  - `@f FORGET threshold=3 older_than=1d` requires both conditions
  - Concept with count=2 used today: remains (recently used)
  - Concept with count=2 unused for 2 days: forgotten
  - Concept with count=5 unused for 2 days: remains (high usage)

## Explicit Forgetting

- Single concept:
  - `@f FORGET concept=obsolete_term` removes specific concept
  - Verify concept is removed regardless of usage

- Pattern-based:
  - `@f FORGET pattern="temp_*"` removes matching concepts
  - Verify only matching concepts removed

## Protection Mechanisms

- Core relations protected:
  - `@f FORGET concept=IS_A` throws error or is ignored
  - Core relations (IS_A, CAUSES, HAS_PROPERTY) cannot be forgotten

- Theory-referenced protection:
  - Concepts referenced in active theory cannot be forgotten
  - Verify error message explains protection reason

- Explicit protection:
  - `@p PROTECT concept=important_concept` marks concept as protected
  - `@f FORGET threshold=1` skips protected concepts
  - `@u UNPROTECT concept=important_concept` removes protection

## Audit Trail

- Forget logging:
  - Each FORGET operation logged in audit
  - Log includes: timestamp, criteria, concepts removed, count

- Recovery info:
  - Audit contains enough info to restore forgotten concepts
  - Vector data logged before removal (optional, configurable)

## Sys2DSL Integration

- FORGET command:
  - Returns `{removed: [...], count: N, protected: [...], skipped: M}`
  - Verify response structure

- FORGOTTEN_LOG command:
  - `@log FORGOTTEN_LOG limit=10` returns recent forget operations
  - Verify log entries contain expected fields

Sample Outputs:
- FORGET: `{removed: ["temp_1", "temp_2"], count: 2, protected: ["IS_A"], skipped: 1}`
- Dry run: `{wouldRemove: ["temp_1", "temp_2"], count: 2}`
- Protected error: `{error: "concept IS_A is protected: core_relation"}`
