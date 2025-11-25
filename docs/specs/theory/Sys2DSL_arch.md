# Sys2DSL Architecture and Data Mapping

ID: DS(/theory/Sys2DSL_arch)

This document describes how Sys2DSL scripts map to the internal data structures of AGISystem2, and how geometric objects (concepts, diamonds, points, masks) are turned back into intelligible Sys2DSL-level outputs.

It complements the functional spec (FS) and the `TheoryDSLEngine` design spec by focusing on:
- representation of data and metadata;
- handling of variables and references (concepts, points, masks);
- control of relevance masks during reasoning;
- translation between Sys2DSL text and the conceptual space.

## Core Data Model

### Concepts and Diamonds

- **Concept**
  - Identified by a canonical name (string) that appears in Sys2DSL as a lowercase token (e.g. `dog`, `boiling`, `export_control`).
  - Stored in `ConceptStore` as a union of one or more `BoundedDiamond` clusters.
- **BoundedDiamond**
  - Fields: `minValues`, `maxValues`, `center`, `l1Radius`, `relevanceMask`, optional `lshFingerprint`.
  - Geometrically represents one sense/cluster of a concept.
  - Each concept may have multiple diamonds (polysemy).
- **Cluster Management**
  - `ClusterManager` decides when to split/merge diamonds based on new observations.
  - For Sys2DSL, the important invariant is: each diamond has a well-defined `center` that can be treated as a representative point for that sense.

### Sessions and Theories

- **System2Session**
  - Maintains:
    - a session environment `env` (variables → values),
    - a list of active Sys2DSL lines (`activeTheoryLines`) representing the session’s current theory,
    - a handle to `EngineAPI` for actual reasoning and ingestion.
  - On creation, optionally loads a base Sys2DSL theory file and applies it to seed the theory stack.
- **Theory Files**
  - Canonical representation of theories is a single Sys2DSL text file per theory.
  - Binary forms (if used) are treated as caches only; they can be regenerated from the text.
  - Theories are version-controlled as text and are effectively programmes in Sys2DSL.

## Sys2DSL Values and References

The Sys2DSL interpreter operates over an environment map:

- `env: { name: Sys2DSLValue }`

`Sys2DSLValue` can be:
- **Primitive**: string, number, boolean.
- **Truth object**: `{ truth: 'TRUE_CERTAIN' | 'PLAUSIBLE' | 'FALSE' | 'UNKNOWN_TIMEOUT' | 'CONFLICT' }`.
- **Fact triple**: `{ subject, relation, object }`.
- **Array of facts**: lists returned by `FACTS_MATCHING`.
- **Concept reference**: `{ kind: 'conceptRef', label, id }`.
  - `label`: canonical concept name (lowercase token).
  - `id`: internal identifier in `ConceptStore`.
- **Point reference**: `{ kind: 'pointRef', conceptId, centers: [Int8Array], meta }`.
  - `centers`: one centre per diamond in the concept union.
  - `meta`: optional metadata (e.g. which diamond index each centre corresponds to).
- **Mask reference**: `{ kind: 'maskRef', dims: Uint8Array, spec }`.
  - `dims`: byte-level mask over dimensions.
  - `spec`: human-readable description (e.g. `'ontology+axiology'`, `'Temperature,MoralValence,Legality'`).

### Token Categories → Values

- Lowercase tokens in Sys2DSL (`dog`, `boiling_point`) are interpreted as concept names when passed to actions that expect concepts (e.g. `BIND_CONCEPT`, `BIND_POINT`).
- Uppercase tokens (`Alice`, `ProcedureX`) are interpreted as individuals or grounded entities when used inside facts or questions; they become the `subject`/`object` fields of triples or normalised questions.
- `$name` tokens are resolved to existing entries in `env`; they must refer to a previously bound value or are treated as empty strings / empty lists depending on context.

### Variable Objects

Implementation-wise, each entry in `env` may be exposed to host code as an instance of a `Variable` class with:
- `name`: the Sys2DSL variable name (without `@`/`$`).
- `kind`: a tag describing the underlying value type (`truth`, `fact`, `conceptRef`, `pointRef`, `maskRef`, etc.).
- `value`: the underlying structured payload (as described above).

Sys2DSL programmes themselves do not manipulate `Variable` instances directly; they operate at the level of variable names. Host APIs (for example session inspect/interactive tools) rely on `Variable` objects rather than raw strings, ensuring that query results are always typed (concepts/points/masks/truth objects), never bare strings.***


## Execution Semantics for Reference Actions

### BIND_CONCEPT

- Input: `conceptToken` (lowercase).
- Steps:
  1. Look up the concept in `ConceptStore` (creating an empty concept if necessary).
  2. Produce `{ kind: 'conceptRef', label: conceptToken, id: conceptId }`.
  3. Store value under `env[varName]`.
- Usage:
  - Decouple Sys2DSL programmes from raw strings when reusing the same concept across multiple actions.

### BIND_POINT

