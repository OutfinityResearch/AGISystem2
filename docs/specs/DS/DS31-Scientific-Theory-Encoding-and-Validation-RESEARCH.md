# AGISystem2 - System Specifications
#
# DS31: Scientific Theory Encoding and Validation (Trustworthy Pattern) — Research
#
# **Document Version:** 1.0
# **Status:** Planned (research-level; not implemented)
#
# This document is an extracted, focused spec from DS08 (Trustworthy AI Patterns).
# It is not currently shipped as a runnable Core/config theory set.
#
# Scope: representing scientific theories as checkable structures; validating new claims against theory; discovering cross-theory connections; exploring hypotheses via “what if”.

---

## 1. The problem

Scientific knowledge needs a representation that is:

- formal enough to validate consistency,
- structured enough to connect concepts across theories,
- usable as a review aid for evaluating new claims and hypotheses.

This pattern uses theories to encode scientific laws, theorems, and concept relationships. The system can then:

- detect contradictions (new claims vs established theory),
- map cross-theory concept bridges,
- explore the implications of hypotheses (counterfactual reasoning).

---

## 2. Scientific theory structure (sketch)

```
@ScientificTheory theory 32768 deterministic

    # ============ FOUNDATIONAL TYPES ============

    @Concept:Concept __Category
    @Law:Law __Category
    @Theorem:Theorem __Category
    @Hypothesis:Hypothesis __Category
    @Observation:Observation __Category
    @Prediction:Prediction __Category
    @Quantity:Quantity __Category

    # Relationships between concepts
    @Implies:Implies __Relation
    @Contradicts:Contradicts __Relation
    @Requires:Requires __Relation
    @Generalizes:Generalizes __Relation
    @SpecialCaseOf:SpecialCaseOf __Relation
    @EquivalentTo:EquivalentTo __Relation

    # ============ LAW DEFINITION ============

    @LawGraph:law graph name domain statement conditions
        @l1 isA $name Law
        @l2 __Role Domain $domain
        @l3 __Role Statement $statement
        @l4 __Role Conditions $conditions
        @result __Bundle $l1 $l2 $l3 $l4
        return $result
    end

    # ============ THEOREM DEFINITION ============

    @TheoremGraph:theorem graph name derivedFrom statement
        @t1 isA $name Theorem
        @t2 __Role DerivedFrom $derivedFrom
        @t3 __Role Statement $statement
        @result __Bundle $t1 $t2 $t3
        return $result
    end

    # ============ MATHEMATICAL RELATIONS ============

    @Equals:Equals __Relation
    @GreaterThan:GreaterThan __Relation
    @LessThan:LessThan __Relation
    @Proportional:Proportional __Relation
    @InverselyProportional:InverselyProportional __Relation

    @EqualsGraph:equals graph left right
        @r1 __Role Left $left
        @r2 __Role Right $right
        @result __Role Equals (__Pair $r1 $r2)
        return $result
    end

    # ============ CONSISTENCY CHECKING ============

    @ConsistentWith:ConsistentWith __Relation
    @Inconsistent:Inconsistent __Relation

    @consistencyRule rule "Contradiction detection"
        implies (and (implies ?theory ?conclusion)
                     (implies ?theory (not ?conclusion)))
                (inconsistent ?theory)

end
```

---

## 3. Encoding a domain theory (example: Thermodynamics)

```
@Thermodynamics theory 32768 deterministic
    @_ Load $ScientificTheory

    # ============ QUANTITIES ============

    @Temperature:Temperature __Quantity
    @Pressure:Pressure __Quantity
    @Volume:Volume __Quantity
    @Entropy:Entropy __Quantity
    @InternalEnergy:InternalEnergy __Quantity
    @Heat:Heat __Quantity
    @Work:Work __Quantity
    @Efficiency:Efficiency __Quantity

    # ============ SYSTEM TYPES ============

    @System:System __Category
    @IsolatedSystem:IsolatedSystem __Category
    @ClosedSystem:ClosedSystem __Category
    @OpenSystem:OpenSystem __Category
    @subclass IsolatedSystem ClosedSystem

    # ============ THE LAWS ============

    @zerothLaw law "Zeroth Law of Thermodynamics"
        AllSystems
        (implies (and (thermalEquilibrium ?A ?B)
                      (thermalEquilibrium ?B ?C))
                 (thermalEquilibrium ?A ?C))
        Always

end
```

The central requirement for this pattern is not a particular encoding of the full laws, but that:

1) claims are represented in the same term space,
2) contradictions can be proven as explicit inconsistency, and
3) proofs can be elaborated into review-friendly reports.

---

## 4. Claim validation (sketch)

Workflow:

1) load the target theory (e.g., `Thermodynamics`),
2) assert a claim or observation,
3) run a validation query that attempts to prove consistency, or to prove a contradiction.

The expected output is a structured “review report”:

- which law(s) are implicated,
- what assumptions were required,
- whether the claim is consistent / inconsistent / undecidable with the current theory base,
- recommended follow-ups (evidence needed, measurement checks, missing premises).

---

## 5. Cross-theory connection discovery (sketch)

If multiple theories are loaded, the system can search for bridges between concepts, such as:

- equivalences, generalizations, analogies,
- shared mathematical structure (e.g., Gibbs vs Shannon forms),
- known bridging principles (e.g., Landauer’s principle).

```javascript
session.learn(`
    @_ Load $Thermodynamics
    @_ Load $StatisticalMechanics
    @_ Load $InformationTheory
    @_ Load $QuantumMechanics
`);

const connections = session.query(`
    @links relatedConcepts Entropy ?otherConcept ?throughRelation
`);
```

This is a research feature: it depends on how “relatedConcepts” and bridging relations are defined in the loaded theories.

---

## 6. Hypothesis exploration (“what if”) (sketch)

```javascript
const hypothesis = session.learn(`
    @hyp exists ?system (lessThan (Temperature ?system) AbsoluteZero)
`);

const exploration = session.prove(`
    @implications whatFollowsFrom $hyp Thermodynamics
`);
```

The intended output is not only whether the hypothesis is consistent, but a structured implication tree with citations to supporting laws and assumptions.

---

## 7. Notes

This DS is research-level. If promoted to runtime:

- the theory vocab must be precise and canonicalized (operators for math/relations need explicit semantics),
- “review reports” should be deterministic and testable (audit-trace style),
- contradiction handling must be explicit about assumptions and closed/open-world settings.
