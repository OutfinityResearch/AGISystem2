# Design Spec: data/init/relations.json

ID: DS(/init/relations.json)

This file materializes the default relation set as JSON. It must be compatible with `.specs/knowledge/default_relations.md` and used by `RelationPermuter.bootstrapDefaults`.

## Structure
- Top-level: object with a single `relations` array.
- Each relation entry is an object with:
  - `name`: string identifier (e.g., `"IS_A"`, `"CAUSES"`).
  - `inverse`: string name of inverse relation, or `null` if none.
  - `symmetric`: boolean; `true` if relation is symmetric.
  - `transitive`: boolean; `true` if relation is transitive.
  - `domainPartitionHint`: optional string (`"ontology"`, `"axiology"`, `"empirical"`) indicating which partition is primarily affected in the subject position.
  - `rangePartitionHint`: optional string (`"ontology"`, `"axiology"`, `"empirical"`) indicating partition for the object position.
  - `weight`: optional numeric hint for importance or priority in retrieval.

## Constraints
- Names must be unique and match the names expected by grammar and code.
- Inverse names must reference other entries in the same file or be `null`.
- Symmetric relations must either have `inverse` equal to their own name or `null` with `symmetric: true`.
- Transitivity flags should reflect intended logical behavior and be consistent with domain theory.

## Proposed Initial Content (excerpt)
```json
{
  "relations": [
    {
      "name": "IS_A",
      "inverse": null,
      "symmetric": false,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 1.0
    },
    {
      "name": "CAUSES",
      "inverse": "CAUSED_BY",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.9
    },
    {
      "name": "EQUIVALENT_TO",
      "inverse": "EQUIVALENT_TO",
      "symmetric": true,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 1.0
    },
    {
      "name": "DISJOINT_WITH",
      "inverse": "DISJOINT_WITH",
      "symmetric": true,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.8
    },
    {
      "name": "PART_OF",
      "inverse": "HAS_PART",
      "symmetric": false,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.9
    },
    {
      "name": "HAS_PART",
      "inverse": "PART_OF",
      "symmetric": false,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.9
    },
    {
      "name": "HAS_PROPERTY",
      "inverse": "PROPERTY_OF",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.7
    },
    {
      "name": "LOCATED_IN",
      "inverse": "CONTAINS",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.7
    },
    {
      "name": "PERMITS",
      "inverse": "PERMITTED_BY",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "axiology",
      "rangePartitionHint": "ontology",
      "weight": 0.8
    },
    {
      "name": "REQUIRES",
      "inverse": "REQUIRED_FOR",
      "symmetric": false,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.85
    },
    {
      "name": "REQUIRED_FOR",
      "inverse": "REQUIRES",
      "symmetric": false,
      "transitive": true,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.85
    },
    {
      "name": "PROTECTED_HEALTH_INFO_OF",
      "inverse": "HAS_PROTECTED_HEALTH_INFO",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.8
    },
    {
      "name": "HAS_PROTECTED_HEALTH_INFO",
      "inverse": "PROTECTED_HEALTH_INFO_OF",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.8
    },
    {
      "name": "COMPLIES_WITH",
      "inverse": "IS_COMPLIANCE_FOR",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.9
    },
    {
      "name": "VIOLATES",
      "inverse": "IS_VIOLATED_BY",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.9
    },
    {
      "name": "CASTS",
      "inverse": "CAST_BY",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.6
    },
    {
      "name": "CHARACTER_OF",
      "inverse": "HAS_CHARACTER",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.7
    },
    {
      "name": "OCCURS_IN_CHAPTER",
      "inverse": "HAS_EVENT",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "ontology",
      "rangePartitionHint": "ontology",
      "weight": 0.7
    }
    {
      "name": "PROHIBITS",
      "inverse": "PROHIBITED_BY",
      "symmetric": false,
      "transitive": false,
      "domainPartitionHint": "axiology",
      "rangePartitionHint": "ontology",
      "weight": 0.8
    }
  ]
}
```

## Notes
- This JSON is loaded at bootstrap to register permutations for known relations. Adding a new relation requires updating this file and the grammar, and then regenerating or reinitializing `RelationPermuter`.
- Seeds for permutation generation come from `Config.relationSeed`, ensuring deterministic tables across runs.***
