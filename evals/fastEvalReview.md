# FastEval Review
Generated at: 2025-12-30T15:23:05.277Z
Suites: suite01_foundations, suite02_hierarchies, suite03_rules, suite04_deep_chains, suite05_negation, suite06_compound_logic, suite07_temporal, suite08_modal, suite09_composition, suite10_integration, suite11_wedding_seating, suite12_fuzzy_matching, suite13_property_inheritance, suite14_meta_queries, suite15_reasoning_macros, suite16_macro_aggregation, suite17_macro_composition, suite18_set_theory, suite19_biology, suite20_predicate_logic, suite21_goat_cabbage_plus, suite22_deduction, suite23_tool_planning, suite24_contradictions, suite25_ruletaker_bugs, suite26_compound_conclusions, suite27_contrapositive_negation, suite28_induction, suite29_explain_abduce_whatif
Actions reviewed: prove, query
LLM critique: enabled (model=gpt-4o-mini)

## suite01_foundations - Foundations
Basic operations with deep chains and complete proofs

## suite02_hierarchies - Type Hierarchies
Deep isA chains with property inheritance and complete proofs

### Case 4 (prove)
- NL: Does Poodle exist? (8-level inheritance: Poodle→...→Entity + hasProperty Entity Exists)
- NL (normalized for translation): Does Poodle exist?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (prove)
- NL: Does Poodle breathe? (7-level inheritance)
- NL (normalized for translation): Does Poodle breathe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is Poodle mortal? (6-level inheritance)
- NL (normalized for translation): Poodle is a mortal.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does Poodle have a spine? (5-level inheritance)
- NL (normalized for translation): Does Poodle have a spine?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (query)
- NL: What is a Poodle?
- NL (normalized for translation): What is a Poodle?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite03_rules - Rule Inference
Implies rules with deep hierarchies and complete proof traces

### Case 5 (prove)
- NL: Is John a suspect? (has Motive AND has Opportunity, both verified)
- NL (normalized for translation): John is a suspect.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is Mary a suspect? (has Motive but NOT Opportunity)
- NL (normalized for translation): Mary is a suspect.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Is Alice capable? (canPay→canPurchase→canOwn→canUse→isCapable)
- NL (normalized for translation): Alice is a capable.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (query)
- NL: Who can pay?
- NL (normalized for translation): Who can pay?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite04_deep_chains - Deep Transitive Chains
Stress test 6-10 step transitive reasoning

### Case 2 (prove)
- NL: Is Paris located in the Universe?
- NL (normalized for translation): Is Paris located in the Universe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Is Paris in the MilkyWay?
- NL (normalized for translation): Is Paris in the MilkyWay?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does Pollution cause Conflict?
- NL (normalized for translation): Does Pollution cause Conflict?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Is Antiquity before AI?
- NL (normalized for translation): Is Antiquity before AI?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (query)
- NL: What is Paris?
- NL (normalized for translation): What is Paris?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (query)
- NL: Where is Paris located?
- NL (normalized for translation): Where is Paris located?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 12 (query)
- NL: What causes Conflict?
- NL (normalized for translation): What causes Conflict?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Is AI before Antiquity? (reverse order - should fail)
- NL (normalized for translation): Is AI before Antiquity?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite05_negation - Negation & Exceptions
Negation blocking with deep chains and complete proofs

### Case 8 (prove)
- NL: Is Alice a Human? (Alice→Professional→Worker→Adult→Person→Human)
- NL (normalized for translation): Alice is a Human.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Is Bob a good driver? (has violations, And condition fails)
- NL (normalized for translation): Is Bob a good driver?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Can a Rock fly? (not in KB)
- NL (normalized for translation): Can a Rock fly?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite06_compound_logic - Compound Logic
Complex And/Or/Not with deep chains and complete proofs

### Case 2 (prove)
- NL: Is John guilty? (has Motive AND Opportunity AND Means)
- NL (normalized for translation): John is a guilty.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Is Mary guilty? (missing Means)
- NL (normalized for translation): Mary is a guilty.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Is Charlie guilty? (only has Motive)
- NL (normalized for translation): Charlie is a guilty.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (query)
- NL: Who can pay?
- NL (normalized for translation): Who can pay?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (prove)
- NL: Is Dave at LeadershipLvl? (9-step chain)
- NL (normalized for translation): Is Dave at LeadershipLvl?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (prove)
- NL: Is Sally at LeadershipLvl? (5-step chain)
- NL (normalized for translation): Is Sally at LeadershipLvl?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 17 (prove)
- NL: Can Dave get promoted? (Performance AND Tenure)
- NL (normalized for translation): Can Dave get promoted?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 18 (prove)
- NL: Can Sally get promoted? (missing Tenure)
- NL (normalized for translation): Can Sally get promoted?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite07_temporal - Temporal & Causal
Deep temporal and causal transitive chains with complete proofs

### Case 2 (prove)
- NL: Was AncientRome before AIAge? (8-step chain)
- NL (normalized for translation): Was AncientRome before AIAge?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Was Medieval before InfoAge? (6-step chain)
- NL (normalized for translation): Was Medieval before InfoAge?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Was Byzantine before Industrial? (5-step chain)
- NL (normalized for translation): Was Byzantine before Industrial?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Does Deforestation cause SocialUnrest? (7-step causal chain)
- NL (normalized for translation): Does Deforestation cause SocialUnrest?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does Flooding cause HealthCrisis? (5-step causal chain)
- NL (normalized for translation): Does Flooding cause HealthCrisis?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Would preventing Deforestation prevent Flooding? (rule application)
- NL (normalized for translation): Would preventing Deforestation prevent Flooding?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Would preventing Erosion prevent FoodShortage? (rule application)
- NL (normalized for translation): Would preventing Erosion prevent FoodShortage?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 12 (prove)
- NL: Is AIAge before AncientRome? (reverse temporal - should fail)
- NL (normalized for translation): Is AIAge before AncientRome?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Does SocialUnrest cause Deforestation? (reverse causal - should fail)
- NL (normalized for translation): Does SocialUnrest cause Deforestation?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (query)
- NL: What does Deforestation cause?
- NL (normalized for translation): What does Deforestation cause?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite08_modal - Modal Reasoning
Deep modal operators with type hierarchies and complete proofs

### Case 8 (prove)
- NL: Is DrJones an Adult? (6-step chain)
- NL (normalized for translation): DrJones is a Adult.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Must DrJones help patients? (obligation via 4-step Doctor inheritance)
- NL (normalized for translation): Must DrJones help patients?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Must DrJones follow ethics? (obligation via 5-step Professional inheritance)
- NL (normalized for translation): Must DrJones follow ethics?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Must DrJones follow law? (obligation via 7-step Adult inheritance)
- NL (normalized for translation): Must DrJones follow law?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (prove)
- NL: Must Rock follow law? (Rock not in KB)
- NL (normalized for translation): Must Rock follow law?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 17 (query)
- NL: Who can think?
- NL (normalized for translation): Who can think?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite09_composition - Compositional Reasoning
Deep property inheritance and multi-role composition with complete proofs

### Case 3 (prove)
- NL: Does GoldenRetriever exist? (9-level inheritance from Entity)
- NL (normalized for translation): Does GoldenRetriever exist?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Does GoldenRetriever metabolize? (8-level inheritance)
- NL (normalized for translation): Does GoldenRetriever metabolize?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (prove)
- NL: Is GoldenRetriever sentient? (7-level inheritance)
- NL (normalized for translation): GoldenRetriever is a sentient.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is GoldenRetriever warm-blooded? (5-level inheritance)
- NL (normalized for translation): Is GoldenRetriever warm-blooded?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Is GoldenRetriever intelligent? (deep chained rules)
- NL (normalized for translation): GoldenRetriever is a intelligent.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Can Sarah do clinical trials? (chained multi-role)
- NL (normalized for translation): Can Sarah do clinical trials?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (prove)
- NL: Can Rock do clinical trials? (not in KB)
- NL (normalized for translation): Can Rock do clinical trials?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (query)
- NL: What is Sarah?
- NL (normalized for translation): What is Sarah?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite10_integration - Complex Integration
Multi-domain with all operators and deep chains

### Case 6 (prove)
- NL: Is Complaint before Sentencing? (6-step temporal chain)
- NL (normalized for translation): Is Complaint before Sentencing?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Is Filing before Verdict? (5-step temporal chain)
- NL (normalized for translation): Is Filing before Verdict?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Does Crime cause Trial? (5-step causal chain)
- NL (normalized for translation): Does Crime cause Trial?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Does DistrictCourt appeal to SupremeCourt? (2-step appeal chain)
- NL (normalized for translation): Does DistrictCourt appeal to SupremeCourt?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Does Trial cause Crime? (reverse causation - should fail)
- NL (normalized for translation): Does Trial cause Crime?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (prove)
- NL: Is Sentencing before Complaint? (reverse temporal - should fail)
- NL (normalized for translation): Is Sentencing before Complaint?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (query)
- NL: What symptoms does Patient1 have?
- NL (normalized for translation): What symptoms does Patient1 have?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (query)
- NL: What can DrSmith do?
- NL (normalized for translation): What can DrSmith do?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite11_wedding_seating - Wedding Seating CSP


## suite12_fuzzy_matching - Fuzzy Matching
Approximate matching with deep chains and complete proofs

### Case 7 (prove)
- NL: Is Paris in SolarSystem? (7-step geographic chain via HDC)
- NL (normalized for translation): Is Paris in SolarSystem?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Is Paris in Europe? (5-step geographic chain)
- NL (normalized for translation): Is Paris in Europe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Is Berlin in Europe? (5-step geographic chain)
- NL (normalized for translation): Is Berlin in Europe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Is Rex in Europe? (cross-hierarchy - should fail)
- NL (normalized for translation): Is Rex in Europe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (query)
- NL: What is in Europe?
- NL (normalized for translation): What is in Europe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (query)
- NL: What does Car have?
- NL (normalized for translation): What does Car have?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite13_property_inheritance - Property Inheritance
Cross-relation inheritance through deep isA hierarchies with complete proofs

### Case 5 (prove)
- NL: Does Rex have fur? (8-step inheritance from Mammal)
- NL (normalized for translation): Does Rex have fur?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Does Rex have a spine? (9-step inheritance from Vertebrate)
- NL (normalized for translation): Does Rex have a spine?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does Rex have cells? (10-step inheritance from Animal)
- NL (normalized for translation): Does Rex have cells?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Does Rex have DNA? (11-step inheritance from LivingThing)
- NL (normalized for translation): Does Rex have DNA?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Does Rex like treats? (5-step inheritance from Dog)
- NL (normalized for translation): Does Rex like treats?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Does Rex know fear? (10-step inheritance from Animal)
- NL (normalized for translation): Does Rex know fear?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Does Tweety have feathers? (5-step inheritance from Bird)
- NL (normalized for translation): Does Tweety have feathers?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (prove)
- NL: Does Tweety like seeds? (5-step inheritance from Bird)
- NL (normalized for translation): Does Tweety like seeds?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 18 (prove)
- NL: Does Whiskers like fish? (4-step inheritance from Cat)
- NL (normalized for translation): Does Whiskers like fish?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 22 (prove)
- NL: Does Opus have feathers? (5-step inheritance, no exception)
- NL (normalized for translation): Does Opus have feathers?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 25 (query)
- NL: What can Rex do?
- NL (normalized for translation): What can Rex do?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 26 (query)
- NL: What can Tweety do or have from birds?
- NL (normalized for translation): What can Tweety do or have from birds?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 27 (query)
- NL: List inherited likes for Whiskers.
- NL (normalized for translation): List inherited likes for Whiskers.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite14_meta_queries - Meta-Query Operators
Similar, analogy, difference, induce, bundle with ranked answers and traces

