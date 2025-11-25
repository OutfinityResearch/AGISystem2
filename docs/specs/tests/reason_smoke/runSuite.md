# Suite: reason_smoke

ID: DS(/tests/reason_smoke/runSuite)

Scope: end-to-end ingest/ask basic.

Fixtures: `fixtures/concepts/basic.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Ingest fixtures.
- Query "Is Dog an Animal?" → TRUE_CERTAIN.
- Query "Is water boiling at 100?" → TRUE_CERTAIN.
- Provenance includes active base theory and dimensions used.

Sample Input/Output:
- Input statements from `basic.txt`; query `"Is water boiling at 50?"` → FALSE (optional negative check).***
