# Agent Notes (Project Scope)

## Local workflow constraints

- Do not run `git` commands (e.g. `git status`, `git diff`, `git checkout`, `git restore`) unless the user explicitly asks; the user may have multiple concurrent sessions and relies on their own git workflow.

## Output language

- **Repository content (strict):** All generated/modified source code, code comments, and any files under `docs/` (recursively) must be written in **English**.
- **Assistant replies (chat):** Romanian is allowed and recommended for faster understanding.
- **Temporary root reports:** If generating temporary report files at the repository root (e.g. ad-hoc `report*.md`), Romanian is allowed.