### Case 2 (query)
- NL: What is similar to a Hammer?
- NL (normalized for translation): What is similar to a Hammer?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (query)
- NL: What is similar to a Car?
- NL (normalized for translation): What is similar to a Car?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (query)
- NL: What is similar to a Sparrow?
- NL (normalized for translation): What is similar to a Sparrow?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 5 (query)
- NL: Truck is to Haul as Bicycle is to what?
- NL (normalized for translation): Truck is to Haul as Bicycle is to what?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 6 (query)
- NL: Paris is to France as Berlin is to what?
- NL (normalized for translation): Paris is to France as Berlin is to what?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (query)
- NL: Bird is to Fly as Fish is to what?
- NL (normalized for translation): Bird is to Fly as Fish is to what?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 8 (query)
- NL: What distinguishes a Car from a Truck?
- NL (normalized for translation): What distinguishes a Car from a Truck?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 9 (query)
- NL: What distinguishes a Hammer from a Screwdriver?
- NL (normalized for translation): What distinguishes a Hammer from a Screwdriver?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (query)
- NL: What distinguishes a Car from a Bicycle?
- NL (normalized for translation): What distinguishes a Car from a Bicycle?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 11 (query)
- NL: Bundle Sparrow and Hawk: what can the bundle do?
- NL (normalized for translation): Bundle Sparrow and Hawk: what can the bundle do?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 12 (query)
- NL: Induce common properties of Fish and Trout.
- NL (normalized for translation): Induce common properties of Fish and Trout.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 13 (query)
- NL: Induce common properties of Sparrow and Hawk.
- NL (normalized for translation): Induce common properties of Sparrow and Hawk.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 14 (query)
- NL: Car is to Engine as Bicycle is to what?
- NL (normalized for translation): Car is to Engine as Bicycle is to what?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (query)
- NL: Bundle vehicles Car, Truck, Bicycle: what properties remain shared?
- NL (normalized for translation): Bundle vehicles Car, Truck, Bicycle: what properties remain shared?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 16 (query)
- NL: What is similar to QuarkX?
- NL (normalized for translation): What is similar to QuarkX?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [high] proof_clarity: Proof clarity issues: missing_proof_prefix

## suite15_reasoning_macros - Reasoning Macros & Defaults
Abduction, counterfactual, default/exception, deduce/analogy stress cases

### Case 2 (query)
- NL: Why is the grass wet and the sidewalk wet?
- NL (normalized for translation): Why is the grass wet and the sidewalk wet?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (query)
- NL: What if Rain did not occur?
- NL (normalized for translation): What if Rain did not occur?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 4 (query)
- NL: What if the power outage did not happen?
- NL (normalized for translation): What if the power outage did not happen?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 6 (prove)
- NL: Can Hawk fly under default rule?
- NL (normalized for translation): Can Hawk fly under default rule?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (query)
- NL: Planet:Sun :: Electron: ?
- NL (normalized for translation): Planet:Sun :: Electron: ?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 10 (query)
- NL: Why is the path dry (should reject Rain)?
- NL (normalized for translation): Why is the path dry.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite16_macro_aggregation - Macro Aggregation
Macros that build complex concepts from anonymous facts, then query/prove over outputs.

### Case 5 (prove)
- NL: Does CityPowerDown cause supply chain disruption?
- NL (normalized for translation): Does CityPowerDown cause supply chain disruption?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is CityPowerDown before ReliefDeployment?
- NL (normalized for translation): Is CityPowerDown before ReliefDeployment?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Must TeamAlpha assist?
- NL (normalized for translation): Must TeamAlpha assist?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Is CityPowerDown in SafeZone?
- NL (normalized for translation): Is CityPowerDown in SafeZone?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (query)
- NL: What entities are hazards?
- NL (normalized for translation): What entities are hazards?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Does VirusX cause hospitalization?
- NL (normalized for translation): Does VirusX cause hospitalization?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Does VirusX cause a public health emergency?
- NL (normalized for translation): Does VirusX cause a public health emergency?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 12 (query)
- NL: What causes supply chain disruption?
- NL (normalized for translation): What causes supply chain disruption?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Does VirusY cause a public health emergency?
- NL (normalized for translation): Does VirusY cause a public health emergency?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite17_macro_composition - Macro Composition
Sys2DSL graph execution with hidden internals and explicit proofs over outputs

### Case 4 (prove)
- NL: Must TeamAlpha coordinate?
- NL (normalized for translation): Must TeamAlpha coordinate?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (prove)
- NL: Must TeamAlpha train?
- NL (normalized for translation): Must TeamAlpha train?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is Planning before Completion?
- NL (normalized for translation): Is Planning before Completion?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Is TeamAlpha located in ReactorSite?
- NL (normalized for translation): Is TeamAlpha located in ReactorSite?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (query)
- NL: What must TeamAlpha do?
- NL (normalized for translation): What must TeamAlpha do?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Does SupplierA cause ProductReady?
- NL (normalized for translation): Does SupplierA cause ProductReady?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Does QA cause Exportable?
- NL (normalized for translation): Does QA cause Exportable?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (query)
- NL: What products are in the supply chain?
- NL (normalized for translation): What products are in the supply chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 12 (prove)
- NL: Does SupplierB cause ProductReady?
- NL (normalized for translation): Does SupplierB cause ProductReady?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite18_set_theory - Axiomatic Set Theory
Subset transitivity and element propagation with multi-step proofs

### Case 2 (prove)
- NL: Is SetA a subset of SetD?
- NL (normalized for translation): Is SetA a subset of SetD?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Does x belong to SetC?
- NL (normalized for translation): Does x belong to SetC?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Is y in Universe via subset chain?
- NL (normalized for translation): Is y in Universe via subset chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (query)
- NL: List all sets that contain x.
- NL (normalized for translation): List all sets that contain x.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Is x in SetZ (unrelated)?
- NL (normalized for translation): Is x in SetZ.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: Are Alpha and Beta equal sets?
- NL (normalized for translation): Are Alpha and Beta equal sets?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Is x in the intersection of SetA and SetB?
- NL (normalized for translation): Is x in the intersection of SetA and SetB?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite19_biology - Biological Pathways
Taxonomy + metabolism + causal chains with proofs

### Case 5 (prove)
- NL: Does glucose cause ATP production?
- NL (normalized for translation): Does glucose cause ATP production?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (query)
- NL: What does glucose cause in the pathway?
- NL (normalized for translation): What does glucose cause in the pathway?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Does VirusX cause organ failure?
- NL (normalized for translation): Does VirusX cause organ failure?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Does DrugD cause ElectronTransport?
- NL (normalized for translation): Does DrugD cause ElectronTransport?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite20_predicate_logic - Predicate Logic
Logical implication chains and conjunction rules with proofs

### Case 2 (prove)
- NL: Does P imply S via chain?
- NL (normalized for translation): Does P imply S via chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Does R hold given P holds?
- NL (normalized for translation): Does R hold given P holds?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Does S hold?
- NL (normalized for translation): Does S hold?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (prove)
- NL: Does T hold given P and S both hold?
- NL (normalized for translation): Does T hold given P and S both hold?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (query)
- NL: What does P imply?
- NL (normalized for translation): What does P imply?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does W hold?
- NL (normalized for translation): Does W hold?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Must Plato die?
- NL (normalized for translation): Must Plato die?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Is Socrates buried?
- NL (normalized for translation): Socrates is a buried.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (prove)
- NL: Is it impossible for something to be both a plant and a mushroom?
- NL (normalized for translation): Is it impossible for something to be both a plant and a mushroom?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (prove)
- NL: Does there exist a pet that is also a rabbit?
- NL (normalized for translation): Does there exist a pet that is also a rabbit?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite21_goat_cabbage_plus - Wolf-Goat-Cabbage Plus
River crossing puzzle with conflict rules and state reasoning

### Case 3 (prove)
- NL: Does Wolf conflict with Goat?
- NL (normalized for translation): Does Wolf conflict with Goat?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: Is Left bank currently safe?
- NL (normalized for translation): Is Left bank currently safe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 5 (query)
- NL: What is on the Left bank?
- NL (normalized for translation): What is on the Left bank?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (query)
- NL: What conflict pairs exist?
- NL (normalized for translation): What conflict pairs exist?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Does Goat conflict with Cabbage?
- NL (normalized for translation): Does Goat conflict with Cabbage?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (prove)
- NL: What is the boat capacity?
- NL (normalized for translation): What is the boat capacity?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (query)
- NL: What animals are in the puzzle?
- NL (normalized for translation): What animals are in the puzzle?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (prove)
- NL: Must Farmer be in the boat to cross?
- NL (normalized for translation): Must Farmer be in the boat to cross?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: Demonstrate the solution logic: Is the initial state safe?
- NL (normalized for translation): Demonstrate the solution logic: Is the initial state safe?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (query)
- NL: How many steps are in the computed plan?
- NL (normalized for translation): How many steps are in the computed plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 14 (query)
- NL: What is step 1 of the computed plan?
- NL (normalized for translation): What is step 1 of the computed plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (query)
- NL: What is step 7 of the computed plan?
- NL (normalized for translation): What is step 7 of the computed plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (query)
- NL: Verify the computed plan by simulating it over requires/causes/prevents.
- NL (normalized for translation): Verify the computed plan by simulating it over requires/causes/prevents.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 18 (query)
- NL: How many steps are in the intermediate-state plan?
- NL (normalized for translation): How many steps are in the intermediate-state plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 19 (query)
- NL: What is step 1 of the intermediate-state plan?
- NL (normalized for translation): What is step 1 of the intermediate-state plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 20 (query)
- NL: Verify that the intermediate-state plan is valid.
- NL (normalized for translation): Verify that the intermediate-state plan is valid.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 22 (query)
- NL: How many steps are in the later intermediate-state plan?
- NL (normalized for translation): How many steps are in the later intermediate-state plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 23 (query)
- NL: What is step 1 of the later intermediate-state plan?
- NL (normalized for translation): What is step 1 of the later intermediate-state plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 24 (query)
- NL: Verify that the intermediate-state plan is valid.
- NL (normalized for translation): Verify that the intermediate-state plan is valid.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite22_deduction - Deduction
Forward-chaining deduction through complex theories and rule chains

### Case 2 (query)
- NL: What effects follow from Inflation through the causal chain?
- NL (normalized for translation): What effects follow from Inflation through the causal chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (query)
- NL: What does CO2 emission cause through the climate chain?
- NL (normalized for translation): What does CO2 emission cause through the climate chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (query)
- NL: What type categories include Dog transitively?
- NL (normalized for translation): What type categories include Dog transitively?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (query)
- NL: What does a Virus cause through the medical chain?
- NL (normalized for translation): What does a Virus cause through the medical chain?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 10 (query)
- NL: What follows from RawMaterial with limited depth?
- NL (normalized for translation): What follows from RawMaterial with limited depth?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite23_tool_planning - Tool-Usage Planning
Graph-defined tool steps + planning for multiple goals with parameterized tool usage.

