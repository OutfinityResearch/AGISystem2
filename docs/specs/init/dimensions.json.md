# Design Spec: data/init/dimensions.json

ID: DS(/init/dimensions.json)

This file materializes the ontology/axiology/empirical dimension catalog as JSON. It must be compatible with `.specs/knowledge/dimensions.md` and the fixed partitions enforced by `Config`.

## Structure
- Top-level: object with keys:
  - `axes`: Array of dimension definitions
  - `partitions`: Partition boundaries (ontology, axiology, empirical, computable)
  - `propertyMappings`: Property name → dimension name mappings
  - `relationMappings`: Relation → affected dimensions
  - `relationProperties`: Relation metadata including transitivity, symmetry, inverses, and **computable plugin assignment**
  - `computePlugins`: Plugin definitions with relations and dimensions

- Each entry in `axes` is an object with:
  - `index`: integer, 0-based, in [0, dimensions-1].
  - `name`: short string identifier (e.g., `"Physicality"`, `"MoralValence"`).
  - `partition`: one of `"ontology"`, `"axiology"`, `"empirical"`, `"computable"`.
  - `description`: human-readable explanation of the axis.
  - `reserved`: boolean; `true` if axis is reserved for future use and should stay zero unless explicitly set.

## Computable Partition (16–31)

A special reserved range for compute plugin metadata:

| Index | Name | Description |
|-------|------|-------------|
| 16 | NumericValue | Encoded numeric value (log-scale) |
| 17 | NumericScale | Order of magnitude (10^n) |
| 18 | UnitDomain | Physical dimension: 0=dimensionless, 1=length, 2=mass, 3=time, 4=temperature |
| 19 | UnitBase | Base SI unit within domain |
| 20 | UnitPrefix | SI prefix as power of 10 |
| 21 | ComputeDomain | Plugin: 0=none, 1=math, 2=physics, 3=chemistry, 4=logic, 5=datetime |
| 22 | ComputeOperationType | Type: 0=none, 1=compare, 2=arithmetic, 3=convert, 4=solve |
| 23 | ComputePrecision | Precision: 0=exact, 1=high, 2=medium, 3=approximate |

## Relation Properties with Computable Assignment

Relations can be marked as computable by adding the `computable` field:

```json
"relationProperties": {
  "LESS_THAN": { "transitive": true, "symmetric": false, "inverse": "GREATER_THAN", "computable": "math" },
  "PLUS": { "transitive": false, "symmetric": true, "computable": "math" },
  "CONVERTS_TO": { "transitive": true, "symmetric": false, "computable": "physics" }
}
```

## Compute Plugin Definitions

```json
"computePlugins": {
  "math": {
    "relations": ["LESS_THAN", "GREATER_THAN", "EQUALS_VALUE", "PLUS", "MINUS", "TIMES", "DIVIDED_BY", "HAS_VALUE"],
    "dimensions": ["NumericValue", "NumericScale"],
    "description": "Arithmetic operations and numeric comparisons"
  },
  "physics": {
    "relations": ["CONVERTS_TO", "HAS_UNIT"],
    "dimensions": ["UnitDomain", "UnitBase", "UnitPrefix"],
    "description": "Unit conversions and physical calculations"
  }
}
```

## Constraints
- Ontology axes cover indices 0–255 with `partition: "ontology"`, excluding the computable range 16-31.
- Computable axes cover indices 16–31 with `partition: "computable"` and `reserved: true`.
- Axiology axes cover indices 256–383 with `partition: "axiology"`.
- Empirical axes have `index >= 384` with `partition: "empirical"`.
- Names and descriptions must be consistent with `.specs/knowledge/dimensions.md`.
- No duplicate indices or names within the file.***

