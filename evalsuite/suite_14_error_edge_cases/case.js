/**
 * Test Case: Comprehensive Error Handling & Boundary Reasoning
 * Tests closed-world assumption, negation as failure, unknown handling, and inference boundaries
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
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
    // Markers for CWA
    "XyzzyThing IS_A unknown_marker",
    "known_entity INCLUDES Cat",
    "known_entity INCLUDES Dog",
    "known_entity INCLUDES Tiger"
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
@c4 $c3 COMPUTES transitive_closure
@c5 $c4 HAS length_4
@c6 $p1 VERIFIED in_kb
@c7 $p2 VERIFIED in_kb
@c8 $p3 VERIFIED in_kb
@c9 $p4 VERIFIED in_kb
@result $c4 IS_A deep_transitive_proof
@proof $result PROVES $q1`,
      PROOF_NL: "4-step transitive: Tiger IS_A cat IS_A feline IS_A mammal IS_A animal. Each step verified in knowledge base."
    },

    // Q2: Closed-world - unknown concept query
    {
      id: "q2",
      TASK_NL: "Is XyzzyThing an animal? (Unknown concept handling)",
      TASK_DSL: "@q2 XyzzyThing MISSING animal_type",
      ANSWEAR_NL: "UNKNOWN - XyzzyThing is not a known concept in the knowledge base",
      PROOF_DSL: `@p1 XyzzyThing IS_A unknown_marker
@query XyzzyThing IS_A animal
@c1 $query SEARCHES knowledge_base
@c2 $c1 RETURNS no_match
@c3 $c2 ESTABLISHES subject_unknown
@c4 XyzzyThing MISSING type_info
@c5 $c4 CONFIRMS no_classification
@c6 $c3 COMBINES $c5
@c7 closed_world_assumption APPLIES here
@c8 $c6 UNDER $c7
@c9 $c8 IMPLIES unknown_status
@result $c9 IS_A unknown_concept_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Unknown concept: 1) Search XyzzyThing as subject - not found 2) Search XyzzyThing in any relation - not found 3) Concept completely absent 4) Under CWA: UNKNOWN."
    },

    // Q3: Disjoint-based negation - Cat is not a plant
    {
      id: "q3",
      TASK_NL: "Is Cat a plant? (Disjoint-based negative inference)",
      TASK_DSL: "@q3 Cat DISJOINT_WITH plant",
      ANSWEAR_NL: "NO (false) - Cat IS_A animal, animal DISJOINT_WITH plant, therefore Cat is NOT a plant",
      PROOF_DSL: `@p1 Cat IS_A animal
@p2 animal DISJOINT_WITH plant
@query Cat IS_A plant
@c1 $p1 ESTABLISHES cat_is_animal
@c2 $p2 DEFINES disjoint_constraint
@c3 $c1 LEADS_TO $c2
@c4 $query HYPOTHESIZES cat_plant
@c5 $c4 CONFLICTS $c1
@c6 animal EXCLUDES plant
@c7 $c5 VIOLATES $p2
@c8 $c7 PROVES contradiction
@c9 $c8 BLOCKS $c4
@c10 $c9 DERIVES not_plant
@result $c10 IS_A negative_inference_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Negative inference via disjoint: 1) Cat IS_A animal (known) 2) animal DISJOINT plant (constraint) 3) If Cat were plant → both animal AND plant 4) Violates disjoint → Cat NOT plant."
    },

    // Q4: Missing relation vs unknown concept
    {
      id: "q4",
      TASK_NL: "Is Paris located in Germany? (Missing relation, known concepts)",
      TASK_DSL: "@q4 Paris MISSING germany_location",
      ANSWEAR_NL: "NO/UNKNOWN - Paris and Germany are known, but no LOCATED_IN relation exists between them",
      PROOF_DSL: `@p1 Paris LOCATED_IN France
@p2 France LOCATED_IN Europe
@query Paris LOCATED_IN Germany
@c1 $query SEARCHES knowledge_base
@c2 $c1 RETURNS no_match
@c3 $c2 ESTABLISHES no_direct_relation
@c4 Paris IS known_entity
@c5 Germany IS known_entity
@c6 $c4 COMBINES $c5
@c7 $c6 DISTINGUISHES from_unknown
@c8 France LOCATED_IN Germany
@c9 $c8 RETURNS no_match
@c10 $c9 BLOCKS transitive_path
@c11 $c3 UNDER closed_world
@c12 $c11 RETURNS negative
@result $c12 IS_A missing_relation_proof
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
@c4 $c3 REACHES animal
@c5 $c4 LEADS_TO $p5
@c6 $c5 INHERITS living
@c7 Tiger REACHES animal
@c8 $c7 INHERITS_PROPERTY $p5
@result $c8 IS_A property_inheritance_proof
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
@c4 $c3 COMPUTES containment
@c5 LOCATED_IN IS transitive_relation
@c6 $c5 APPLIES $c4
@c7 Paris LOCATED_IN Europe
@c8 $c7 HAS length_2
@result $c7 IS_A transitive_containment_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Transitive containment: 1) Paris LOCATED_IN France (direct) 2) France LOCATED_IN Europe (direct) 3) LOCATED_IN is transitive 4) Therefore Paris LOCATED_IN Europe."
    },

    // Q7: Boundary between false and unknown
    {
      id: "q7",
      TASK_NL: "Distinguish: Dog IS_A plant (false) vs UnknownX IS_A plant (unknown)",
      TASK_DSL: "@q7 false DIFFERS unknown",
      ANSWEAR_NL: "Dog→animal→DISJOINT plant = FALSE. UnknownX has no info = UNKNOWN. Different epistemics.",
      PROOF_DSL: `@p1 Dog IS_A animal
@p2 animal DISJOINT_WITH plant
@c1 $p1 LEADS_TO $p2
@c2 $c1 PROVES definitely_false
@c3 UnknownX MISSING in_kb
@c4 $c3 RETURNS nothing
@c5 $c4 ESTABLISHES no_evidence
@c6 $c5 IMPLIES unknown_status
@c7 $c2 IS false
@c8 $c6 IS unknown
@c9 $c7 DIFFERS $c8
@c10 false HAS negative_evidence
@c11 unknown HAS no_evidence
@c12 $c10 DIFFERS $c11
@result $c12 IS_A epistemic_distinction_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Epistemic distinction: 1) Dog IS_A animal, animal DISJOINT plant → Dog NOT plant (FALSE with evidence) 2) UnknownX not in KB → no evidence either way (UNKNOWN) 3) FALSE ≠ UNKNOWN."
    },

    // Q8: Exhaustive search for non-animals
    {
      id: "q8",
      TASK_NL: "What things in KB are NOT animals? (Complement search)",
      TASK_DSL: "@q8 non_animals HAS 5_items",
      ANSWEAR_NL: "Paris, France, Europe, London, UK (geographic entities are not animals)",
      PROOF_DSL: `@p1 Cat IS_A animal
@p2 Dog IS_A animal
@p3 Bird IS_A animal
@p4 Tiger IS_A cat
@p5 Parrot IS_A bird
@c1 Paris MISSING animal_type
@c2 $c1 CONFIRMS non_animal
@c3 France MISSING animal_type
@c4 $c3 CONFIRMS non_animal
@c5 Europe MISSING animal_type
@c6 $c5 CONFIRMS non_animal
@c7 London MISSING animal_type
@c8 $c7 CONFIRMS non_animal
@c9 UK MISSING animal_type
@c10 $c9 CONFIRMS non_animal
@c11 $c2 COMBINES $c4
@c12 $c11 COMBINES $c6
@c13 $c12 COMBINES $c8
@c14 $c13 COMBINES $c10
@c15 $c14 TOTALS 5_items
@result $c15 IS_A complement_search_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Complement search: 1) Enumerate all concepts 2) Check each for IS_A animal path 3) Paris, France, Europe, London, UK have no path to animal 4) These are non-animals (geographic entities)."
    }
  ]
};