### Case 2 (query)
- NL: Verify the learning-report plan is valid by simulating it.
- NL (normalized for translation): Verify the learning-report plan is valid by simulating it.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (query)
- NL: How many steps are in the learning-report plan?
- NL (normalized for translation): How many steps are in the learning-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (query)
- NL: What is step 1 of the learning-report plan?
- NL (normalized for translation): What is step 1 of the learning-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 5 (query)
- NL: What tool is used at step 1 (with parameters)?
- NL (normalized for translation): What tool is used at step 1.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (query)
- NL: What is step 2 of the learning-report plan?
- NL (normalized for translation): What is step 2 of the learning-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (query)
- NL: What tool is used at step 2 (with parameters)?
- NL (normalized for translation): What tool is used at step 2.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 8 (query)
- NL: What is step 3 of the learning-report plan?
- NL (normalized for translation): What is step 3 of the learning-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (query)
- NL: What tool is used at step 3 (with parameters)?
- NL (normalized for translation): What tool is used at step 3.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (query)
- NL: Verify the eval-report plan is valid by simulating it.
- NL (normalized for translation): Verify the eval-report plan is valid by simulating it.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 12 (query)
- NL: How many steps are in the eval-report plan?
- NL (normalized for translation): How many steps are in the eval-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (query)
- NL: What is step 1 of the eval-report plan?
- NL (normalized for translation): What is step 1 of the eval-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 14 (query)
- NL: What tool is used at step 1 (with parameters)?
- NL (normalized for translation): What tool is used at step 1.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 15 (query)
- NL: What is step 2 of the eval-report plan?
- NL (normalized for translation): What is step 2 of the eval-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (query)
- NL: What tool is used at step 2 (with parameters)?
- NL (normalized for translation): What tool is used at step 2.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 17 (query)
- NL: What is step 3 of the eval-report plan?
- NL (normalized for translation): What is step 3 of the eval-report plan?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 18 (query)
- NL: What tool is used at step 3 (with parameters)?
- NL (normalized for translation): What tool is used at step 3.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite24_contradictions - Contradictions & Atomic Learn
Reject hard contradictions with proof + keep session unpolluted (transaction rollback)

### Case 3 (prove)
- NL: Door is still Open (the rejected learn did not change KB)
- NL (normalized for translation): Door is still Open.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 4 (prove)
- NL: Door is not in Kitchen (the rejected learn did not partially apply)
- NL (normalized for translation): Door is not in Kitchen.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 7 (prove)
- NL: Door is not in Attic (the rejected indirect learn did not partially apply)
- NL (normalized for translation): Door is not in Attic.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: A is still before B (the rejected learn did not change KB)
- NL (normalized for translation): A is still before B.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 14 (prove)
- NL: X does not cause Y (the rejected learn did not partially apply)
- NL (normalized for translation): X does not cause Y.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 19 (prove)
- NL: Foo does not cause Bar (the rejected learn did not partially apply)
- NL (normalized for translation): Foo does not cause Bar.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 22 (prove)
- NL: Tea is not in Cupboard (the rejected inherited-contradiction learn did not partially apply)
- NL (normalized for translation): Tea is not in Cupboard.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 25 (prove)
- NL: Foo is not in Bar (the rejected operator-alias contradiction learn did not partially apply)
- NL (normalized for translation): Foo is not in Bar.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 28 (prove)
- NL: Tea is now in Cupboard2 (successful learn applied fully)
- NL (normalized for translation): Tea is now in Cupboard2.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 29 (prove)
- NL: Tea is Hot (successful learn applied fully)
- NL (normalized for translation): Tea is Hot.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

## suite25_ruletaker_bugs - RuleTaker Bugs
Confirmed critical reasoning bugs from RuleTaker benchmark

### Case 2 (prove)
- NL: Verify: Harry is big (positive fact exists)
- NL (normalized for translation): Verify: Harry is big.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 3 (prove)
- NL: BUG #1: Not(Harry big) should be UNPROVABLE (Harry IS big!)
- NL (normalized for translation): BUG #1: Not.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (prove)
- NL: CWA: Not(Zed big) should be PROVABLE (Zed big is absent)
- NL (normalized for translation): CWA: Not.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 6 (prove)
- NL: Verify: Charlie is quiet (antecedent is TRUE)
- NL (normalized for translation): Verify: Charlie is quiet.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 7 (prove)
- NL: BUG #2: Charlie round via modus ponens (quiet->round, quiet=TRUE)
- NL (normalized for translation): BUG #2: Charlie round via modus ponens.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 9 (prove)
- NL: Sanity: Bob green via variable rule (THIS WORKS)
- NL (normalized for translation): Sanity: Bob green via variable rule.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 11 (prove)
- NL: BUG #3: Dave frozen via ground modus ponens (should work but fails)
- NL (normalized for translation): BUG #3: Dave frozen via ground modus ponens.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 13 (prove)
- NL: Verify: Tom is smart (positive)
- NL (normalized for translation): Verify: Tom is smart.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.
  - [medium] proof_clarity: Proof clarity issues: proof_too_short

### Case 14 (prove)
- NL: Sanity: Not(Tom smart) correctly unprovable (Tom IS smart)
- NL (normalized for translation): Sanity: Not.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 16 (prove)
- NL: BUG #4: Water frozen should be UNPROVABLE (Water is not cold)
- NL (normalized for translation): BUG #4: Water frozen should be UNPROVABLE.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite26_compound_conclusions - Compound Conclusions
Prove/query against leaf conclusions inside And/Or consequents

### Case 2 (prove)
- NL: BUG001 regression: prove leaf (Zumpus) from And consequent.
- NL (normalized for translation): BUG001 regression: prove leaf.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (prove)
- NL: Also prove the other leaf (Impus) from the same And consequent.
- NL (normalized for translation): Also prove the other leaf.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (query)
- NL: Query: who is a zumpus?
- NL (normalized for translation): who is a zumpus?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## suite27_contrapositive_negation - Contrapositive Negation
Derive Not(antecedent) from Not(conclusion) and remaining antecedents

## suite28_induction - Induction
Type-level induction for missing hasProperty queries

## suite29_explain_abduce_whatif - Explain + Abduce + Whatif
Multi-step causal chain with explain/abduce/whatif outputs and proof text.

### Case 2 (query)
- NL: Explain why Storm causes Injury (requires multi-step transitive reasoning).
- NL (normalized for translation): Explain why Storm causes Injury.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 3 (query)
- NL: Counterfactual: if Storm did not occur, would Injury still occur?
- NL (normalized for translation): Counterfactual: if Storm did not occur, would Injury still occur?
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

### Case 4 (query)
- NL: Abduce plausible explanations for Injury (should include direct and upstream causes).
- NL (normalized for translation): Abduce plausible explanations for Injury.
- Issues:
  - [high] nl_dsl_mismatch: Generated DSL differs from canonical DSL and does not reproduce expected output.

## LLM Critique
gpt-4o-mini via https://api.openai.com/v1

### suite02_hierarchies Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be more concise. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Poodle Exists",
    "expected_nl": "True: Poodle has Exists.",
    "proof_nl": "Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing is an entity. Entity has Exists. Therefore, Poodle has Exists."
  }
}
```

### suite02_hierarchies Case 5
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a variation of the canonical DSL but maintains the intended meaning. The proof provided is consistent with the canonical output.",
  "suggestions": {}
}
```

### suite02_hierarchies Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is consistent with the intent, and the proof provided is clear and follows the reasoning correctly. No changes are necessary.",
  "suggestions": {}
}
```

### suite02_hierarchies Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Poodle has a spine based on the provided hierarchy. The proof is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite02_hierarchies Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is slightly different from the canonical DSL but does not affect the correctness of the output. The proof and expected natural language outputs align well with the canonical output.",
  "suggestions": {}
}
```

### suite03_rules Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL contains a grammatical error and does not match the canonical DSL. Additionally, the expected NL output is incomplete compared to the canonical output.",
  "suggestions": {
    "generated_dsl": "@goal isSuspect John",
    "expected_nl": "True: John is suspect. Proof: John has a motive. John has an opportunity. And condition satisfied: John has a motive, John has an opportunity. Applied rule: IF ((John has a motive) AND (John has an opportunity)) THEN (John is suspect). Therefore John is suspect.",
    "proof_nl": [
      "John has a motive",
      "John has an opportunity",
      "And condition satisfied: John has a motive, John has an opportunity",
      "Applied rule: IF ((John has a motive) AND (John has an opportunity)) THEN (John is suspect)",
      "Therefore John is suspect"
    ]
  }
}
```

### suite03_rules Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is slightly incorrect but does not affect the overall proof process. The canonical output and proof are consistent with the input.",
  "suggestions": {}
}
```

### suite03_rules Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL contains a typo and does not match the canonical DSL. Additionally, the proof_nl could be clearer and more concise.",
  "suggestions": {
    "generated_dsl": "@goal isCapable Alice",
    "proof_nl": [
      "Value-type inheritance: inferred Alice has a paymentmethod",
      "IF (Alice has a paymentmethod) THEN (Alice can Pay)",
      "IF (Alice can Use) THEN (Alice is isCapable)",
      "Therefore, Alice is isCapable."
    ]
  }
}
```

### suite03_rules Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is consistent with the canonical DSL, and the outputs match the expected results. The proof is clear and follows logically from the provided information.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 2
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output correctly confirms that Paris is located in the Universe and provides a valid proof chain. The proof is clear and follows a logical sequence.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Paris is in the Milky Way and provides a valid proof chain. The generated output aligns with the expected results.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that pollution causes conflict and provides a clear causal chain. The proof is consistent with the canonical output.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that Antiquity is before AI with a clear proof chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a valid transformation of the canonical DSL, and the outputs match the expected natural language responses. The proof is clear and follows logically from the facts.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 11
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a less clear representation of the input NL compared to the canonical DSL, but it does not affect the overall correctness of the output. The proof and expected NL are consistent with the canonical output.",
  "suggestions": {}
}
```

### suite04_deep_chains Case 12
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has a minor grammatical issue, and the proof_nl could be clearer by explicitly stating the causal relationships leading to each conclusion. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q causes ?what Conflict",
    "expected_nl": [
      "Migration causes Conflict.",
      "Famine causes Conflict.",
      "CropFailure causes Conflict.",
      "Drought causes Conflict.",
      "ClimateChange causes Conflict.",
      "Pollution causes Conflict."
    ],
    "proof_nl": [
      "Fact in KB: Migration causes Conflict.",
      "Famine causes Migration.",
      "Therefore Famine causes Conflict.",
      "CropFailure causes Famine.",
      "Therefore CropFailure causes Conflict.",
      "Drought causes CropFailure.",
      "Therefore Drought causes Conflict.",
      "ClimateChange causes Drought.",
      "Therefore ClimateChange causes Conflict.",
      "Pollution causes ClimateChange.",
      "Therefore Pollution causes Conflict."
    ]
  }
}
```

### suite04_deep_chains Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that the statement cannot be proven based on the available knowledge base. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite05_negation Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL contains a typo ('Lice' instead of 'Alice'), which affects the translation accuracy. Additionally, the proof_nl could be more concise and structured.",
  "suggestions": {
    "generated_dsl": "@goal isA Alice Human",
    "proof_nl": "Alice isA Professional. Professional isA Worker. Worker isA Adult. Adult isA Person. Therefore, Alice isA Human."
  }
}
```

### suite05_negation Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that Bob cannot be proven to be a good driver based on the provided conditions. The proof steps are clear and align with the canonical output.",
  "suggestions": {}
}
```

### suite05_negation Case 11
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that the proof cannot be established due to the missing antecedent. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be more concise. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal isGuilty John",
    "expected_nl": "True: John is guilty.",
    "proof_nl": [
      "John has a motive",
      "John has an opportunity",
      "John has a means",
      "IF (((John has a motive) AND (John has an opportunity)) AND (John has a means)) THEN (John is guilty)",
      "Therefore John is guilty"
    ]
  }
}
```

