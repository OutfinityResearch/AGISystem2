# Theory Spec: Law Minimal

ID: DS(/init/theories/law_minimal.sys2dsl)

Status: STABLE

## Purpose

Minimal legal theory establishing basic deontic facts for permission/prohibition reasoning tests.

## Content

```sys2dsl
# Minimal law theory (Sys2DSL)
@f1 ASSERT Killing PROHIBITS permitted
@f2 ASSERT Helping PERMITS permitted
```

## Facts Defined

| Fact | Relation | Semantics |
|------|----------|-----------|
| `Killing PROHIBITS permitted` | PROHIBITS | Action categorically forbidden |
| `Helping PERMITS permitted` | PERMITS | Action categorically allowed |

## Semantic Notes

The `permitted` object is a meta-level marker indicating the deontic status. This allows queries like:
- `ASK Killing PROHIBITS permitted` → TRUE_CERTAIN
- `ASK Helping PERMITS permitted` → TRUE_CERTAIN
- `ASK Helping PROHIBITS permitted` → FALSE

## Usage

```javascript
session.appendTheory(fs.readFileSync('data/init/theories/law_minimal.sys2dsl', 'utf8'));
// Now deontic queries work against these baseline norms
```

## Related Files

- `law_minimal.theory.json`: Dimension overrides for deontic axes
- `export_action.dsl`: Uses similar deontic patterns

## Test Coverage

- Suite: `deontic_reasoning`

## Requirements Trace

- FS-02: Theory layering
- FS-12: Safety & bias controls (deontic dimensions)
- URS-015: Deontic/normative reasoning modes
