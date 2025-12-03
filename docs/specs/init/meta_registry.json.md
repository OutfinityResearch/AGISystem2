# Design Spec: data/init/meta_registry.json

ID: DS(/init/meta_registry.json)

Status: v1.0 – Registry of Built-in Specs

## Purpose

`data/init/meta_registry.json` provides a lightweight registry of built-in theories, profiles, and spec identifiers that are shipped with AGISystem2. It is used to:
- Expose a machine-readable list of bundled theories (for example, base ontology/axiology, sample compliance theories).
- Associate human-friendly names and categories with underlying `.sys2dsl` and `.theory.json` files.
- Support tooling (CLI, UI, tests) that needs to discover available theories/specs without hard-coding filenames.

## Structure

High-level JSON shape (illustrative):

```json
{
  "theories": [
    { "id": "base/ontology", "file": "data/init/theories/base/ontology_base.sys2dsl", "kind": "base" },
    { "id": "base/axiology", "file": "data/init/theories/base/axiology_base.sys2dsl", "kind": "base" },
    { "id": "sample/health_compliance", "file": "data/init/theories/health_compliance.sys2dsl", "kind": "sample" }
  ],
  "profiles": [
    { "id": "auto_test", "configProfileId": "auto_test" },
    { "id": "manual_test", "configProfileId": "manual_test" }
  ]
}
```

Actual fields may include:
- `id`: Stable identifier used by higher-level components.
- `file`: Relative path to the theory/config file.
- `kind`: Category, e.g. `base`, `sample`, `test`.
- Optional metadata such as `description`, `tags`, `deprecated`.

## Collaborators

- `Config` and `TheoryStorage` use this registry to:
  - List available built-in theories.
  - Resolve IDs in CLI/Chat commands (e.g., "load base ontology").
- Test suites (for example `relations_bootstrap`, `health_compliance`) may reference these IDs when asserting availability of default content.

## Constraints

- `meta_registry.json` must be kept in sync with the actual files under `data/init/**` and `docs/specs/**`.
- IDs are stable and should not change without a deprecation path.
- The file is read-only at runtime; any dynamic registration happens in memory, not by mutating this JSON.

## Related Documents

- DS(/init/config_profile.json) — configuration profile catalogue.
- DS(/knowledge/base_theories) — description of base theories and sample domain theories.
- DS(/theory/theory_storage.js) — how theory files are located and loaded.

