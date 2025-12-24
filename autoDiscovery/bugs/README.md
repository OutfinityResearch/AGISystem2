# AutoDiscovery Bug Tracker

## Summary (2025-12-24)

### Translation Status by Source

| Source | Status | Notes |
|--------|--------|-------|
| **prontoqa** | ✅ Complete | 0 translation bugs, 32.5% pass rate |
| **ruletaker** | ✅ Complete | 0 translation bugs |
| folio | ❌ Needs work | Complex first-order logic, real-world entities |
| folio_fol | ❌ Needs work | Has FOL annotations but complex patterns |
| abduction | ❌ Needs work | Property-based reasoning, "why" questions |
| babi15/babi16 | ❌ Needs work | Numbered sentences, simple patterns to fix |
| clutrr | ❌ Needs work | Kinship reasoning, [Name] entity format |
| logiqa/logiqa2 | ❌ Needs work | Multi-choice logical reading comprehension |
| logicnli | ❌ Needs work | NLI with complex logic conditions |
| reclor | ❌ Needs work | Reading comprehension multi-choice |
| rulebert | ❌ Needs work | Rule-based soft inference |

### Reasoning Bugs (Categories)

| Bug ID | Description | File |
|--------|-------------|------|
| BUG001 | Compound logic (Or/And in implications) | BUG001-compound-logic.md |
| BUG002 | Negation reasoning | BUG002-negation.md |
| BUG003 | Deep chains (>3 hops) | BUG003-deep-chains.md |
| BUG004 | Relational reasoning | BUG004-relational.md |
| BUG005 | Abductive reasoning | BUG005-abduction.md |
| BUG006 | Multi-choice ambiguity | BUG006-multichoice.md |
| BUG007 | Quantifier handling | BUG007-quantifiers.md |

## Pass Rate Analysis

For ProntoQA (with complete translation):
- **65 passed (32.5%)** - Simple implication chains work
- **135 failed (67.5%)** - Compound logic (Or antecedents, And consequents)

The 32.5% pass rate represents cases with simple `A → B` chains.
The 67.5% failure rate represents cases requiring:
- Disjunction matching (if A, then A∨B∨C matches)
- Conjunction splitting (from A∧B∧C derive A)
- Forward chaining through compound formulas

## Translation Priority

1. **babi15/babi16** - Strip sentence numbers, simple patterns
2. **logicnli** - Similar if-then patterns to prontoqa
3. **clutrr** - Extract [Name] entities, simple relationships
4. **abduction** - Property assertions, why-questions
5. **folio/folio_fol** - Complex real-world logic
6. **logiqa/reclor** - Multi-choice answer selection (different paradigm)
