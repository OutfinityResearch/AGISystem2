# Design Spec: chat/handlers_ask.mjs

ID: DS(/chat/handlers_ask.mjs)

Status: IMPLEMENTED v2.0

## 1. Purpose

Implements question‑answering for the chat interface:
- Parses user questions into structured canonical form.
- Performs ontology auto‑discovery when enabled.
- Performs logical inference (via `InferenceEngine`) over structured facts.
- Produces natural language answers via the LLM with deterministic fallbacks.

**File**: `chat/handlers_ask.mjs`  
**Module Type**: ESM  
**Exports**: `handleAsk`, `generateResponse`

---

## 2. Responsibilities

- Use an LLM to parse natural language questions into typed queries.
- Use deterministic fallbacks for simple yes/no and causal questions to keep demos reliable.
- Gather relevant facts from the current session and call the reasoning engine.
- Apply additional type‑based inference and negative inference for `IS_A` questions.
- For unsupported cases, fall back to the Sys2DSL `@q ASK` command.

---

## 3. Ontology Auto‑Discovery

### `performOntologyDiscovery(ctx, message, iteration, config)`

Internal helper; not exported.

- Inputs:
  - `ctx.session`: Sys2DSL session (supports `@m MISSING` and facts queries).
  - `message`: Original question string.
  - `config`: Provided by caller (`ctx.ontologyConfig` – see DS(/chat/handlers_teach.mjs)).
- Steps:
  1. Run `@m MISSING "question"` and inspect `env.m.missing` for unresolved concepts.
  2. If none or `config.enabled` is `false`, stop.
  3. Fetch existing facts via `@r any FACTS_MATCHING any`.
  4. Build a generation prompt with `buildOntologyFactsPrompt(missingConcepts, message, existingFacts)` and call `llmAgent.complete`.
  5. Parse `{ facts: [...] }` from the response and for each new fact run `@discN subject REL object`.
  6. Recurse until no new facts are added or `maxIterations` is reached.
- Output:
  - `{ factsAdded, iterations, conceptsDiscovered[] }`.

`handleAsk` records an `ontology_discovery` action when `factsAdded > 0`.

---

## 4. Public API

### `async handleAsk(ctx, message, details?): Promise<HandlerResult>`

Where:
```ts
type HandlerCtx = {
  llmAgent,
  session,
  ontologyConfig?: typeof ONTOLOGY_CONFIG
};

type HandlerResult = {
  response: string,
  actions: any[]
};
```

**Steps:**
1. If `ctx.ontologyConfig` is present, run `performOntologyDiscovery` with it; record any discovery actions.
2. Build a question prompt and call `llmAgent.complete`, expecting a JSON object describing the question (`type`, `canonical`).
3. If the LLM response is missing or unusable, fall back to:
   - `fallbackParseYesNoQuestion` for simple `IS_A` questions.
   - `fallbackParseCausalQuestion` for simple causal questions.
4. Fetch facts from the session: `@r any FACTS_MATCHING any`.
5. Branch on `parsedQuestion.type`:
   - **`'yes_no'`**:
     - Build a canonical query `{ subject, relation, object }` and always log a `query` action.
     - If all fields are present:
       - Construct an `InferenceEngine` and call `infer(subject, relation, object, facts)`.
       - If result is `UNKNOWN`, apply:
         - `checkArgumentTypeInference(...)` from DS(/chat/handler_utils.mjs).
         - For `IS_A`, `checkNegativeInference(...)` (DISJOINT_WITH) and, if still unknown, a closed‑world assumption when the subject has known types.
     - If parse is incomplete, return an `UNKNOWN` result with an explanation.
   - **`'causes'` / `'effects'`**:
     - Filter facts on `CAUSES` / `CAUSED_BY` involving the subject and return a `{ causes: [...] }` result.
   - **`'list'`**:
     - Filter facts whose subject or object mention the requested concept; return `{ facts: [...] }`.
   - **Other / unknown**:
     - Fall back to `@q ASK "question"` and return the raw engine result.
6. Call `generateResponse(ctx, result, message)` to obtain NL output.
7. Return `{ response, actions }`.

### `async generateResponse(ctx, result, originalQuestion): Promise<string>`

- Calls `buildResponsePrompt(result, originalQuestion)` and sends it to `llmAgent.complete`.
- Trims and returns the LLM response on success.
- Deterministic fallback:
  - If `result.truth` is a boolean or `TRUE_CERTAIN` / `FALSE_CERTAIN`, return a canned yes/no text.
  - Otherwise JSON‑stringify the `result` for debugging.

---

## 5. Usage

Primary caller:
- DS(/chat/chat_handlers.mjs) → `handleAsk`, with `ontologyConfig` injected from `ONTOLOGY_CONFIG`.

Higher‑level orchestration is done in:
- DS(/chat/chat_engine.mjs) – routes intents and maintains session state.

---

## 6. Related Documents

- DS(/reason/inference_engine.js.md) – Logical inference engine.
- DS(/chat/handler_utils.mjs) – Deterministic helpers.
- DS(/chat/handlers_teach.mjs) – Shared ontology configuration and contradiction handling.

