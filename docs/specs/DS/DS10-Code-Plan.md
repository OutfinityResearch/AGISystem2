# AGISystem2 - System Specifications

# Chapter 9B: Parser, Runtime, and Reasoning Engine

**Document Version:** 2.0  
**Status:** Draft Specification  
**Focus:** DSL Processing, Session Management, Query Resolution

---

## 9B.1 Module Map

```
src/
├── parser/                  # DSL → AST transformation
│   ├── lexer.js             # Text → Tokens
│   ├── parser.js            # Tokens → AST
│   └── ast.js               # AST node definitions
│
├── runtime/                 # Execution environment
│   ├── session.js           # Main API surface
│   ├── executor.js          # AST → Vector operations
│   ├── scope.js             # Variable binding & lookup
│   └── theory/
│       ├── registry.js      # Theory storage & lookup
│       ├── loader.js        # Theory file parsing
│       └── core-theory.js   # Built-in Core theory
│
├── reasoning/               # Query & proof systems
│   ├── query.js             # Single-step queries
│   ├── prove.js             # Multi-step proofs
│   ├── rules.js             # Rule matching & firing
│   └── unify.js             # Pattern unification
│
└── debug/                   # Inspection utilities
    ├── dump.js              # Session state export
    ├── inspect.js           # Vector analysis
    └── decode.js            # Vector → structure
```

---

## 9B.2 Parser Pipeline

### 9B.2.1 Overview

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  DSL    │ ──► │  Lexer  │ ──► │  Parser │ ──► │   AST   │
│  Text   │     │         │     │         │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘

Example:
  "@f1 loves John Mary"
       ↓
  [AT, IDENT(f1), IDENT(loves), IDENT(John), IDENT(Mary), NEWLINE]
       ↓
  Assignment {
    dest: "f1",
    operator: Identifier("loves"),
    args: [Identifier("John"), Identifier("Mary")]
  }
```

### 9B.2.2 Token Types

```
DECLARATIONS:
├── AT (@)           # Destination marker
├── DOLLAR ($)       # Variable reference
├── QUESTION (?)     # Query hole
└── COLON (:)        # Export marker

LITERALS:
├── IDENTIFIER       # Names: loves, John, __Person
├── STRING           # "quoted text"
└── NUMBER           # 42, 3.14, -7

KEYWORDS:
├── MACRO            # Graph definition start
├── END              # Block termination
├── RETURN           # Graph return
└── THEORY           # Theory definition

STRUCTURE:
├── NEWLINE          # Statement separator
├── INDENT           # Block start (for graphs)
├── DEDENT           # Block end
└── EOF              # End of input
```

### 9B.2.3 AST Node Types

```
PROGRAM
└── statements: Statement[]

STATEMENT (one of):
├── Assignment { dest, exportName?, operator, args[] }
├── GraphDef { name, exportName, params[], body[] }
├── TheoryDef { name, geometry, initMode, body[] }
└── Return { value }

EXPRESSION (one of):
├── Identifier { name }        # Literal lookup
├── Reference { name }         # $variable
├── Hole { name }              # ?query_var
└── Literal { value, type }    # "string" or 42
```

### 9B.2.4 Parser Error Handling

```
ERROR TYPES:
├── UnexpectedToken { expected, found, line, column }
├── UnterminatedString { line, column }
├── InvalidIndentation { expected, found, line }
└── UndefinedReference { name, line, column }

RECOVERY STRATEGY:
├── Single statement error → Skip to next NEWLINE
├── Graph error → Skip to END keyword
├── Theory error → Skip to theory END
└── Always report line/column for debugging
```

---

## 9B.3 Runtime: Session

### 9B.3.1 Session Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         SESSION                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Scope     │  │ KnowledgeBase│  │    Vocabulary    │  │
│  │  (variables) │  │  (bundled    │  │   (all known     │  │
│  │              │  │   facts)     │  │    atoms)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Theory Registry                      │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                  │  │
│  │  │  Core  │  │TheoryA │  │TheoryB │  ...             │  │
│  │  └────────┘  └────────┘  └────────┘                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │  Executor │  │QueryEngine│  │ProofEngine│              │
│  └───────────┘  └───────────┘  └───────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9B.3.2 Session Lifecycle

```
1. CREATION
   session = new Session(options)
   ├── Initialize empty scope
   ├── Initialize empty KB
   ├── Load Core theory (always)
   └── Import Core exports to vocabulary

