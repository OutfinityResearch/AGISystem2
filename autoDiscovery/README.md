# AutoDiscovery Bug Tracker

**Last Updated:** 2025-12-24
**Total Cases Analysed:** 1051+

## Directory Structure

```
autoDiscovery/
├── bugCases/           # Reasoning bugs
│   ├── BUG000/         # Unclassified (325 cases)
│   ├── BUG001/         # Compound logic (132 cases)
│   ├── BUG003/         # Deep chains (569 cases)
│   ├── BUG006/         # Multi-choice (143 cases)
│   ├── BUG008/         # Existential (254 cases)
│   └── BUG009/         # General failure (857 cases)
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

## Pass Rate by Source

| Source | Passed | Failed | Pass Rate | Notes |
|--------|--------|--------|-----------|-------|
| **prontoqa** | 102 | 5 | **95.3%** | Near complete - only proof-by-contradiction cases fail |
| **logicnli** | 53 | 14 | **79.1%** | NLI patterns - good coverage |
| **logiqa** | 90 | 29 | **75.6%** | Multi-choice logic - good coverage |
| **folio** | 131 | 101 | **56.5%** | Complex FOL with real-world entities |
| **folio_fol** | 63 | 57 | **52.5%** | FOL with annotations |
| **rulebert** | 36 | 65 | **35.6%** | Soft inference rules - problematic |

**Global: 475 passed / 271 failed = 63.7% overall pass rate**

### Sources Without Evaluation Labels

These sources run but cannot be verified (no expected answer):
- logiqa2 (84 cases)
- abduction (83 cases)
- babi15 (83 cases)
- babi16 (83 cases)
- clutrr (83 cases)
- reclor (83 cases)

## Translation Status

**All translation bugs have been resolved.** Zero translation errors across all sources.

| Source | Translation | Notes |
|--------|-------------|-------|
| prontoqa | ✅ Complete | 100% sentences parsed |
| folio | ✅ Complete | Complex FOL translated |
| folio_fol | ✅ Complete | FOL annotations used |
| logiqa | ✅ Complete | Multi-choice format |
| logicnli | ✅ Complete | NLI format |
| rulebert | ✅ Complete | Rule format |
| abduction | ✅ Complete | Property assertions |
| babi15/16 | ✅ Complete | Simple patterns |
| clutrr | ✅ Complete | Kinship relations |

## Reasoning Bugs

| Bug ID | Description | Cases | Status |
|--------|-------------|-------|--------|
| **BUG009** | General reasoning failure | 857 | Open |
| **BUG003** | Deep chains (>3 hops) | 569 | Open |
| **BUG000** | Unclassified failure | 325 | Needs triage |
| **BUG008** | Existential reasoning | 254 | Open |
| **BUG006** | Multi-choice ambiguity | 143 | Open |
| **BUG001** | Compound logic (Or/And) | 132 | Open |
| **TOTAL** | | **2280** | |

### Bug Details

#### BUG001: Compound Logic Failure
Engine cannot match compound And conditions:
```
Implies (And A B C) (And D E F)
```
When facts A, B, C exist separately, cannot derive D, E, F.

#### BUG003: Deep Chain Failure
Inference chains with >3 steps fail to complete.

#### BUG008: Existential Reasoning
```
All rabbits have fur. Some pets are rabbits.
Question: Some pets do not have fur.
Expected: uncertain → Actual: proved=true (WRONG)
```

#### BUG009: General Reasoning (Transitive + Negation)
```
No plants are fungi. Mushrooms are fungi.
Question: No plants are mushrooms.
Expected: entailment → Actual: cannot prove
```

## Historical Progress

| Date | ProntoQA | LogiQA | FOLIO | Global | Notes |
|------|----------|--------|-------|--------|-------|
| Initial | 32.5% | - | - | - | Simple chains only |
| 2025-12-24 | **95.3%** | **75.6%** | **56.5%** | **63.7%** | Translation fixed, reasoning improved |

## Priority for Bug Fixes

1. **BUG001** - Compound And/Or matching (impacts 132 cases)
2. **BUG003** - Deep chain support (impacts 569 cases)
3. **BUG009** - Transitive negation (impacts 857 cases)
4. **BUG008** - Existential quantifier handling (impacts 254 cases)
