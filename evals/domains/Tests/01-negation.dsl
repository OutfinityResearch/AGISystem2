# Tests - Negation Primitive
# Verifies the functionality of the L0 ___Not primitive.

@_:NegationTests isA TestSuite NegationTests

@TestNegation:testNegation graph
    # 1. Create a base vector
    @A ___NewVector "BaseVector" "Test"
    
    # 2. Negate it
    @notA ___Not $A
    
    # 3. Verify A is NOT similar to notA (Distance should be 1.0 for binary complement)
    @sim ___Similarity $A $notA
    # For dense binary, sim(A, ~A) = 0.0
    
    # 4. Double negation
    @notNotA ___Not $notA
    @simDouble ___Similarity $A $notNotA
    # should be 1.0
    
    @result __Bundle $sim $simDouble
    return $result
end
