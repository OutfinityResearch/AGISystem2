# Suite Audit: suite32_orchestrator

## Intent

Exercise the URC orchestration contract at runtime:

- fragment classification,
- backend selection via `PreferBackend`,
- compilation to a solver artifact (SMT-LIB2) when selected.

## URC alignment

- Fragment: `Frag_SMT_LRA` (from a minimal SMT-ish predicate DSL)
- Backend selection: `PreferBackend(goalKind, fragment, backend)` (URC registry facts)
- Artifacts: `Artifact(format=SMTLIB2, hash=...)`
- Plan: `Plan`/`Step` surface returned by `Session.orchestrate()`

## Policy

This suite avoids any scenario-specific runtime hooks. Backend selection is controlled only by persisted preference facts.

