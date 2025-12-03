# Design Spec: chat/handlers_theory.mjs

ID: DS(/chat/handlers_theory.mjs)

Status: IMPLEMENTED v2.0

## 1. Purpose

Implements chat handlers related to:
- Importing facts from files.
- Managing theory branches and stack.
- Listing current knowledge (facts, concepts, theories).
- Providing high‑level chat help text.

**File**: `chat/handlers_theory.mjs`  
**Module Type**: ESM  
**Exports**: `handleImport`, `handleTheoryManagement`, `handleList`, `handleHelp`

---

## 2. Responsibilities

- Provide a user‑friendly layer over Sys2DSL theory commands used by the chat interface.
- Keep file I/O and path handling isolated from teaching/asking modules.
- Avoid LLM dependence for management operations (only `handleImport` uses LLM to parse imported lines).

---

## 3. Public API

### `async handleImport(ctx, message, details?): Promise<HandlerResult>`

**Inputs:**
- `ctx.llmAgent`: LLM agent used for fact extraction.
- `ctx.session`: Sys2DSL session (supports `@impN` commands).
- `message`: Natural language request, e.g. `"Import file my_facts.txt"`.
- `details.filepath?`: Optional explicit path from intent detection.

**Behaviour:**
1. Determine `filepath`:
   - Prefer `details.filepath` if present.
   - Otherwise parse the message for `import/load/read file "<path>"`.
2. Resolve to an absolute path using `process.cwd()` if necessary.
3. If file does not exist, return a diagnostic response and `import_error` action.
4. Read the file as UTF‑8, ignore blank lines and `#` comments.
5. For up to 100 lines:
   - Build a `buildFactExtractionPrompt(line)` and call `llmAgent.complete`.
   - Parse `{ facts: [...] }` and, for each triple, run `@impN subject REL object` via `session.run`.
6. Return a response summarizing how many facts were imported and a corresponding `import_success` action.

### `async handleTheoryManagement(ctx, message, details?): Promise<HandlerResult>`

**Inputs:**
- `ctx.session`: Sys2DSL session.
- `ctx.theoriesRoot`: Directory where `.sys2dsl` theory files are saved.
- `ctx.setCurrentTheory(name)`: Setter provided by `ChatEngine`.
- `ctx.currentTheory`: Name of the current theory/layer.

**Supported patterns:**
- Create new theory: phrases containing `"create"` or `"new"` and optional name.
  - Extracts `[a-zA-Z0-9_]+` as the theory name or uses `theory_<timestamp>`.
  - Executes `@r <name> THEORY_PUSH any` and updates `currentTheory`.
- Pop/discard current layer: phrases containing `"pop"` or `"discard"`.
  - Executes `@r any THEORY_POP any`.
- List/show theories: phrases containing `"list"` or `"show"`.
  - Executes `@r any LIST_THEORIES any` and returns the JSON representation.
- Save theory: phrases containing `"save"` with optional name.
  - Writes all current facts to `<theoriesRoot>/<name>.sys2dsl` using `subject relation object` per line.

When no pattern matches, returns a short usage summary of theory management commands.

### `async handleList(ctx, details?): Promise<HandlerResult>`

**Inputs:**
- `details.what` ∈ `'facts' | 'all' | 'concepts' | 'theories'` (default: `'facts'`).

**Behaviour:**
- For `facts`/`all`:
  - Fetch facts via `@r any FACTS_MATCHING any`.
  - Return up to 20 prettified lines and a count suffix when there are more.
- For `concepts`:
  - Read from `session.engine.conceptStore.listConcepts()`.
  - Return up to 30 concept names plus count suffix.
- For `theories`:
  - Delegate to `handleTheoryManagement(ctx, 'list theories', {})`.

### `handleHelp(): HandlerResult`

- Returns markdown‑style help text describing:
  - Teaching, asking, importing, theory management and listing.
- Includes a single `help_shown` action for telemetry.

---

## 4. Usage

Primary caller:
- DS(/chat/chat_handlers.mjs) – dispatches based on detected intent.

Higher‑level orchestration:
- DS(/chat/chat_engine.mjs) – builds `ctx` (session, theoriesRoot, etc.) and forwards user messages and intents.

---

## 5. Related Documents

- DS(/chat/handlers_teach.mjs) – Teaching and contradiction logic.
- DS(/chat/handlers_ask.mjs) – Question answering.
- DS(/chat/chat_repl.mjs) – Interactive REPL that uses `ChatEngine`.

