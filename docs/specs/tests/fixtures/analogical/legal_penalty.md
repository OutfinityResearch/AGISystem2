# Test Fixture: Legal Penalty Analogies

ID: DS(/tests/fixtures/analogical/legal_penalty)

Status: STABLE

## Purpose

Fixture establishing parallel Crime-Penalty structures for analogical reasoning tests.

## Content

```sys2dsl
@_ Theft IS_A Crime
@_ Jail IS_A Penalty
@_ Fraud IS_A Crime
@_ Fine IS_A Penalty
```

## Facts

| Subject | Relation | Object | Domain |
|---------|----------|--------|--------|
| Theft | IS_A | Crime | Legal classification |
| Jail | IS_A | Penalty | Legal classification |
| Fraud | IS_A | Crime | Legal classification |
| Fine | IS_A | Penalty | Legal classification |

## Analogical Structure

These facts enable the analogy:
```
Theft : Jail :: Fraud : ?
```

Given:
- Theft is a Crime, Jail is a Penalty (assumed relation: Theft → Jail)
- Fraud is a Crime

Query: What penalty corresponds to Fraud? (Answer: Fine)

## Usage

```sys2dsl
# Load fixture
@_ Theft IS_A Crime
@_ Jail IS_A Penalty
@_ Fraud IS_A Crime
@_ Fine IS_A Penalty

# Analogical reasoning
@result ANALOGICAL source_a=Theft source_b=Jail target_c=Fraud
# Returns vector suggesting: Fine
```

## Test Coverage

- Suite: `analogical_reasoning`
- Tests: Vector delta computation, analogical transfer

## Requirements Trace

- FS-05: Reasoning engine
- FS-06: Retrieval & decoding
- URS-015: Analogical reasoning mode (vector translation)
