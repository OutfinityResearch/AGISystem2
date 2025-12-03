# Design Spec: chat/handler_utils.mjs

ID: DS(/chat/handler_utils.mjs)

Status: IMPLEMENTED v2.0

## 1. Purpose

Shared lexical and reasoning utilities used by chat handlers. Provides deterministic helpers so that logic examples and tests do not depend on LLM behaviour.

**File**: `chat/handler_utils.mjs`  
**Module Type**: ESM  
**Exports**: Named functions

---

## 2. Responsibilities

- Normalize natural language tokens to base ontology concept names (EN/RO, plural → singular).
- Extract simple `SUBJECT IS_A OBJECT` facts from constrained English/Romanian sentences.
- Deterministically parse simple yes/no and causal questions.
- Perform lightweight type-inference for arguments (e.g. EATS food?) over an in‑memory fact set.

---

## 3. Public API

### `normalizeConceptToken(token: string): string`
- Lowercases and normalizes a single token.
- Applies explicit mappings from a small logic lexicon (e.g. `men` → `human`, `oameni` → `human`).
- Applies irregular plural rules (e.g. `children` → `child`) and simple `-s` stripping.

### `normalizeConceptName(name: string): string`
- Convenience wrapper around `normalizeConceptToken` for concept strings.

### `extractFactsDeterministic(message: string): FactTriple[]`
Where:
```ts
type FactTriple = { subject: string, relation: string, object: string }
```
- Splits the message into sentences on `.`, `;`, and newlines.
- Matches constrained patterns such as:
  - `"All X are Y"`, `"Every X is Y"`
  - `"X are Y"`
  - `"X is a/an Y"`, `"X is Y"`
  - Romanian `"X este/e un/o Y"`
- Returns `IS_A` triples with normalized lowercase concept names.

### `fallbackParseYesNoQuestion(message: string): ParsedQuestion | null`
Where:
```ts
type ParsedQuestion = {
  type: 'yes_no' | 'causes' | 'list',
  canonical: { subject?: string, relation?: string, object?: string }
}
```
- Parses simple type‑membership questions:
  - `"Is Socrates a human?"`, `"Is Socrates mortal?"`
  - Romanian `"Este Socrate un om?"`
- On success returns `{ type: 'yes_no', canonical: { subject, relation: 'IS_A', object } }`.

### `fallbackParseCausalQuestion(message: string): ParsedQuestion | null`
- Parses causal questions of the form `"What does X cause?"`.
- Returns `{ type: 'causes', canonical: { subject } }` on success.

### `getAllTypes(entity: string, facts: FactTriple[]): string[]`
- Performs a BFS over `IS_A` facts to collect all direct and transitive supertypes for `entity`.
- Returned types are lowercased unique strings.

### `checkNegativeInference(subject, targetType, facts, inferenceEngine?): InferenceResult`
Where:
```ts
type InferenceResult = {
  truth: 'TRUE_CERTAIN' | 'FALSE' | 'UNKNOWN',
  method: string,
  confidence?: number,
  explanation?: string,
  proof?: any
}
```
- Uses `DISJOINT_WITH` constraints to infer negative answers:
  - If any known type of `subject` is disjoint with `targetType` (or its ancestors), returns `FALSE` with an explanation.
  - Otherwise returns `{ truth: 'UNKNOWN', method: 'no_disjoint_found' }`.

### `checkArgumentTypeInference(subject, relation, objectType, facts): InferenceResult`
- For a relation `REL`:
  - Looks for facts `subject REL x` and checks if `x IS_A objectType`.
  - Also supports the reverse form where `x REL subject`.
  - If a match is found, returns `TRUE_CERTAIN` with an explanation and minimal proof skeleton; otherwise `UNKNOWN`.

---

## 4. Usage

Used by:
- DS(/chat/handlers_teach.mjs) for deterministic fact extraction.
- DS(/chat/handlers_ask.mjs) for fall‑back parsing and type‑based inference.

These utilities never touch the session or LLM directly; they operate purely on strings and in‑memory `facts` arrays.

---

## 5. Related Documents

- DS(/chat/handlers_teach.mjs) – Teaching and contradiction detection.
- DS(/chat/handlers_ask.mjs) – Question answering.
- DS(/chat/chat_handlers.mjs) – Facade used by `ChatEngine`.