2. LEARNING
   session.learn(dslText)
   ├── Parse DSL → AST
   ├── Execute statements
   ├── Store results in scope
   ├── Add facts to KB (via bundle)
   └── Register new atoms in vocabulary

3. QUERYING
   session.query(dslWithHoles)
   ├── Parse query
   ├── Identify holes
   ├── Execute query algorithm
   └── Return bindings + confidence

4. PROVING
   session.prove(goal)
   ├── Parse goal
   ├── Backward chain through rules
   ├── Build proof tree
   └── Return proof + validity

5. CLOSING
   session.close()
   ├── Clear scope
   ├── Clear KB
   └── Release memory
```

### 9B.3.3 Session State

```
SESSION STATE:
├── scope: Map<string, Vector>
│   └── Session-local variables
│
├── knowledgeBase: Vector
│   └── Bundle of all learned facts
│
├── facts: Array<FactInfo>
│   └── Metadata for each fact (for inspection)
│
├── vocabulary: Map<string, Vector>
│   └── All known atoms (from theories + session)
│
├── registry: TheoryRegistry
│   └── Loaded theories
│
└── stats: SessionStats
    ├── learnCalls: number
    ├── queryCalls: number
    ├── proveCalls: number
    └── startTime: timestamp
```

---

## 9B.4 Runtime: Executor

### 9B.4.1 Statement Execution

```
EXECUTE(statement):
  SWITCH statement.type:
    
    CASE Assignment:
      operator = resolve(statement.operator)
      args = statement.args.map(resolve)
      
      IF operator is graph:
        result = executeGraph(operator, args)
      ELSE:
        result = executeBinding(operator, args)
      
      IF statement.dest != "_":
        scope.set(statement.dest, result)
      
      IF isFact(result):
        KB = bundle([KB, result])
    
    CASE GraphDef:
      registry.registerGraph(statement)
    
    CASE Return:
      RETURN resolve(statement.value)
```

### 9B.4.2 Expression Resolution

```
RESOLVE(expression):
  SWITCH expression.type:
    
    CASE Identifier:
      # Look up literal in vocabulary
      IF NOT vocabulary.has(expression.name):
        # Auto-create new atom
        vector = asciiStamp(expression.name, "session", GEOMETRY)
        vocabulary.set(expression.name, vector)
      RETURN vocabulary.get(expression.name)
    
    CASE Reference:
      # Look up $variable in scope
      IF NOT scope.has(expression.name):
        ERROR "Undefined variable: $" + expression.name
      RETURN scope.get(expression.name)
    
    CASE Hole:
      # Return marker for query processing
      RETURN HoleMarker(expression.name)
    
    CASE Literal:
      # Convert literal value to vector
      RETURN asciiStamp(String(expression.value), "session", GEOMETRY)
```

### 9B.4.3 Binding Execution

```
EXECUTE_BINDING(operator, args):
  # Apply the binding formula
  # result = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ...
  
  bindings = [operator]
  
  FOR i = 0 TO args.length - 1:
    positioned = bind(getPosition(i + 1), args[i])
    bindings.push(positioned)
  
  result = bindAll(bindings)
  RETURN result
```

### 9B.4.4 Graph Execution

```
EXECUTE_MACRO(graph, args):
  # Create child scope for graph
  graphScope = scope.createChild()
  
  # Bind parameters to arguments
  FOR i = 0 TO graph.params.length - 1:
    graphScope.set(graph.params[i], args[i])
  
  # Execute graph body
  savedScope = scope
  scope = graphScope
  
  FOR statement IN graph.body:
    IF statement.type == Return:
      result = resolve(statement.value)
      scope = savedScope
      RETURN result
    ELSE:
      execute(statement)
  
  scope = savedScope
  RETURN null
```

---

## 9B.5 Runtime: Theory Management

### 9B.5.1 Theory Registry

```
THEORY REGISTRY:
├── theories: Map<string, Theory>
├── graphs: Map<string, Graph>
└── exportedAtoms: Map<string, Vector>

