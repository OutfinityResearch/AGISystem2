# AutoDiscovery Bug Tracker

## Directory Structure

```
autoDiscovery/
├── bugCases/           # Reasoning bugs
│   ├── BUG001/
│   │   ├── report.md   # Bug description & case list
│   │   └── *.json      # Example cases
│   └── BUG003/
│       ├── report.md
│       └── *.json
├── nlpBugs/            # Translation/NLP bugs
│   ├── NLP002/
│   │   ├── report.md
│   │   └── *.json
│   └── NLP005/
│       ├── report.md
│       └── *.json
├── quarantine/         # Unclassified cases (should be empty)
└── analised.md         # Deduplication log
```

## Running Bug Cases

```bash
# Run all cases for a reasoning bug
node autoDiscovery/runBugSuite.mjs --bug=BUG001

# Run a single case
node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_xxx.json

# For strict mode (no auto-declare of unknown verb operators)
node autoDiscovery/runBugCase.mjs --strict-operators autoDiscovery/bugCases/BUG001/prontoqa_xxx.json

# Run discovery to find new bugs
node autoDiscovery/bugsAutoDiscovery.mjs --batch=100
```

## Translation Status by Source

| Source | Status | Notes |
|--------|--------|-------|
| **prontoqa** | Complete | 0 translation bugs, 32.5% pass rate |
| **ruletaker** | Complete | 0 translation bugs |
| folio | Needs work | Complex first-order logic, real-world entities |
| folio_fol | Needs work | Has FOL annotations but complex patterns |
| abduction | Needs work | Property-based reasoning, "why" questions |
| babi15/babi16 | Needs work | Numbered sentences, simple patterns to fix |
| clutrr | Needs work | Kinship reasoning, [Name] entity format |
| logiqa/logiqa2 | Needs work | Multi-choice logical reading comprehension |
| logicnli | Needs work | NLI with complex logic conditions |
| reclor | Needs work | Reading comprehension multi-choice |
| rulebert | Needs work | Rule-based soft inference |

## Reasoning Bugs

| Bug ID | Description | Folder |
|--------|-------------|--------|
| BUG001 | Compound logic (Or/And in implications) | bugCases/BUG001/ |
| BUG002 | Negation reasoning | bugCases/BUG002/ |
| BUG003 | Deep chains (>3 hops) | bugCases/BUG003/ |
| BUG004 | Relational reasoning | bugCases/BUG004/ |
| BUG005 | Abductive reasoning | bugCases/BUG005/ |
| BUG006 | Multi-choice ambiguity | bugCases/BUG006/ |
| BUG007 | Quantifier handling | bugCases/BUG007/ |

## NLP/Translation Bugs

| Bug ID | Description | Folder |
|--------|-------------|--------|
| NLP001 | Context translation empty | nlpBugs/NLP001/ |
| NLP002 | Question translation empty | nlpBugs/NLP002/ |
| NLP003 | Goal not first statement | nlpBugs/NLP003/ |
| NLP004 | Multi-statement without goal | nlpBugs/NLP004/ |
| NLP005 | Learn parse error | nlpBugs/NLP005/ |
| NLP006 | Translation quality issue | nlpBugs/NLP006/ |
| NLP007 | Complex sentence unsupported | nlpBugs/NLP007/ |

## Pass Rate Analysis

For ProntoQA (with complete translation):
- **65 passed (32.5%)** - Simple implication chains work
- **135 failed (67.5%)** - Compound logic (Or antecedents, And consequents)

The 32.5% pass rate represents cases with simple `A -> B` chains.
The 67.5% failure rate represents cases requiring:
- Disjunction matching (if A, then A|B|C matches)
- Conjunction splitting (from A&B&C derive A)
- Forward chaining through compound formulas

## Translation Priority

1. **babi15/babi16** - Strip sentence numbers, simple patterns
2. **logicnli** - Similar if-then patterns to prontoqa
3. **clutrr** - Extract [Name] entities, simple relationships
4. **abduction** - Property assertions, why-questions
5. **folio/folio_fol** - Complex real-world logic
6. **logiqa/reclor** - Multi-choice answer selection (different paradigm)
