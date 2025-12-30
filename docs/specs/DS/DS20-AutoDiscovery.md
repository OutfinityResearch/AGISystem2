# DS20 - AutoDiscovery: Automated Bug Discovery System

**Document Version:** 1.0  
**Author:** Sînică Alboaie  
**Status:** Implemented (tooling; not part of runtime Core)

## 1. Overview

The AutoDiscovery system is an automated bug-discovery environment that iteratively identifies and categorizes translation heuristics bugs and reasoning engine failures in AGISystem2.

### 1.1 Purpose

- **Automated Testing**: Continuously test against external reasoning benchmarks (LogiGlue, RuleTaker, FOLIO, ProntoQA)
- **Bug Classification**: Distinguish between translation bugs (Category A) and reasoning bugs (Category B)
- **Deduplication**: Track all tested cases to avoid redundant testing
- **Quarantine**: Isolate and preserve failed cases for detailed analysis

### 1.2 Location

All autoDiscovery components are located in `/autoDiscovery/`:

```
autoDiscovery/
├── bugsAutoDiscovery.mjs      # Main discovery script
├── runLogiGlueEval.mjs        # LogiGlue evaluation runner (migrated)
├── runRuleTakerEval.mjs       # RuleTaker evaluation runner (migrated)
├── analised.md                # Tracking file for tested cases
├── reasoningBugs.md           # Detailed reasoning bug reports
├── quarantine/                # Failed cases for analysis
│   └── [source]_[hash].json   # Individual failure records
└── libs/                      # Shared libraries
    ├── logiglue/
    │   ├── dataset-loader.mjs # HuggingFace data fetching
    │   └── translator.mjs     # LogiGlue-specific patterns
    └── ruletaker/
        ├── dataset-loader.mjs # RuleTaker data fetching
        ├── translator.mjs     # RuleTaker patterns
        └── reporter.mjs       # Output formatting
```

## 2. Architecture

### 2.1 Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    bugsAutoDiscovery.mjs                         │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Data Source │  │ Translator   │  │ Reasoning Engine        │ │
│  │ (HuggingFace)│→│ (NL → DSL)   │→│ (Session.prove)          │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Dedup Check │  │ Quality      │  │ Result Comparison       │ │
│  │ (analised.md)│  │ Assessment   │  │ (Expected vs Actual)    │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│                          │                      │               │
│                          ▼                      ▼               │
│              ┌───────────────────────────────────────┐          │
│              │        Bug Classification             │          │
│              │  Category A: Translation Bug          │          │
│              │  Category B: Reasoning Bug            │          │
│              └───────────────────────────────────────┘          │
│                          │                                      │
│              ┌───────────┴───────────┐                         │
│              ▼                       ▼                         │
│  ┌───────────────────┐  ┌───────────────────────┐              │
│  │ quarantine/       │  │ reasoningBugs.md      │              │
│  │ (all failures)    │  │ (Category B only)     │              │
│  └───────────────────┘  └───────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Consolidated NL-to-DSL Module

The translation logic is consolidated in `src/nlp/nl2dsl.mjs`:

```javascript
import { translateNL2DSL, translateExample, resetRefCounter } from '../src/nlp/nl2dsl.mjs';

// Translate context (facts/rules)
const contextResult = translateNL2DSL(contextText, { source: 'prontoqa' });

// Translate question (goal to prove)
const questionResult = translateNL2DSL(questionText, { source: 'prontoqa', isQuestion: true });

// Translate complete example
const translated = translateExample({ context, question, label, source });
```

**Supported Sources:**
- `prontoqa`: Made-up ontologies with -us suffix patterns
- `folio`: Complex first-order logic patterns
- `ruletaker`: Fact/rule patterns from Allen AI benchmark
- `generic`: Fallback patterns (default)

## 3. Bug Classification

### 3.1 Category A: Translation Bugs

Translation bugs occur when the NL-to-DSL conversion is incorrect:

- **Missing patterns**: No regex matches the sentence structure
- **Incorrect operator**: Wrong DSL operator chosen
- **Entity normalization**: Names not properly normalized
- **Negation handling**: Negation not properly wrapped in `Not`
- **Rule structure**: Conditional not properly forming `Implies`

**Indicators:**
- `contextErrors` array contains unparsed sentences
- DSL length too short relative to context length
- Missing `Implies` when context contains "if...then"
- Missing `Not` when context contains negation

**Action**: Modify heuristics in `src/nlp/nl2dsl.mjs`

### 3.2 Category B: Reasoning Bugs

Reasoning bugs occur when translation is correct but the engine produces wrong results:

- **Proof completeness**: Engine fails to find existing proof
- **Soundness**: Engine proves something that shouldn't be provable
- **Rule application**: Rules not correctly applied
- **Negation reasoning**: Closed-world assumption issues

**Indicators:**
- Translation quality assessment passes
- `proved !== expectProved`

**Action**: Log to `reasoningBugs.md` (do NOT modify engine)

## 4. Data Flow

### 4.1 Test Case Processing

