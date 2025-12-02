# Test Fixture: Fire-Smoke Causal

ID: DS(/tests/fixtures/causal/fire_smoke)

Status: STABLE

## Purpose

Fixture establishing bidirectional causal relationship for abductive reasoning tests.

## Content

```sys2dsl
@_ Fire CAUSES Smoke
@_ Smoke CAUSED_BY Fire
```

## Facts

| Subject | Relation | Object | Direction |
|---------|----------|--------|-----------|
| Fire | CAUSES | Smoke | Forward causation |
| Smoke | CAUSED_BY | Fire | Inverse causation |

## Causal Semantics

Both facts encode the same causal relationship:
- `Fire CAUSES Smoke` - Fire produces smoke (forward)
- `Smoke CAUSED_BY Fire` - Smoke is evidence of fire (inverse)

The inverse form enables abductive reasoning: "Given smoke, what caused it?"

## Usage

```sys2dsl
# Load fixture facts
@_ Fire CAUSES Smoke
@_ Smoke CAUSED_BY Fire

# Abductive query: what causes smoke?
@causes ABDUCT observation=Smoke relation=CAUSED_BY
# Returns: Fire
```

## Test Coverage

- Suite: `abductive_causal`
- Tests: ABDUCT command, inverse relation probing

## Requirements Trace

- FS-05: Reasoning engine (abductive mode)
- FS-06: Retrieval & decoding (inverse permutations)
- URS-015: Abductive reasoning mode
