# Design Spec: chat/chat_repl.mjs

ID: DS(/chat/chat_repl.mjs)

Status: IMPLEMENTED v1.0

## 1. Purpose

Interactive Read-Eval-Print Loop (REPL) for natural language interaction with AGISystem2. Provides a conversational interface that accepts natural language input and translates it to Sys2DSL commands.

**File**: `chat/chat_repl.mjs`
**Module Type**: ESM
**Exports**: `ChatREPL` class

---

## 2. Class: ChatREPL

### Constructor
```javascript
constructor(options?: {
  engine?: DSLEngine,
  agent?: AchillesAgent,
  prompt?: string,
  historyFile?: string
})
```

**Parameters:**
- `engine` (DSLEngine, optional) - DSL engine instance, created if not provided
- `agent` (AchillesAgent, optional) - LLM agent for NL understanding
- `prompt` (string, optional) - REPL prompt string, default: `"AGI> "`
- `historyFile` (string, optional) - Path to command history file

---

## 3. Public Methods

### start()
```javascript
async start(): Promise<void>
```
Starts the interactive REPL session.

**Behavior:**
1. Displays welcome message
2. Initializes readline interface
3. Loads command history if configured
4. Enters main loop: read → evaluate → print
5. Handles graceful shutdown on SIGINT

### processInput(input)
```javascript
async processInput(input: string): Promise<string>
```
Processes single user input and returns response.

**Behavior:**
1. Trims and validates input
2. Checks for special commands (quit, help, clear)
3. If LLM available: detects intent via prompts module
4. If no LLM: attempts regex-based parsing
5. Dispatches to appropriate handler
6. Returns response string

### stop()
```javascript
stop(): void
```
Gracefully stops the REPL.

**Behavior:**
1. Saves command history
2. Closes readline interface
3. Displays goodbye message

---

## 4. Special Commands

| Command | Description |
|---------|-------------|
| `quit`, `exit`, `q` | Exit the REPL |
| `help`, `?` | Show help message |
| `clear` | Clear the screen |
| `history` | Show command history |
| `debug on/off` | Toggle debug output |

---

## 5. REPL Flow

```
┌─────────────────────────────────────────────────────┐
│                    ChatREPL.start()                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              Display Welcome Message                │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              Wait for User Input                    │◄──────┐
└─────────────────┬───────────────────────────────────┘       │
                  │                                           │
                  ▼                                           │
┌─────────────────────────────────────────────────────┐       │
│              processInput(input)                    │       │
│  ┌─────────────────────────────────────────────┐    │       │
│  │ 1. Check special commands                   │    │       │
│  │ 2. detectIntent(input, agent)               │    │       │
│  │ 3. Dispatch to handler                      │    │       │
│  │ 4. Return response                          │    │       │
│  └─────────────────────────────────────────────┘    │       │
└─────────────────┬───────────────────────────────────┘       │
                  │                                           │
                  ▼                                           │
┌─────────────────────────────────────────────────────┐       │
│              Display Response                       │───────┘
└─────────────────────────────────────────────────────┘
```

---

## 6. Usage Example

```javascript
import { ChatREPL } from './chat_repl.mjs';
import { loadAchillesAgent } from './llm_loader.mjs';

// With LLM support
const agent = await loadAchillesAgent();
const repl = new ChatREPL({ agent });
await repl.start();

// Without LLM (regex fallback)
const replNoLLM = new ChatREPL();
await replNoLLM.start();

// Programmatic use
const repl = new ChatREPL({ agent });
const response = await repl.processInput("Dogs are animals");
console.log(response); // "OK, am înregistrat: Dog IS_A animal"
```

---

## 7. History Management

Command history is persisted to `~/.agisystem2_history` by default.

**Features:**
- Auto-load on start
- Auto-save on exit
- Up/down arrow navigation
- History search with Ctrl+R (where supported)
- Maximum 1000 entries

---

## 8. Error Handling

| Error Type | Behavior |
|------------|----------|
| Parse error | Display friendly message, continue REPL |
| DSL error | Display error, continue REPL |
| LLM timeout | Fallback to regex, warn user |
| Unknown intent | Ask for clarification |

---

## 9. Related Documents

- DS(/chat/prompts.mjs) - Intent detection prompts
- DS(/chat/chat_handlers.mjs) - Intent execution handlers
- DS(/chat/llm_loader.mjs) - LLM agent loading
- DS(/chat/index.mjs) - Module entry point
- DS(/language/dsl_engine.js) - DSL execution engine
