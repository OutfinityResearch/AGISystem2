# fastEval Suite Audits

This directory contains evaluation suites that act as simulated conversations (DS14).

Audit policy:

- Suites must be realistic and coherent (DS74).
- Baseline packs are loaded uniformly by the runner.
- Suites must not reload baseline packs as `theories`.
- Domain vocabularies/constraints must live in suite-local `.sys2` files or `evals/domains/*`.

Per-suite notes live in:

- `evals/fastEval/suite*/AUDIT.md`

