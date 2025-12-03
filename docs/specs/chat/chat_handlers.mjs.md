# Design Spec: chat/chat_handlers.mjs

ID: DS(/chat/chat_handlers.mjs)

Status: IMPLEMENTED v2.0

## 1. Purpose

Facade module for natural language chat intent handling. Provides a stable, thin API that `ChatEngine` uses to route intents while delegating implementation to specialised sub‑modules.

**File**: `chat/chat_handlers.mjs`  
**Module Type**: ESM  
**Exports**: Named functions and configuration objects

---

## 2. Responsibilities

- Expose high‑level handlers:
  - `handleTeach`, `handleAsk`, `handleImport`
  - `handleTheoryManagement`, `handleList`, `handleHelp`
- Re‑export configuration and helpers used across chat:
  - `ONTOLOGY_CONFIG`, `CONTRADICTION_CONFIG`
  - `checkContradictions`, `suggestTheoryBranch`, `generateResponse`
- Delegate implementation to:
  - DS(/chat/handler_utils.mjs) – deterministic helpers
  - DS(/chat/handlers_teach.mjs) – teaching and contradictions
  - DS(/chat/handlers_ask.mjs) – question answering
  - DS(/chat/handlers_theory.mjs) – import, theory management, listing, help

The module itself contains no business logic; it only adapts the handler context (e.g. adding `ontologyConfig`) and forwards calls.

---

## 3. Public API

### `async handleTeach(ctx, message, details?): Promise<HandlerResult>`
- Delegates to `handlers_teach.handleTeach(ctx, message, details)`.
- `ctx` is the handler context constructed by `ChatEngine` (see DS(/chat/chat_engine.mjs)).

### `async handleAsk(ctx, message, details?): Promise<HandlerResult>`
- Injects `ontologyConfig` into the context:
  - `const extendedCtx = { ...ctx, ontologyConfig: ONTOLOGY_CONFIG }`
- Delegates to `handlers_ask.handleAsk(extendedCtx, message, details)`.

### `async handleImport(ctx, message, details?)`
- Delegates to `handlers_theory.handleImport(ctx, message, details)`.

### `async handleTheoryManagement(ctx, message, details?)`
- Delegates to `handlers_theory.handleTheoryManagement(ctx, message, details)`.

### `async handleList(ctx, details?)`
- Delegates to `handlers_theory.handleList(ctx, details)`.

### `handleHelp()`
- Delegates to `handlers_theory.handleHelp()`.

### Re‑exports

```ts
export const ONTOLOGY_CONFIG: typeof import('./handlers_teach.mjs').ONTOLOGY_CONFIG;
export const CONTRADICTION_CONFIG: typeof import('./handlers_teach.mjs').CONTRADICTION_CONFIG;

export function checkContradictions(ctx, newFacts);
export function suggestTheoryBranch(ctx, facts, contradictions);
export function generateResponse(ctx, result, originalQuestion);
```

These are simple forwarders so that existing code and specs that referenced the legacy monolithic module keep working.

---

## 4. Usage Example

```ts
import {
  handleTeach,
  handleAsk,
  handleImport,
  handleTheoryManagement,
  handleList,
  handleHelp
} from './chat_handlers.mjs';

// Minimal context as constructed by ChatEngine
const ctx = {
  llmAgent,
  session,
  theoriesRoot,
  currentTheory: 'default',
  setCurrentTheory: (name) => { ctx.currentTheory = name; },
  setPendingAction: (type, data) => { /* stored by ChatEngine */ }
};

const teachResult = await handleTeach(ctx, 'Dogs are animals', {});
const askResult = await handleAsk(ctx, 'Is a dog an animal?', {});
const importResult = await handleImport(ctx, 'Import file my_facts.txt', {});
```

---

## 5. Error Handling

- All low‑level errors are handled inside the sub‑modules:
  - LLM parsing errors yield deterministic fallbacks or user‑friendly messages.
  - Session/DSL errors are captured and reported in the returned `actions` array.
- `chat_handlers.mjs` only forwards rejections from sub‑modules; callers should treat any thrown error as fatal and surface an error message (as `ChatEngine` already does).

---

## 6. Related Documents

- DS(/chat/chat_engine.mjs) – Uses all handlers for intent routing.
- DS(/chat/handler_utils.mjs) – Shared deterministic helpers.
- DS(/chat/handlers_teach.mjs) – Teaching and contradictions.
- DS(/chat/handlers_ask.mjs) – Question answering.
- DS(/chat/handlers_theory.mjs) – Import and theory management.
