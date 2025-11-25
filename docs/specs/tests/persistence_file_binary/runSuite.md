# Suite: persistence_file_binary

ID: DS(/tests/persistence_file_binary/runSuite)

Scope: StorageAdapter (file_binary), ConceptStore/Theory persistence (Sys2DSL text + optional binary caches).

Fixtures: `fixtures/concepts/basic.txt`, test theories (e.g., `law_minimal.sys2dsl`).

Profile: `manual_test` (uses file_binary root `./.data_dev`).

Steps/Assertions:
- Save concepts and theories to disk via `StorageAdapter`, using `saveConcept` for concept binaries and `saveTheoryText` for Sys2DSL theories; flush.
- Reload via `StorageAdapter`; concept binaries round-trip (hashes/diamonds match pre-save) and theory Sys2DSL text matches.
- Optional: populate and read binary theory caches via `saveTheoryCache`/`loadTheoryCache`.
- Hierarchical override respected (child theory files do not mutate parent; loader composes them in deterministic order).
- Cleanup temp root after run.

Sample:
- Save `basic.txt` concepts and `law_minimal.sys2dsl` theory; reload; compare vector hashes and theory text; assert parent/base theory unchanged when child override exists.***