- Input: `conceptToken` or `conceptRef`.
- Steps:
  1. Resolve to a concept id.
  2. Fetch concept diamonds from `ConceptStore`.
  3. Collect the `center` of each diamond into `centers[]`.
  4. Produce `{ kind: 'pointRef', conceptId, centers, meta }`.
  5. Store under `env[varName]`.
- Semantics:
  - A pointRef is effectively a **bag of representative points**; it acknowledges polysemy.
  - When passed to reasoning actions that accept pointRefs (future extensions, e.g. direct geometric queries), the engine may:
    - run reasoning once per centre;
    - aggregate results deterministically (e.g. require all centres to satisfy a condition for TRUE_CERTAIN).

## Mask Construction and Application

### Building Masks

- `MASK_PARTITIONS <partition1> <partition2> ...`
  - Each `partition` is resolved via `Config.getPartition(name)` (e.g. `ontology`, `axiology`, `empirical`).
  - The interpreter constructs a `Uint8Array` mask where bits corresponding to the union of selected ranges are set to 1.
  - Resulting value: `{ kind: 'maskRef', dims, spec: 'ontology,axiology' }`.

- `MASK_DIMS <dimName1> <dimName2> ...`
  - Each `dimName` is the symbolic name of an ontology or axiology axis from the dimension catalog (for example `Temperature`, `MoralValence`, `Legality`).
  - The interpreter resolves names to indices (restricted to ontology/axiology ranges) and sets the corresponding bits in a `Uint8Array`.
  - Result: `{ kind: 'maskRef', dims, spec: 'dimName1,dimName2,...' }`.

### Effective Masks During Reasoning

When an action such as `ASK` or `ASK_MASKED` is executed, the engine determines the effective mask as:

1. **Concept relevance mask**: `diamond.relevanceMask`.
2. **Bias mode mask** (if any): produced by `BiasController` (`veil_of_ignorance`, etc.).
3. **Explicit mask**: from `maskRef` passed via Sys2DSL (for `ASK_MASKED`).

The effective mask is computed as a bytewise AND of the available masks:

```text
effectiveMask = relevanceMask & biasMask & explicitMask
```

If no explicit or bias mask is provided, the concept’s `relevanceMask` alone is used.

### ASK vs. ASK_MASKED

- `ASK <question-string>`:
  - Normalises the question to a structured triple, encodes it, and calls `EngineAPI.ask` with the default mask (relevanceMask plus any bias mode).
- `ASK_MASKED <maskVar> <question-string>`:
  - Resolves `$maskVar` to a `maskRef`.
  - Combines masks as described above.
  - Passes the effective mask into `Reasoner` / `MathEngine.distanceMaskedL1` so that only selected dimensions influence the truth band.

## Translation Back to Sys2DSL-Level Outputs

### Facts and Truth Values

- Actions like `ASK`, `CF`, `ABDUCT` return truth objects or richer result objects (e.g. `{ truth, band, hypothesis }`).
- Sys2DSL programmes typically store final outcomes under variables such as `@result` or `@decision`.
- When a host application needs to present results textually, it can:
  - read `env.result` and print `truth`/`band`;
  - optionally reconstruct an explanation by:
    - reading provenance from `EngineAPI` (active theories, mask spec, distances);
    - mapping concept ids back to their canonical names.

### Points to Text

- When a pointRef is produced (for example, by future geometric Sys2DSL actions), it is converted back to textual form by:
  1. Calling `Retriever.nearest` for each centre to find the closest concept(s).
  2. Emitting a description such as `pointRef(dog)` or `pointRef(dog, sense=2)` using the concept name and, optionally, a sense index.
- Sys2DSL scripts normally do not manipulate raw vector coordinates; they operate over concept and point references that can be rendered as readable tokens whenever needed.

## Multi-Diamond Handling Policy

- For ingestion and structural reasoning (facts, IS_A graphs), the engine treats a concept as a logical unit regardless of how many diamonds it has.
- For geometric reasoning that depends on distances (abductive, analogical, masked membership checks):
  - each diamond centre is a candidate representation;
  - operations such as membership or nearest-neighbour search are run against all diamonds;
  - truth bands are aggregated deterministically (for example, TRUE_CERTAIN only if all diamonds satisfy the condition within sceptic radius; PLAUSIBLE if some do, FALSE if none do).
- This policy ensures that:
  - Sys2DSL variables for concepts and points remain simple (no explicit diamond IDs in scripts),
  - but the underlying geometry still respects polysemy and offers clear semantics for ambiguous concepts.

## Summary

- Sys2DSL is the single, session-centric language through which callers define facts, ask questions, manipulate theories, build references to concepts and points, and control masks.
- `System2Session` and `TheoryDSLEngine` jointly enforce a clean separation:
  - external code sees only Sys2DSL text and high-level results;
  - internal modules operate on vectors, diamonds, masks, and theory stacks.
- The mapping described here must remain deterministic, auditable, and stable across versions so that Sys2DSL programmes stored in version control remain valid and reproducible over time.***
