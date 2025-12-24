# BUG001: Or→And implication failure

## Description
Compound logic with Or antecedent and/or And consequent

## Detailed Examples



### prontoqa_68d6bb22

**Source:** prontoqa | **Category:** proof_chains
**Expected:** TRUE (should prove) | **Actual:** proved=false

#### Context (NL)
```
Tumpuses are rompuses. Wren is a rompus. Brimpuses are tumpuses, wumpuses, and lempuses. Each wumpus is a dumpus. Everything that is a vumpus and a wumpus and a yumpus is an impus. Wren is a grimpus. Everything that is a vumpus and a wumpus and a yumpus is a zumpus and a brimpus and a shumpus. Shumpuses are jompuses. Wren is a vumpus. Brimpuses are impuses. Everything that is a rompus, a vumpus, and a grimpus is a lorpus. Every zumpus is a dumpus. Wren is a vumpus. Wren is a jompus. Wren is a wu...
```

#### Context (DSL)
```dsl
@ant0 isA ?x Tumpus
@cons1 isA ?x Rompus
Implies $ant0 $cons1
isA Wren Rompus
@ant2 isA ?x Wumpus
@cons3 isA ?x Dumpus
Implies $ant2 $cons3
@type4 isA ?x Vumpus
@type5 isA ?x Wumpus
@type6 isA ?x Yumpus
@and7 And $type4 $type5 $type6
@cons8 isA ?x Impus
Implies $and7 $cons8
isA Wren Grimpus
@type9 isA ?x Vumpus
@type10 isA ?x Wumpus
@type11 isA ?x Yumpus
@and12 And $type9 $type10 $type11
@cons13 isA ?x Zumpus
@cons14 isA ?x Brimpus
@cons15 isA ?x Shumpus
@and16 And $cons13 $cons14 $cons15
Implies $and12 $and16
@ant17 isA ?x Shumpus
@cons18 isA ?x Jompus
Implies $ant17 $cons18
isA Wren Vumpus
@
...
```

#### Question (NL)
```
Wren is a lempus.
```

#### Question (DSL)
```dsl
@goal isA Wren Lempus
```

---
## Case IDs
- prontoqa_68d6bb22
### prontoqa_236ef268
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_236ef268.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_236ef268.json`

### prontoqa_67357ad9
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_67357ad9.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_67357ad9.json`

### prontoqa_6953f0a3
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_6953f0a3.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_6953f0a3.json`

### prontoqa_2370cdad
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_2370cdad.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_2370cdad.json`

### prontoqa_21768947
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_21768947.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_21768947.json`

### prontoqa_2562d170
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_2562d170.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_2562d170.json`

### prontoqa_e5d66be
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_e5d66be.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_e5d66be.json`

### prontoqa_6af2875d
- **Source:** prontoqa
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG001/prontoqa_6af2875d.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_6af2875d.json`