## Proposed Initial Content (excerpt)
```json
{
  "axes": [
    {
      "index": 0,
      "name": "Physicality",
      "partition": "ontology",
      "description": "Degree to which an entity occupies physical space and has material properties.",
      "reserved": false
    },
    {
      "index": 2,
      "name": "MassScale",
      "partition": "ontology",
      "description": "Rough magnitude of mass or weight on a normalized scale.",
      "reserved": false
    },
    {
      "index": 3,
      "name": "SizeScale",
      "partition": "ontology",
      "description": "Overall spatial extent or size of an entity on a normalized scale.",
      "reserved": false
    },
    {
      "index": 4,
      "name": "Temperature",
      "partition": "ontology",
      "description": "Abstracted temperature axis used for physical processes and states.",
      "reserved": false
    },
    {
      "index": 5,
      "name": "Pressure",
      "partition": "ontology",
      "description": "Abstracted pressure axis for fluids, gases, or systems under load.",
      "reserved": false
    },
    {
      "index": 6,
      "name": "Density",
      "partition": "ontology",
      "description": "Relative density or compactness of an entity or medium.",
      "reserved": false
    },
    {
      "index": 7,
      "name": "Phase",
      "partition": "ontology",
      "description": "Encodes state such as solid, liquid, gas, or plasma via discrete bands.",
      "reserved": false
    },
    {
      "index": 8,
      "name": "SpatialExtent",
      "partition": "ontology",
      "description": "Captures whether an entity is point-like, local, or extended over regions.",
      "reserved": false
    },
    {
      "index": 9,
      "name": "LocationSpecificity",
      "partition": "ontology",
      "description": "Indicates how precisely an entity or event is tied to a concrete location.",
      "reserved": false
    },
    {
      "index": 10,
      "name": "TemporalPersistence",
      "partition": "ontology",
      "description": "Distinguishes transient events from long-lived or permanent entities.",
      "reserved": false
    },
    {
      "index": 11,
      "name": "Duration",
      "partition": "ontology",
      "description": "Approximate time span for which an event or state persists.",
      "reserved": false
    },
    {
      "index": 12,
      "name": "Frequency",
      "partition": "ontology",
      "description": "How often an event or pattern recurs in a given context.",
      "reserved": false
    },
    {
      "index": 13,
      "name": "CausalityStrength",
      "partition": "ontology",
      "description": "Strength of causal influence associated with an event or relation.",
      "reserved": false
    },
    {
      "index": 14,
      "name": "DeterminismLevel",
      "partition": "ontology",
      "description": "Indicates whether a process is deterministic or stochastic in character.",
      "reserved": false
    },
    {
      "index": 15,
      "name": "Reversibility",
      "partition": "ontology",
      "description": "Degree to which a process can be reversed without loss.",
      "reserved": false
    },
    {
      "index": 48,
      "name": "LivingStatus",
      "partition": "ontology",
      "description": "Whether an entity is biologically living; high values indicate life.",
      "reserved": false
    },
    {
      "index": 49,
      "name": "SpeciesTaxonomy",
      "partition": "ontology",
      "description": "Encodes high-level biological taxonomy class for living entities.",
      "reserved": false
    },
    {
      "index": 50,
      "name": "LifeStage",
      "partition": "ontology",
      "description": "Distinguishes juvenile, adult, and senescent stages for organisms.",
      "reserved": false
    },
    {
      "index": 51,
      "name": "HealthVitality",
      "partition": "ontology",
      "description": "Measures health or vitality of living entities on a coarse scale.",
      "reserved": false
    },
    {
      "index": 58,
      "name": "CognitionBaseline",
      "partition": "ontology",
      "description": "Represents baseline cognitive capacity (e.g., non-sapient, animal, human-level).",
      "reserved": false
    },
    {
      "index": 59,
      "name": "AgencyBaseline",
      "partition": "ontology",
      "description": "Indicates whether an entity can initiate actions intentionally.",
      "reserved": false
    },
    {
      "index": 80,
      "name": "ArtifactDevice",
      "partition": "ontology",
      "description": "Marks entities that are artifacts or devices rather than natural objects.",
      "reserved": false
    },
    {
      "index": 83,
      "name": "ComputationCapability",
      "partition": "ontology",
      "description": "Indicates whether an entity can perform computation and to what degree.",
      "reserved": false
    },
    {
      "index": 96,
      "name": "LegalEntity",
      "partition": "ontology",
      "description": "Indicates that an entity is recognized as a legal person or organization.",
      "reserved": false
    },
    {
      "index": 97,
      "name": "JurisdictionAnchor",
      "partition": "ontology",
      "description": "Anchors an entity or rule to a primary legal jurisdiction.",
      "reserved": false
    },
    {
      "index": 128,
      "name": "KnowledgeClaim",
      "partition": "ontology",
      "description": "Marks vectors that represent propositions or claims rather than concrete objects.",
      "reserved": false
    },
    {
      "index": 256,
      "name": "MoralValence",
      "partition": "axiology",
      "description": "Represents moral goodness or badness of an act or state.",
      "reserved": false
    },
    {
      "index": 289,
      "name": "SafetyPreference",
      "partition": "axiology",
      "description": "Preference for safety over other objectives; high values indicate strong safety bias.",
      "reserved": false
    },
    {
      "index": 292,
      "name": "ReliabilityPreference",
      "partition": "axiology",
      "description": "Preference for reliable, robust behaviour over potentially fragile but efficient options.",
      "reserved": false
    },
    {
      "index": 294,
      "name": "TransparencyPreference",
      "partition": "axiology",
      "description": "Desire for transparent and explainable decisions rather than opaque ones.",
      "reserved": false
    },
    {
      "index": 297,
      "name": "IncentiveAlignment",
      "partition": "axiology",
      "description": "Measures how well incentives for different actors are aligned.",
      "reserved": false
    },
    {
      "index": 300,
      "name": "PrestigeValue",
      "partition": "axiology",
      "description": "Captures perceived prestige or status associated with an outcome.",
      "reserved": false
    },
    {
      "index": 320,
      "name": "EmotionFear",
      "partition": "axiology",
      "description": "Emotional dimension representing fear or anticipated danger.",
      "reserved": false
    },
    {
      "index": 323,
      "name": "EmotionJoy",
      "partition": "axiology",
      "description": "Emotional dimension representing joy or satisfaction.",
      "reserved": false
    },
    {
      "index": 326,
      "name": "EmpathyLevel",
      "partition": "axiology",
      "description": "Represents empathy or compassion felt toward affected entities.",
      "reserved": false
    },
    {
      "index": 328,
      "name": "TrustLevel",
      "partition": "axiology",
      "description": "Stores trust or confidence in an entity, process, or source.",
      "reserved": false
    },
    {
      "index": 384,
      "name": "EmpiricalLatent0",
      "partition": "empirical",
      "description": "First empirical latent axis reserved for learned features; semantics emerge from data.",
      "reserved": false
    }
  ]
}
```

## Notes
- This JSON is loaded at bootstrap and used to validate that all components share a consistent view of the dimensional layout.
- Changes to this file are versioned and should be coordinated with code that depends on specific indices.***
