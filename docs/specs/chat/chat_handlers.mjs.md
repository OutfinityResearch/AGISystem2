# Design Spec: chat/chat_handlers.mjs

ID: DS(/chat/chat_handlers.mjs)

Status: IMPLEMENTED v1.0

## 1. Purpose

Intent handlers for natural language chat interactions. Maps detected intents to Sys2DSL commands and executes them through the DSL engine.

**File**: `chat/chat_handlers.mjs`
**Module Type**: ESM
**Exports**: Named functions

---

## 2. Handler Functions

### handleTeach(intent, engine)
```javascript
async handleTeach(intent: TeachIntent, engine: DSLEngine): Promise<string>
```
Handles teaching/assertion intents by converting natural language to ASSERT commands.

**Parameters:**
- `intent.subject` (string) - Subject concept
- `intent.relation` (string) - Relation type
- `intent.object` (string) - Object concept
- `engine` (DSLEngine) - DSL engine instance

**Behavior:**
1. Constructs ASSERT command: `@_ ASSERT {subject} {relation} {object}`
2. Executes via `engine.executeLine()`
3. Returns confirmation message

**Returns:** `"OK, am înregistrat: {subject} {relation} {object}"`

### handleAsk(intent, engine)
```javascript
async handleAsk(intent: AskIntent, engine: DSLEngine): Promise<string>
```
Handles question intents by converting to ASK commands.

**Parameters:**
- `intent.question` (string) - Natural language question
- `engine` (DSLEngine) - DSL engine instance

**Behavior:**
1. Constructs ASK command: `@result ASK "{question}"`
2. Executes via `engine.executeLine()`
3. Returns reasoning result or "Nu știu" if unknown

**Returns:** Result string or uncertainty message

### handleImport(intent, engine)
```javascript
async handleImport(intent: ImportIntent, engine: DSLEngine): Promise<string>
```
Handles theory import intents.

**Parameters:**
- `intent.theoryName` (string) - Theory to load
- `engine` (DSLEngine) - DSL engine instance

**Behavior:**
1. Constructs LOAD_THEORY command: `@_ LOAD_THEORY {theoryName}`
2. Executes via `engine.executeLine()`
3. Returns success/failure message

**Returns:** Load confirmation or error message

---

## 3. Intent Data Structures

### TeachIntent
```javascript
{
  type: 'teach',
  subject: string,
  relation: string,
  object: string
}
```

### AskIntent
```javascript
{
  type: 'ask',
  question: string
}
```

### ImportIntent
```javascript
{
  type: 'import',
  theoryName: string
}
```

---

## 4. Usage Example

```javascript
import { handleTeach, handleAsk, handleImport } from './chat_handlers.mjs';
import { DSLEngine } from '../src/language/dsl_engine.js';

const engine = new DSLEngine({ /* deps */ });

// Teaching
const teachIntent = { type: 'teach', subject: 'Dog', relation: 'IS_A', object: 'Animal' };
const result1 = await handleTeach(teachIntent, engine);
// → "OK, am înregistrat: Dog IS_A Animal"

// Asking
const askIntent = { type: 'ask', question: 'Is Dog an Animal?' };
const result2 = await handleAsk(askIntent, engine);
// → "TRUE_CERTAIN" or similar

// Importing
const importIntent = { type: 'import', theoryName: 'medical_ethics' };
const result3 = await handleImport(importIntent, engine);
// → "Teoria medical_ethics a fost încărcată."
```

---

## 5. Error Handling

- DSL execution errors are caught and returned as user-friendly messages
- Unknown intents are passed through with generic response
- Engine exceptions are logged but don't crash the handler

---

## 6. Related Documents

- DS(/chat/prompts.mjs) - Generates intents from natural language
- DS(/chat/chat_repl.mjs) - Uses handlers in REPL loop
- DS(/language/dsl_engine.js) - Executes generated commands