### suite06_compound_logic Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is slightly incorrect but does not affect the overall proof. The canonical output and proof are consistent with the input.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is slightly incorrect but does not affect the overall proof process. The canonical output and proof are consistent with the input.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is consistent with the canonical DSL, and the outputs match the expected results. The proof provided is clear and supports the conclusions drawn.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 15
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated proof correctly follows the transitive chain of levels leading to the conclusion that Dave is a leadership level. The canonical output and expected natural language align well with the proof provided.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 16
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Sally is at LeadershipLvl with a clear proof chain. The output is consistent with the expected results.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 17
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Dave can get promoted based on the provided conditions. The proof is clear and follows a logical structure.",
  "suggestions": {}
}
```

### suite06_compound_logic Case 18
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the input and the proof provided. The reasoning is clear and follows the logical steps correctly.",
  "suggestions": {}
}
```

### suite07_temporal Case 2
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that AncientRome is before AIAge with a clear proof chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite07_temporal Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that the Medieval period is before the Information Age, providing a clear proof chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite07_temporal Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Byzantine is before Industrial and provides a clear proof chain. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite07_temporal Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that deforestation causes social unrest through a clear 7-step causal chain. The outputs align well with the expected results.",
  "suggestions": {}
}
```

### suite07_temporal Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that flooding causes a health crisis through a clear causal chain. The proof provided aligns well with the expected output.",
  "suggestions": {}
}
```

### suite07_temporal Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the expected NL is incomplete. The proof could also be more concise.",
  "suggestions": {
    "generated_dsl": "@goal wouldPrevent Deforestation Flooding",
    "expected_nl": "True: Preventing Deforestation would prevent Flooding.",
    "proof_nl": [
      "Deforestation causes Erosion",
      "Erosion causes Flooding",
      "Causal chain verified",
      "Therefore Preventing Deforestation would prevent Flooding"
    ]
  }
}
```

### suite07_temporal Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has incorrect syntax and the proof_nl lacks clarity in its presentation. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal prevent Erosion would prevent FoodShortage",
    "expected_nl": "True: Preventing Erosion would prevent FoodShortage.",
    "proof_nl": [
      "Erosion causes Flooding",
      "Flooding causes FoodShortage",
      "Causal chain verified",
      "Applied rule: IF ((Erosion causes Flooding) AND (Flooding causes FoodShortage)) THEN (Preventing Erosion would prevent FoodShortage)",
      "Therefore, Preventing Erosion would prevent FoodShortage."
    ]
  }
}
```

### suite07_temporal Case 12
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the expected output and proof. The reasoning is clear and aligns with the canonical output.",
  "suggestions": {}
}
```

### suite07_temporal Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that SocialUnrest does not cause Deforestation and provides a clear explanation. The proof steps are concise and relevant.",
  "suggestions": {}
}
```

### suite07_temporal Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is not consistent with the canonical DSL, but the canonical output provides a comprehensive causal chain for deforestation. The expected NL aligns with the canonical output.",
  "suggestions": {}
}
```

### suite08_modal Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL contains a typo in the name 'DrJone' instead of 'DrJones', which affects clarity. Additionally, the proof_nl should be more concise and consistent in terminology.",
  "suggestions": {
    "generated_dsl": "@goal isA DrJones Adult",
    "proof_nl": "DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Professional isA Worker. Worker isA Adult."
  }
}
```

### suite08_modal Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent casing and formatting compared to the canonical DSL. Additionally, the proof_nl could be more concise and clearer.",
  "suggestions": {
    "generated_dsl": "@goal DrJones must HelpPatients",
    "proof_nl": [
      "DrJones is a surgeon.",
      "DrJones is a doctor.",
      "IF (DrJones is a doctor) THEN (DrJones must HelpPatients).",
      "Therefore, DrJones must HelpPatients."
    ]
  }
}
```

### suite08_modal Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent capitalization and phrasing compared to the canonical DSL. Additionally, the proof_nl could be clearer and more concise.",
  "suggestions": {
    "input_nl": "Must Dr. Jones follow ethics? (obligation via 5-step Professional inheritance)",
    "proof_nl": [
      "Dr. Jones is a surgeon.",
      "Surgeon is a specialist.",
      "Specialist is a doctor.",
      "Doctor is a medical professional.",
      "Medical professional is a professional.",
      "Dr. Jones is a professional.",
      "Applied rule: IF (Dr. Jones is a professional) THEN (Dr. Jones must FollowEthics).",
      "Therefore, Dr. Jones must FollowEthics."
    ],
    "canonical_dsl": "@goal must DrJones FollowEthics"
  }
}
```

### suite08_modal Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent casing and phrasing compared to the canonical DSL. Additionally, the proof_nl could be clearer and more concise.",
  "suggestions": {
    "generated_dsl": "@goal must DrJones FollowLaw",
    "proof_nl": [
      "DrJones is a surgeon.",
      "DrJones is an adult.",
      "IF (DrJones is an adult) THEN (DrJones must FollowLaw).",
      "Therefore, DrJones must FollowLaw."
    ]
  }
}
```

### suite08_modal Case 15
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation suite correctly identifies that Rock cannot be proven to follow the law due to missing information about Rock's status as an adult. The proof steps are clear and consistent with the reasoning.",
  "suggestions": {}
}
```

### suite08_modal Case 17
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL incorrectly uses 'Who' instead of a variable, which affects the translation accuracy. Additionally, the proof_nl could be more concise and structured.",
  "suggestions": {
    "generated_dsl": "@q can ?x Think",
    "proof_nl": [
      "Socrates is a human.",
      "IF (Socrates is a human) THEN (Socrates can Think).",
      "Therefore, Socrates can Think."
    ]
  }
}
```

### suite09_composition Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a valid representation of the canonical DSL, and the outputs match the expected results. The proof is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite09_composition Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a valid representation of the canonical DSL, and the outputs match the expected results. The proof is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite09_composition Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL incorrectly uses 'isA' instead of 'hasProperty', which affects the translation accuracy. Additionally, the proof_nl could be made clearer by explicitly stating the transitive nature of the reasoning.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty GoldenRetriever Sentient",
    "proof_nl": "1. GoldenRetriever is a retriever. 2. Retriever is a sporting. 3. Sporting is a dog. 4. Dog is a canine. 5. Canine is a carnivore. 6. Carnivore is a mammal. 7. Mammal is a vertebrate. 8. Vertebrate is an animal. 9. Animal has Sentient. 10. Therefore, GoldenRetriever has Sentient."
  }
}
```

### suite09_composition Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that GoldenRetriever is warm-blooded and provides a valid proof chain. The output is consistent with the input and expected results.",
  "suggestions": {}
}
```

### suite09_composition Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL incorrectly uses 'isA' instead of 'hasProperty', which affects the translation accuracy. Additionally, the proof_nl could be more concise and clearer.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty GoldenRetriever Intelligent",
    "proof_nl": [
      "GoldenRetriever has Intelligent",
      "Therefore, GoldenRetriever has Intelligent."
    ]
  }
}
```

### suite09_composition Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly concludes that Sarah can do clinical trials based on the provided proof. The proof is clear and follows a logical structure.",
  "suggestions": {}
}
```

### suite09_composition Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation is consistent and clear, with the proof correctly outlining the missing conditions for the rule. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite09_composition Case 15
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL aligns well with the canonical DSL, and the outputs match the expected results. The proof is clear and follows a logical structure.",
  "suggestions": {}
}
```

### suite10_integration Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that the Complaint is before Sentencing and provides a clear proof chain. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite10_integration Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Filing occurs before Verdict, and the proof provided is clear and follows a logical sequence.",
  "suggestions": {}
}
```

### suite10_integration Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies the causal relationship between Crime and Trial, providing a clear proof of the causal chain. The outputs align well with the expected results.",
  "suggestions": {}
}
```

### suite10_integration Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL structure, and the proof_nl lacks a clear conclusion. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal appealsTo DistrictCourt SupremeCourt",
    "expected_nl": "True: DistrictCourt appeals to SupremeCourt.",
    "proof_nl": [
      "DistrictCourt appeals to AppealsCourt",
      "AppealsCourt appeals to SupremeCourt",
      "Therefore, DistrictCourt appeals to SupremeCourt."
    ]
  }
}
```

### suite10_integration Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that there is no proof for the causation of Trial causing Crime, aligning with the expected output. The proof steps are clear and concise.",
  "suggestions": {}
}
```

### suite10_integration Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that the proof cannot be established due to the absence of relevant facts. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite10_integration Case 15
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more consistent with the canonical output format.",
  "suggestions": {
    "generated_dsl": "@q hasSymptom Patient1 ?symptom",
    "proof_nl": [
      "Fact in KB: Patient1 has fatigue.",
      "Fact in KB: Patient1 has fever.",
      "Fact in KB: Patient1 has cough."
    ]
  }
}
```

### suite10_integration Case 16
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output matches the expected results, and the proof provided is clear and consistent with the canonical output.",
  "suggestions": {}
}
```

### suite12_fuzzy_matching Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Paris is in the Solar System and provides a clear proof chain. The output is consistent with the input and expected results.",
  "suggestions": {}
}
```

### suite12_fuzzy_matching Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Paris is in Europe and provides a clear proof chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite12_fuzzy_matching Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Berlin is in Europe and provides a clear proof chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite12_fuzzy_matching Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "expected",
    "proof"
  ],
  "summary": "The expected natural language output does not match the canonical output, and the proof steps could be clearer. The proof should explicitly state the conclusion derived from the facts.",
  "suggestions": {
    "expected_nl": "Cannot prove: Rex is in Europe. No locatedIn facts for Rex exist in KB.",
    "proof_nl": [
      "No locatedIn facts for Rex exist in KB",
      "Therefore, Rex is not in Europe"
    ]
  }
}
```

### suite12_fuzzy_matching Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL structure, and the proof_nl could be clearer by explicitly stating the transitive relationships used in the reasoning.",
  "suggestions": {
    "generated_dsl": "@q locatedIn ?X Europe",
    "proof_nl": [
      "Fact in KB: WesternEurope is in Europe",
      "Fact in KB: CentralEurope is in Europe",
      "France is in WesternEurope. WesternEurope is in Europe. Therefore France is in Europe.",
      "Germany is in CentralEurope. CentralEurope is in Europe. Therefore Germany is in Europe.",
      "IleDeFrance is in France. France is in WesternEurope. WesternEurope is in Europe. Therefore IleDeFrance is in Europe.",
      "Brandenburg is in Germany. Germany is in CentralEurope. CentralEurope is in Europe. Therefore Brandenburg is in Europe.",
      "Paris is in IleDeFrance. IleDeFrance is in France. France is in WesternEurope. WesternEurope is in Europe. Therefore Paris is in Europe.",
      "Berlin is in Brandenburg. Brandenburg is in Germany. Germany is in CentralEurope. CentralEurope is in Europe. Therefore Berlin is in Europe."
    ]
  }
}
```

### suite12_fuzzy_matching Case 14
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL should also be formatted consistently.",
  "suggestions": {
    "generated_dsl": "@q has Car ?property",
    "proof_nl": [
      "Fact in KB: Car has a steering.",
      "Fact in KB: Car has a wheels.",
      "Fact in KB: Car has an engine.",
      "Fact in KB: Car has a seats."
    ]
  }
}
```

