# Test Fixture: Counterfactual Boiling Point

ID: DS(/tests/fixtures/counterfactual/boil50)

Status: STABLE

## Purpose

Fixture for counterfactual reasoning tests - establishes an alternative physics where water boils at 50°C.

## Content

```
Water HAS_PROPERTY boiling_point=50
```

## Facts

| Subject | Relation | Object | Notes |
|---------|----------|--------|-------|
| Water | HAS_PROPERTY | boiling_point=50 | Counterfactual value (real: 100°C) |

## Counterfactual Semantics

This fixture creates a temporary theory layer that overrides the normal boiling point:
- Base theory: `Water HAS_PROPERTY boiling_point=100`
- Counterfactual layer: `Water HAS_PROPERTY boiling_point=50`

## Usage

```sys2dsl
# Base facts (normal physics)
@_ ASSERT Water HAS_PROPERTY boiling_point=100

# Push counterfactual layer
@_ THEORY_PUSH name="alt_physics"
@_ ASSERT Water HAS_PROPERTY boiling_point=50

# Query in counterfactual world
@q ASK Water HAS_PROPERTY boiling_point=50
# Returns: TRUE_CERTAIN (in this layer)

# Pop back to reality
@_ THEORY_POP
@q ASK Water HAS_PROPERTY boiling_point=100
# Returns: TRUE_CERTAIN (base layer)
```

## Test Scenarios

1. **Override test**: CF layer overrides base property
2. **Isolation test**: CF changes don't affect base
3. **Pop restore**: Base facts restored after pop

## Test Coverage

- Suite: `counterfactual_layering`
- Tests: THEORY_PUSH/POP, property override, layer isolation

## Requirements Trace

- FS-02: Theory layering and what-if
- FS-13: Validation & abstract interpretation
- URS-006: What-if exploration
- URS-015: Counterfactual/non-monotonic reasoning
