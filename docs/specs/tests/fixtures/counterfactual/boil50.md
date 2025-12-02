# Test Fixture: Counterfactual Boiling Point

ID: DS(/tests/fixtures/counterfactual/boil50)

Status: STABLE

## Purpose

Fixture for counterfactual reasoning tests - establishes an alternative physics where water boils at 50°C.

## Content

```sys2dsl
@bp50 boiling_point DIM_PAIR 50
@_ Water SET_DIM @bp50
```

## Facts

| Subject | Relation | Object | Notes |
|---------|----------|--------|-------|
| boiling_point | DIM_PAIR | 50 | Dimension-value pair |
| Water | SET_DIM | boiling_point | Counterfactual value (real: 100°C) |

## Counterfactual Semantics

This fixture creates a temporary theory layer that overrides the normal boiling point:
- Base theory: `@bp boiling_point DIM_PAIR 100` then `@_ Water SET_DIM @bp`
- Counterfactual layer: `@bp boiling_point DIM_PAIR 50` then `@_ Water SET_DIM @bp`

## Usage

```sys2dsl
# Base facts (normal physics)
@bp100 boiling_point DIM_PAIR 100
@_ Water SET_DIM @bp100

# Push counterfactual layer
@_ alt_physics PUSH any
@bp50 boiling_point DIM_PAIR 50
@_ Water SET_DIM @bp50

# Query in counterfactual world
@check50 boiling_point DIM_PAIR 50
@q Water HAS_DIM @check50
# Returns: TRUE_CERTAIN (in this layer)

# Pop back to reality
@_ any POP any
@check100 boiling_point DIM_PAIR 100
@q Water HAS_DIM @check100
# Returns: TRUE_CERTAIN (base layer)
```

## Test Scenarios

1. **Override test**: CF layer overrides base property
2. **Isolation test**: CF changes don't affect base
3. **Pop restore**: Base facts restored after pop

## Test Coverage

- Suite: `counterfactual_layering`
- Tests: PUSH/POP, property override, layer isolation

## Requirements Trace

- FS-02: Theory layering and what-if
- FS-13: Validation & abstract interpretation
- URS-006: What-if exploration
- URS-015: Counterfactual/non-monotonic reasoning