### suite13_property_inheritance Case 5
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Rex has fur based on the inheritance chain from Mammal. The proof provided is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Rex has a spine based on the provided inheritance chain. The proof is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Rex has cells based on the inheritance chain from Animal. The proof provided is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Rex has DNA based on the provided inheritance chain. The proof is clear and follows a logical progression.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Rex likes treats based on the inheritance chain from Dog. The proof provided is clear and follows the necessary steps.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that Rex knows fear through a clear transitive chain of inheritance. The proof provided is consistent with the canonical output.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that Tweety has feathers through a clear transitive proof. The output aligns with the expected natural language and proof.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that Tweety likes seeds through a clear transitive chain of inheritance. The proof provided is consistent with the canonical output.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 18
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Whiskers likes fish based on the inheritance chain. The proof provided is clear and follows the logical steps needed to reach the conclusion.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 22
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Opus has feathers based on a clear transitive chain of inheritance. The output is consistent with the input and expected results.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 25
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output correctly identifies Rex's abilities and provides a clear proof for each ability. The expected natural language output matches the canonical output.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 26
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output correctly identifies that Tweety can fly, and the proof provided is clear and follows a logical progression. No changes are necessary.",
  "suggestions": {}
}
```

### suite13_property_inheritance Case 27
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q likes Whiskers ?thing",
    "expected_nl": [
      "Whiskers likes Fish."
    ],
    "proof_nl": [
      "Whiskers is a persiancat.",
      "PersianCat is a domesticcat.",
      "DomesticCat is a cat.",
      "Cat likes Fish.",
      "Therefore Whiskers likes Fish."
    ]
  }
}
```

### suite14_meta_queries Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof provided lacks clarity and consistency with the canonical output. Additionally, the proof should be more structured.",
  "suggestions": {
    "generated_dsl": "@q similar Hammer ?entity",
    "proof_nl": [
      "shared Tool, Handle, Head",
      "shared Tool and Handle"
    ]
  }
}
```

### suite14_meta_queries Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof provided lacks clarity and consistency with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q similar Car ?entity",
    "proof_nl": [
      "shared Vehicle, Wheels, Engine, and Transport",
      "shared Vehicle, Wheels, and Transport"
    ]
  }
}
```

### suite14_meta_queries Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity. The canonical DSL should be used for consistency.",
  "suggestions": {
    "generated_dsl": "@q similar Sparrow ?entity",
    "proof_nl": [
      "Hawk is a type of Bird.",
      "Sparrow is a type of Bird.",
      "Therefore, Hawk is similar to Sparrow."
    ]
  }
}
```

### suite14_meta_queries Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intended analogy structure, and the proof could be clearer. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q analogy Truck Haul Bicycle ?ability",
    "proof_nl": [
      "Truck can Haul",
      "Bicycle can Transport",
      "Therefore, Truck is to Haul as Bicycle is to Transport."
    ]
  }
}
```

### suite14_meta_queries Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL is a less clear representation of the intended analogy compared to the canonical DSL, but it still conveys the same meaning. The outputs align correctly with the expected natural language and proof.",
  "suggestions": {}
}
```

### suite14_meta_queries Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intended analogy structure, and the proof could be clearer. The expected NL and proof NL should align with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q analogy Bird Fly Fish ?ability",
    "proof_nl": [
      "Bird can Fly maps to Fish can Swim",
      "Therefore, Fish can Swim."
    ]
  }
}
```

### suite14_meta_queries Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof needs to be more structured. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q difference Car Truck ?feature",
    "expected_nl": [
      "Car differs from Truck."
    ],
    "proof_nl": [
      "Fact: Car has Seats.",
      "Fact: Truck has Bed and Haul.",
      "Therefore: Car differs from Truck."
    ]
  }
}
```

### suite14_meta_queries Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "input_nl": "What are the differences between a Hammer and a Screwdriver?",
    "expected_nl": [
      "Hammer differs from Screwdriver."
    ],
    "proof_nl": [
      "Fact: Hammer has Head and Pound.",
      "Fact: Screwdriver has Tip, Shaft, and Turn.",
      "Therefore: Hammer differs from Screwdriver."
    ],
    "canonical_dsl": "@q difference Hammer Screwdriver ?feature"
  }
}
```

### suite14_meta_queries Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer and more structured.",
  "suggestions": {
    "generated_dsl": "@q difference Car Bicycle ?feature",
    "proof_nl": [
      "Fact: Car has Engine and Seats.",
      "Fact: Bicycle has Pedals.",
      "Therefore: Car differs from Bicycle."
    ]
  }
}
```

### suite14_meta_queries Case 11
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output matches the expected natural language and proof, providing a clear explanation of the abilities of the bundle. No changes are necessary.",
  "suggestions": {}
}
```

### suite14_meta_queries Case 12
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof could be more clearly articulated. The expected NL and proof should align with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q induce Fish Trout ?property",
    "proof_nl": [
      "Fish has properties A, B, C.",
      "Trout has properties D, E, F.",
      "No properties are shared between Fish and Trout.",
      "Therefore, empty intersection."
    ]
  }
}
```

### suite14_meta_queries Case 13
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not match the canonical DSL structure, and the proof_nl lacks clarity. The expected_nl should explicitly state the shared property.",
  "suggestions": {
    "generated_dsl": "@q induce Sparrow Hawk ?property",
    "expected_nl": [
      "Sparrow and Hawk share the property Bird."
    ],
    "proof_nl": [
      "Sparrow has properties of Bird.",
      "Hawk has properties of Bird.",
      "Therefore, Sparrow and Hawk share the property Bird."
    ]
  }
}
```

### suite14_meta_queries Case 14
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intended analogy structure, and the proof lacks clarity in its presentation. The expected NL should clearly state the relationships.",
  "suggestions": {
    "generated_dsl": "@q analogy Car Engine Bicycle ?part",
    "proof_nl": [
      "Car has Engine maps to Bicycle has Wheels.",
      "Car has Engine maps to Bicycle has Pedals."
    ]
  }
}
```

### suite14_meta_queries Case 15
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not match the canonical DSL format, and the proof_nl could be clearer. The expected_nl is missing a concluding statement.",
  "suggestions": {
    "generated_dsl": "@q bundle Car Truck Bicycle ?vehicleProp",
    "proof_nl": [
      "Properties of Car: Vehicle, Wheels, Engine, Seats, Transport, Bed, Haul, Pedals.",
      "Properties of Truck: Vehicle, Wheels, Engine, Seats, Transport, Bed, Haul.",
      "Properties of Bicycle: Vehicle, Wheels, Pedals.",
      "Therefore, the union of properties includes Vehicle, Wheels, Engine, Seats, Transport, Bed, Haul, and Pedals."
    ]
  }
}
```

### suite14_meta_queries Case 16
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL is redundant with the expected NL. The translation needs to be clearer and more consistent with the canonical DSL.",
  "suggestions": {
    "generated_dsl": "@q similar QuarkX ?entity",
    "proof_nl": [
      "The query for similar entities to QuarkX was executed.",
      "No results were found."
    ]
  }
}
```

### suite15_reasoning_macros Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity in presenting the causal relationships. The expected NL should also include all relevant explanations.",
  "suggestions": {
    "input_nl": "Why is the grass wet and the sidewalk wet?",
    "expected_nl": [
      "WetGrass is explained by Rain.",
      "WetGrass is explained by Sprinkler.",
      "WetGrass is explained by Storm."
    ],
    "proof_nl": [
      "Causal path: Rain → WetGrass",
      "Causal path: Sprinkler → WetGrass",
      "Causal path: Storm → Rain → WetGrass"
    ],
    "canonical_dsl": "@q abduce WetGrass ?cause"
  }
}
```

### suite15_reasoning_macros Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The output correctly reflects the input NL intent and matches the expected output. The proof provided is also consistent with the canonical output.",
  "suggestions": {}
}
```

### suite15_reasoning_macros Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output aligns well with the expected natural language and proof. The reasoning is clear and consistent with the canonical DSL.",
  "suggestions": {}
}
```

### suite15_reasoning_macros Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Hawk can fly under the default rule, and the proof provided is clear and consistent with the canonical output.",
  "suggestions": {}
}
```

### suite15_reasoning_macros Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies the analogy and provides a clear proof. The output aligns with the expected natural language response.",
  "suggestions": {}
}
```

### suite15_reasoning_macros Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity. The expected NL should also include the confidence level for consistency with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q abduce DryPath ?cause",
    "expected_nl": [
      "DryPath is explained by Sprinkler. (confidence=0.90)"
    ],
    "proof_nl": [
      "Causal path: Sprinkler → DryPath",
      "Therefore, DryPath is explained by Sprinkler."
    ]
  }
}
```

### suite16_macro_aggregation Case 5
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that CityPowerDown causes supply chain disruption, and the proof provided is clear and logical.",
  "suggestions": {}
}
```

### suite16_macro_aggregation Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that CityPowerDown occurs before ReliefDeployment, and the proof provided is clear and logically sound.",
  "suggestions": {}
}
```

### suite16_macro_aggregation Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent capitalization and does not match the canonical DSL format. The proof_nl could be more clearly structured.",
  "suggestions": {
    "generated_dsl": "@goal TeamAlpha must Assist",
    "proof_nl": "Fact in KB: TeamAlpha must Assist. Therefore, TeamAlpha must Assist."
  }
}
```

### suite16_macro_aggregation Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the expected output and proof. The reasoning is clear and aligns with the canonical DSL.",
  "suggestions": {}
}
```

### suite16_macro_aggregation Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. Additionally, the expected_nl should match the canonical output format more closely.",
  "suggestions": {
    "generated_dsl": "@q isA ?x Hazard",
    "proof_nl": [
      "Fact in KB: CityPowerDown is a hazard",
      "Fact in KB: PortDamage is a hazard",
      "Therefore, CityPowerDown and PortDamage are hazards."
    ]
  }
}
```

### suite16_macro_aggregation Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that VirusX causes hospitalization and provides a clear proof of the causal chain. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite16_macro_aggregation Case 11
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that VirusX causes a public health emergency with a clear proof structure. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite16_macro_aggregation Case 12
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl lacks clarity and structure. The expected_nl should also be more concise.",
  "suggestions": {
    "generated_dsl": "@q causes ?x SupplyChainDisruption",
    "proof_nl": [
      "Fact in KB: Hazard causes SupplyChainDisruption.",
      "CityPowerDown is a hazard.",
      "PortDamage is a hazard.",
      "Therefore, CityPowerDown causes SupplyChainDisruption.",
      "Therefore, PortDamage causes SupplyChainDisruption."
    ]
  }
}
```

### suite16_macro_aggregation Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that VirusY causes a public health emergency and provides a clear proof. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent capitalization and does not match the canonical DSL. Additionally, the proof_nl could be more concise and clearer.",
  "suggestions": {
    "input_nl": "Should TeamAlpha coordinate?",
    "expected_nl": "True: TeamAlpha must Coordinate.",
    "proof_nl": [
      "IF (TeamAlpha must Protect) THEN (TeamAlpha must Coordinate)",
      "Therefore, TeamAlpha must Coordinate."
    ],
    "canonical_dsl": "@goal must TeamAlpha Coordinate"
  }
}
```

### suite17_macro_composition Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has inconsistent capitalization and does not match the canonical DSL. The proof_nl could be clearer by explicitly stating the inference step.",
  "suggestions": {
    "generated_dsl": "@goal TeamAlpha must Train",
    "proof_nl": [
      "Applied rule: IF (TeamAlpha can Mobilize) THEN (TeamAlpha must Train)",
      "Therefore, TeamAlpha must Train."
    ]
  }
}
```

### suite17_macro_composition Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Planning occurs before Completion and provides a valid proof. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that TeamAlpha is not located in ReactorSite and provides a clear explanation of the negation blocking inference. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output aligns with the expected results, and the proof provided is clear and consistent with the canonical output.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that SupplierA causes ProductReady and provides a clear proof of the causal chain. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated output aligns with the canonical output, and the proof is clear and consistent with the reasoning provided.",
  "suggestions": {}
}
```

