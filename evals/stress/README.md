# Stress Tests - Domain Application Examples

## Philosophy

Stress test files in this directory are **APPLICATIONS** of the core theories, NOT part of the core theory itself. They demonstrate how domain-specific knowledge can be built on top of the foundational theories in `config/`.

## Vocabulary Responsibility

**Each stress test MUST define its own domain-specific vocabulary.**

### What's in Core (`config/Core/`):
- Universal operators: `__Role`, `__Pair`, `__Bundle`, `And`, `Or`, `Not`, `forall`
- Universal relations: `isA`, `partOf`, `causes`
- Foundational constructs: `__Event`, `__State`, `__Property`

### What's in Domain Foundations (`config/Domain/01-relations.sys2`):
- **ONLY FUNDAMENTAL operators** reused across many contexts
- **Biology:** `belongsTo`, `foundIn`, `hasFunction`, `expresses`, `metabolizes`, etc.
- **Math:** `add`, `mult`, `unionOf`, `intersectionOf`, `elementOf`, `isNatural`, `successor`, etc.
- **Medicine:** `hasSymptom`, `diagnoses`, `treats`, `prescribes`, etc.
- **Physics:** `hasQuantity`, `conserves`, `exertsForceOn`, etc.

### What MUST be in Stress Tests:
- **Domain-specific vocabulary** used only in specific contexts
- **Examples:**
  - Biology: `commonName`, `isSubtypeOf`, `containsDNA`, `hasDoubleMembrane`
  - Math: `isPrime`, `divides`, `gcd`, `coprime`, `orderedPair`, `symmetricDiff`
  - Medicine: `isOrgan`, `pumpsBlood`, `exchangesGas`, `filtersBlood`
  - Physics: `hasField`, `fieldStrengthAt`, `negligibleComparedTo`

## Decision Criteria

**Add to `config/Domain/01-relations.sys2` if:**
- ✅ Used in MANY different contexts within the domain
- ✅ Fundamental to the domain's reasoning
- ✅ Would be needed by ANY subdomain or fork

**Define in stress test if:**
- ✅ Specific to this particular application
- ✅ Used only in narrow contexts
- ✅ Could have multiple valid interpretations in different subdomains

## Benefits of This Approach

1. **Modularity:** Core theories stay clean and minimal
2. **Forkability:** Easy to create domain variants without modifying core
3. **Clarity:** Clear separation between foundation and application
4. **Maintainability:** Changes to specific applications don't affect core
5. **Extensibility:** New domains can be added without bloating core

## Example Pattern

```sys2
# ============================================================================
# Stress Test: biology.sys2
# ============================================================================

# Define domain-specific vocabulary AT THE TOP
@commonName:commonName graph organism name
    @org __Role Organism $organism
    @nm __Role CommonName $name
    @naming __Pair $org $nm
    return $naming
end

@isSubtypeOf:isSubtypeOf graph subtype supertype
    @sub __Role Subtype $subtype
    @super __Role Supertype $supertype
    @hierarchy isA $sub $super  # Uses core isA
    return $hierarchy
end

# Now use the vocabulary in application graphs
@:Tiger_Common_Name graph
    @tiger ...
    @name commonName $tiger "Tiger"  # Uses vocabulary defined above
    return $name
end
```

## Current Status

After implementing FUNDAMENTAL operators in domain foundations:

| Domain | Before | After | Reduction |
|--------|--------|-------|-----------|
| Biology | 670 missing | ~650 missing | ~20 fundamentals added |
| Math | 242 missing | 222 missing | 20 fundamentals added |
| Medicine | 303 missing | 298 missing | 5 fundamentals added |

**Remaining missing operators are INTENTIONALLY left for stress tests to define.**

This ensures core theories remain focused on fundamentals while allowing rich, specific applications.
