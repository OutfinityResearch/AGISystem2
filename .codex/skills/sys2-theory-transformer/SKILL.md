---
name: sys2-theory-transformer
description: Mass-refactor Sys2DSL theory packs (especially config/Packs) to enforce single-@ per line, add per-line inline comments (>=3 words), and split non-minimal/eval-driven declarations into a dedicated pack (tests_and_evals) while keeping tests/evals working.
---

# Sys2 Theory Transformer (config packs)

This skill is for reorganizing and normalizing Sys2DSL theories under `config/Packs/`:

- Keep “minimal baseline” packs small and domain-agnostic.
- Move eval-driven / convenience vocabulary into `config/Packs/tests_and_evals/`.
- Ensure every DSL statement line has an inline comment (`# ...` or `// ...`) with at least 3 words.
- Ensure no DSL line ever contains more than one `@` token (use `$name` for references).

## Quick workflow

1) Read the report `nonminimal_concepts.md` and decide what belongs in baseline vs. `tests_and_evals`.
2) Update pack indexes to enforce the split:
   - Remove non-minimal loads from baseline manifests (e.g. `config/Packs/Kernel/index.sys2`, `config/Packs/URC/index.sys2`).
   - Add a new pack `config/Packs/tests_and_evals/index.sys2` that loads the moved/non-minimal modules.
3) Move declarations that are mixed into baseline files into `tests_and_evals` (example: “everyday state tokens” in `Consistency/14-constraints.sys2`).
4) Add/repair inline comments for every DSL statement line you touched.
5) Scan for syntax violations and comment quality:
   - Run `node scripts/sys2dsl/audit-theories.mjs config/Packs evals` and fix the flagged lines.
6) Keep tests/evals behavior stable:
   - Wherever tests/evals relied on removed baseline loads, explicitly add `session.loadPack('tests_and_evals', { includeIndex: true })`.

## Guardrails

- Do not “paper over” multiple-`@` lines by allowing them: fix the DSL instead.
- Inline comments should explain “why this line exists” (not only what it does).
- Avoid stuffing everything into baseline manifests just to satisfy tests—use `tests_and_evals`.

