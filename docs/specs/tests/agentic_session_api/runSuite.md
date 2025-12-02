# Suite: agentic_session_api

ID: DS(/tests/agentic_session_api/runSuite)

Scope: `AgentSystem2` and `System2Session` using Sys2DSL with constrained grammar.

Fixtures: `fixtures/concepts/basic.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Create an `AgentSystem2` instance and a fresh `System2Session`.
- Send a small Sys2DSL script to the session:
  - `@f1 dog IS_A Animal`
  - `@q1 dog IS_A Animal`
- Verify that the session environment contains a result object for `@q1` with `truth=TRUE_CERTAIN`.
- Attempt to send a line outside the Sys2DSL grammar (for example a free-form story request without `@var action` prefix) and confirm that the session rejects it with a clear error.
- Provenance for the successful query includes translator/version and the active theory stack for the session.

Sample:
- Allowed: Sys2DSL script with triple syntax as above. Disallowed: free-form `"Tell me a story"` → error/reject.***