OPERATIONS:
├── register(theory)     # Add new theory
├── get(name)           # Retrieve theory
├── getGraph(name)      # Find graph by name
├── listAtoms(theory?)  # List all/filtered atoms
└── listGraphs(theory?) # List all/filtered graphs
```

### 9B.5.2 Theory Loading

```
LOAD_THEORY(theoryName):
  # Check if already loaded
  IF registry.has(theoryName):
    RETURN registry.get(theoryName)
  
  # Find theory file
  path = resolveTheoryPath(theoryName)
  source = readFile(path)
  
  # Parse theory
  ast = parse(source)
  
  # Must be TheoryDef
  IF ast.statements[0].type != TheoryDef:
    ERROR "Not a valid theory file"
  
  theoryDef = ast.statements[0]
  
  # Create theory with specified geometry
  theory = new Theory(
    name: theoryDef.name,
    geometry: theoryDef.geometry,
    initMode: theoryDef.initMode
  )
  
  # Execute theory body
  FOR statement IN theoryDef.body:
    executeInTheory(theory, statement)
  
  # Register and return
  registry.register(theory)
  RETURN theory
```

### 9B.5.3 Core Theory

```
CORE THEORY (always loaded):

CATEGORIES (~20):
├── __Atom, __Relation, __Property, __State
├── __Entity, __Event, __Action
├── __Role, __Category, __Type
└── ...

POSITION VECTORS (20):
├── Pos1, Pos2, ..., Pos20

LOGIC OPERATORS:
├── Implies, And, Or, Not, Equivalent
├── ForAll, Exists

FOUNDATIONAL RELATIONS:
├── isA, hasProperty, hasState
├── Before, After, During
├── Causes, Enables, Prevents
└── ...

TYPE HIERARCHY:
├── isA __Entity __Atom
├── isA __Event __Atom
├── isA __Action __Event
└── ...

TOTAL: ~120 definitions
```

---

## 9B.6 Reasoning: Query Engine

### 9B.6.1 Query Algorithm

```
QUERY(dslWithHoles):
  # Parse and validate
  ast = parse(dsl)
  statement = ast.statements[0]
  
  # Separate holes from known values
  holes = []
  knowns = []
  
  FOR i = 0 TO statement.args.length - 1:
    arg = statement.args[i]
    IF arg.type == Hole:
      holes.push({ index: i+1, name: arg.name })
    ELSE:
      knowns.push({ index: i+1, vector: resolve(arg) })
  
  # Build partial vector (operator + known args)
  operator = resolve(statement.operator)
  partial = operator
  FOR known IN knowns:
    partial = bind(partial, withPosition(known.index, known.vector))
  
  # Unbind from KB
  candidate = bind(KB, partial)
  
  # For each hole, extract answer
  bindings = Map()
  FOR hole IN holes:
    raw = removePosition(hole.index, candidate)
    matches = topKSimilar(raw, vocabulary, k=5)
    
    IF matches.length > 0:
      bindings.set(hole.name, {
        answer: matches[0].name,
        similarity: matches[0].similarity,
        alternatives: matches[1..4]
      })
  
  # Calculate confidence
  confidence = calculateConfidence(bindings, holes.length)
  
  RETURN {
    success: allHolesFilled(bindings, holes),
    bindings: bindings,
    confidence: confidence,
    ambiguous: hasCloseAlternatives(bindings)
  }
```

### 9B.6.2 Confidence Calculation

```
CALCULATE_CONFIDENCE(bindings, numHoles):
  IF bindings.size == 0:
    RETURN 0.0
  
  # Average similarity across all bindings
  totalSim = 0
  FOR binding IN bindings.values():
    totalSim += binding.similarity
  avgSim = totalSim / bindings.size
  
  # Penalty for multiple holes
  holePenalty = 1.0 - (numHoles - 1) * 0.1  # -10% per extra hole
  
  # Penalty for close alternatives (ambiguity)
  ambiguityPenalty = 1.0
  FOR binding IN bindings.values():
    IF binding.alternatives[0].similarity > binding.similarity - 0.05:
      ambiguityPenalty *= 0.9  # -10% if close alternative
  
  RETURN avgSim * holePenalty * ambiguityPenalty
```

### 9B.6.3 Query Confidence Interpretation

```
CONFIDENCE THRESHOLDS:

> 0.80:  STRONG
├── High similarity to expected answer
├── No close alternatives
└── Action: Trust the result

0.65 - 0.80:  GOOD
├── Solid match
├── May have some alternatives
└── Action: Probably correct, verify if critical

0.55 - 0.65:  WEAK
├── Marginal similarity
├── Multiple close alternatives likely
└── Action: Treat with caution

