# Design Spec: chat/index.mjs

ID: DS(/chat/index.mjs)

Status: IMPLEMENTED v1.0

## 1. Purpose

Main entry point for the chat module. Re-exports all chat components and provides a convenience factory for creating chat sessions.

**File**: `chat/index.mjs`
**Module Type**: ESM
**Exports**: Named exports and `ChatEngine` factory

---

## 2. Exports

### Re-exported Modules
```javascript
export { ChatREPL } from './chat_repl.mjs';
export { loadAchillesAgent } from './llm_loader.mjs';
export { detectIntent, extractFacts } from './prompts.mjs';
export { handleTeach, handleAsk, handleImport } from './chat_handlers.mjs';
```

### ChatEngine Factory
```javascript
export async function createChatEngine(options?: ChatEngineOptions): Promise<ChatEngine>
```

---

## 3. ChatEngine Factory

### createChatEngine(options)
```javascript
async createChatEngine(options?: {
  useLLM?: boolean,
  engine?: DSLEngine,
  loadBaseTheories?: boolean
}): Promise<ChatEngine>
```
Creates a configured chat engine with all dependencies wired.

**Parameters:**
- `useLLM` (boolean, default: true) - Whether to load LLM agent
- `engine` (DSLEngine, optional) - Existing DSL engine to use
- `loadBaseTheories` (boolean, default: true) - Load ontology/axiology on init

**Returns:** Configured `ChatEngine` instance

**Behavior:**
1. Creates DSLEngine if not provided
2. Optionally loads LLM agent via `loadAchillesAgent()`
3. Loads base theories if configured
4. Returns wrapped engine with chat methods

---

## 4. ChatEngine Interface

```javascript
interface ChatEngine {
  // Process natural language input
  process(input: string): Promise<string>;

  // Direct DSL execution
  execute(dslCode: string): Promise<any>;

  // Start interactive REPL
  startREPL(): Promise<void>;

  // Access underlying engine
  getEngine(): DSLEngine;

  // Check if LLM is available
  hasLLM(): boolean;
}
```

---

## 5. Usage Examples

### Quick Start
```javascript
import { createChatEngine } from './chat/index.mjs';

const chat = await createChatEngine();
const response = await chat.process("What is a dog?");
console.log(response);
```

### Without LLM
```javascript
import { createChatEngine } from './chat/index.mjs';

const chat = await createChatEngine({ useLLM: false });
// Uses regex-based intent detection
```

### Interactive REPL
```javascript
import { createChatEngine } from './chat/index.mjs';

const chat = await createChatEngine();
await chat.startREPL();
// Enters interactive mode
```

### Direct Component Access
```javascript
import {
  ChatREPL,
  loadAchillesAgent,
  detectIntent,
  handleTeach
} from './chat/index.mjs';

// Use components directly
const agent = await loadAchillesAgent();
const intent = await detectIntent("Dogs are mammals", agent);
```

---

## 6. Module Structure

```
chat/
├── index.mjs           ← Entry point (this file)
├── chat_repl.mjs       ← Interactive REPL
├── chat_handlers.mjs   ← Intent handlers
├── llm_loader.mjs      ← LLM agent loader
└── prompts.mjs         ← LLM prompts
```

---

## 7. Design Rationale

1. **Facade Pattern**: Single entry point simplifies imports
2. **Factory Function**: Handles complex initialization
3. **Optional LLM**: System works without LLM dependency
4. **Re-exports**: Allow direct access to submodules when needed

---

## 8. Related Documents

- DS(/chat/chat_repl.mjs) - REPL implementation
- DS(/chat/chat_handlers.mjs) - Intent handlers
- DS(/chat/llm_loader.mjs) - LLM loading
- DS(/chat/prompts.mjs) - Prompt templates
- DS(/language/dsl_engine.js) - Underlying DSL engine
