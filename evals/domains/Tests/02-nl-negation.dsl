# Test NL Negation Integration
# Verifies that the high-level @not macro (used by NL translation)
# includes the low-level ___Not logical primitive.

@_:NLNegationTests isA TestSuite NLNegationTests

@TestNLNegation:testNLNegation graph
    # 1. Create concept A
    @A ___NewVector "ConceptA" "Test"

    # 2. Apply "NL" negation (the logic macro)
    @notA not $A

    # 3. Create explicit logical negation for comparison
    @trueNotA ___Not $A

    # 4. Verify that the "NL" negation contains the logical negation
    # Since we plan to BUNDLE them, the similarity should be high (or at least non-zero)
    # If @not is just symbolic (Not * A), it is orthogonal to ~A (in dense binary)
    
    @sim ___Similarity $notA $trueNotA
    
    # We expect this to FAIL (sim ~ 0) before the fix, and PASS (sim > 0.4) after.
    # (Similarity of Bundle(X, Y) to X is usually > 0.5)

    @result GreaterThan $sim 0.4
    return $result
end