### suite17_macro_composition Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl lacks clarity and structure. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q partOf ?x SupplyChain",
    "proof_nl": [
      "Fact in KB: Beam partOf SupplyChain",
      "Fact in KB: Battery partOf SupplyChain",
      "Therefore, Beam and Battery are part of the SupplyChain."
    ]
  }
}
```

### suite17_macro_composition Case 12
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that SupplierB causes ProductReady and provides a clear proof of the causal chain. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite18_set_theory Case 2
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that SetA is a subset of SetD and provides a valid proof. The output is consistent with the input and expected results.",
  "suggestions": {}
}
```

### suite18_set_theory Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof could be clearer and more concise. The expected natural language output should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal elementOf x SetC",
    "expected_nl": "True: x elementOf SetC.",
    "proof_nl": [
      "x elementOf SetA",
      "SetA subsetOf SetC",
      "Therefore x elementOf SetC"
    ]
  }
}
```

### suite18_set_theory Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that y is an element of Universe based on the subset chain. The proof is clear and follows logically from the premises.",
  "suggestions": {}
}
```

### suite18_set_theory Case 5
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL and the canonical output align well with the expected results. The proof is clear and follows logically from the facts provided.",
  "suggestions": {}
}
```

### suite18_set_theory Case 6
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the expected output, and the proof reasoning aligns with the canonical output. No changes are necessary.",
  "suggestions": {}
}
```

### suite18_set_theory Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that Alpha and Beta are equal sets and provides a clear proof. The output is consistent with the canonical DSL and expected results.",
  "suggestions": {}
}
```

### suite18_set_theory Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that x is in the intersection of SetA and SetB, and the proof provided is clear and follows logically from the premises.",
  "suggestions": {}
}
```

### suite19_biology Case 5
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly establishes that glucose causes ATP production with a clear causal chain. The proof provided aligns well with the canonical output.",
  "suggestions": {}
}
```

### suite19_biology Case 6
```json
{
  "verdict": "ok",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL is less clear than the canonical DSL, but the outputs match the expected results. The proof is logically structured and aligns with the canonical output.",
  "suggestions": {
    "canonical_dsl": "@q causes Glucose ?stage"
  }
}
```

### suite19_biology Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that VirusX causes organ failure and provides a clear proof of the causal chain. The output aligns with the expected results.",
  "suggestions": {}
}
```

### suite19_biology Case 10
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the input and output provided. The proof steps are clear and align with the canonical output.",
  "suggestions": {}
}
```

### suite20_predicate_logic Case 2
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly identifies that P implies S and provides a clear proof structure. The proof steps are logically sound and follow the necessary implications.",
  "suggestions": {}
}
```

### suite20_predicate_logic Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite is consistent, and the outputs align well with the input and expected results. The proof is clear and follows logically from the premises.",
  "suggestions": {}
}
```

### suite20_predicate_logic Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL is incorrectly structured and does not match the canonical DSL. Additionally, the expected NL output is incomplete compared to the canonical output.",
  "suggestions": {
    "generated_dsl": "@goal holds S",
    "expected_nl": "True: S is holds.",
    "proof_nl": "P holds. P implies Q. Q holds. Q implies R. R holds. R implies S. S holds."
  }
}
```

### suite20_predicate_logic Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "expected",
    "proof"
  ],
  "summary": "The expected natural language output does not match the canonical output, and the proof steps could be clearer and more logically structured.",
  "suggestions": {
    "expected_nl": "True: T holds.",
    "proof_nl": [
      "P holds",
      "S holds",
      "P and S imply T",
      "Therefore T holds"
    ]
  }
}
```

### suite20_predicate_logic Case 6
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof provided is not concise or clear. The expected NL and proof NL need to be aligned with the canonical output.",
  "suggestions": {
    "input_nl": "What does P imply?",
    "expected_nl": [
      "P implies Q.",
      "P implies R.",
      "P implies S."
    ],
    "proof_nl": [
      "Fact in KB: P implies Q.",
      "Therefore P implies R.",
      "Therefore P implies S."
    ],
    "canonical_dsl": "@q implies P ?x"
  }
}
```

### suite20_predicate_logic Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be clearer and more concise. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal holds W",
    "expected_nl": "Cannot prove: W is holds.",
    "proof_nl": "Searched isA W in KB. Not found. Entity unknown. No applicable inheritance paths."
  }
}
```

### suite20_predicate_logic Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has incorrect capitalization and does not match the canonical DSL. The proof_nl could be more clearly structured.",
  "suggestions": {
    "generated_dsl": "@goal Plato must Die",
    "proof_nl": [
      "Applied rule: IF (Plato is a human) THEN (Plato is a mortal)",
      "Applied rule: IF (Plato is a mortal) THEN (Plato must Die)",
      "Therefore, Plato must Die."
    ]
  }
}
```

### suite20_predicate_logic Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof could be clearer in its structure. Additionally, the expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal Buried Socrates",
    "expected_nl": "True: Socrates is Buried.",
    "proof_nl": [
      "Applied rule: IF (Socrates is a human) THEN (Socrates is a mortal)",
      "Applied rule: IF (Socrates is a mortal) THEN (Socrates must Die)",
      "Applied rule: IF (Socrates must Die) THEN (Socrates is Buried)",
      "Therefore, Socrates is Buried."
    ]
  }
}
```

### suite20_predicate_logic Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation suite correctly identifies the impossibility of something being both a plant and a mushroom, and the proof provided is clear and concise.",
  "suggestions": {}
}
```

### suite20_predicate_logic Case 16
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, leading to potential confusion. The proof_nl could be clearer and more structured.",
  "suggestions": {
    "generated_dsl": "@goal Exists ?x (And (isA ?x Pet) (isA ?x Rabbit))",
    "proof_nl": "1. Assume Alice is a pet. 2. Alice is a rabbit. 3. Therefore, Alice satisfies the existential."
  }
}
```

### suite21_goat_cabbage_plus Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the expected output and proof. The reasoning is clear and aligns with the canonical DSL.",
  "suggestions": {}
}
```

### suite21_goat_cabbage_plus Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation suite correctly identifies that the left bank is safe based on the provided rule. The proof is clear and follows logically from the rule applied.",
  "suggestions": {}
}
```

### suite21_goat_cabbage_plus Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more consistent with the canonical output format.",
  "suggestions": {
    "generated_dsl": "@q location ?x Left",
    "proof_nl": [
      "Fact in KB: Farmer is at Left.",
      "Fact in KB: Wolf is at Left.",
      "Fact in KB: Goat is at Left.",
      "Fact in KB: Cabbage is at Left."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 6
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. Additionally, the expected_nl should match the canonical output format more closely.",
  "suggestions": {
    "generated_dsl": "@q conflicts ?x ?y",
    "proof_nl": [
      "Fact in KB: Wolf conflicts Goat.",
      "Fact in KB: Goat conflicts Cabbage."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 7
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation suite correctly identifies the conflict between Goat and Cabbage, and the proof provided is clear and accurate.",
  "suggestions": {}
}
```

### suite21_goat_cabbage_plus Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl lacks clarity. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal boatCapacity Boat Two",
    "proof_nl": "Fact in KB: Boat boatCapacity Two. Therefore, the boat capacity is Two."
  }
}
```

### suite21_goat_cabbage_plus Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the input NL query, and the proof_nl could be clearer and more structured. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q isA ?x Animal",
    "proof_nl": [
      "Fact in KB: Wolf is an animal.",
      "Fact in KB: Goat is an animal."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL is not correctly structured, and the proof_nl lacks clarity. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal mustBe Farmer InBoat",
    "proof_nl": "Fact in KB: Farmer mustBe InBoat. Therefore, Farmer must be in the boat."
  }
}
```

### suite21_goat_cabbage_plus Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of demonstrating the solution logic, and the proof_nl could be clearer and more concise. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "input_nl": "Demonstrate the solution logic: Is the initial state safe?",
    "expected_nl": "True: Left is safe.",
    "proof_nl": [
      "Applied rule: IF (Farmer is at Left) THEN (Left is safe)",
      "Therefore, Left is safe."
    ],
    "canonical_dsl": "@goal safe Left"
  }
}
```

### suite21_goat_cabbage_plus Case 13
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL should also match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q plan crossingPlan ?len",
    "expected_nl": [
      "Plan crossingPlan has 7 steps."
    ],
    "proof_nl": [
      "Found 7 plan steps for crossingPlan.",
      "Therefore, the plan has 7 steps."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 14
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "input_nl": "What is step 1 of the crossing plan?",
    "expected_nl": [
      "Step 1 of plan crossingPlan is CrossGoatLR."
    ],
    "proof_nl": [
      "Fact in KB: Step 1 of plan crossingPlan is CrossGoatLR.",
      "Therefore, Step 1 of plan crossingPlan is CrossGoatLR."
    ],
    "canonical_dsl": "@q planStep crossingPlan 1 ?action"
  }
}
```

### suite21_goat_cabbage_plus Case 15
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the input NL, and the proof_nl could be clearer. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "input_nl": "What is step 7 of the crossing plan?",
    "expected_nl": [
      "Step 7 of plan crossingPlan is CrossGoatLR."
    ],
    "proof_nl": [
      "Fact in KB: Step 7 of plan crossingPlan is CrossGoatLR.",
      "Therefore, Step 7 of plan crossingPlan is CrossGoatLR."
    ],
    "canonical_dsl": "@q planStep crossingPlan 7 ?action"
  }
}
```

### suite21_goat_cabbage_plus Case 16
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of verifying the plan, and the proof_nl lacks clarity and detail. The expected_nl should also include more information about the proof.",
  "suggestions": {
    "input_nl": "Verify the computed plan by simulating it over requires/causes/prevents.",
    "expected_nl": [
      "Plan crossingPlan is valid.",
      "Proof: Goals satisfied."
    ],
    "proof_nl": [
      "Step 1: Loaded plan crossingPlan.",
      "Step 2: Start: location Farmer Left, location Wolf Left, location Goat Left, location Cabbage Left.",
      "Step 3: Applied CrossGoatLR.",
      "Step 4: Applied CrossAloneRL.",
      "Step 5: Applied CrossWolfLR.",
      "Step 6: Applied CrossGoatRL.",
      "Step 7: Applied CrossCabbageLR.",
      "Step 8: Applied CrossAloneRL.",
      "Step 9: Applied CrossGoatLR.",
      "Therefore, goals satisfied: location Farmer Right, location Wolf Right, location Goat Right, location Cabbage Right."
    ],
    "canonical_dsl": "@q verifyPlan crossingPlan ?ok"
  }
}
```

