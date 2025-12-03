/**
 * Test Case: Comprehensive Memory Management & Retention Policies
 * Tests concept classification hierarchies, retention policy inheritance, and garbage collection reasoning
 * Version: 5.0 - Complex proofs with priority inheritance, conflict resolution, and multi-level retention analysis
 */
module.exports = {
  id: "suite_16_memory_forgetting",
  name: "Comprehensive Memory Management & Retention Policies",

  theory_NL: "Memory management system with hierarchical retention policies. Importance hierarchy: essential→important→normal→temporary→scratch. Essential things are never deleted. Important things retained for long_term. Normal things retained for medium_term. Temporary things retained for short_term. Scratch items deleted on cleanup. Specific items: CoreConcept and Critical are essential. KeepMe and Archive are important. UserData is normal. DropMe and TempData are temporary. Scratch1 and Scratch2 are scratch. Retention policies: essential has priority 100, important has priority 75, normal has priority 50, temporary has priority 25, scratch has priority 0. Cleanup policy: delete items with priority < threshold. Default threshold is 30. Archive older than 1 year downgrades to normal. Conflict resolution: when item has multiple classifications, use highest priority. Access frequency boosts priority: frequently_accessed gets +20 priority boost.",

  theory_DSL: [
    // Importance hierarchy
    "essential_thing IS_A importance_level",
    "important_thing IS_A importance_level",
    "normal_thing IS_A importance_level",
    "temporary_thing IS_A importance_level",
    "scratch_item IS_A importance_level",
    // Priority levels
    "essential_thing HAS_PRIORITY 100",
    "important_thing HAS_PRIORITY 75",
    "normal_thing HAS_PRIORITY 50",
    "temporary_thing HAS_PRIORITY 25",
    "scratch_item HAS_PRIORITY 0",
    // Retention policies
    "essential_thing RETAINED_FOR never_deleted",
    "important_thing RETAINED_FOR long_term",
    "normal_thing RETAINED_FOR medium_term",
    "temporary_thing RETAINED_FOR short_term",
    "scratch_item RETAINED_FOR until_cleanup",
    // Cleanup thresholds
    "default_cleanup HAS_THRESHOLD 30",
    "aggressive_cleanup HAS_THRESHOLD 60",
    "conservative_cleanup HAS_THRESHOLD 10",
    // Concept classifications
    "CoreConcept IS_A essential_thing",
    "Critical IS_A essential_thing",
    "KeepMe IS_A important_thing",
    "Archive IS_A important_thing",
    "UserData IS_A normal_thing",
    "DropMe IS_A temporary_thing",
    "TempData IS_A temporary_thing",
    "Scratch1 IS_A scratch_item",
    "Scratch2 IS_A scratch_item",
    // Access patterns
    "Archive ACCESSED frequently",
    "UserData ACCESSED rarely",
    "frequently_accessed ADDS_PRIORITY 20",
    // Age-based rules
    "old_archive AGE greater_than_1_year",
    "old_data DOWNGRADES_TO normal_thing",
    // Cleanup rules
    "cleanup DELETES below_threshold",
    "cleanup PRESERVES above_threshold",
    // Conflict resolution
    "multiple_classifications USES highest_priority"
  ],

  tasks: [
    // Q1: Priority inheritance chain
    {
      id: "q1",
      TASK_NL: "What is the retention priority of CoreConcept? (Priority inheritance through chain)",
      TASK_DSL: "@q1 CoreConcept HAS_PRIORITY value",
      ANSWEAR_NL: "Priority 100: CoreConcept→essential_thing→priority 100. Essential items have maximum retention.",
      PROOF_DSL: `@p1 CoreConcept IS_A essential_thing
@p2 essential_thing HAS_PRIORITY 100
@c1 $p1 ESTABLISHES type_of_CoreConcept
@c2 $c1 LEADS_TO $p2
@inherit $c2 COMPUTES priority_inheritance
@trace CoreConcept THROUGH essential_thing
@priority $trace REACHES 100
@verify $priority MATCHES $p2
@max 100 IS maximum_priority
@essential_rule $max ENSURES never_deleted
@result $inherit IS_A priority_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Priority inheritance: 1) CoreConcept IS_A essential_thing 2) essential_thing HAS_PRIORITY 100 3) Inherit priority through type chain 4) CoreConcept has priority 100 (maximum)."
    },

    // Q2: Cleanup survival analysis - what survives default cleanup?
    {
      id: "q2",
      TASK_NL: "Which items survive default cleanup (threshold 30)? (Multi-item priority comparison)",
      TASK_DSL: "@q2 default_cleanup SURVIVORS listed",
      ANSWEAR_NL: "CoreConcept, Critical (100), KeepMe, Archive (75), UserData (50) survive. DropMe, TempData (25), Scratch1, Scratch2 (0) deleted.",
      PROOF_DSL: `@p1 default_cleanup HAS_THRESHOLD 30
@p2 essential_thing HAS_PRIORITY 100
@p3 important_thing HAS_PRIORITY 75
@p4 normal_thing HAS_PRIORITY 50
@p5 temporary_thing HAS_PRIORITY 25
@p6 scratch_item HAS_PRIORITY 0
@check1 100 GREATER_THAN $p1
@check2 75 GREATER_THAN $p1
@check3 50 GREATER_THAN $p1
@check4 25 LESS_THAN $p1
@check5 0 LESS_THAN $p1
@survive1 $check1 MEANS essential_survives
@survive2 $check2 MEANS important_survives
@survive3 $check3 MEANS normal_survives
@delete1 $check4 MEANS temporary_deleted
@delete2 $check5 MEANS scratch_deleted
@survivors $survive1 AND $survive2
@survivors2 $survivors AND $survive3
@deleted $delete1 AND $delete2
@count_survive $survivors2 HAS 5_items
@count_delete $deleted HAS 4_items
@enumerate CoreConcept Critical KeepMe Archive UserData
@result $count_survive IS_A cleanup_analysis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Cleanup analysis: 1) Threshold=30 2) Check each priority level 3) 100>30, 75>30, 50>30 → survive 4) 25<30, 0<30 → deleted 5) 5 survive, 4 deleted."
    },

    // Q3: Access frequency priority boost
    {
      id: "q3",
      TASK_NL: "What is Archive's effective priority after access frequency boost?",
      TASK_DSL: "@q3 Archive EFFECTIVE_PRIORITY boosted",
      ANSWEAR_NL: "75 + 20 = 95. Archive has base priority 75 (important) + 20 (frequently accessed) = 95 effective priority.",
      PROOF_DSL: `@p1 Archive IS_A important_thing
@p2 important_thing HAS_PRIORITY 75
@p3 Archive ACCESSED frequently
@p4 frequently_accessed ADDS_PRIORITY 20
@c1 $p1 LEADS_TO $p2
@base_priority $c1 COMPUTES 75
@c2 $p3 TRIGGERS $p4
@boost $c2 COMPUTES 20
@add $base_priority PLUS $boost
@effective $add EQUALS 95
@compare 95 LESS_THAN 100
@still_below_essential $compare CONFIRMS
@but_above_important 95 GREATER_THAN 75
@boosted_ranking $but_above_important IMPROVES retention
@result $effective IS_A priority_boost_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Priority boost: 1) Archive IS_A important → base 75 2) Frequently accessed → +20 boost 3) 75 + 20 = 95 effective 4) Higher than base important but below essential."
    },

    // Q4: Aggressive cleanup impact analysis
    {
      id: "q4",
      TASK_NL: "What happens during aggressive cleanup (threshold 60)?",
      TASK_DSL: "@q4 aggressive_cleanup IMPACT analysis",
      ANSWEAR_NL: "Only essential items (CoreConcept, Critical) survive. Important (75>60) barely survives. Normal (50<60) and below deleted.",
      PROOF_DSL: `@p1 aggressive_cleanup HAS_THRESHOLD 60
@p2 essential_thing HAS_PRIORITY 100
@p3 important_thing HAS_PRIORITY 75
@p4 normal_thing HAS_PRIORITY 50
@check1 100 GREATER_THAN 60
@check2 75 GREATER_THAN 60
@check3 50 LESS_THAN 60
@essential_survives $check1 PASSES
@important_survives $check2 PASSES_MARGINALLY
@margin 75 MINUS 60 EQUALS 15
@risk $margin IS narrow_margin
@normal_deleted $check3 FAILS
@cascade UserData DELETED
@cascade2 DropMe TempData DELETED
@cascade3 Scratch1 Scratch2 DELETED
@survivors CoreConcept Critical KeepMe Archive
@count_survive $survivors HAS 4_items
@count_delete 5_items DELETED
@compare_to_default 4 LESS_THAN 5
@more_aggressive $compare_to_default CONFIRMS
@result $survivors IS_A aggressive_cleanup_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Aggressive cleanup: 1) Threshold=60 2) 100>60 ✓, 75>60 ✓ (margin 15), 50<60 ✗ 3) Essential+important survive 4) Normal+below deleted 5) 4 survive vs 5 in default."
    },

    // Q5: Age-based downgrade reasoning
    {
      id: "q5",
      TASK_NL: "What happens to Archive after 1 year? (Age-based priority change)",
      TASK_DSL: "@q5 old_archive PRIORITY_CHANGE analyzed",
      ANSWEAR_NL: "Old archive downgrades: important(75) → normal(50). Would not survive aggressive cleanup after downgrade.",
      PROOF_DSL: `@p1 Archive IS_A important_thing
@p2 important_thing HAS_PRIORITY 75
@p3 old_archive AGE greater_than_1_year
@p4 old_data DOWNGRADES_TO normal_thing
@p5 normal_thing HAS_PRIORITY 50
@before_age Archive HAS_PRIORITY 75
@time_passes Archive BECOMES old_archive
@c1 $time_passes TRIGGERS $p3
@c2 $c1 LEADS_TO $p4
@apply_rule $c2 DOWNGRADES Archive
@new_type Archive IS_A normal_thing
@new_priority $new_type LEADS_TO $p5
@after_age Archive HAS_PRIORITY 50
@delta 75 MINUS 50 EQUALS 25
@impact $delta IS significant_drop
@aggressive_check 50 LESS_THAN 60
@would_be_deleted $aggressive_check UNDER aggressive_cleanup
@result $impact IS_A age_downgrade_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Age-based downgrade: 1) Archive starts as important (75) 2) After 1 year → old_archive 3) Old data downgrades to normal 4) New priority: 50 5) Would fail aggressive cleanup (50<60)."
    },

    // Q6: Conflict resolution - item with multiple classifications
    {
      id: "q6",
      TASK_NL: "If an item is both important_thing AND temporary_thing, what priority applies?",
      TASK_DSL: "@q6 multiple_classifications RESOLUTION highest",
      ANSWEAR_NL: "Conflict resolution: use highest priority. Important(75) > Temporary(25), so 75 applies.",
      PROOF_DSL: `@p1 multiple_classifications USES highest_priority
@p2 important_thing HAS_PRIORITY 75
@p3 temporary_thing HAS_PRIORITY 25
@hypothetical Item IS_A important_thing
@hypothetical2 Item IS_A temporary_thing
@conflict $hypothetical AND $hypothetical2
@detect $conflict HAS multiple_classifications
@apply_rule $detect TRIGGERS $p1
@compare 75 GREATER_THAN 25
@select $compare CHOOSES 75
@resolution $select APPLIES highest
@effective Item HAS_PRIORITY 75
@verify $effective MATCHES $p2
@not_deleted 75 GREATER_THAN 30
@survives_default $not_deleted CONFIRMS
@result $resolution IS_A conflict_resolution_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Conflict resolution: 1) Item classified as both important AND temporary 2) Apply highest_priority rule 3) Compare 75 vs 25 4) 75 wins 5) Item has effective priority 75."
    },

    // Q7: Retention chain - what's the retention period for UserData?
    {
      id: "q7",
      TASK_NL: "What is UserData's retention period? (Full chain: item→type→priority→retention)",
      TASK_DSL: "@q7 UserData RETENTION_PERIOD derived",
      ANSWEAR_NL: "UserData→normal_thing→medium_term retention. Priority 50, survives default but not aggressive cleanup.",
      PROOF_DSL: `@p1 UserData IS_A normal_thing
@p2 normal_thing HAS_PRIORITY 50
@p3 normal_thing RETAINED_FOR medium_term
@p4 default_cleanup HAS_THRESHOLD 30
@p5 aggressive_cleanup HAS_THRESHOLD 60
@c1 $p1 ESTABLISHES UserData_type
@c2 $c1 LEADS_TO $p2
@priority $c2 DERIVES 50
@c3 $c1 LEADS_TO $p3
@retention $c3 DERIVES medium_term
@check_default 50 GREATER_THAN 30
@default_survives $check_default CONFIRMS
@check_aggressive 50 LESS_THAN 60
@aggressive_fails $check_aggressive CONFIRMS
@full_chain UserData THROUGH normal_thing
@chain2 $full_chain TO priority_50
@chain3 $chain2 TO medium_term
@summary $chain3 COMPLETES full_derivation
@result $summary IS_A retention_chain_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Retention chain: 1) UserData IS_A normal_thing 2) normal_thing → priority 50 3) normal_thing → medium_term retention 4) Survives default (50>30) 5) Fails aggressive (50<60)."
    },

    // Q8: Complete retention hierarchy enumeration
    {
      id: "q8",
      TASK_NL: "Enumerate all items by retention level (hierarchical grouping)",
      TASK_DSL: "@q8 retention_hierarchy ENUMERATED",
      ANSWEAR_NL: "Never deleted: CoreConcept, Critical. Long-term: KeepMe, Archive. Medium-term: UserData. Short-term: DropMe, TempData. Until cleanup: Scratch1, Scratch2.",
      PROOF_DSL: `@p1 essential_thing RETAINED_FOR never_deleted
@p2 important_thing RETAINED_FOR long_term
@p3 normal_thing RETAINED_FOR medium_term
@p4 temporary_thing RETAINED_FOR short_term
@p5 scratch_item RETAINED_FOR until_cleanup
@find_essential CoreConcept Critical IS_A essential_thing
@find_important KeepMe Archive IS_A important_thing
@find_normal UserData IS_A normal_thing
@find_temp DropMe TempData IS_A temporary_thing
@find_scratch Scratch1 Scratch2 IS_A scratch_item
@group1 $find_essential MAPS_TO $p1
@group2 $find_important MAPS_TO $p2
@group3 $find_normal MAPS_TO $p3
@group4 $find_temp MAPS_TO $p4
@group5 $find_scratch MAPS_TO $p5
@hierarchy $group1 THEN $group2
@hierarchy2 $hierarchy THEN $group3
@hierarchy3 $hierarchy2 THEN $group4
@hierarchy4 $hierarchy3 THEN $group5
@count $hierarchy4 HAS 5_levels
@total 9_items CLASSIFIED
@complete $total COVERS all_items
@result $complete IS_A hierarchical_enumeration_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Hierarchical enumeration: 1) Never deleted: 2 items 2) Long-term: 2 items 3) Medium-term: 1 item 4) Short-term: 2 items 5) Until cleanup: 2 items 6) Total: 9 items in 5 levels."
    }
  ]
};
