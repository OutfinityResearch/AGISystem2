# Design Spec: chat/prompts.mjs

ID: DS(/chat/prompts.mjs)

Status: IMPLEMENTED v1.0

## 1. Purpose

LLM prompt templates for natural language understanding. Converts user input to structured intents and extracts facts from conversational text.

**File**: `chat/prompts.mjs`
**Module Type**: ESM
**Exports**: Named functions and constants

---

## 2. Prompt Templates

### INTENT_DETECTION_PROMPT
```javascript
const INTENT_DETECTION_PROMPT: string
```
System prompt for classifying user input into intent categories.

**Intent Categories:**
- `teach` - User wants to assert a fact
- `ask` - User wants to query knowledge
- `import` - User wants to load a theory
- `help` - User needs assistance
- `quit` - User wants to exit

**Expected LLM Output Format:**
```json
{
  "type": "teach|ask|import|help|quit",
  "subject": "...",
  "relation": "...",
  "object": "...",
  "question": "...",
  "theoryName": "..."
}
```

### FACT_EXTRACTION_PROMPT
```javascript
const FACT_EXTRACTION_PROMPT: string
```
System prompt for extracting structured facts from natural language.

**Expected LLM Output Format:**
```json
{
  "facts": [
    { "subject": "...", "relation": "...", "object": "..." }
  ]
}
```

---

## 3. Functions

### detectIntent(userInput, agent)
```javascript
async detectIntent(userInput: string, agent: AchillesAgent): Promise<Intent>
```
Uses LLM to detect user intent from natural language.

**Parameters:**
- `userInput` (string) - Raw user message
- `agent` (AchillesAgent) - LLM agent instance

**Returns:** Parsed intent object

### extractFacts(text, agent)
```javascript
async extractFacts(text: string, agent: AchillesAgent): Promise<Fact[]>
```
Extracts structured facts from conversational text.

**Parameters:**
- `text` (string) - Natural language text
- `agent` (AchillesAgent) - LLM agent instance

**Returns:** Array of fact triples

### buildIntentPrompt(userInput)
```javascript
buildIntentPrompt(userInput: string): string
```
Constructs full prompt for intent detection.

**Parameters:**
- `userInput` (string) - User message

**Returns:** Complete prompt string with template and input

---

## 4. Relation Mapping

Natural language relations are mapped to Sys2DSL relations:

| Natural Language | Sys2DSL Relation |
|-----------------|------------------|
| "is a", "is an" | IS_A |
| "has", "has a" | HAS |
| "can", "is able to" | CAN |
| "part of" | PART_OF |
| "located in", "lives in" | LOCATED_IN |
| "causes", "leads to" | CAUSES |
| "requires", "needs" | REQUIRES |

---

## 5. Usage Example

```javascript
import { detectIntent, extractFacts } from './prompts.mjs';
import { loadAchillesAgent } from './llm_loader.mjs';

const agent = await loadAchillesAgent();

// Intent detection
const intent = await detectIntent("Dogs are mammals", agent);
// → { type: 'teach', subject: 'Dog', relation: 'IS_A', object: 'mammal' }

// Fact extraction
const facts = await extractFacts(
  "Paris is located in France. France is in Europe.",
  agent
);
// → [
//   { subject: 'Paris', relation: 'LOCATED_IN', object: 'France' },
//   { subject: 'France', relation: 'LOCATED_IN', object: 'Europe' }
// ]
```

---

## 6. Fallback Behavior

When no LLM agent is available:
- `detectIntent` uses regex-based pattern matching
- `extractFacts` returns empty array with warning

**Regex Patterns (fallback):**
```javascript
/^(.+?)\s+(is a|is an)\s+(.+)$/i  → teach intent
/^(is|are|can|does|do)\s+/i       → ask intent
/^(load|import)\s+(.+)$/i         → import intent
```

---

## 7. Related Documents

- DS(/chat/llm_loader.mjs) - Provides LLM agent
- DS(/chat/chat_handlers.mjs) - Executes detected intents
- DS(/chat/chat_repl.mjs) - Orchestrates detection and handling
