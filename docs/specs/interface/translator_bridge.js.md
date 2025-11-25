# Design Spec: src/interface/translator_bridge.js

ID: DS(/interface/translator_bridge.js)

Class `TranslatorBridge`
- **Role**: Boundary to external LLM/translation services for NL→structured intents and tokens; enforce determinism via pinned models/prompts; surface provenance to parser/encoder. Supports normalization of richer natural language into the constrained grammar accepted by the engine (simple English subject–relation–object).
- **Pattern**: Adapter. SOLID: single responsibility for translation layer.
- **Key Collaborators**: `NLParser`, `AuditLog`, `Config`.

## Public API
- `constructor({config, audit, client})`
- `toStructure(text)`: returns structured parse hints (tokens, relations) deterministically; includes model/version in metadata; normalizes to constrained grammar.
- `translate(text, targetLang='en')`: optional deterministic translation; logs usage.
- `getVersion()`: returns identifier of underlying model/config.

## Pseudocode (comments)
```js
class TranslatorBridge {
  constructor({config, audit, client}) {
    // store client; freeze prompt/model ids from config
  }

  toStructure(text) {
    // call client with pinned params; validate deterministic fields; log to audit
  }

  translate(text, target='en') {
    // deterministic translation with same pins; return {text, version}
  }

  getVersion() { /* return model id + prompt hash */ }
}
```

## Notes/Constraints
- All outputs must carry version/provenance for audit/replay.
- No stochastic params (temperature forced to 0); enforce retries or failures explicitly.***
