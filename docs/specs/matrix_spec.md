# Design Spec: Specification Matrix (docs/specs/matrix.html)

ID: DS(/specs/matrix)

## Purpose
- Present a consolidated view of requirements (URS/FS/NFS), design specs (DS), and test coverage.
- Show which test suites validate each DS and the latest recorded test status.
- Serve as a quick compliance/coverage dashboard for the project site and local docs.

## Data Sources
- **Requirements lists**: URS, FS, NFS embedded in `matrix.html` (`URS_DATA`, `FS_DATA`, `NFS_DATA`).
- **Design specs list**: `DS_DATA` embedded in `matrix.html` with fields:
  - `spec`: path under `docs/specs/`
  - `name`: short description
  - `dsId`: DS identifier string
  - `reqs`: comma-separated URS/FS/NFS IDs
  - `coverage`: `full|partial|none`
  - `testSuite`: name of the test folder (or `null` if none)
  - Optional `isNew` flag for highlighting new docs
- **Test results**:
  - Preferred: `tests/results/test_results.json` (committed artifact, refreshed by CI/test runner).
  - Fallback: embedded `EMBEDDED_RESULTS` object inside `matrix.html` (generated from the same JSON at commit time).
  - Path resolution: `matrix.html` loads `../../tests/results/test_results.json` via `fetch`; if it fails (e.g., site does not host `/tests`), it uses the embedded fallback.

## Expected Update Flow
1. Add or modify DS docs under `docs/specs/**`.
2. Add a row in `DS_DATA` with the DS identifier, mapped URS/FS/NFS IDs, and an associated test suite (if any).
3. When new tests are added, ensure the suite name matches the folder under `tests/` and add it to relevant DS rows.
4. After running tests, update `tests/results/test_results.json` (CI should regenerate this file). Commit the updated JSON so the matrix reflects the latest status.
5. If hosting docs without the `tests` folder (e.g., static site), keep `EMBEDDED_RESULTS` in sync with the committed JSON to avoid UNKNOWN statuses.

## Rendering Rules
- Requirements and specs are rendered into tables with links to the underlying documents.
- Coverage badges use `coverage` and `testSuite` fields:
  - If a test suite exists in results, show its status.
  - If not found, display `UNKNOWN`.
- New documents can be highlighted via `isNew: true`.

## Limitations / Known Gaps
- Components without a DS (e.g., DSL command modules, some chat/CLI scripts) are not yet listed; add DS docs before populating the matrix.
- If the site hosting omits `/tests`, statuses rely on embedded fallback; ensure it is refreshed when tests are rerun.

## Future Improvements
- Automate `DS_DATA` generation from repository scans.
- Auto-inject fresh test results into `EMBEDDED_RESULTS` during CI publish.
- Add anchors/filters by tag (core/ingest/reasoning/cli/chat).
