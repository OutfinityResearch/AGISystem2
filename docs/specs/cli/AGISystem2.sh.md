# Design Spec: bin/AGISystem2.sh

ID: DS(/cli/AGISystem2.sh)

## Role
- Launches the natural-language chat interface (`chat/index.mjs`) that bridges LLMs with Sys2DSL.
- Prepares `NODE_PATH` so AchillesAgentLib (LLMAgent provider) and the AGISystem2 sources are discoverable.
- Surfaces minimal CLI flags for debugging and terminal formatting.

## Inputs
- **Args**: `--help|-h`, `--debug`, `--no-color`, plus any flags forwarded to `chat/index.mjs`.
- **Env**:
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` — at least one must be set for LLM-backed flows.
  - `NODE_PATH` — extended automatically; may be pre-set by user.
  - `HOME`, `PWD` — used for common library lookup.

## Behavior
1. Resolve `SCRIPT_DIR` and `AGISYSTEM_ROOT`; set `CHAT_SCRIPT=chat/index.mjs`.
2. Search for AchillesAgentLib in common locations (sibling dir, `$HOME/work`, global node_modules, symlinks). If found, prepend its parent to `NODE_PATH`.
3. Always prepend AGISystem2 root to `NODE_PATH` so `require` can resolve local modules.
4. Handle `--help` by printing usage, environment notes, and chat commands, then exit 0.
5. Handle `--debug` by printing paths and discovered library info to stderr.
6. Warn (non-fatal) if AchillesAgentLib is not found; continue to exec chat anyway.
7. `exec node chat/index.mjs "$@"` to preserve signals/exit codes.

## Output/Errors
- Help text on `--help`.
- Debug dump on `--debug`.
- Warning to stderr if AchillesAgentLib is missing.
- Non-zero exit if `chat/index.mjs` is absent or Node fails to start.

## Constraints/Notes
- No network logic in the launcher; LLM use happens in `chat/` at runtime.
- Launcher is portable bash; assumes `node` on PATH.
- Coloring is controlled by `--no-color` and terminal TTY detection in `chat_repl`.

## Future Enhancements
- Add explicit env var to pin LLMAgent model/provider (mirroring chat prompts).
- Optional `--config PATH` to set `.env` location before launching.
- Health check for AchillesAgentLib version to warn on incompatibility.
