/**
 * Test Case: Comprehensive Error Handling & Boundary Reasoning
 * Tests closed-world assumption, negation as failure, unknown handling, and inference boundaries
 * Version: 5.0 - Complex proofs with explicit unknown handling, boundary detection, and negative inference
 */
module.exports = {
  id: "suite_14_error_edge_cases",
  name: "Comprehensive Error Handling & Boundary Reasoning",

  theory_NL: "Minimal ontology for boundary testing: Cat, Dog, Bird are animals. Tiger is a cat (species). Parrot is a bird. Paris is in France, France is in Europe. London is in UK. Closed-world assumption: anything not stated is unknown/false. Disjoint categories: animal vs mineral vs plant. Nothing is both animal and plant. Properties: animals are living, rocks are non-living. Inheritance tested through chains. Unknown concepts: queries about XyzzyThing should return UNKNOWN. Missing relations: Cat is NOT explicitly a plant (should be derivably false via disjoint).",

  theory_DSL: [
    // Basic ontology
    "Cat IS_A animal",
    "Dog IS_A animal",
    "Bird IS_A animal",
    "Tiger IS_A cat",
    "cat IS_A feline",
    "feline IS_A mammal",
    "mammal IS_A animal",
    "Parrot IS_A bird",
    "bird IS_A animal",
    // Geography
    "Paris LOCATED_IN France",
    "France LOCATED_IN Europe",
    "London LOCATED_IN UK",
    "UK LOCATED_IN Europe",
    // Disjoint categories
    "animal DISJOINT_WITH mineral",
    "animal DISJOINT_WITH plant",
    "mineral DISJOINT_WITH plant",
    // Properties
    "animal IS living",
    "plant IS living",
    "mineral IS non_living",
    // Unknown markers
    "known_concepts INCLUDE Cat",
    "known_concepts INCLUDE Dog",
    "known_concepts INCLUDE Tiger"
  ],

  tasks: [
    // Q1: Deep transitive chain - is Tiger an animal?
    {
      id: "q1",
      TASK_NL: "Is Tiger an animal? (4-step transitive chain)",
      TASK_DSL: "@q1 Tiger IS_A animal",
      ANSWEAR_NL: "Yes: Tiger→cat→feline→mammal→animal",
      PROOF_DSL: `@p1 Tiger IS_A cat
@p2 cat IS_A feline
@p3 feline IS_A mammal
@p4 mammal IS_A animal
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 COMPUTES transitive_closure
@depth $chain HAS length_4
@each_step $p1 THEN $p2
@each_step2 $each_step THEN $p3
@each_step3 $each_step2 THEN $p4
@verified $each_step3 ALL_EXIST in_kb
@result $chain IS_A deep_transitive_proof
@proof $result PROVES $q1`,
      PROOF_NL: "4-step transitive: Tiger IS_A cat IS_A feline IS_A mammal IS_A animal. Each step verified in knowledge base."
    },

    // Q2: Closed-world - unknown concept query
    {
      id: "q2",
      TASK_NL: "Is XyzzyThing an animal? (Unknown concept handling)",
      TASK_DSL: "@q2 XyzzyThing IS_A animal",
      ANSWEAR_NL: "UNKNOWN - XyzzyThing is not a known concept in the knowledge base",
      PROOF_DSL: `@query XyzzyThing IS_A animal
@search XyzzyThing IN known_concepts
@c1 $search NOT_FOUND
@unknown_subject $c1 ESTABLISHES subject_unknown
@search2 XyzzyThing IS_A anything
@c2 $search2 NOT_FOUND
@no_type $c2 ESTABLISHES no_type_info
@search3 anything RELATION XyzzyThing
@c3 $search3 NOT_FOUND
@no_mention $c3 ESTABLISHES completely_unknown
@combine $unknown_subject AND $no_type
@complete $combine AND $no_mention
@cwa closed_world_assumption APPLIES
@under_cwa $complete IMPLIES unknown
@result $under_cwa IS_A unknown_concept_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Unknown concept: 1) Search XyzzyThing as subject - not found 2) Search XyzzyThing in any relation - not found 3) Concept completely absent 4) Under CWA: UNKNOWN."
    },

    // Q3: Disjoint-based negation - Cat is not a plant
    {
      id: "q3",
      TASK_NL: "Is Cat a plant? (Disjoint-based negative inference)",
      TASK_DSL: "@q3 Cat IS_A plant",
      ANSWEAR_NL: "NO (false) - Cat IS_A animal, animal DISJOINT_WITH plant, therefore Cat is NOT a plant",
      PROOF_DSL: `@p1 Cat IS_A animal
@p2 animal DISJOINT_WITH plant
@query Cat IS_A plant
@c1 $p1 ESTABLISHES cat_is_animal
@c2 $p2 DEFINES disjoint_constraint
@c3 $c1 LEADS_TO $c2
@hypothesize Cat IS_A plant
@c4 $hypothesize AND $c1
@both_claims animal AND plant
@c5 $c4 VIOLATES $p2
@contradiction $c5 PROVES false
@negate $contradiction BLOCKS $hypothesize
@by_disjoint $negate DERIVES NOT_plant
@result $by_disjoint IS_A negative_inference_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Negative inference via disjoint: 1) Cat IS_A animal (known) 2) animal DISJOINT plant (constraint) 3) If Cat were plant → both animal AND plant 4) Violates disjoint → Cat NOT plant."
    },

    // Q4: Missing relation vs unknown concept
    {
      id: "q4",
      TASK_NL: "Is Paris located in Germany? (Missing relation, known concepts)",
      TASK_DSL: "@q4 Paris LOCATED_IN Germany",
      ANSWEAR_NL: "NO/UNKNOWN - Paris and Germany are known, but no LOCATED_IN relation exists between them",
      PROOF_DSL: `@p1 Paris LOCATED_IN France
@p2 France LOCATED_IN Europe
@query Paris LOCATED_IN Germany
@search $query IN knowledge_base
@c1 $search NOT_FOUND
@missing $c1 ESTABLISHES no_direct_relation
@known1 Paris IS_KNOWN
@known2 Germany IS_KNOWN
@both_known $known1 AND $known2
@not_unknown $both_known DISTINGUISHES from_unknown_concept
@check_transitive Paris LOCATED_IN France LOCATED_IN Germany
@c2 France LOCATED_IN Germany
@search2 $c2 NOT_FOUND
@no_path $search2 BLOCKS transitive
@cwa_applies $missing UNDER closed_world
@false_or_unknown $cwa_applies RETURNS negative
@result $false_or_unknown IS_A missing_relation_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Missing relation: 1) Both Paris and Germany are known concepts 2) No direct LOCATED_IN relation 3) No transitive path either 4) Under CWA: false/unknown (not true)."
    },

    // Q5: Property inheritance through chain
    {
      id: "q5",
      TASK_NL: "Is Tiger living? (Property inheritance through type chain)",
      TASK_DSL: "@q5 Tiger IS living",
      ANSWEAR_NL: "Yes - Tiger→cat→feline→mammal→animal, animal IS living",
      PROOF_DSL: `@p1 Tiger IS_A cat
@p2 cat IS_A feline
@p3 feline IS_A mammal
@p4 mammal IS_A animal
@p5 animal IS living
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@type_chain $c3 REACHES animal
@c4 $type_chain LEADS_TO $p5
@property $c4 INHERITS living
@verify Tiger REACHES animal IN 4_steps
@inherit $verify INHERITS_PROPERTY $p5
@result $inherit IS_A property_inheritance_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Property inheritance: 1) Type chain: Tiger→cat→feline→mammal→animal 2) Animal IS living 3) Property inherited through chain 4) Tiger IS living."
    },

    // Q6: Transitive geographic containment
    {
      id: "q6",
      TASK_NL: "Is Paris in Europe? (Transitive containment)",
      TASK_DSL: "@q6 Paris LOCATED_IN Europe",
      ANSWEAR_NL: "Yes - Paris→France→Europe (transitive LOCATED_IN)",
      PROOF_DSL: `@p1 Paris LOCATED_IN France
@p2 France LOCATED_IN Europe
@query Paris LOCATED_IN Europe
@c1 $p1 ESTABLISHES paris_in_france
@c2 $p2 ESTABLISHES france_in_europe
@c3 $c1 LEADS_TO $c2
@transitive $c3 COMPUTES containment
@verify LOCATED_IN IS transitive_relation
@apply $verify TO $transitive
@conclude Paris LOCATED_IN Europe
@depth $conclude HAS length_2
@result $conclude IS_A transitive_containment_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Transitive containment: 1) Paris LOCATED_IN France (direct) 2) France LOCATED_IN Europe (direct) 3) LOCATED_IN is transitive 4) Therefore Paris LOCATED_IN Europe."
    },

    // Q7: Boundary between false and unknown
    {
      id: "q7",
      TASK_NL: "Distinguish: Dog IS_A plant (false) vs UnknownX IS_A plant (unknown)",
      TASK_DSL: "@q7 false_vs_unknown DISTINGUISHED",
      ANSWEAR_NL: "Dog→animal→DISJOINT plant = FALSE. UnknownX has no info = UNKNOWN. Different epistemics.",
      PROOF_DSL: `@case1 Dog IS_A plant
@p1 Dog IS_A animal
@p2 animal DISJOINT_WITH plant
@c1 $p1 LEADS_TO $p2
@dog_not_plant $c1 PROVES definitely_false
@case2 UnknownX IS_A plant
@search UnknownX IN knowledge_base
@c2 $search RETURNS nothing
@no_info $c2 ESTABLISHES no_evidence
@unknownx_status $no_info IMPLIES unknown
@compare $dog_not_plant IS false
@compare2 $unknownx_status IS unknown
@different $compare DIFFERS $compare2
@epistemic false STRONGER_THAN unknown
@reason1 false HAS negative_evidence
@reason2 unknown HAS no_evidence
@distinction $reason1 DIFFERS $reason2
@result $distinction IS_A epistemic_distinction_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Epistemic distinction: 1) Dog IS_A animal, animal DISJOINT plant → Dog NOT plant (FALSE with evidence) 2) UnknownX not in KB → no evidence either way (UNKNOWN) 3) FALSE ≠ UNKNOWN."
    },

    // Q8: Exhaustive search for non-animals
    {
      id: "q8",
      TASK_NL: "What things in KB are NOT animals? (Complement search)",
      TASK_DSL: "@q8 non_animals ENUMERATED",
      ANSWEAR_NL: "Paris, France, Europe, London, UK (geographic entities are not animals)",
      PROOF_DSL: `@all_concepts Cat Dog Bird Tiger Parrot Paris France Europe London UK
@animals Cat IS_A animal
@animals2 Dog IS_A animal
@animals3 Bird IS_A animal
@animals4 Tiger IS_A cat_chain_to_animal
@animals5 Parrot IS_A bird_chain_to_animal
@check_paris Paris IS_A animal
@c1 $check_paris NOT_FOUND
@check_france France IS_A animal
@c2 $check_france NOT_FOUND
@check_europe Europe IS_A animal
@c3 $check_europe NOT_FOUND
@check_london London IS_A animal
@c4 $check_london NOT_FOUND
@check_uk UK IS_A animal
@c5 $check_uk NOT_FOUND
@non_animals $c1 AND $c2
@non_animals2 $non_animals AND $c3
@non_animals3 $non_animals2 AND $c4
@non_animals4 $non_animals3 AND $c5
@list Paris France Europe London UK
@count $list HAS 5_items
@result $non_animals4 IS_A complement_search_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Complement search: 1) Enumerate all concepts 2) Check each for IS_A animal path 3) Paris, France, Europe, London, UK have no path to animal 4) These are non-animals (geographic entities)."
    }
  ]
};
