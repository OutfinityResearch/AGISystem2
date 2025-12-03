/**
 * Test Case: Comprehensive Memory Management & Retention Policies
 * Tests concept classification hierarchies, retention policy inheritance, and garbage collection reasoning
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
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
    "multiple_classifications USES highest_priority",
    // Comparison facts
    "100 GREATER_THAN 30",
    "75 GREATER_THAN 30",
    "50 GREATER_THAN 30",
    "25 LESS_THAN 30",
    "0 LESS_THAN 30",
    "100 GREATER_THAN 60",
    "75 GREATER_THAN 60",
    "50 LESS_THAN 60",
    "75 GREATER_THAN 25"
  ],

  tasks: [
    {
      id: "q1",
      TASK_NL: "What is the retention priority of CoreConcept? (Priority inheritance through chain)",
      TASK_DSL: "@q1 CoreConcept HAS_PRIORITY 100",
      ANSWEAR_NL: "Priority 100: CoreConcept→essential_thing→priority 100. Essential items have maximum retention.",
      PROOF_DSL: `@p1 CoreConcept IS_A essential_thing
@p2 essential_thing HAS_PRIORITY 100
@p3 essential_thing RETAINED_FOR never_deleted
@c1 $p1 ESTABLISHES type
@c2 $c1 LEADS_TO $p2
@c3 $c2 DERIVES 100
@c4 $c3 IS maximum_priority
@c5 $p3 ENSURES never_deleted
@c6 $c4 IMPLIES $c5
@result $c6 IS_A priority_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Priority inheritance: CoreConcept → essential_thing → priority 100 → never deleted."
    },
    {
      id: "q2",
      TASK_NL: "Which items survive default cleanup (threshold 30)? (Multi-item priority comparison)",
      TASK_DSL: "@q2 cleanup PRESERVES above_threshold",
      ANSWEAR_NL: "CoreConcept, Critical (100), KeepMe, Archive (75), UserData (50) survive. DropMe, TempData (25), Scratch1, Scratch2 (0) deleted.",
      PROOF_DSL: `@p1 default_cleanup HAS_THRESHOLD 30
@p2 essential_thing HAS_PRIORITY 100
@p3 important_thing HAS_PRIORITY 75
@p4 normal_thing HAS_PRIORITY 50
@p5 temporary_thing HAS_PRIORITY 25
@p6 scratch_item HAS_PRIORITY 0
@p7 100 GREATER_THAN 30
@p8 75 GREATER_THAN 30
@p9 50 GREATER_THAN 30
@p10 25 LESS_THAN 30
@p11 0 LESS_THAN 30
@c1 $p7 CONFIRMS essential_survives
@c2 $p8 CONFIRMS important_survives
@c3 $p9 CONFIRMS normal_survives
@c4 $p10 CONFIRMS temporary_deleted
@c5 $p11 CONFIRMS scratch_deleted
@c6 $c1 COMBINES $c2
@c7 $c6 COMBINES $c3
@c8 $c4 COMBINES $c5
@result $c7 IS_A cleanup_analysis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Cleanup analysis: 100>30, 75>30, 50>30 survive. 25<30, 0<30 deleted."
    },
    {
      id: "q3",
      TASK_NL: "What is Archive's effective priority after access frequency boost?",
      TASK_DSL: "@q3 Archive BOOSTED_TO 95",
      ANSWEAR_NL: "75 + 20 = 95. Archive has base priority 75 (important) + 20 (frequently accessed) = 95 effective priority.",
      PROOF_DSL: `@p1 Archive IS_A important_thing
@p2 important_thing HAS_PRIORITY 75
@p3 Archive ACCESSED frequently
@p4 frequently_accessed ADDS_PRIORITY 20
@c1 $p1 LEADS_TO $p2
@c2 $c1 DERIVES base_75
@c3 $p3 TRIGGERS $p4
@c4 $c3 ADDS 20
@c5 $c2 PLUS $c4
@c6 $c5 EQUALS 95
@c7 95 LESS_THAN 100
@c8 $c7 CONFIRMS below_essential
@result $c6 IS_A priority_boost_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Priority boost: 75 (base) + 20 (frequency) = 95 effective."
    },
    {
      id: "q4",
      TASK_NL: "What happens during aggressive cleanup (threshold 60)?",
      TASK_DSL: "@q4 aggressive_cleanup HAS_THRESHOLD 60",
      ANSWEAR_NL: "Only essential items (CoreConcept, Critical) survive. Important (75>60) barely survives. Normal (50<60) and below deleted.",
      PROOF_DSL: `@p1 aggressive_cleanup HAS_THRESHOLD 60
@p2 100 GREATER_THAN 60
@p3 75 GREATER_THAN 60
@p4 50 LESS_THAN 60
@c1 $p2 CONFIRMS essential_survives
@c2 $p3 CONFIRMS important_survives
@c3 75 MINUS 60
@c4 $c3 EQUALS 15_margin
@c5 $p4 CONFIRMS normal_deleted
@c6 UserData DELETED_BY $p1
@c7 DropMe DELETED_BY $p1
@c8 $c1 COMBINES $c2
@c9 $c8 SURVIVES cleanup
@result $c9 IS_A aggressive_cleanup_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Aggressive cleanup: 100>60, 75>60 survive. 50<60 and below deleted."
    },
    {
      id: "q5",
      TASK_NL: "What happens to Archive after 1 year? (Age-based priority change)",
      TASK_DSL: "@q5 old_data DOWNGRADES_TO normal_thing",
      ANSWEAR_NL: "Old archive downgrades: important(75) → normal(50). Would not survive aggressive cleanup after downgrade.",
      PROOF_DSL: `@p1 Archive IS_A important_thing
@p2 important_thing HAS_PRIORITY 75
@p3 old_archive AGE greater_than_1_year
@p4 old_data DOWNGRADES_TO normal_thing
@p5 normal_thing HAS_PRIORITY 50
@p6 50 LESS_THAN 60
@c1 $p1 ESTABLISHES initial_type
@c2 $c1 HAS priority_75
@c3 Archive BECOMES old_archive
@c4 $c3 TRIGGERS $p4
@c5 $c4 CHANGES_TO normal_thing
@c6 $c5 LEADS_TO $p5
@c7 $c6 HAS priority_50
@c8 $p6 CONFIRMS aggressive_deletion
@result $c8 IS_A age_downgrade_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Age-based downgrade: important(75) → normal(50) after 1 year. 50<60 fails aggressive."
    },
    {
      id: "q6",
      TASK_NL: "If an item is both important_thing AND temporary_thing, what priority applies?",
      TASK_DSL: "@q6 multiple_classifications USES highest_priority",
      ANSWEAR_NL: "Conflict resolution: use highest priority. Important(75) > Temporary(25), so 75 applies.",
      PROOF_DSL: `@p1 multiple_classifications USES highest_priority
@p2 important_thing HAS_PRIORITY 75
@p3 temporary_thing HAS_PRIORITY 25
@p4 75 GREATER_THAN 25
@c1 Item HAS_TYPE important_thing
@c2 Item HAS_TYPE temporary_thing
@c3 $c1 CONFLICTS $c2
@c4 $c3 TRIGGERS $p1
@c5 $p4 SELECTS 75
@c6 $c5 APPLIES highest
@c7 Item HAS_PRIORITY 75
@c8 $c7 SURVIVES default_cleanup
@result $c8 IS_A conflict_resolution_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Conflict resolution: 75 > 25, so important priority applies."
    },
    {
      id: "q7",
      TASK_NL: "What is UserData's retention period? (Full chain: item→type→priority→retention)",
      TASK_DSL: "@q7 UserData RETAINED_FOR medium_term",
      ANSWEAR_NL: "UserData→normal_thing→medium_term retention. Priority 50, survives default but not aggressive cleanup.",
      PROOF_DSL: `@p1 UserData IS_A normal_thing
@p2 normal_thing HAS_PRIORITY 50
@p3 normal_thing RETAINED_FOR medium_term
@p4 50 GREATER_THAN 30
@p5 50 LESS_THAN 60
@c1 $p1 ESTABLISHES type
@c2 $c1 LEADS_TO $p2
@c3 $c2 DERIVES priority_50
@c4 $c1 LEADS_TO $p3
@c5 $c4 DERIVES medium_term
@c6 $p4 CONFIRMS default_survives
@c7 $p5 CONFIRMS aggressive_fails
@c8 $c5 COMBINES $c6
@result $c8 IS_A retention_chain_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Retention chain: UserData → normal → priority 50 → medium_term. Survives default, fails aggressive."
    },
    {
      id: "q8",
      TASK_NL: "Enumerate all items by retention level (hierarchical grouping)",
      TASK_DSL: "@q8 retention_hierarchy IS complete",
      ANSWEAR_NL: "Never deleted: CoreConcept, Critical. Long-term: KeepMe, Archive. Medium-term: UserData. Short-term: DropMe, TempData. Until cleanup: Scratch1, Scratch2.",
      PROOF_DSL: `@p1 essential_thing RETAINED_FOR never_deleted
@p2 important_thing RETAINED_FOR long_term
@p3 normal_thing RETAINED_FOR medium_term
@p4 temporary_thing RETAINED_FOR short_term
@p5 scratch_item RETAINED_FOR until_cleanup
@p6 CoreConcept IS_A essential_thing
@p7 KeepMe IS_A important_thing
@p8 UserData IS_A normal_thing
@p9 DropMe IS_A temporary_thing
@p10 Scratch1 IS_A scratch_item
@c1 $p6 MAPS_TO $p1
@c2 $p7 MAPS_TO $p2
@c3 $p8 MAPS_TO $p3
@c4 $p9 MAPS_TO $p4
@c5 $p10 MAPS_TO $p5
@c6 $c1 COMBINES $c2
@c7 $c6 COMBINES $c3
@c8 $c7 COMBINES $c4
@c9 $c8 COMBINES $c5
@result $c9 IS_A hierarchical_enumeration_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Hierarchical enumeration: 5 levels from never_deleted to until_cleanup. 9 items total."
    }
  ]
};
