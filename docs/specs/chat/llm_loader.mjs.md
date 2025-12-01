# Design Spec: chat/llm_loader.mjs

ID: DS(/chat/llm_loader.mjs)

Status: IMPLEMENTED v1.0

## 1. Purpose

Dynamic loader for the AchillesAgentLib LLM integration. Provides lazy loading of the agent library to avoid hard dependencies and allow graceful degradation when LLM features are unavailable.

**File**: `chat/llm_loader.mjs`
**Module Type**: ESM
**Exports**: `loadAchillesAgent`

---

## 2. Main Function

### loadAchillesAgent()
```javascript
async loadAchillesAgent(): Promise<AchillesAgent | null>
```
Dynamically imports and instantiates the AchillesAgentLib.

**Behavior:**
1. Attempts dynamic import of `achilles-agent-lib` package
2. On success: Returns configured agent instance
3. On failure: Logs warning and returns null

**Returns:**
- `AchillesAgent` instance if available
- `null` if library not installed or import fails

**Error Handling:**
- Module not found: Returns null, logs info message
- Other errors: Returns null, logs warning

---

## 3. Configuration

The loader reads configuration from environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ACHILLES_API_KEY` | API key for LLM service | - |
| `ACHILLES_MODEL` | Model identifier | `gpt-4` |
| `ACHILLES_TEMPERATURE` | Sampling temperature | `0.7` |

---

## 4. Usage Example

```javascript
import { loadAchillesAgent } from './llm_loader.mjs';

const agent = await loadAchillesAgent();

if (agent) {
  // LLM features available
  const response = await agent.complete(prompt);
} else {
  // Fallback to non-LLM mode
  console.log('Running without LLM support');
}
```

---

## 5. Design Rationale

1. **Optional Dependency**: LLM library is not required for core functionality
2. **Lazy Loading**: Only loads when chat features are used
3. **Graceful Degradation**: System works without LLM, just with reduced NL capabilities
4. **Single Point of Configuration**: All LLM config centralized here

---

## 6. Related Documents

- DS(/chat/prompts.mjs) - Uses agent for intent detection
- DS(/chat/chat_repl.mjs) - Initializes agent via loader
- DS(/chat/index.mjs) - Re-exports loader
