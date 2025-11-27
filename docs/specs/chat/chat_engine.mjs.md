# Design Spec: chat/chat_engine.mjs

ID: DS(/chat/chat_engine.mjs)

Status: DRAFT v1.1

## 1. Purpose

The `ChatEngine` class serves as the core bridge between natural language user input and the AGISystem2 DSL-based reasoning system. It:
- Detects user intent from natural language
- Routes to appropriate handlers (teach, ask, import, etc.)
- Manages conversation state and history
- Handles pending actions requiring user confirmation

---

## 2. Class Overview

```javascript
class ChatEngine {
  constructor(options = {}) {
    this.options = options;
    this.llmAgent = null;           // LLM interface for NL processing
    this.session = null;            // AGISystem2 session
    this.theoriesRoot = null;       // Path to theories directory
    this.currentTheory = 'default'; // Active theory context
    this.conversationHistory = [];  // Chat history
    this.initialized = false;
    this.pendingAction = null;      // Action awaiting confirmation
  }
}
```

---

## 3. Pending Action System

### 3.1 Overview

The pending action system enables multi-turn interactions where the system asks for user confirmation before performing certain operations (e.g., creating a new theory branch when contradictions are detected).

### 3.2 Pending Action Structure

```javascript
pendingAction = {
  type: 'create_theory_branch',  // Action type identifier
  data: {
    facts: [...],                 // Facts to add
    contradictions: [...],        // Detected contradictions
    suggestion: {                 // Suggested resolution
      name: 'Theory Name',
      description: '...'
    }
  }
}
```

### 3.3 Confirmation Detection

The system recognizes confirmations and rejections in multiple languages:

**Confirmations:**
- English: yes, yeah, yep, sure, ok, okay, go ahead, do it, confirm, y, aye
- Other: affirmative, absolutely, definitely

**Rejections:**
- English: no, nope, nah, cancel, stop, nevermind, never mind, forget it, don't, n

### 3.4 Flow Diagram

```
┌─────────────────┐
│ User Input      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Check pendingAction != null │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │ Has     │
    │ pending?│
    └────┬────┘
         │
    ┌────┴────┐         ┌─────────────────┐
    │  Yes    │────────▶│ Check confirm/  │
    └─────────┘         │ reject pattern  │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌─────────┐        ┌─────────┐        ┌─────────┐
        │ Confirm │        │ Reject  │        │ Neither │
        └────┬────┘        └────┬────┘        └────┬────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Execute action │  │ Cancel &     │  │ Cancel &     │
    │ (create branch)│  │ respond      │  │ process as   │
    └────────────────┘  └──────────────┘  │ new message  │
                                          └──────────────┘
```

---

## 4. Handler Context

The context object passed to all handlers:

```javascript
{
  llmAgent: LLMAgent,              // For NL processing
  session: System2Session,          // AGISystem2 session
  theoriesRoot: string,             // Theories directory
  currentTheory: string,            // Active theory name
  setCurrentTheory: (name) => void, // Update current theory
  setPendingAction: (type, data) => void  // Set pending action
}
```

---

## 5. Public API

### 5.1 initialize()

```javascript
async initialize() → { success: boolean, message: string }
```

Initializes the engine:
1. Loads LLM library
2. Validates API keys
3. Creates LLM agent
4. Initializes AGISystem2 session

### 5.2 processMessage()

```javascript
async processMessage(userMessage: string) → {
  response: string,
  actions: Action[]
}
```

Main entry point for processing user input:
1. Checks for pending action confirmation
2. Detects intent (teach, ask, import, manage_theory, list, help)
3. Routes to appropriate handler
4. Returns natural language response and structured actions

### 5.3 setPendingAction()

```javascript
setPendingAction(type: string, data: object) → void
```

Sets a pending action that requires user confirmation.

### 5.4 getHistory() / clearHistory()

Manage conversation history for context.

---

## 6. Intent Detection

### 6.1 LLM-based Detection

Uses `buildIntentPrompt()` to ask LLM to classify user intent.

### 6.2 Heuristic Fallback

If LLM fails, uses pattern matching:
- Questions (?, is, what, why, how, does) → `ask`
- Import keywords → `import`
- Theory/context/branch → `manage_theory`
- List/show → `list`
- Help → `help`
- Default → `teach`

---

## 7. Supported Action Types

| Type | Description |
|------|-------------|
| `fact_added` | A fact was added to the theory |
| `fact_failed` | A fact failed to add |
| `query` | A query was executed |
| `contradiction_detected` | Contradictions found |
| `theory_created` | New theory branch created |
| `confirmation_rejected` | User rejected pending action |
| `error` | An error occurred |

---

## 8. Test Cases

See: `tests/chat_confirmation.test.mjs`

### 8.1 Confirmation Flow
```javascript
// Detect contradiction
engine.processMessage('Cats are mammals. Cats are fish.');
// → Response asks for confirmation, sets pendingAction

// User confirms
engine.processMessage('yes');
// → Creates theory branch, adds facts, clears pendingAction
```

### 8.2 Rejection Flow
```javascript
engine.processMessage('Dogs are cats.');
engine.processMessage('no');
// → Cancels operation, clears pendingAction
```

### 8.3 New Message Cancels Pending
```javascript
engine.processMessage('Fish are birds.');
engine.processMessage('The sky is blue.');
// → Cancels pending, processes new message normally
```

---

## 9. Related Documents

- DS(/chat/chat_handlers.mjs) - Message handlers
- DS(/chat/prompts.mjs) - LLM prompt templates
- DS(/interface/usecase_theory_branching) - Theory branching use case
- DS(/reason/contradiction_detection) - Contradiction detection