< 0.55:  POOR
├── Near random similarity
├── Essentially noise
└── Action: Do not trust, query failed
```

---

## 9B.7 Reasoning: Proof Engine

### 9B.7.1 Proof Strategy

```
PROVE(goal):
  # Initialize proof state
  proofTree = new ProofTree(goal)
  visited = Set()
  
  # Backward chaining
  result = backwardChain(goal, proofTree, visited, depth=0)
  
  RETURN {
    valid: result.success,
    proof: proofTree,
    steps: proofTree.getSteps(),
    confidence: result.confidence
  }

BACKWARD_CHAIN(goal, tree, visited, depth):
  # Depth limit
  IF depth > MAX_PROOF_DEPTH:
    RETURN { success: false, reason: "depth limit" }
  
  # Cycle detection
  goalHash = hashGoal(goal)
  IF visited.has(goalHash):
    RETURN { success: false, reason: "cycle" }
  visited.add(goalHash)
  
  # Try direct KB lookup
  directResult = queryKB(goal)
  IF directResult.confidence > 0.7:
    tree.addLeaf(goal, "direct", directResult)
    RETURN { success: true, confidence: directResult.confidence }
  
  # Try rule matching
  FOR rule IN findMatchingRules(goal):
    premises = rule.getPremises(goal)
    allPremisesProved = true
    premiseResults = []
    
    FOR premise IN premises:
      premiseResult = backwardChain(premise, tree.child(), visited, depth+1)
      IF NOT premiseResult.success:
        allPremisesProved = false
        BREAK
      premiseResults.push(premiseResult)
    
    IF allPremisesProved:
      confidence = combineConfidences(premiseResults)
      tree.addNode(goal, rule, premiseResults)
      RETURN { success: true, confidence: confidence }
  
  RETURN { success: false, reason: "no proof found" }
```

### 9B.7.2 Rule Matching

```
FIND_MATCHING_RULES(goal):
  # Goal: Implies ?premise goal
  # Find rules where conclusion matches goal
  
  matchingRules = []
  
  FOR rule IN getAllRules():
    conclusion = rule.getConclusion()
    
    # Try to unify goal with conclusion
    unification = unify(goal, conclusion)
    
    IF unification.success:
      boundRule = rule.applyBindings(unification.bindings)
      matchingRules.push(boundRule)
  
  # Sort by specificity (more specific rules first)
  matchingRules.sort(bySpecificity)
  
  RETURN matchingRules