### suite21_goat_cabbage_plus Case 18
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL should also match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q plan nextAfterGoatRight ?len",
    "expected_nl": [
      "Plan nextAfterGoatRight has 6 steps."
    ],
    "proof_nl": [
      "Found 6 plan steps for nextAfterGoatRight.",
      "Therefore, the plan has 6 steps."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 19
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q planStep nextAfterGoatRight 1 ?action",
    "proof_nl": [
      "Fact in KB: Step 1 of plan nextAfterGoatRight is CrossAloneRL.",
      "Therefore, Step 1 of the intermediate-state plan is CrossAloneRL."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 20
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of verifying the plan's validity, and the proof_nl lacks detail. The expected_nl should also be more aligned with the canonical output.",
  "suggestions": {
    "input_nl": "Verify that the intermediate-state plan 'nextAfterGoatRight' is valid.",
    "expected_nl": [
      "Plan nextAfterGoatRight is valid."
    ],
    "proof_nl": [
      "Loaded plan nextAfterGoatRight (6 steps).",
      "Start: location Farmer Right, location Goat Right, location Wolf Left, location Cabbage Left.",
      "Step 1: applied CrossAloneRL.",
      "Step 2: applied CrossWolfLR.",
      "Step 3: applied CrossGoatRL.",
      "Step 4: applied CrossCabbageLR.",
      "Step 5: applied CrossAloneRL.",
      "Step 6: applied CrossGoatLR.",
      "Goals satisfied: location Farmer Right, location Wolf Right, location Goat Right, location Cabbage Right."
    ],
    "canonical_dsl": "@q verifyPlan nextAfterGoatRight ?ok"
  }
}
```

### suite21_goat_cabbage_plus Case 22
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q plan nextAfterWolfRight ?len",
    "expected_nl": [
      "Plan nextAfterWolfRight has 4 steps."
    ],
    "proof_nl": [
      "Found 4 plan steps for nextAfterWolfRight.",
      "Therefore, the plan has 4 steps."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 23
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q planStep nextAfterWolfRight 1 ?action",
    "proof_nl": [
      "Fact in KB: Step 1 of plan nextAfterWolfRight is CrossGoatRL.",
      "Therefore, Step 1 of plan nextAfterWolfRight is CrossGoatRL."
    ]
  }
}
```

### suite21_goat_cabbage_plus Case 24
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of verifying the plan's validity, and the proof_nl lacks detail. Additionally, the expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q verifyPlan nextAfterWolfRight ?ok",
    "proof_nl": [
      "Loaded plan nextAfterWolfRight (4 steps).",
      "Start: location Farmer Right, location Goat Right, location Wolf Right, location Cabbage Left.",
      "Step 1: applied CrossGoatRL.",
      "Step 2: applied CrossCabbageLR.",
      "Step 3: applied CrossAloneRL.",
      "Step 4: applied CrossGoatLR.",
      "Goals satisfied: location Farmer Right, location Wolf Right, location Goat Right, location Cabbage Right."
    ]
  }
}
```

### suite22_deduction Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof provided is incomplete. The expected NL should also be more aligned with the canonical output.",
  "suggestions": {
    "input_nl": "What effects follow from Inflation through the causal chain?",
    "expected_nl": [
      "From Inflation, deduce causes HigherPrices ReducedSpending.",
      "From Inflation, deduce causes ReducedSpending Recession.",
      "From Inflation, deduce causes Recession Unemployment."
    ],
    "proof_nl": [
      "Inflation via causes via ReducedSpending",
      "ReducedSpending via causes via Recession",
      "Recession via causes via Unemployment"
    ],
    "canonical_dsl": "\n      @filter causes ?X ?Y\n      @q deduce Inflation $filter ?result 4 5\n    "
  }
}
```

### suite22_deduction Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the input NL, and the proof provided is incomplete. The expected NL and proof NL need to be aligned with the canonical output.",
  "suggestions": {
    "input_nl": "What does CO2 emission cause through the climate chain?",
    "expected_nl": [
      "From CO2Emission, deduce causes GlobalWarming IceMelt.",
      "From CO2Emission, deduce causes IceMelt SeaLevelRise.",
      "From CO2Emission, deduce causes SeaLevelRise CoastalFlooding.",
      "From CO2Emission, deduce causes CoastalFlooding Displacement."
    ],
    "proof_nl": [
      "CO2Emission via causes via IceMelt",
      "CO2Emission via causes via IceMelt via causes via SeaLevelRise",
      "CO2Emission via causes via IceMelt via causes via SeaLevelRise via causes via CoastalFlooding",
      "CO2Emission via causes via IceMelt via causes via SeaLevelRise via causes via CoastalFlooding via causes via Displacement"
    ],
    "canonical_dsl": "\n      @filter causes ?X ?Y\n      @q deduce CO2Emission $filter ?result 5 5\n    "
  }
}
```

### suite22_deduction Case 6
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl lacks clarity and completeness. The expected_nl should also be more aligned with the canonical output.",
  "suggestions": {
    "input_nl": "What type categories include Dog transitively?",
    "expected_nl": [
      "From Dog, deduce isA Dog Vertebrate.",
      "From Dog, deduce isA Dog Animal.",
      "From Dog, deduce isA Dog LivingThing."
    ],
    "proof_nl": [
      "Dog via isA via Vertebrate",
      "Dog via isA via Vertebrate via isA via Animal",
      "Dog via isA via Vertebrate via isA via Animal via isA via LivingThing"
    ],
    "canonical_dsl": "\n      @filter isA ?X ?Y\n      @q deduce Dog $filter ?result 4 5\n    "
  }
}
```

### suite22_deduction Case 8
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL does not match the canonical DSL, but the canonical output and expected NL are consistent with the reasoning process. The proof NL is also accurate and follows the logical deductions.",
  "suggestions": {}
}
```

### suite22_deduction Case 10
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof lacks clarity in its structure. The expected NL and proof NL should be more aligned with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q deduce RawMaterial limited depth",
    "proof_nl": [
      "RawMaterial via causes via Assembly",
      "RawMaterial via causes via Assembly via causes via QualityCheck"
    ]
  }
}
```

### suite23_tool_planning Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl lacks clarity and completeness. The expected NL should also be more aligned with the canonical output.",
  "suggestions": {
    "input_nl": "Verify that the learning-report plan is valid by simulating it.",
    "expected_nl": [
      "Plan planLearn is valid.",
      "Proof: Goals satisfied: has Workspace LearnReturnReport."
    ],
    "proof_nl": [
      "Loaded plan planLearn (3 steps).",
      "Step 1: applied ReadDS03.",
      "Step 2: applied ExtractLearnReturn.",
      "Step 3: applied WriteLearnReport.",
      "Therefore, goals satisfied."
    ],
    "canonical_dsl": "@q verifyPlan planLearn ?ok"
  }
}
```

### suite23_tool_planning Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer and more structured. The expected NL is also not fully aligned with the canonical output.",
  "suggestions": {
    "generated_dsl": "@q plan planLearn ?len",
    "expected_nl": [
      "Plan planLearn has 3 steps."
    ],
    "proof_nl": [
      "Found 3 plan steps for planLearn.",
      "Therefore, plan planLearn has 3 steps."
    ]
  }
}
```

### suite23_tool_planning Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL is correct but lacks a direct connection to the proof.",
  "suggestions": {
    "generated_dsl": "@q planStep planLearn 1 ?action",
    "proof_nl": [
      "Fact in KB: Step 1 of plan planLearn is ReadDS03.",
      "Therefore, Step 1 of plan planLearn is ReadDS03."
    ]
  }
}
```

### suite23_tool_planning Case 5
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL is consistent with the canonical output but lacks clarity in the proof.",
  "suggestions": {
    "generated_dsl": "@q planAction planLearn 1 ?tool ?input ?output",
    "proof_nl": [
      "Fact in KB: Step 1 of plan planLearn uses ReadFile with DS03Spec and DS03Text.",
      "Therefore, the tool used is ReadFile with parameters DS03Spec and DS03Text."
    ]
  }
}
```

### suite23_tool_planning Case 6
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL is correct but lacks a direct connection to the proof provided.",
  "suggestions": {
    "generated_dsl": "@q planStep planLearn 2 ?action",
    "proof_nl": [
      "Fact in KB: Step 2 of plan planLearn is ExtractLearnReturn.",
      "Therefore, Step 2 of plan planLearn is ExtractLearnReturn."
    ]
  }
}
```

### suite23_tool_planning Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity. The expected NL should also be more concise.",
  "suggestions": {
    "input_nl": "What tool is used in step 2 of the plan (with parameters)?",
    "expected_nl": [
      "Step 2 of plan planLearn uses Extract with DS03Text and LearnReturnInfo."
    ],
    "proof_nl": [
      "Fact in KB: Step 2 of plan planLearn uses Extract with DS03Text and LearnReturnInfo.",
      "Therefore, Extract is the tool used at step 2."
    ],
    "canonical_dsl": "@q planAction planLearn 2 ?tool ?input ?output"
  }
}
```

### suite23_tool_planning Case 8
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The canonical output and expected NL are consistent, but the proof lacks a clear structure.",
  "suggestions": {
    "generated_dsl": "@q planStep planLearn 3 ?action",
    "proof_nl": [
      "Fact in KB: Step 3 of plan planLearn is WriteLearnReport.",
      "Therefore, Step 3 of plan planLearn is WriteLearnReport."
    ]
  }
}
```

### suite23_tool_planning Case 9
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL is consistent with the canonical output but lacks clarity in the proof.",
  "suggestions": {
    "generated_dsl": "@q planAction planLearn 3 ?tool ?input ?output",
    "proof_nl": [
      "Fact in KB: Step 3 of plan planLearn uses WriteFile with LearnReturnInfo and LearnReturnReport.",
      "Therefore, the tool used is WriteFile with parameters LearnReturnInfo and LearnReturnReport."
    ]
  }
}
```

### suite23_tool_planning Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl lacks clarity and completeness. The expected NL should also be more aligned with the canonical output.",
  "suggestions": {
    "input_nl": "Verify that the eval-report plan is valid by simulating it.",
    "expected_nl": [
      "Plan planEval is valid.",
      "Proof: Goals satisfied."
    ],
    "proof_nl": [
      "Loaded plan planEval (3 steps).",
      "Step 1: applied ReadDS14.",
      "Step 2: applied ExtractProveNoHoles.",
      "Step 3: applied WriteEvalReport.",
      "Therefore, goals satisfied: has Workspace EvalReport."
    ],
    "canonical_dsl": "@q verifyPlan planEval ?ok"
  }
}
```

### suite23_tool_planning Case 12
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@q plan planEval ?len",
    "proof_nl": [
      "Found 3 plan steps for planEval.",
      "Therefore, planEval has 3 steps."
    ]
  }
}
```

### suite23_tool_planning Case 13
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL is correct but lacks the necessary context from the proof.",
  "suggestions": {
    "generated_dsl": "@q planStep planEval 1 ?action",
    "proof_nl": [
      "Fact in KB: Step 1 of plan planEval is ReadDS14.",
      "Therefore, Step 1 of plan planEval is ReadDS14."
    ]
  }
}
```

### suite23_tool_planning Case 14
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The expected NL is consistent with the canonical output but lacks clarity in the proof.",
  "suggestions": {
    "generated_dsl": "@q planAction planEval 1 ?tool ?input ?output",
    "proof_nl": [
      "Fact in KB: Step 1 of plan planEval uses ReadFile with DS14Spec and DS14Text.",
      "Therefore, the tool used is ReadFile with parameters DS14Spec and DS14Text."
    ]
  }
}
```

### suite23_tool_planning Case 15
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL is also not formatted as a complete sentence.",
  "suggestions": {
    "generated_dsl": "@q planStep planEval 2 ?action",
    "expected_nl": "Step 2 of the eval-report plan is ExtractProveNoHoles.",
    "proof_nl": [
      "Fact in KB: Step 2 of plan planEval is ExtractProveNoHoles.",
      "Therefore, Step 2 of the eval-report plan is ExtractProveNoHoles."
    ]
  }
}
```

### suite23_tool_planning Case 16
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL could be clearer. The canonical DSL should be more closely followed to ensure consistency.",
  "suggestions": {
    "generated_dsl": "@q planAction planEval 2 ?tool ?input ?output",
    "proof_nl": [
      "Fact in KB: Step 2 of plan planEval uses Extract with DS14Text and ProveNoHolesInfo.",
      "Therefore, the tool used at step 2 is Extract with DS14Text and ProveNoHolesInfo."
    ]
  }
}
```

