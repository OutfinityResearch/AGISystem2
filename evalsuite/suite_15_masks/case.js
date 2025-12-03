/**
 * Test Case: Comprehensive Masking, Perspectives & Multi-Dimensional Classification
 * Tests ontology/axiology dimensions, masked attributes, perspective shifts, and multi-faceted queries
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_15_masks",
  name: "Comprehensive Masking, Perspectives & Multi-Dimensional Classification",

  theory_NL: "Multi-dimensional classification system. Ontology dimension: Tiger is mammal, Eagle is bird, Shark is fish, Oak is tree, Rose is flower. Category hierarchy: mammal→vertebrate→animal→living_thing. Axiology dimension: Honesty is virtue, Theft is vice, Helping is positive_action, Harming is negative_action. Actions have moral valence. Perspectives: Scientific view classifies by biology. Ethical view classifies by moral value. Aesthetic view classifies by beauty. Objects can be classified differently under different perspectives. Masked attributes: When evaluating moral worth, physical attributes (size, color) are masked. When evaluating biological classification, moral attributes are masked. Cross-cutting concerns: Tiger is both beautiful (aesthetic) and dangerous (practical). Rose is both beautiful and fragrant. Ethics: universal principles vs situational ethics.",

  theory_DSL: [
    // Ontology - biological hierarchy
    "Tiger IS_A mammal",
    "Lion IS_A mammal",
    "Eagle IS_A bird",
    "Parrot IS_A bird",
    "Shark IS_A fish",
    "mammal IS_A vertebrate",
    "bird IS_A vertebrate",
    "fish IS_A vertebrate",
    "vertebrate IS_A animal",
    "animal IS_A living_thing",
    "Oak IS_A tree",
    "Rose IS_A flower",
    "tree IS_A plant",
    "flower IS_A plant",
    "plant IS_A living_thing",
    // Properties
    "Tiger HAS_PROPERTY striped",
    "Tiger HAS_PROPERTY carnivore",
    "Tiger HAS_PROPERTY beautiful",
    "Tiger HAS_PROPERTY dangerous",
    "Eagle HAS_PROPERTY majestic",
    "Eagle HAS_PROPERTY predator",
    "Rose HAS_PROPERTY beautiful",
    "Rose HAS_PROPERTY fragrant",
    "Rose HAS_PROPERTY thorny",
    // Axiology - moral dimension
    "Honesty IS_A virtue",
    "Courage IS_A virtue",
    "Theft IS_A vice",
    "Cowardice IS_A vice",
    "Helping IS_A positive_action",
    "Harming IS_A negative_action",
    "virtue PROMOTES well_being",
    "vice HARMS well_being",
    // Perspectives
    "scientific_view CLASSIFIES_BY biology",
    "ethical_view CLASSIFIES_BY moral_value",
    "aesthetic_view CLASSIFIES_BY beauty",
    // Masking rules
    "moral_evaluation MASKS physical_attributes",
    "biological_classification MASKS moral_attributes",
    "aesthetic_evaluation INCLUDES beauty"
  ],

  tasks: [
    // Q1: Multi-level biological classification
    {
      id: "q1",
      TASK_NL: "What is the full classification chain for Tiger? (5-level hierarchy)",
      TASK_DSL: "@q1 Tiger IS_A mammal",
      ANSWEAR_NL: "Tiger→mammal→vertebrate→animal→living_thing (5 levels)",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 mammal IS_A vertebrate
@p3 vertebrate IS_A animal
@p4 animal IS_A living_thing
@c1 $p1 STARTS chain
@c2 $c1 LEADS_TO $p2
@c3 $c2 LEADS_TO $p3
@c4 $c3 LEADS_TO $p4
@c5 $c4 COMPLETES hierarchy
@c6 $c5 HAS depth_4
@c7 Tiger AT level_0
@c8 mammal AT level_1
@c9 vertebrate AT level_2
@c10 animal AT level_3
@c11 living_thing AT level_4
@c12 $c7 THROUGH $c11
@result $c12 IS_A hierarchy_traversal_proof
@proof $result PROVES $q1`,
      PROOF_NL: "5-level hierarchy: 1) Tiger IS_A mammal 2) mammal IS_A vertebrate 3) vertebrate IS_A animal 4) animal IS_A living_thing. Full chain from instance to root."
    },

    // Q2: Cross-category comparison - Tiger vs Oak
    {
      id: "q2",
      TASK_NL: "What do Tiger and Oak have in common? (Common ancestor search)",
      TASK_DSL: "@q2 animal IS_A living_thing",
      ANSWEAR_NL: "Both are living_thing (Tiger via animal path, Oak via plant path)",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 mammal IS_A vertebrate
@p3 vertebrate IS_A animal
@p4 animal IS_A living_thing
@p5 Oak IS_A tree
@p6 tree IS_A plant
@p7 plant IS_A living_thing
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $p5 LEADS_TO $p6
@c5 $c4 LEADS_TO $p7
@c6 $c3 REACHES living_thing
@c7 $c5 REACHES living_thing
@c8 $c6 EQUALS $c7
@c9 living_thing IS common_ancestor
@c10 animal DISJOINT plant
@c11 $c3 DIFFERS $c5
@c12 $c11 AT $c9
@result $c8 IS_A common_ancestor_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Common ancestor search: 1) Tiger path: mammal→vertebrate→animal→living_thing 2) Oak path: tree→plant→living_thing 3) Paths diverge (animal vs plant) but merge at living_thing."
    },

    // Q3: Multi-property classification - Tiger's dimensions
    {
      id: "q3",
      TASK_NL: "Classify Tiger across all dimensions (biological, aesthetic, practical)",
      TASK_DSL: "@q3 Tiger HAS_PROPERTY beautiful",
      ANSWEAR_NL: "Biological: mammal/carnivore. Aesthetic: beautiful/striped. Practical: dangerous.",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 Tiger HAS_PROPERTY carnivore
@p3 Tiger HAS_PROPERTY beautiful
@p4 Tiger HAS_PROPERTY striped
@p5 Tiger HAS_PROPERTY dangerous
@c1 $p1 COMBINES $p2
@c2 $c1 CLASSIFIES biological
@c3 $p3 COMBINES $p4
@c4 $c3 CLASSIFIES aesthetic
@c5 $p5 CLASSIFIES practical
@c6 $c2 UNDER scientific_view
@c7 $c4 UNDER aesthetic_view
@c8 $c5 UNDER practical_view
@c9 $c6 COMBINES $c7
@c10 $c9 COMBINES $c8
@c11 $c10 PROVES multi_dimensional
@result $c11 IS_A multi_dimensional_classification
@proof $result PROVES $q3`,
      PROOF_NL: "Multi-dimensional: 1) Biological dimension: mammal, carnivore 2) Aesthetic dimension: beautiful, striped 3) Practical dimension: dangerous. Same entity, multiple valid classifications."
    },

    // Q4: Moral classification with masking
    {
      id: "q4",
      TASK_NL: "Evaluate Honesty morally (masked: who is honest, their appearance)",
      TASK_DSL: "@q4 virtue PROMOTES well_being",
      ANSWEAR_NL: "Honesty IS_A virtue, virtue PROMOTES well_being → positive moral value. Person's appearance masked.",
      PROOF_DSL: `@p1 Honesty IS_A virtue
@p2 virtue PROMOTES well_being
@p3 moral_evaluation MASKS physical_attributes
@c1 $p1 ESTABLISHES virtue_status
@c2 $c1 LEADS_TO $p2
@c3 $c2 DERIVES positive
@c4 physical_attributes IS relevant
@c5 $p3 APPLIES $c4
@c6 $c5 EXCLUDES physical_attributes
@c7 $c3 WITHOUT $c6
@c8 $c7 UNDER universal_ethics
@c9 $c8 APPLIES all_contexts
@result $c7 IS_A masked_evaluation_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Masked moral evaluation: 1) Honesty IS_A virtue 2) Virtue PROMOTES well_being 3) Physical attributes masked (irrelevant to moral worth) 4) Pure moral evaluation: positive."
    },

    // Q5: Compare perspectives on Rose
    {
      id: "q5",
      TASK_NL: "How is Rose classified under scientific vs aesthetic perspectives?",
      TASK_DSL: "@q5 Rose HAS_PROPERTY beautiful",
      ANSWEAR_NL: "Scientific: flower→plant→living_thing. Aesthetic: beautiful, fragrant. Different relevant features.",
      PROOF_DSL: `@p1 Rose IS_A flower
@p2 flower IS_A plant
@p3 plant IS_A living_thing
@p4 Rose HAS_PROPERTY beautiful
@p5 Rose HAS_PROPERTY fragrant
@p6 Rose HAS_PROPERTY thorny
@p7 scientific_view CLASSIFIES_BY biology
@p8 aesthetic_view CLASSIFIES_BY beauty
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 USES $p7
@c4 biology SELECTS type_hierarchy
@c5 $p8 SELECTS $p4
@c6 $c5 COMBINES $p5
@c7 $c6 IGNORES $p6
@c8 $p6 IRRELEVANT beauty
@c9 $c3 DIFFERS $c6
@c10 $c9 UNDER different_perspectives
@result $c10 IS_A perspective_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Perspective comparison: 1) Scientific: focuses on taxonomy (flower→plant) 2) Aesthetic: focuses on beauty, fragrance 3) Thorns irrelevant to beauty 4) Different perspectives, different features."
    },

    // Q6: Virtue vs Vice classification
    {
      id: "q6",
      TASK_NL: "Compare Honesty (virtue) vs Theft (vice) moral effects",
      TASK_DSL: "@q6 vice HARMS well_being",
      ANSWEAR_NL: "Virtue PROMOTES well_being, Vice HARMS well_being - opposite effects",
      PROOF_DSL: `@p1 Honesty IS_A virtue
@p2 Theft IS_A vice
@p3 virtue PROMOTES well_being
@p4 vice HARMS well_being
@c1 $p1 LEADS_TO $p3
@c2 $c1 PRODUCES positive_well_being
@c3 $p2 LEADS_TO $p4
@c4 $c3 PRODUCES negative_well_being
@c5 $c2 OPPOSITE $c4
@c6 promotes CONTRASTS harms
@c7 positive CONTRASTS negative
@c8 $c6 DEFINES good_bad
@c9 $p1 FALLS_ON positive_side
@c10 $p2 FALLS_ON negative_side
@c11 $c9 MIRRORS $c10
@result $c11 IS_A moral_contrast_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Moral contrast: 1) Honesty→virtue→PROMOTES well_being 2) Theft→vice→HARMS well_being 3) PROMOTES contrasts HARMS 4) Opposite moral valences on good/bad axis."
    },

    // Q7: Living thing classification breadth
    {
      id: "q7",
      TASK_NL: "What are all living_things in the KB? (Breadth search)",
      TASK_DSL: "@q7 plant IS_A living_thing",
      ANSWEAR_NL: "Tiger, Lion, Eagle, Parrot, Shark (animals) + Oak, Rose (plants) = 7 instances",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 Lion IS_A mammal
@p3 Eagle IS_A bird
@p4 Parrot IS_A bird
@p5 Shark IS_A fish
@p6 Oak IS_A tree
@p7 Rose IS_A flower
@p8 mammal LEADS_TO animal
@p9 bird LEADS_TO animal
@p10 fish LEADS_TO animal
@c1 tree LEADS_TO plant
@c2 flower LEADS_TO plant
@c3 animal LEADS_TO living_thing
@c4 plant LEADS_TO living_thing
@c5 $p1 REACHES living_thing
@c6 $p2 REACHES living_thing
@c7 $p3 REACHES living_thing
@c8 $p4 REACHES living_thing
@c9 $p5 REACHES living_thing
@c10 $p6 REACHES living_thing
@c11 $p7 REACHES living_thing
@c12 $c5 COMBINES $c6
@c13 $c12 COMBINES $c7
@c14 $c13 COMBINES $c8
@c15 $c14 COMBINES $c9
@c16 $c15 COMBINES $c10
@c17 $c16 COMBINES $c11
@c18 $c17 HAS 7_instances
@result $c18 IS_A breadth_enumeration_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Breadth enumeration: 1) Find all instances with path to living_thing 2) Animals: Tiger, Lion, Eagle, Parrot, Shark 3) Plants: Oak, Rose 4) Total: 7 living things."
    },

    // Q8: Cross-dimensional query - beautiful AND living
    {
      id: "q8",
      TASK_NL: "What things are both beautiful AND living? (Cross-dimensional intersection)",
      TASK_DSL: "@q8 Tiger HAS_PROPERTY dangerous",
      ANSWEAR_NL: "Tiger (beautiful + animal) and Rose (beautiful + plant) - both satisfy both criteria",
      PROOF_DSL: `@p1 Tiger HAS_PROPERTY beautiful
@p2 Tiger IS_A mammal
@p3 Rose HAS_PROPERTY beautiful
@p4 Rose IS_A flower
@p5 mammal IS_A vertebrate
@p6 vertebrate IS_A animal
@p7 animal IS_A living_thing
@p8 flower IS_A plant
@p9 plant IS_A living_thing
@c1 $p1 SATISFIES aesthetic_criterion
@c2 $p2 LEADS_TO $p5
@c3 $c2 LEADS_TO $p6
@c4 $c3 LEADS_TO $p7
@c5 $c4 SATISFIES living_criterion
@c6 $c1 COMBINES $c5
@c7 $p3 SATISFIES aesthetic_criterion
@c8 $p4 LEADS_TO $p8
@c9 $c8 LEADS_TO $p9
@c10 $c9 SATISFIES living_criterion
@c11 $c7 COMBINES $c10
@c12 $c6 COMBINES $c11
@c13 $c12 HAS 2_members
@result $c13 IS_A cross_dimensional_intersection
@proof $result PROVES $q8`,
      PROOF_NL: "Cross-dimensional: 1) Tiger: beautiful (aesthetic) + mammal→animal→living_thing 2) Rose: beautiful (aesthetic) + flower→plant→living_thing 3) Both satisfy both criteria. Intersection = {Tiger, Rose}."
    }
  ]
};