```

### 9B.7.3 Proof Tree Structure

```
PROOF TREE:
├── goal: Vector (what we're proving)
├── method: "direct" | "rule" | "assumption"
├── rule?: RuleInfo (if method == "rule")
├── children: ProofTree[] (premises)
├── confidence: number
└── valid: boolean

OPERATIONS:
├── addLeaf(goal, method, result)
├── addNode(goal, rule, children)
├── getSteps() → ProofStep[]
├── toText() → string (human-readable)
└── validate() → boolean
```

---

## 9B.8 Scope Management

### 9B.8.1 Scope Hierarchy

```
SCOPE STRUCTURE:
┌─────────────────────────────────────┐
│           Global Scope              │
│  (Core theory exports)              │
├─────────────────────────────────────┤
│         Theory Scope                │
│  (Current theory definitions)       │
├─────────────────────────────────────┤
│         Session Scope               │
│  (User-defined variables)           │
├─────────────────────────────────────┤
│          Graph Scope                │
│  (Parameters + locals)              │
└─────────────────────────────────────┘

LOOKUP ORDER: Graph → Session → Theory → Global
```

### 9B.8.2 Scope Operations

```
SCOPE:
├── variables: Map<string, Vector>
├── parent: Scope | null
│
├── get(name):
│     IF variables.has(name):
│       RETURN variables.get(name)
│     ELSE IF parent != null:
│       RETURN parent.get(name)
│     ELSE:
│       ERROR "Undefined: " + name
│
├── set(name, vector):
│     variables.set(name, vector)
│
├── has(name):
│     RETURN variables.has(name) OR (parent?.has(name))
│
├── createChild():
│     RETURN new Scope(parent: this)
│
└── clear():
      variables.clear()
```

---

## 9B.9 Error Handling

### 9B.9.1 Error Types

```
ERROR HIERARCHY:
AGIError (base)
├── ParseError
│   ├── line, column
│   ├── expected, found
│   └── source snippet
│
├── RuntimeError
│   ├── operation
│   └── context
│
├── QueryError
│   ├── query
│   └── reason ("no match", "ambiguous", "low confidence")
│
├── TheoryError
│   ├── theoryName
│   └── reason ("not found", "parse error", "invalid")
│
└── CapacityError
    ├── current
    ├── maximum
    └── resource ("KB facts", "vocabulary")
```

### 9B.9.2 Result Types

```
ALL API METHODS RETURN STRUCTURED RESULTS:

LearnResult:
├── success: boolean
├── warnings?: string[]
├── error?: string
├── line?: number
└── column?: number

QueryResult:
├── success: boolean
├── bindings: Map<string, Binding> | null
├── confidence: number
├── ambiguous?: boolean
├── alternatives?: Binding[]
└── reason?: string

ProveResult:
├── valid: boolean
├── proof: ProofTree | null
├── steps: ProofStep[]
├── confidence: number
└── reason?: string
```

---

## 9B.10 Debug Utilities

### 9B.10.1 Session Dump

```
DUMP():
  RETURN {
    scope: mapToObject(scope.variables),
    facts: facts.map(f => f.info),
    vocabulary: vocabularyStats(),
    theories: registry.list(),
    stats: stats
  }
```

### 9B.10.2 Vector Inspection

```
INSPECT(name):
  vector = get(name)
  
  RETURN {
    name: name,
    density: vector.density(),
    popcount: vector.popcount(),
    
    # Find what this is similar to
    similarTo: topKSimilar(vector, vocabulary, 10),
    
    # Try to decode structure
    structure: decode(vector),
    
    # Check if it's in KB
    inKB: similarity(vector, KB) > 0.55
  }
```

### 9B.10.3 Vector Decoding

```
DECODE(vector):
  # Try to extract structure from bound vector
  
  # Find operator (highest similarity to known operators)
  operatorMatch = mostSimilar(vector, operators)
  IF operatorMatch.similarity < 0.55:
    RETURN { type: "unknown" }
  
  # Extract arguments by unbinding operator
  remainder = bind(vector, operatorMatch.vector)
  
  # Try each position
  args = []
  FOR i = 1 TO MAX_ARGS:
    posUnbound = removePosition(i, remainder)
    argMatch = mostSimilar(posUnbound, vocabulary)
    IF argMatch.similarity > 0.55:
      args.push({ position: i, value: argMatch.name, sim: argMatch.similarity })
  
  RETURN {
    type: "relation",
    operator: operatorMatch.name,
    arguments: args,
    confidence: operatorMatch.similarity
  }
```

---

## 9B.11 Performance Considerations

### 9B.11.1 Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| parse(text) | O(n) | n = text length |
| learn(statement) | O(v) | v = vocabulary size (for new atoms) |
| query(1 hole) | O(v) | Vocabulary scan |
| query(k holes) | O(k × v) | k scans |
| prove(goal) | O(r^d) | r = rules, d = depth |
| bundle(n facts) | O(n × geo) | geo = geometry |

### 9B.11.2 Bottlenecks

```
KNOWN BOTTLENECKS:

1. Vocabulary Scan
   Problem: mostSimilar scans entire vocabulary
   Mitigation: Locality-sensitive hashing (LSH) for large vocabularies

2. Proof Search
   Problem: Exponential in worst case
   Mitigation: Depth limit, memoization, iterative deepening

3. KB Bundle Growth
   Problem: Query accuracy degrades with KB size
   Mitigation: Capacity warnings, partitioning

4. Theory Loading
   Problem: Large theories slow to parse
   Mitigation: Cache parsed theories, lazy loading
```

---

## 9B.12 Summary

| Component | Responsibility |
|-----------|----------------|
| Lexer | Text → Tokens |
| Parser | Tokens → AST |
| Session | API surface, state management |
| Executor | AST → Vector operations |
| Scope | Variable binding hierarchy |
| TheoryRegistry | Theory storage & lookup |
| QueryEngine | Hole-filling queries |
| ProofEngine | Multi-step backward chaining |
| Debug utilities | Inspection, decoding, dumping |

**Key Design Decisions:**
1. Structured error returns (no exceptions for domain errors)
2. Confidence scores on all query/proof results
3. Scope hierarchy for clean variable management
4. Separate query (single-step) from prove (multi-step)
5. Capacity warnings before degradation

---

*End of Chapter 9B - Parser, Runtime, and Reasoning Engine*