### suite23_tool_planning Case 17
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the input NL, and the proof_nl could be clearer. The expected NL is correct but lacks a direct connection to the proof.",
  "suggestions": {
    "generated_dsl": "@q planStep planEval 3 ?action",
    "proof_nl": [
      "Fact in KB: Step 3 of plan planEval is WriteEvalReport.",
      "Therefore, Step 3 of plan planEval is WriteEvalReport."
    ]
  }
}
```

### suite23_tool_planning Case 18
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof NL lacks clarity. The canonical output should be more directly aligned with the expected NL.",
  "suggestions": {
    "generated_dsl": "@q planAction planEval 3 ?tool ?input ?output",
    "proof_nl": [
      "Fact in KB: Step 3 of plan planEval uses WriteFile with ProveNoHolesInfo and EvalReport.",
      "Therefore, the tool used is WriteFile with parameters ProveNoHolesInfo and EvalReport."
    ]
  }
}
```

### suite24_contradictions Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl lacks detail. The expected_nl should also match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasState Door Open",
    "proof_nl": "Fact: Door is Open. Therefore, Door is Open."
  }
}
```

### suite24_contradictions Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be clearer and more concise. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal locatedIn Door Kitchen",
    "expected_nl": "Cannot prove: Door is in Kitchen.",
    "proof_nl": [
      "No locatedIn facts for Door exist in KB",
      "Therefore, Door is in Kitchen cannot be derived"
    ]
  }
}
```

### suite24_contradictions Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be clearer and more concise. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal locatedIn Door Not Attic",
    "expected_nl": "Cannot prove: Door is in Attic.",
    "proof_nl": [
      "No locatedIn facts for Door exist in KB",
      "Therefore, Door is in Attic cannot be derived."
    ]
  }
}
```

### suite24_contradictions Case 13
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the provided artifacts, and the outputs align correctly with the input and expected results.",
  "suggestions": {}
}
```

### suite24_contradictions Case 14
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL correctly reflects the intent of the input NL, and the outputs align with the expected results. The proof is clear and concise.",
  "suggestions": {}
}
```

### suite24_contradictions Case 19
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The generated DSL correctly reflects the intent of the input NL, and the outputs are consistent with the canonical output. The proof is clear and follows logically from the provided information.",
  "suggestions": {}
}
```

### suite24_contradictions Case 22
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl could be clearer. The expected NL should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal not locatedIn Tea Cupboard",
    "expected_nl": "Cannot prove: Tea is in Cupboard.",
    "proof_nl": [
      "No locatedIn facts for Tea exist in KB",
      "Therefore, Tea is in Cupboard cannot be derived"
    ]
  }
}
```

### suite24_contradictions Case 25
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl could be clearer. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal locatedIn Foo Bar",
    "expected_nl": "Cannot prove: Foo is in Bar.",
    "proof_nl": [
      "No locatedIn facts for Foo exist in KB",
      "Therefore, Foo is in Bar cannot be derived"
    ]
  }
}
```

### suite24_contradictions Case 28
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL, and the proof_nl lacks clarity. The expected_nl should also match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal locatedIn Tea Cupboard2",
    "proof_nl": "Fact: Tea is in Cupboard2. Therefore, Tea is in Cupboard2."
  }
}
```

### suite24_contradictions Case 29
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL incorrectly uses 'isA' instead of 'hasProperty', which affects the translation accuracy. Additionally, the proof_nl could be more explicit in its structure.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Tea Hot",
    "proof_nl": "Fact: Tea has Hot. Therefore, Tea has Hot."
  }
}
```

### suite25_ruletaker_bugs Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL format, and the proof_nl could be clearer. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Harry big",
    "expected_nl": "True: Harry has big.",
    "proof_nl": "Fact in KB: Harry has big."
  }
}
```

### suite25_ruletaker_bugs Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "expected",
    "proof"
  ],
  "summary": "The expected natural language output does not match the canonical output, and the proof reasoning lacks clarity. The proof_nl should be more detailed to align with the canonical output.",
  "suggestions": {
    "expected_nl": "Cannot prove: Not (Harry has big)",
    "proof_nl": "No Not facts for (hasProperty Harry big). Therefore, NOT (Harry has big) cannot be derived."
  }
}
```

### suite25_ruletaker_bugs Case 4
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation is consistent with the provided artifacts, and the proof aligns with the closed world assumption. The output is clear and accurate.",
  "suggestions": {}
}
```

### suite25_ruletaker_bugs Case 6
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL structure, and the proof_nl could be clearer. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Charlie quiet",
    "proof_nl": "Fact in KB: Charlie has quiet. Therefore, Charlie is quiet."
  }
}
```

### suite25_ruletaker_bugs Case 7
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not match the canonical DSL, and the proof_nl could be clearer. The expected_nl should also align with the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Charlie round",
    "expected_nl": "True: Charlie has round.",
    "proof_nl": "1. Charlie has quiet. 2. IF (Charlie has quiet) THEN (Charlie has round). 3. Therefore, Charlie has round."
  }
}
```

### suite25_ruletaker_bugs Case 9
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite is consistent and clear, with the canonical output matching the expected natural language output. The proof provided is also coherent and follows logically from the rule applied.",
  "suggestions": {}
}
```

### suite25_ruletaker_bugs Case 11
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not align with the canonical DSL, and the proof_nl could be clearer. The expected_nl should match the canonical output more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Dave frozen",
    "expected_nl": "True: Dave has frozen.",
    "proof_nl": "1. IF (Dave has cold) THEN (Dave has frozen). 2. Dave has cold. 3. Therefore, Dave has frozen."
  }
}
```

### suite25_ruletaker_bugs Case 13
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the canonical DSL structure, and the proof_nl could be clearer. The expected_nl should match the canonical output format more closely.",
  "suggestions": {
    "generated_dsl": "@goal hasProperty Tom smart",
    "expected_nl": "True: Tom has smart.",
    "proof_nl": "Fact in KB: Tom has smart."
  }
}
```

### suite25_ruletaker_bugs Case 14
```json
{
  "verdict": "needs_fix",
  "categories": [
    "expected",
    "proof"
  ],
  "summary": "The expected natural language output does not match the canonical output, and the proof is overly simplistic. The proof should provide more context to clarify the reasoning.",
  "suggestions": {
    "expected_nl": "Cannot prove: Not(Tom smart) because there are no facts supporting that Tom is not smart.",
    "proof_nl": "No facts support Not(Tom smart). Therefore, it cannot be derived."
  }
}
```

### suite25_ruletaker_bugs Case 16
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The evaluation correctly identifies that the statement about water being frozen is unprovable due to the lack of the necessary condition. The proof steps are clear and align with the canonical output.",
  "suggestions": {}
}
```

### suite26_compound_conclusions Case 2
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly proves that Sally is a zumpus based on the provided conditions and rules. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite26_compound_conclusions Case 3
```json
{
  "verdict": "ok",
  "categories": [],
  "summary": "The reasoning evaluation suite correctly proves that Sally is an impus based on the provided conditions and rules. The output aligns well with the expected results.",
  "suggestions": {}
}
```

### suite26_compound_conclusions Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL has a capitalization issue, and the proof_nl could be more concise. The expected_nl is correct but lacks clarity in the proof steps.",
  "suggestions": {
    "generated_dsl": "@q isA ?who Zumpus",
    "proof_nl": [
      "Sally is a wumpus.",
      "Sally is a sterpus.",
      "Sally is a gorpus.",
      "Therefore, Sally is a zumpus."
    ]
  }
}
```

### suite29_explain_abduce_whatif Case 2
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl is incomplete. The proof should include the full causal chain leading to the conclusion.",
  "suggestions": {
    "generated_dsl": "@q explain (causes Storm Injury) ?why",
    "proof_nl": [
      "Storm causes Rain.",
      "Rain causes WetGrass.",
      "WetGrass causes SlipHazard.",
      "SlipHazard causes Injury.",
      "Therefore Storm causes Injury."
    ]
  }
}
```

### suite29_explain_abduce_whatif Case 3
```json
{
  "verdict": "needs_fix",
  "categories": [
    "expected",
    "proof"
  ],
  "summary": "The expected natural language output does not match the canonical output, and the proof is incomplete. The proof should include all relevant steps leading to the conclusion about Injury.",
  "suggestions": {
    "expected_nl": [
      "If Storm did not occur, Injury would be uncertain."
    ],
    "proof_nl": [
      "Storm → Rain → WetGrass → SlipHazard → Injury",
      "Therefore, if Storm does not occur, the chain leading to Injury is disrupted."
    ]
  }
}
```

### suite29_explain_abduce_whatif Case 4
```json
{
  "verdict": "needs_fix",
  "categories": [
    "translation",
    "expected",
    "proof"
  ],
  "summary": "The generated DSL does not accurately reflect the intent of the input NL, and the proof_nl is incomplete compared to the canonical output. The expected NL should also include more explanations.",
  "suggestions": {
    "generated_dsl": "@q abduce Injury ?cause",
    "expected_nl": [
      "Injury is explained by SlipHazard.",
      "Injury is explained by Accident.",
      "Injury is explained by WetGrass.",
      "Injury is explained by Rain.",
      "Injury is explained by Storm."
    ],
    "proof_nl": [
      "Causal path: SlipHazard → Injury",
      "Causal path: Accident → Injury",
      "Causal path: WetGrass → SlipHazard → Injury",
      "Causal path: Rain → WetGrass → SlipHazard → Injury",
      "Causal path: Storm → Rain → WetGrass → SlipHazard → Injury"
    ]
  }
}
```

## Summary
Reviewed cases: 288
Total issues: 226

| Suite | Reviewed | Issues | Translation | Expected | Proof |
|---|---:|---:|---:|---:|---:|
| suite01_foundations | 9 | 0 | 0 | 0 | 0 |
| suite02_hierarchies | 8 | 5 | 5 | 0 | 0 |
| suite03_rules | 11 | 4 | 4 | 0 | 0 |
| suite04_deep_chains | 9 | 8 | 8 | 0 | 0 |
| suite05_negation | 10 | 3 | 3 | 0 | 0 |
| suite06_compound_logic | 14 | 8 | 8 | 0 | 0 |
| suite07_temporal | 11 | 10 | 10 | 0 | 0 |
| suite08_modal | 14 | 6 | 6 | 0 | 0 |
| suite09_composition | 13 | 8 | 8 | 0 | 0 |
| suite10_integration | 15 | 8 | 8 | 0 | 0 |
| suite11_wedding_seating | 0 | 0 | 0 | 0 | 0 |
| suite12_fuzzy_matching | 11 | 6 | 6 | 0 | 0 |
| suite13_property_inheritance | 25 | 13 | 13 | 0 | 0 |
| suite14_meta_queries | 15 | 25 | 15 | 0 | 10 |
| suite15_reasoning_macros | 7 | 9 | 6 | 0 | 3 |
| suite16_macro_aggregation | 9 | 9 | 9 | 0 | 0 |
| suite17_macro_composition | 9 | 9 | 9 | 0 | 0 |
| suite18_set_theory | 7 | 7 | 7 | 0 | 0 |
| suite19_biology | 7 | 4 | 4 | 0 | 0 |
| suite20_predicate_logic | 12 | 10 | 10 | 0 | 0 |
| suite21_goat_cabbage_plus | 19 | 19 | 19 | 0 | 0 |
| suite22_deduction | 5 | 5 | 5 | 0 | 0 |
| suite23_tool_planning | 16 | 18 | 16 | 0 | 2 |
| suite24_contradictions | 10 | 13 | 10 | 0 | 3 |
| suite25_ruletaker_bugs | 10 | 13 | 10 | 0 | 3 |
| suite26_compound_conclusions | 3 | 3 | 3 | 0 | 0 |
| suite27_contrapositive_negation | 6 | 0 | 0 | 0 | 0 |
| suite28_induction | 0 | 0 | 0 | 0 | 0 |
| suite29_explain_abduce_whatif | 3 | 3 | 3 | 0 | 0 |
