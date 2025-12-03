# Design Spec: chat/handlers_teach.mjs

ID: DS(/chat/handlers_teach.mjs)

Status: IMPLEMENTED v2.0

## 1. Purpose

Implements teaching‑related chat handlers and contradiction management:
- Extracts facts from natural language messages.
- Normalizes and validates triples.
- Checks for contradictions against the current knowledge base.
- Integrates with theory branching suggestions.

**File**: `chat/handlers_teach.mjs`  
**Module Type**: ESM  
**Exports**: `handleTeach`, `ONTOLOGY_CONFIG`, `CONTRADICTION_CONFIG`, `checkContradictions`, `suggestTheoryBranch`

---

## 2. Responsibilities

- Convert an NL message into a set of well‑formed fact triples (`subject relation object`).
- Prefer deterministic parsing where possible to keep behaviour stable in tests.
- Before committing facts, run deterministic contradiction checks and optionally LLM‑based checks.
- When contradictions are detected and blocking is enabled, propose creating a new theory branch instead of mutating the current one.

---

## 3. Configuration

### `ONTOLOGY_CONFIG`

Although primarily consumed by question handling, this module owns the default config so that teaching and asking share the same ontology discovery policy.

```ts
export const ONTOLOGY_CONFIG = {
  maxIterations: number,      // Max ontology discovery recursion depth
  minFactsPerConcept: number, // Reserved for future use
  maxFactsPerConcept: number, // Reserved for future use
  enabled: boolean            // Enable/disable discovery globally
};
```

### `CONTRADICTION_CONFIG`

```ts
export const CONTRADICTION_CONFIG = {
  enableLLMSemanticCheck: boolean, // Optional LLM semantic contradiction pass
  enableDeterministicCheck: boolean,
  blockOnContradiction: boolean    // If true, do not commit facts when contradictions exist
};
```

Default deployment uses deterministic checks only (`enableDeterministicCheck: true`, LLM disabled).

---

## 4. Public API

### `async handleTeach(ctx, message, details?): Promise<HandlerResult>`

Where:
```ts
type HandlerCtx = {
  llmAgent: { complete(opts): Promise<string> },
  session: { run(lines: string[]): any },
  setPendingAction?: (type: string, data: any) => void
};

type HandlerResult = {
  response: string,
  actions: any[]
};
```

**Steps:**
1. Build an extraction prompt and call `llmAgent.complete` to obtain `{ facts: [...] }`.
2. Fallback to `details.facts` if provided (e.g. from intent detection).
3. Filter for well‑formed triples; normalize lowercase `subject` and `object` with `normalizeConceptName`.
4. If no facts remain, use `extractFactsDeterministic(message)` from DS(/chat/handler_utils.mjs).
5. Record a `fact_extraction` action with source (`llm`, `deterministic`, or `intent_details`).
6. If still empty, return a friendly clarification response.
7. Optionally run `checkContradictions(ctx, facts)`:
   - If `blockOnContradiction` is `true` and contradictions exist:
     - Call `suggestTheoryBranch(ctx, facts, contradictions)` to obtain a name/description.
     - Set a pending action via `ctx.setPendingAction('create_theory_branch', ...)`.
     - Return a response describing conflicts and asking the user for confirmation.
8. If not blocked, for each fact execute a `@learnN subject REL object` Sys2DSL command via `session.run`.
9. Return a response listing the successfully added facts and `fact_added` / `fact_failed` actions.

### `async checkContradictions(ctx, newFacts): Promise<Contradiction[]>`

**Inputs:**
- `newFacts`: Array of `{ subject, relation, object }`.

**Steps:**
1. Fetch existing facts: `session.run(['@r any FACTS_MATCHING any'])`.
2. Normalize to `{ subject, relation, object }` objects.
3. If deterministic checking is enabled:
   - Run `new ContradictionDetector().detectAll([...existing, ...newFacts])`.
   - For each new fact involved in a reported contradiction, push a structured entry with `reason` and `type`.
4. If LLM semantic checking is enabled and deterministic found nothing:
   - For each new fact build a `buildContradictionPrompt()` and call `llmAgent.complete`.
   - If the JSON result signals a contradiction, push an entry with `type: 'LLM_SEMANTIC'`.

### `async suggestTheoryBranch(ctx, facts, contradictions): Promise<{ name: string, description: string }>`

- Uses `buildTheoryNamePrompt(facts, reason)` and `llmAgent.complete` to ask the LLM for a branch name.
- Parses JSON `{ suggested_name, description }` when available.
- Falls back to a deterministic name `alternative_<timestamp>` and default description.

---

## 5. Usage

Primary caller:
- DS(/chat/chat_handlers.mjs) via `handleTeach`, passing the `ChatEngine` handler context.

`ChatEngine` is responsible for managing `pendingAction` state and applying the suggested theory branch once the user confirms.

---

## 6. Related Documents

- DS(/chat/handler_utils.mjs) – Deterministic parsing and inference helpers.
- DS(/chat/handlers_ask.mjs) – Question answering logic.
- DS(/reason/contradiction_detector.js.md) – Contradiction detection engine.

