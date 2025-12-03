/**
 * Test Case: Comprehensive Masking, Perspectives & Multi-Dimensional Classification
 * Tests ontology/axiology dimensions, masked attributes, perspective shifts, and multi-faceted queries
 * Version: 5.0 - Complex proofs with dimensional analysis, perspective-based inference, and cross-category reasoning
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
    "aesthetic_evaluation INCLUDES beauty",
    // Ethics levels
    "universal_ethics APPLIES_TO all_contexts",
    "situational_ethics DEPENDS_ON context"
  ],

  tasks: [
    // Q1: Multi-level biological classification
    {
      id: "q1",
      TASK_NL: "What is the full classification chain for Tiger? (5-level hierarchy)",
      TASK_DSL: "@q1 Tiger CLASSIFICATION full_chain",
      ANSWEAR_NL: "Tiger→mammal→vertebrate→animal→living_thing (5 levels)",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 mammal IS_A vertebrate
@p3 vertebrate IS_A animal
@p4 animal IS_A living_thing
@c1 $p1 STARTS chain
@c2 $c1 LEADS_TO $p2
@c3 $c2 LEADS_TO $p3
@c4 $c3 LEADS_TO $p4
@chain $c4 COMPLETES hierarchy
@levels $chain HAS depth_4
@enumerate Tiger AT level_0
@enumerate2 mammal AT level_1
@enumerate3 vertebrate AT level_2
@enumerate4 animal AT level_3
@enumerate5 living_thing AT level_4
@complete $enumerate THROUGH $enumerate5
@result $complete IS_A hierarchy_traversal_proof
@proof $result PROVES $q1`,
      PROOF_NL: "5-level hierarchy: 1) Tiger IS_A mammal 2) mammal IS_A vertebrate 3) vertebrate IS_A animal 4) animal IS_A living_thing. Full chain from instance to root."
    },

    // Q2: Cross-category comparison - Tiger vs Oak
    {
      id: "q2",
      TASK_NL: "What do Tiger and Oak have in common? (Common ancestor search)",
      TASK_DSL: "@q2 Tiger_Oak COMMON_ANCESTOR found",
      ANSWEAR_NL: "Both are living_thing (Tiger via animal path, Oak via plant path)",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 mammal IS_A vertebrate
@p3 vertebrate IS_A animal
@p4 animal IS_A living_thing
@p5 Oak IS_A tree
@p6 tree IS_A plant
@p7 plant IS_A living_thing
@tiger_path $p1 LEADS_TO $p2
@tiger_path2 $tiger_path LEADS_TO $p3
@tiger_path3 $tiger_path2 LEADS_TO $p4
@oak_path $p5 LEADS_TO $p6
@oak_path2 $oak_path LEADS_TO $p7
@tiger_root $tiger_path3 REACHES living_thing
@oak_root $oak_path2 REACHES living_thing
@common $tiger_root EQUALS $oak_root
@ancestor living_thing IS common_ancestor
@diverge animal DISJOINT plant
@paths_differ $tiger_path3 DIFFERS $oak_path2
@but_merge $paths_differ AT $ancestor
@result $common IS_A common_ancestor_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Common ancestor search: 1) Tiger path: mammal→vertebrate→animal→living_thing 2) Oak path: tree→plant→living_thing 3) Paths diverge (animal vs plant) but merge at living_thing."
    },

    // Q3: Multi-property classification - Tiger's dimensions
    {
      id: "q3",
      TASK_NL: "Classify Tiger across all dimensions (biological, aesthetic, practical)",
      TASK_DSL: "@q3 Tiger MULTI_DIMENSIONAL classification",
      ANSWEAR_NL: "Biological: mammal/carnivore. Aesthetic: beautiful/striped. Practical: dangerous.",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 Tiger HAS_PROPERTY carnivore
@p3 Tiger HAS_PROPERTY beautiful
@p4 Tiger HAS_PROPERTY striped
@p5 Tiger HAS_PROPERTY dangerous
@bio_dim $p1 AND $p2
@bio_class $bio_dim CLASSIFIES biological
@aes_dim $p3 AND $p4
@aes_class $aes_dim CLASSIFIES aesthetic
@prac_dim $p5 CLASSIFIES practical
@dimension1 $bio_class UNDER scientific_view
@dimension2 $aes_class UNDER aesthetic_view
@dimension3 $prac_dim UNDER practical_view
@combine $dimension1 AND $dimension2
@all_dims $combine AND $dimension3
@multi $all_dims PROVES multi_dimensional
@result $multi IS_A multi_dimensional_classification
@proof $result PROVES $q3`,
      PROOF_NL: "Multi-dimensional: 1) Biological dimension: mammal, carnivore 2) Aesthetic dimension: beautiful, striped 3) Practical dimension: dangerous. Same entity, multiple valid classifications."
    },

    // Q4: Moral classification with masking
    {
      id: "q4",
      TASK_NL: "Evaluate Honesty morally (masked: who is honest, their appearance)",
      TASK_DSL: "@q4 Honesty MORAL_VALUE positive",
      ANSWEAR_NL: "Honesty IS_A virtue, virtue PROMOTES well_being → positive moral value. Person's appearance masked.",
      PROOF_DSL: `@p1 Honesty IS_A virtue
@p2 virtue PROMOTES well_being
@p3 moral_evaluation MASKS physical_attributes
@c1 $p1 ESTABLISHES virtue_status
@c2 $c1 LEADS_TO $p2
@moral_value $c2 DERIVES positive
@mask_check physical_attributes RELEVANT
@c3 $p3 APPLIES_TO $mask_check
@masked $c3 EXCLUDES physical_attributes
@pure_eval $moral_value WITHOUT $masked
@universal $pure_eval UNDER universal_ethics
@context_free $universal APPLIES_TO all_contexts
@result $pure_eval IS_A masked_evaluation_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Masked moral evaluation: 1) Honesty IS_A virtue 2) Virtue PROMOTES well_being 3) Physical attributes masked (irrelevant to moral worth) 4) Pure moral evaluation: positive."
    },

    // Q5: Compare perspectives on Rose
    {
      id: "q5",
      TASK_NL: "How is Rose classified under scientific vs aesthetic perspectives?",
      TASK_DSL: "@q5 Rose PERSPECTIVE_COMPARISON done",
      ANSWEAR_NL: "Scientific: flower→plant→living_thing. Aesthetic: beautiful, fragrant. Different relevant features.",
      PROOF_DSL: `@p1 Rose IS_A flower
@p2 flower IS_A plant
@p3 plant IS_A living_thing
@p4 Rose HAS_PROPERTY beautiful
@p5 Rose HAS_PROPERTY fragrant
@p6 Rose HAS_PROPERTY thorny
@p7 scientific_view CLASSIFIES_BY biology
@p8 aesthetic_view CLASSIFIES_BY beauty
@sci_path $p1 LEADS_TO $p2
@sci_path2 $sci_path LEADS_TO $p3
@sci_class $sci_path2 USES $p7
@sci_focus biology SELECTS type_hierarchy
@aes_focus $p8 SELECTS $p4
@aes_focus2 $aes_focus AND $p5
@aes_class $aes_focus2 IGNORES $p6
@thorny_masked $p6 IRRELEVANT_TO beauty
@compare $sci_class DIFFERS $aes_class
@both_valid $compare UNDER different_perspectives
@result $both_valid IS_A perspective_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Perspective comparison: 1) Scientific: focuses on taxonomy (flower→plant) 2) Aesthetic: focuses on beauty, fragrance 3) Thorns irrelevant to beauty 4) Different perspectives, different features."
    },

    // Q6: Virtue vs Vice classification
    {
      id: "q6",
      TASK_NL: "Compare Honesty (virtue) vs Theft (vice) moral effects",
      TASK_DSL: "@q6 virtue_vice COMPARISON effects",
      ANSWEAR_NL: "Virtue PROMOTES well_being, Vice HARMS well_being - opposite effects",
      PROOF_DSL: `@p1 Honesty IS_A virtue
@p2 Theft IS_A vice
@p3 virtue PROMOTES well_being
@p4 vice HARMS well_being
@c1 $p1 LEADS_TO $p3
@honesty_effect $c1 PRODUCES positive_well_being
@c2 $p2 LEADS_TO $p4
@theft_effect $c2 PRODUCES negative_well_being
@compare $honesty_effect OPPOSITE $theft_effect
@promotes CONTRASTS harms
@positive CONTRASTS negative
@moral_axis $promotes DEFINES good_bad
@classify_honesty $p1 FALLS_ON positive_side
@classify_theft $p2 FALLS_ON negative_side
@symmetric $classify_honesty MIRRORS $classify_theft
@result $symmetric IS_A moral_contrast_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Moral contrast: 1) Honesty→virtue→PROMOTES well_being 2) Theft→vice→HARMS well_being 3) PROMOTES contrasts HARMS 4) Opposite moral valences on good/bad axis."
    },

    // Q7: Living thing classification breadth
    {
      id: "q7",
      TASK_NL: "What are all living_things in the KB? (Breadth search)",
      TASK_DSL: "@q7 living_things ENUMERATED all",
      ANSWEAR_NL: "Tiger, Lion, Eagle, Parrot, Shark (animals) + Oak, Rose (plants) = 7 instances",
      PROOF_DSL: `@p1 Tiger IS_A mammal
@p2 Lion IS_A mammal
@p3 Eagle IS_A bird
@p4 Parrot IS_A bird
@p5 Shark IS_A fish
@p6 Oak IS_A tree
@p7 Rose IS_A flower
@animal_path mammal LEADS_TO animal
@animal_path2 bird LEADS_TO animal
@animal_path3 fish LEADS_TO animal
@plant_path tree LEADS_TO plant
@plant_path2 flower LEADS_TO plant
@to_living animal LEADS_TO living_thing
@to_living2 plant LEADS_TO living_thing
@trace1 $p1 REACHES living_thing
@trace2 $p2 REACHES living_thing
@trace3 $p3 REACHES living_thing
@trace4 $p4 REACHES living_thing
@trace5 $p5 REACHES living_thing
@trace6 $p6 REACHES living_thing
@trace7 $p7 REACHES living_thing
@animals $trace1 AND $trace2
@animals2 $animals AND $trace3
@animals3 $animals2 AND $trace4
@animals4 $animals3 AND $trace5
@plants $trace6 AND $trace7
@all $animals4 AND $plants
@count $all HAS 7_instances
@result $count IS_A breadth_enumeration_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Breadth enumeration: 1) Find all instances with path to living_thing 2) Animals: Tiger, Lion, Eagle, Parrot, Shark 3) Plants: Oak, Rose 4) Total: 7 living things."
    },

    // Q8: Cross-dimensional query - beautiful AND living
    {
      id: "q8",
      TASK_NL: "What things are both beautiful AND living? (Cross-dimensional intersection)",
      TASK_DSL: "@q8 beautiful_AND_living INTERSECTION",
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
@tiger_beautiful $p1 SATISFIES aesthetic_criterion
@tiger_chain $p2 LEADS_TO $p5
@tiger_chain2 $tiger_chain LEADS_TO $p6
@tiger_chain3 $tiger_chain2 LEADS_TO $p7
@tiger_living $tiger_chain3 SATISFIES living_criterion
@tiger_both $tiger_beautiful AND $tiger_living
@rose_beautiful $p3 SATISFIES aesthetic_criterion
@rose_chain $p4 LEADS_TO $p8
@rose_chain2 $rose_chain LEADS_TO $p9
@rose_living $rose_chain2 SATISFIES living_criterion
@rose_both $rose_beautiful AND $rose_living
@intersection $tiger_both AND $rose_both
@count $intersection HAS 2_members
@result $intersection IS_A cross_dimensional_intersection
@proof $result PROVES $q8`,
      PROOF_NL: "Cross-dimensional: 1) Tiger: beautiful (aesthetic) + mammal→animal→living_thing 2) Rose: beautiful (aesthetic) + flower→plant→living_thing 3) Both satisfy both criteria. Intersection = {Tiger, Rose}."
    }
  ]
};
