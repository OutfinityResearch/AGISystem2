# Suite: agentic_session_api

Scope: EngineAPI `getAgenticSession` with constrained grammar.

Fixtures: `fixtures/concepts/basic.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Create session via `getAgenticSession`.
- Ingest "Dog IS_A Animal" through session; query "Is Dog an Animal?" → TRUE_CERTAIN.
- Attempt disallowed command outside grammar → rejected.
- Provenance includes translator/version and active stack.

Sample:
- Allowed: ingest/query as above. Disallowed: free-form "Tell me a story" → error/reject.***
