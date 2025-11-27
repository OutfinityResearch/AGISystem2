# Use Case: Theory Branching on Contradiction

ID: DS(/interface/usecase_theory_branching)

Status: IMPLEMENTED v1.0

## 1. Overview

When a user attempts to teach facts that contradict existing knowledge, the system detects the conflict and offers to create an alternative theory branch. This enables exploring hypothetical scenarios or alternative worldviews without corrupting the base knowledge.

---

## 2. Actors

- **User**: Teaches facts via natural language
- **ChatEngine**: Orchestrates the interaction flow
- **ContradictionDetector**: Identifies logical conflicts
- **TheoryStack**: Manages theory layers

---

## 3. Preconditions

- ChatEngine is initialized with an active session
- Base theory contains established facts
- LLM agent is available for natural language processing

---

## 4. Main Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    THEORY BRANCHING FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User                    ChatEngine                 System
 │                          │                         │
 │  "Cats are fish"         │                         │
 │─────────────────────────▶│                         │
 │                          │  Extract facts          │
 │                          │────────────────────────▶│
 │                          │                         │
 │                          │  Check contradictions   │
 │                          │────────────────────────▶│
 │                          │                         │
 │                          │  ◀─ Contradiction found │
 │                          │     (cat IS_A mammal,   │
 │                          │      mammal ≠ fish)     │
 │                          │                         │
 │                          │  Set pendingAction      │
 │                          │────────────────────────▶│
 │                          │                         │
 │  ◀────────────────────────                         │
 │  "Contradiction detected.                          │
 │   Create branch?"                                  │
 │                          │                         │
 │  "yes"                   │                         │
 │─────────────────────────▶│                         │
 │                          │                         │
 │                          │  Check confirmation     │
 │                          │────────────────────────▶│
 │                          │                         │
 │                          │  THEORY_PUSH            │
 │                          │────────────────────────▶│
 │                          │                         │
 │                          │  ASSERT facts           │
 │                          │────────────────────────▶│
 │                          │                         │
 │  ◀────────────────────────                         │
 │  "Created branch                                   │
 │   'Alternative Theory'"                            │
 │                          │                         │
```

---

## 5. Alternative Flows

### 5.1 User Rejects Branch Creation

```
User: "Cats are fish"
System: "Contradiction detected. Create branch?"
User: "no"
System: "Okay, I won't create a new theory branch. The facts were not added."
```

- pendingAction is cleared
- No facts are added
- User remains in current theory context

### 5.2 User Sends Different Message

```
User: "Cats are fish"
System: "Contradiction detected. Create branch?"
User: "Dogs are animals"
System: "Got it! I've learned 1 fact: dog IS_A animal"
```

- pendingAction is cancelled
- New message is processed normally
- Original contradicting facts are discarded

### 5.3 No Contradiction Detected

```
User: "Lions are mammals"
System: "Got it! I've learned 1 fact: lion IS_A mammal"
```

- Facts added directly to current theory
- No confirmation required

---

## 6. Data Structures

### 6.1 Pending Action

```javascript
{
  type: 'create_theory_branch',
  data: {
    facts: [
      { subject: 'cat', relation: 'IS_A', object: 'fish' }
    ],
    contradictions: [
      {
        newFact: { subject: 'cat', relation: 'IS_A', object: 'fish' },
        conflicts: [
          { fact: 'cat IS_A mammal', reason: 'Cats are mammals, not fish' }
        ]
      }
    ],
    suggestion: {
      name: 'Aquatic Feline Theory',
      description: 'A theory where cats are classified as fish'
    }
  }
}
```

### 6.2 Confirmation Result

```javascript
{
  response: 'Created new theory branch "Aquatic Feline Theory".\n' +
            'Added 1 fact(s) to this branch:\n' +
            '- cat IS_A fish\n' +
            'You are now working in the "Aquatic Feline Theory" context.',
  actions: [
    { type: 'theory_created', name: 'Aquatic Feline Theory' },
    { type: 'fact_added', fact: { subject: 'cat', relation: 'IS_A', object: 'fish' } }
  ]
}
```

---

## 7. DSL Commands Used

| Command | Purpose |
|---------|---------|
| `THEORY_PUSH name="..."` | Create and switch to new theory layer |
| `ASSERT S R O` | Add fact to current theory |
| `FACTS_MATCHING ? ? ?` | Retrieve facts for contradiction checking |

---

## 8. Confirmation Patterns

### Accepted Confirmations
- yes, yeah, yep, sure, ok, okay
- go ahead, do it, please, confirm
- y, aye, affirmative, absolutely, definitely

### Accepted Rejections
- no, nope, nah, cancel, stop
- nevermind, never mind, forget it
- don't, do not, n

---

## 9. Postconditions

### On Confirmation
- New theory branch is created
- Contradicting facts are added to the new branch
- User's active context switches to the new branch
- Base theory remains unchanged

### On Rejection
- No new branch is created
- No facts are added
- User remains in current context
- pendingAction is cleared

---

## 10. Error Handling

| Error | Handling |
|-------|----------|
| THEORY_PUSH fails | Return error message, clear pendingAction |
| ASSERT fails | Skip failed fact, continue with others |
| LLM unavailable | Use heuristic contradiction detection |

---

## 11. Example Session

```
You: All birds can fly. Penguins are birds.

System: Got it! I've learned 2 fact(s):
- bird CAN fly
- penguin IS_A bird

You: Penguins cannot fly.

System: I noticed potential contradictions with existing knowledge:
- Penguins are birds, and birds can fly. Saying penguins cannot fly
  contradicts this.

Would you like me to create a new theory branch?
Suggested name: "Flightless Bird Theory"

You: yes

System: Created new theory branch "Flightless Bird Theory".

Added 1 fact(s) to this branch:
- penguin CAN_NOT fly

You're now working in the "Flightless Bird Theory" context.

You: Can penguins fly?

System: In this theory, penguins cannot fly, which is an exception
to the general rule that birds can fly.
```

---

## 12. Related Documents

- DS(/chat/chat_engine.mjs) - ChatEngine implementation
- DS(/reason/contradiction_detection) - Contradiction detection logic
- DS(/knowledge/theory_stack.js) - Theory stack management
- DS(/interface/usecase_hypothesize) - Hypothetical reasoning
