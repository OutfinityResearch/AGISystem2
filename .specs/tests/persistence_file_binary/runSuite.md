# Suite: persistence_file_binary

Scope: StorageAdapter (file_binary), ConceptStore/Theory persistence.

Fixtures: `fixtures/concepts/basic.txt`, test layers (e.g., law_minimal).

Profile: `manual_test` (uses file_binary root `./.data_dev`).

Steps/Assertions:
- Save concepts and layers to disk; flush.
- Reload via StorageAdapter; hashes/diamonds match pre-save.
- Hierarchical override respected (child layer files do not mutate parent).
- Cleanup temp root after run.

Sample:
- Save `basic.txt` concepts and `law_minimal` layer; reload; compare vector hashes; assert parent/base theory unchanged when child override exists.***
