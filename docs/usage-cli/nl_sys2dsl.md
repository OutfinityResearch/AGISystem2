# Natural Language ↔ Sys2DSL in the CLI

This page documents how the CLI chat flow turns natural language into Sys2DSL (and back), what prompts/tricks are currently implemented, and how to get predictable behavior.

## Pipeline
1. **Launcher** (`bin/AGISystem2.sh`) sets `NODE_PATH` and runs `chat/index.mjs`.
2. **Chat REPL** (`chat/chat_repl.mjs`) handles terminal I/O and lightweight `/commands`.
3. **ChatEngine** (`chat/chat_engine.mjs`) orchestrates:
   - Intent detection via LLMAgent (AchillesAgentLib) using `buildIntentPrompt`.
   - Fact extraction via `buildFactExtractionPrompt`.
   - Question canonicalization via `buildQuestionPrompt`.
   - Theory/session plumbing (`System2Session`, Sys2DSL execution).
4. **Engine** runs Sys2DSL through `System2Session` → `TheoryDSLEngine` → core modules.
5. **Responses** are formatted back to natural language; optional DSL snippets appear in REPL history for transparency.

## Prompt Conventions (current)
- **System prompt**: positions the assistant as Sys2DSL-aware, capable of teaching, asking, contradictions, and theory management.
- **Intent JSON**: LLM must return `{intent, confidence, details}`; intents: `teach | ask | import | manage_theory | list | help | other`.
- **Fact extraction**:
  - Enforces `Subject RELATION Object` triples.
  - Lowercase for types, Capitalized for instances.
  - UPPERCASE relations (custom verbs allowed).
  - Avoids `HAS_PROPERTY` with free text; prefers `IS_A` concepts.
  - Maps numeric values to concepts (e.g., `Celsius100`).
  - Works across languages; verbs are uppercased as-is (Romanian examples included).
- **Question canonicalization**:
  - Normalizes plurals to singular.
  - Relation mapping: `is a`→`IS_A`, `causes`→`CAUSES`, `can`→`CAN/PERMITS`, `located in`→`LOCATED_IN`.
  - Preserves custom verbs (EATS, HUNTS, OMOARA, etc.).
  - Expects subject/object as single tokens (no articles).

## Current Tricks & Heuristics
- Custom verb preservation: any verb from NL is uppercased and used as-is if not in the standard list.
- Plural-to-singular normalization in the question prompt.
- Fact extraction discourages `HAS_PROPERTY` with descriptive strings; prefers typed concepts.
- Numeric literals become named concepts (e.g., `Celsius100`), not raw numbers.
- Determinism: prompts request JSON-only outputs for intent/facts.

## Masking/Bias Expectations
- The DSL supports explicit masks (`MASK_PARTITIONS`, `MASK_DIMS`, `ASK_MASKED`); the translator does **not** infer masks automatically. Masking is applied only if a command or session code asks for it.
- The chat layer does not inject bias modes; use Sys2DSL mask commands if neutrality is required.

## How to Phrase Requests for Best Results
- Teaching facts: short, declarative sentences (“Dogs are mammals”, “Fire causes smoke”).
- Questions: simple yes/no or “what/where” forms (“Is a dog an animal?”, “Where is Paris located?”).
- Avoid: long compound sentences with multiple verbs; split them into separate turns for more reliable triples.
- If you need a custom relation, say it explicitly (“Do lions hunt zebras?” → relation `HUNTS`).
- For property=value text you want preserved, wrap it in quotes so the parser accepts it (e.g., `"temp=100"`).

## Limitations and Gaps
- No inline comments or semicolon separators in generated Sys2DSL; each statement must start with `@`.
- The parser rejects unquoted `property=value` tokens in subject/object slots.
- `MODIFY_RELATION` is not implemented; only `DEFINE_RELATION`/`BIND_RELATION` are active.
- Mask names in `MASK_DIMS` must exist in `config.dimensionNames` or be numeric indices.

## Extensibility Ideas
- Add prompt controls for bias/mask suggestions (e.g., request axiology masking on sensitive questions).
- Support batch translation of paragraphs into multiple `@` statements for large imports.
- Expose model/provider selection via CLI flags and pass through to ChatEngine.
- Add deterministic slot-filling mode (no free-form JSON) for stricter scripting workflows.