```
1. Load examples from HuggingFace (loadExamples)
2. Generate case ID: [source]_[hash]
3. Check deduplication (analised.md)
   → If already tested: skip
4. Translate NL to DSL (translateExample)
   → If translation fails: Category A
5. Create Session and learn context DSL
6. Prove question DSL
7. Compare result with expected label
   → If correct: record as PASSED
   → If incorrect:
      a. Assess translation quality
      b. Category A if translation issues detected
      c. Category B if translation looks correct
8. Quarantine failed cases
9. Record in analised.md
```

### 4.2 Parallel Execution

The script uses 10 concurrent sessions by default:

```javascript
const DEFAULT_WORKERS = 10;

// Process in parallel chunks
for (let i = 0; i < toProcess.length; i += chunkSize) {
  const chunk = toProcess.slice(i, i + chunkSize);
  const chunkResults = await Promise.all(
    chunk.map(({ example, caseId }) => runExample(example, caseId))
  );
  // ... process results
}
```

## 5. File Formats

### 5.1 analised.md

Tracking file for deduplication:

```markdown
# Analysed Cases

Generated by bugsAutoDiscovery.mjs

- prontoqa_a1b2c3d4: PASSED (proved=true, expected=true)
- ruletaker_e5f6g7h8: FAIL_TRANSLATION (50% sentences unparsed)
- folio_i9j0k1l2: FAIL_REASONING (proved=false, expected=true)
```

### 5.2 quarantine/[caseId].json

Failed case record:

```json
{
  "caseId": "prontoqa_a1b2c3d4",
  "category": "A",
  "reason": "translation_failed",
  "details": "2 context errors",
  "timestamp": "2025-12-24T10:30:00Z",
  "example": {
    "source": "prontoqa",
    "context": "Wumpuses are grimpuses. Polly is a wumpus.",
    "question": "Polly is a grimpus",
    "label": "entailment"
  },
  "translated": {
    "contextDsl": "...",
    "questionDsl": "...",
    "contextErrors": [...]
  }
}
```

### 5.3 reasoningBugs.md

Detailed reasoning bug reports:

```markdown
# Reasoning Bugs

Bugs where translation is correct but reasoning engine fails.

---

## prontoqa_a1b2c3d4

**Timestamp:** 2025-12-24T10:30:00Z
**Source:** prontoqa
**Expected:** PROVE
**Got:** proved=false, expected=true

### Context (NL)
```
Wumpuses are grimpuses. Polly is a wumpus.
```

### Question
Polly is a grimpus

### Context DSL
```
@ant0 isA ?x Wumpus
@cons0 isA ?x Grimpus
Implies $ant0 $cons0
isA Polly Wumpus
```

### Question DSL
```
@goal isA Polly Grimpus
```

---
```

## 6. Usage

### 6.1 Basic Usage

```bash
# Run discovery with default settings (50 cases, 10 workers)
node autoDiscovery/runAutodiscoveryAgent.mjs

# Process 100 cases
node autoDiscovery/runAutodiscoveryAgent.mjs --batch=100

# Only test ProntoQA examples
node autoDiscovery/runAutodiscoveryAgent.mjs --source=prontoqa

# Run continuously until interrupted
node autoDiscovery/runAutodiscoveryAgent.mjs --continuous

# Analyze quarantine folder
node autoDiscovery/runAutodiscoveryAgent.mjs status

# Verbose output (show each case)
node autoDiscovery/runAutodiscoveryAgent.mjs --verbose
```

### 6.2 Options

| Option | Default | Description |
|--------|---------|-------------|
| `--batch=N` | 50 | Cases per batch |
| `--workers=N` | 10 | Parallel workers |
| `--source=NAME` | all | Specific source only |
| `--continuous` | false | Run indefinitely |
| `--analyze` | false | Analyze quarantine |
| `--verbose` | false | Show per-case results |
| `--seed=N` | timestamp | Random seed |

## 7. Integration

### 7.1 With runAllEvals.mjs

The LogiGlue and RuleTaker evaluations have been moved to autoDiscovery and removed from runAllEvals.mjs. The main eval suite now focuses on:

1. Fast Eval (NL→DSL transformation suites)
2. Stress Check (theory loading validation)
3. Query Eval (cross-domain reasoning)

### 7.2 Standalone Evaluation

The migrated evaluation runners can still be run standalone:

```bash
node autoDiscovery/runLogiGlueEval.mjs --fast
node autoDiscovery/runRuleTakerEval.mjs --sample=100
```

## 8. Future Enhancements

### 8.1 Planned Features

- **Auto-fix**: Suggest heuristic fixes for Category A bugs
- **Pattern learning**: Learn new patterns from successful translations
- **Coverage tracking**: Track which NL patterns are covered
- **Regression detection**: Alert when previously passing tests fail

### 8.2 Metrics Dashboard

Future web interface to visualize:
- Bug discovery rate over time
- Category A vs B distribution
- Per-source accuracy trends
- Heuristic coverage gaps
