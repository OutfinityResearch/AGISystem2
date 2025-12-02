# Test Fixture: Basic Concepts

ID: DS(/tests/fixtures/concepts/basic)

Status: STABLE

## Purpose

Minimal fixture with basic ontological and property facts for smoke tests.

## Content

```sys2dsl
@_ dog IS_A Animal
@bp_val boiling_point DIM_PAIR 100
@_ Water SET_DIM @bp_val
```

## Facts

| Subject | Relation | Object | Notes |
|---------|----------|--------|-------|
| dog | IS_A | Animal | Concept classification |
| boiling_point | DIM_PAIR | 100 | Dimension-value pair |
| Water | SET_DIM | boiling_point | Numeric property |

## Usage

```javascript
const facts = loadFixture('tests/fixtures/concepts/basic.txt');
for (const line of facts) {
  session.run(`@_ ${line}`);
}
```

## Test Coverage

- Suite: `core_math`, `reason_smoke`
- Tests: Basic queries, property retrieval

## Requirements Trace

- FS-01: Concept representation
- FS-03: Ingestion pipeline
