# Test Fixture: Basic Concepts

ID: DS(/tests/fixtures/concepts/basic)

Status: STABLE

## Purpose

Minimal fixture with basic ontological and property facts for smoke tests.

## Content

```
dog IS_A Animal
Water HAS_PROPERTY boiling_point=100
```

## Facts

| Subject | Relation | Object | Notes |
|---------|----------|--------|-------|
| dog | IS_A | Animal | Concept classification |
| Water | HAS_PROPERTY | boiling_point=100 | Numeric property |

## Usage

```javascript
const facts = loadFixture('tests/fixtures/concepts/basic.txt');
for (const line of facts) {
  session.run(`@_ ASSERT ${line}`);
}
```

## Test Coverage

- Suite: `core_math`, `reason_smoke`
- Tests: Basic ASK queries, property retrieval

## Requirements Trace

- FS-01: Concept representation
- FS-03: Ingestion pipeline
