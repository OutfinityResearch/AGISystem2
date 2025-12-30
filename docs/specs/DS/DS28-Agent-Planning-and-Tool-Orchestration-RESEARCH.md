# AGISystem2 - System Specifications
#
# DS28: Agent Planning and Tool Orchestration (Trustworthy Pattern) — Research
#
# **Document Version:** 1.0
# **Author:** Sînică Alboaie
# **Status:** Planned (research-level; not implemented)
#
# This document is an extracted, focused spec from DS08 (Trustworthy AI Patterns).
# It is not currently shipped as a runnable Core/config theory set.
#
# Scope: planning as a verifiable, theory-driven activity (tool semantics, preconditions/effects, plan validation, runtime monitoring).

---

## 1. The problem

AI agents that orchestrate tools need a representation for what tools can do (preconditions, effects, costs) and a way to generate and validate multi-step plans. Pure LLM planning is prone to producing plausible but invalid sequences. The goal of this pattern is to make plans *checkable* before execution, and to support replanning when reality changes.

This pattern describes a theory-oriented approach:

- tools are declared as facts with explicit semantics,
- plan steps and plans are structured records,
- plan validity is a property that can be proven (or disproven) with explicit missing preconditions.

---

## 2. Theory design (sketch)

The theory uses a small type system (states/resources/tools) plus graph macros to define tools and plan structures. The DSL below is illustrative; if/when implemented, it must be moved into `config/` and covered by unit tests.

```
@AgentPlanning theory 32768 deterministic

    # ============ TYPE SYSTEM ============

    # States (conditions that can be true/false)
    @StateType:StateType __Category
    @HasFile:HasFile __State
    @HasData:HasData __State
    @HasAccess:HasAccess __State
    @Connected:Connected __State
    @Authenticated:Authenticated __State
    @Completed:Completed __State

    # Resources (things tools operate on)
    @Resource:Resource __Category
    @File:File __Category
    @Database:Database __Category
    @API:API __Category
    @Service:Service __Category

    # Actors
    @Agent:Agent __Category
    @Tool:Tool __Category

    # ============ TOOL DEFINITION MACRO ============

    # A tool has: name, preconditions, effects, cost
    @ToolDefGraph:defineTool graph name preconditions effects cost
        @t1 __Role Name $name
        @t2 __Role Requires $preconditions
        @t3 __Role Produces $effects
        @t4 __Role Cost $cost
        @t5 isA $name Tool
        @result __Bundle $t1 $t2 $t3 $t4 $t5
        return $result
    end

    # State predicates
    @HasStateGraph:has graph agent state resource
        @r1 __Role Agent $agent
        @r2 __Role State $state
        @r3 __Role Resource $resource
        @result __Bundle $r1 $r2 $r3
        return $result
    end

    # ============ PLANNING PRIMITIVES ============

    # A plan step
    @PlanStepGraph:planStep graph tool args expectedPre expectedPost
        @r1 __Role Tool $tool
        @r2 __Role Arguments $args
        @r3 __Role Preconditions $expectedPre
        @r4 __Role Postconditions $expectedPost
        @result __Bundle $r1 $r2 $r3 $r4
        return $result
    end

    # A complete plan
    @PlanGraph:plan graph goal steps
        @r1 __Role Goal $goal
        @r2 __Role Steps $steps
        @result __Bundle $r1 $r2
        return $result
    end

    # ============ VERIFICATION RULES ============

    # A step is valid if preconditions are satisfied
    @validStep rule "Step validity"
        implies (and (planStep ?tool ?args ?pre ?post)
                     (satisfies CurrentState ?pre))
                (valid ?step)

    # A plan is valid if all steps are valid in sequence
    @validPlan rule "Plan validity"
        implies (forall ?step (in ?step ?plan) (valid ?step))
                (valid ?plan)

    # Effects become new state
    @effectRule rule "Effect propagation"
        implies (and (executes ?agent ?step)
                     (planStep ?tool ?args ?pre ?post))
                (becomes CurrentState ?post)

end
```

---

## 3. Declaring tools (example)

```
# Load the planning theory
@_ Load $AgentPlanning

# ============ DEFINE AVAILABLE TOOLS ============

# File operations
@readFileTool defineTool ReadFile
    (and (has Agent HasFile ?path)
         (has Agent HasAccess ?path))
    (has Agent HasData (contentOf ?path))
    (cost Low)

@writeFileTool defineTool WriteFile
    (and (has Agent HasData ?content)
         (has Agent HasAccess ?path))
    (has Agent HasFile ?path)
    (cost Low)

# Database operations
@queryDBTool defineTool QueryDatabase
    (and (has Agent Connected ?database)
         (has Agent Authenticated ?database))
    (has Agent HasData (queryResult ?query))
    (cost Medium)

@insertDBTool defineTool InsertDatabase
    (and (has Agent Connected ?database)
         (has Agent Authenticated ?database)
         (has Agent HasData ?record))
    (has Agent Completed (insert ?record ?database))
    (cost Medium)

# API operations
@callAPItool defineTool CallAPI
    (and (has Agent Connected ?api)
         (has Agent HasData ?request))
    (has Agent HasData (responseFrom ?api))
    (cost High)

# Authentication
@loginTool defineTool Login
    (and (has Agent HasCredentials ?service))
    (and (has Agent Connected ?service)
         (has Agent Authenticated ?service))
    (cost Low)

# Email
@sendEmailTool defineTool SendEmail
    (and (has Agent Connected EmailServer)
         (has Agent Authenticated EmailServer)
         (has Agent HasData ?content))
    (has Agent Completed (sent ?content ?recipient))
    (cost Low)
```

---

## 4. Plan generation and validation (example workflow)

In this pattern, “plan generation” can be modeled as backward chaining on desired effects: pick a tool whose effects satisfy the goal, then recursively satisfy preconditions.

```javascript
// User goal: "Send the Q3 report to the team"
const goal = session.learn(`
    @goal has Agent Completed (sent Q3Report TeamMailingList)
`);

// Current state
session.learn(`
    @current_state __Bundle
        (has Agent HasCredentials EmailServer)
        (has Agent HasCredentials SalesDB)
        (has Agent HasFile ReportTemplate)
`);

// Generate plan via backward chaining
const plan = session.prove(`
    @generatedPlan achieves Agent $goal
`);
```

Plan validation is expressed as a proof query against the plan structure:

```javascript
// Validate a proposed plan
const validation = session.prove(`
    @check validPlan $proposedPlan
`);
```

If validation fails, the system should report which preconditions are missing and which steps need to be inserted (e.g., login steps).

---

## 5. Runtime monitoring and replanning (sketch)

During execution, preconditions may change. The pattern is to re-check preconditions before each tool call and trigger replanning if they no longer hold.

```javascript
for (const step of plan.steps) {
    const preCheck = session.prove(`
        @pre satisfies CurrentState ${step.preconditions}
    `);

    if (!preCheck.valid) {
        const newPlan = session.prove(`
            @replan achieves Agent $goal from CurrentState
        `);
        continue;
    }

    const result = await executeToolCall(step.tool, step.args);

    session.learn(`
        @_ updateState CurrentState ${step.postconditions}
    `);
}
```

---

## 6. Notes

This DS is a research pattern. If promoted to runtime:

- the theory should live under `config/` and be loaded deterministically,
- plan validity and precondition reporting must be covered by unit tests,
- eval suites should include both valid and invalid plan examples.
