/**
 * Test Case: Comprehensive Theory Storage & Hardware Dependency Reasoning
 * Tests component relationships, dependency chains, failure propagation, and system composition
 * Version: 5.0 - Complex proofs with transitive dependencies, failure analysis, and composition rules
 */
module.exports = {
  id: "suite_17_theory_storage",
  name: "Comprehensive Theory Storage & Hardware Dependency Reasoning",

  theory_NL: "Hardware system with component dependencies. Computer has DiskA, MemoryB, PowerSupply. Server has CoolingFan, MemoryB. Workstation has CPUC, GraphicsCard. Network topology: NetworkD and Switch connect to Router. Power dependencies: PowerSupply powers Computer, which powers all its components. Cooling dependencies: CoolingFan cools Server, preventing overheating. Failure propagation: if power fails, dependent components fail. If cooling fails, server overheats. Transitive dependencies: DiskA depends on PowerSupply (through Computer). Component hierarchy: Component→HardwareItem→Asset. Network is redundant if multiple paths exist. Data integrity requires both DiskA AND MemoryB. System is operational if all critical components work.",

  theory_DSL: [
    // Component composition
    "DiskA PART_OF Computer",
    "MemoryB PART_OF Computer",
    "PowerSupply PART_OF Computer",
    "MemoryB PART_OF Server",
    "CoolingFan PART_OF Server",
    "CPUC PART_OF Workstation",
    "GraphicsCard PART_OF Workstation",
    // Network topology
    "NetworkD CONNECTS_TO Router",
    "Switch CONNECTS_TO Router",
    "Router CONNECTS_TO Internet",
    // Power dependencies
    "PowerSupply POWERS Computer",
    "Computer POWERS DiskA",
    "Computer POWERS MemoryB",
    // Cooling dependencies
    "CoolingFan COOLS Server",
    "cooling_failure CAUSES overheating",
    "overheating CAUSES server_shutdown",
    // Component hierarchy
    "DiskA IS_A storage_component",
    "MemoryB IS_A memory_component",
    "CPUC IS_A processing_component",
    "GraphicsCard IS_A display_component",
    "storage_component IS_A component",
    "memory_component IS_A component",
    "processing_component IS_A component",
    "display_component IS_A component",
    "component IS_A hardware_item",
    "hardware_item IS_A asset",
    // Failure propagation
    "power_failure AFFECTS PowerSupply",
    "PowerSupply_failure CASCADES_TO Computer",
    "Computer_failure CASCADES_TO DiskA",
    "Computer_failure CASCADES_TO MemoryB",
    // Redundancy
    "multiple_paths PROVIDES redundancy",
    "NetworkD PROVIDES path_to_Internet",
    "Switch PROVIDES path_to_Internet",
    // Data integrity
    "data_integrity REQUIRES DiskA",
    "data_integrity REQUIRES MemoryB",
    // Operational status
    "system_operational REQUIRES all_critical_working"
  ],

  tasks: [
    // Q1: Deep component hierarchy - what type is DiskA?
    {
      id: "q1",
      TASK_NL: "What is DiskA's full type hierarchy? (5-level chain)",
      TASK_DSL: "@q1 DiskA TYPE_HIERARCHY complete",
      ANSWEAR_NL: "DiskA→storage_component→component→hardware_item→asset (5 levels)",
      PROOF_DSL: `@p1 DiskA IS_A storage_component
@p2 storage_component IS_A component
@p3 component IS_A hardware_item
@p4 hardware_item IS_A asset
@c1 $p1 STARTS hierarchy_chain
@c2 $c1 LEADS_TO $p2
@c3 $c2 LEADS_TO $p3
@c4 $c3 LEADS_TO $p4
@chain $c4 COMPLETES full_hierarchy
@level1 DiskA AT level_0
@level2 storage_component AT level_1
@level3 component AT level_2
@level4 hardware_item AT level_3
@level5 asset AT level_4
@enumerate $level1 THROUGH $level5
@depth $enumerate HAS 5_levels
@result $chain IS_A hierarchy_traversal_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Type hierarchy: 1) DiskA IS_A storage_component 2) storage_component IS_A component 3) component IS_A hardware_item 4) hardware_item IS_A asset 5) Five levels total."
    },

    // Q2: Transitive power dependency
    {
      id: "q2",
      TASK_NL: "What is DiskA's power dependency chain? (Transitive dependency)",
      TASK_DSL: "@q2 DiskA POWER_DEPENDENCY traced",
      ANSWEAR_NL: "PowerSupply→Computer→DiskA. DiskA depends on PowerSupply through Computer.",
      PROOF_DSL: `@p1 PowerSupply POWERS Computer
@p2 Computer POWERS DiskA
@p3 DiskA PART_OF Computer
@c1 $p1 ESTABLISHES power_source
@c2 $p2 ESTABLISHES power_path
@c3 $c1 LEADS_TO $c2
@transitive $c3 COMPUTES dependency_chain
@start PowerSupply IS source
@middle Computer IS intermediary
@end DiskA IS dependent
@chain $start THROUGH $middle
@chain2 $chain TO $end
@verify $p3 CONFIRMS part_of_relationship
@dependency $chain2 PROVES transitive_power
@result $dependency IS_A transitive_dependency_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Transitive dependency: 1) PowerSupply POWERS Computer 2) Computer POWERS DiskA 3) Chain: PowerSupply→Computer→DiskA 4) DiskA transitively depends on PowerSupply."
    },

    // Q3: Failure cascade analysis
    {
      id: "q3",
      TASK_NL: "What happens when power fails? (Failure cascade)",
      TASK_DSL: "@q3 power_failure CASCADE analyzed",
      ANSWEAR_NL: "power_failure→PowerSupply_failure→Computer_failure→DiskA+MemoryB failure. Complete cascade.",
      PROOF_DSL: `@p1 power_failure AFFECTS PowerSupply
@p2 PowerSupply_failure CASCADES_TO Computer
@p3 Computer_failure CASCADES_TO DiskA
@p4 Computer_failure CASCADES_TO MemoryB
@step1 $p1 TRIGGERS PowerSupply_failure
@step2 $step1 TRIGGERS $p2
@step3 $step2 TRIGGERS $p3
@step4 $step2 TRIGGERS $p4
@cascade1 $step1 LEADS_TO $step2
@cascade2 $cascade1 LEADS_TO $step3
@cascade3 $cascade1 LEADS_TO $step4
@fork $step2 SPLITS_TO $step3 AND $step4
@trace power_failure LEADS_TO PowerSupply_failure
@trace2 $trace LEADS_TO Computer_failure
@trace3 $trace2 LEADS_TO DiskA_failure
@trace4 $trace2 LEADS_TO MemoryB_failure
@all_failed $trace3 AND $trace4
@count $all_failed HAS 4_component_failures
@result $count IS_A failure_cascade_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Failure cascade: 1) Power fails→PowerSupply affected 2) PowerSupply→Computer cascades 3) Computer failure forks to DiskA AND MemoryB 4) Total: 4 components fail."
    },

    // Q4: Cooling failure chain
    {
      id: "q4",
      TASK_NL: "What happens if cooling fails on Server? (Causal chain)",
      TASK_DSL: "@q4 cooling_failure CONSEQUENCE derived",
      ANSWEAR_NL: "cooling_failure→overheating→server_shutdown. Server becomes non-operational.",
      PROOF_DSL: `@p1 CoolingFan COOLS Server
@p2 cooling_failure CAUSES overheating
@p3 overheating CAUSES server_shutdown
@initial CoolingFan FAILS
@c1 $initial TRIGGERS cooling_failure
@c2 $c1 LEADS_TO $p2
@c3 $c2 DERIVES overheating
@c4 $c3 LEADS_TO $p3
@c5 $c4 DERIVES server_shutdown
@chain $c1 THEN $c2
@chain2 $chain THEN $c3
@chain3 $chain2 THEN $c4
@final $chain3 THEN $c5
@length $final HAS 3_causal_steps
@verify cooling_failure THROUGH overheating
@verify2 $verify TO server_shutdown
@result $final IS_A causal_chain_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Causal chain: 1) Cooling failure occurs 2) Causes overheating 3) Overheating causes server_shutdown 4) Three-step causal chain."
    },

    // Q5: Network redundancy analysis
    {
      id: "q5",
      TASK_NL: "Is there network redundancy to Internet? (Multiple path analysis)",
      TASK_DSL: "@q5 network REDUNDANCY verified",
      ANSWEAR_NL: "Yes: Path1: NetworkD→Router→Internet. Path2: Switch→Router→Internet. Two paths exist.",
      PROOF_DSL: `@p1 NetworkD CONNECTS_TO Router
@p2 Switch CONNECTS_TO Router
@p3 Router CONNECTS_TO Internet
@p4 multiple_paths PROVIDES redundancy
@p5 NetworkD PROVIDES path_to_Internet
@p6 Switch PROVIDES path_to_Internet
@path1 NetworkD THROUGH Router
@path1_end $path1 TO Internet
@path2 Switch THROUGH Router
@path2_end $path2 TO Internet
@c1 $path1_end CONFIRMS first_path
@c2 $path2_end CONFIRMS second_path
@count $c1 AND $c2
@multiple $count HAS 2_paths
@apply $multiple MATCHES $p4
@redundant $apply DERIVES redundancy_present
@verify $path1_end INDEPENDENT_OF $path2_end
@robust $verify CONFIRMS fault_tolerance
@result $redundant IS_A redundancy_analysis_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Redundancy analysis: 1) Path 1: NetworkD→Router→Internet 2) Path 2: Switch→Router→Internet 3) Two independent paths exist 4) Multiple paths provide redundancy."
    },

    // Q6: Data integrity requirements
    {
      id: "q6",
      TASK_NL: "What components are required for data integrity?",
      TASK_DSL: "@q6 data_integrity REQUIREMENTS listed",
      ANSWEAR_NL: "data_integrity requires DiskA (storage) AND MemoryB (memory). Both must work.",
      PROOF_DSL: `@p1 data_integrity REQUIRES DiskA
@p2 data_integrity REQUIRES MemoryB
@p3 DiskA IS_A storage_component
@p4 MemoryB IS_A memory_component
@req1 $p1 ESTABLISHES disk_requirement
@req2 $p2 ESTABLISHES memory_requirement
@both_required $req1 AND $req2
@check_disk DiskA WORKING
@check_memory MemoryB WORKING
@integrity_ok $check_disk AND $check_memory
@if_disk_fails DiskA NOT_WORKING
@consequence1 $if_disk_fails BREAKS $p1
@integrity_fail1 $consequence1 VIOLATES data_integrity
@if_memory_fails MemoryB NOT_WORKING
@consequence2 $if_memory_fails BREAKS $p2
@integrity_fail2 $consequence2 VIOLATES data_integrity
@critical $both_required ALL_MUST_WORK
@result $critical IS_A requirement_analysis_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Requirement analysis: 1) data_integrity REQUIRES DiskA 2) data_integrity REQUIRES MemoryB 3) Both are mandatory (AND condition) 4) If either fails, integrity is violated."
    },

    // Q7: Component composition - what does Workstation contain?
    {
      id: "q7",
      TASK_NL: "What components does Workstation contain and what types are they?",
      TASK_DSL: "@q7 Workstation COMPOSITION detailed",
      ANSWEAR_NL: "CPUC (processing_component) and GraphicsCard (display_component). For computation and display.",
      PROOF_DSL: `@p1 CPUC PART_OF Workstation
@p2 GraphicsCard PART_OF Workstation
@p3 CPUC IS_A processing_component
@p4 GraphicsCard IS_A display_component
@find1 $p1 ESTABLISHES cpu_in_workstation
@find2 $p2 ESTABLISHES gpu_in_workstation
@parts $find1 AND $find2
@type1 $p3 CLASSIFIES CPUC
@type2 $p4 CLASSIFIES GraphicsCard
@composition $parts WITH_TYPES $type1
@composition2 $composition AND $type2
@purpose1 processing_component FOR computation
@purpose2 display_component FOR visualization
@roles $purpose1 AND $purpose2
@complete $composition2 WITH_ROLES $roles
@count $parts HAS 2_components
@result $complete IS_A composition_analysis_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Composition analysis: 1) CPUC PART_OF Workstation (processing) 2) GraphicsCard PART_OF Workstation (display) 3) Both classified by component type 4) Total: 2 specialized components."
    },

    // Q8: Cross-system component sharing - MemoryB analysis
    {
      id: "q8",
      TASK_NL: "Is MemoryB shared between systems? What are the implications?",
      TASK_DSL: "@q8 MemoryB SHARING analyzed",
      ANSWEAR_NL: "MemoryB PART_OF Computer AND PART_OF Server. Shared resource - failure affects both systems.",
      PROOF_DSL: `@p1 MemoryB PART_OF Computer
@p2 MemoryB PART_OF Server
@p3 MemoryB IS_A memory_component
@in_computer $p1 ESTABLISHES computer_has_memoryB
@in_server $p2 ESTABLISHES server_has_memoryB
@shared $in_computer AND $in_server
@count $shared HAS 2_systems
@implies $count MEANS shared_resource
@failure_scenario MemoryB FAILS
@impact1 $failure_scenario AFFECTS Computer
@impact2 $failure_scenario AFFECTS Server
@both_impacted $impact1 AND $impact2
@risk $both_impacted IS higher_than_dedicated
@recommendation single_point_of_failure DETECTED
@mitigation add_redundant_memory SUGGESTED
@analysis $shared WITH_RISK $risk
@result $analysis IS_A sharing_analysis_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Sharing analysis: 1) MemoryB PART_OF Computer 2) MemoryB PART_OF Server 3) Shared between 2 systems 4) Single point of failure - affects both if it fails."
    }
  ]
};
