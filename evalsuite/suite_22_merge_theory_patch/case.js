/**
 * Test Case: Comprehensive Merge Theory - Component Compatibility & Power Analysis
 * Tests component relationships, power requirements, and compatibility reasoning
 * Version: 5.0 - Complex proofs with dependency chains and compatibility analysis
 */
module.exports = {
  id: "suite_22_merge_theory_patch",
  name: "Comprehensive Merge Theory - Component Compatibility & Power Analysis",

  theory_NL: "Devices and power components. RobotA uses BatteryX (12V). RobotB uses BatteryY (24V). DroneC uses MotorZ. VehicleD uses FuelCell. ServerE uses PowerUnit (220V). LaptopF uses Battery (19V). PhoneG uses MicroBattery (5V). TabletH uses SlimBattery (5V). Compatibility: same voltage components are interchangeable. Power hierarchy: 220V > 24V > 19V > 12V > 5V. Higher voltage can power lower (with regulator). Same voltage = direct compatible.",

  theory_DSL: [
    "RobotA USES BatteryX", "BatteryX HAS_VOLTAGE 12",
    "RobotB USES BatteryY", "BatteryY HAS_VOLTAGE 24",
    "DroneC USES MotorZ", "MotorZ REQUIRES_POWER high",
    "VehicleD USES FuelCell", "FuelCell HAS_VOLTAGE 48",
    "ServerE USES PowerUnit", "PowerUnit HAS_VOLTAGE 220",
    "LaptopF USES Battery", "Battery HAS_VOLTAGE 19",
    "PhoneG USES MicroBattery", "MicroBattery HAS_VOLTAGE 5",
    "TabletH USES SlimBattery", "SlimBattery HAS_VOLTAGE 5",
    "same_voltage MEANS compatible", "higher_voltage CAN_POWER lower_with_regulator",
    "BatteryX IS_A lithium_battery", "BatteryY IS_A lithium_battery",
    "lithium_battery IS_A rechargeable", "rechargeable IS_A power_source",
    "FuelCell IS_A hydrogen_cell", "hydrogen_cell IS_A power_source"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Are MicroBattery and SlimBattery compatible?",
      TASK_DSL: "@q1 MicroBattery_SlimBattery COMPATIBLE",
      ANSWEAR_NL: "Both 5V. Same voltage = compatible. PhoneG and TabletH can swap batteries.",
      PROOF_DSL: `@p1 MicroBattery HAS_VOLTAGE 5
@p2 SlimBattery HAS_VOLTAGE 5
@p3 same_voltage MEANS compatible
@compare $p1 EQUALS $p2
@same 5 EQUALS 5
@apply $same MATCHES $p3
@conclude MicroBattery COMPATIBLE_WITH SlimBattery
@implication PhoneG CAN_USE SlimBattery
@implication2 TabletH CAN_USE MicroBattery
@result $conclude IS_A compatibility_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Both 5V → same_voltage → compatible. Batteries interchangeable."
    },
    {
      id: "q2", TASK_NL: "Can ServerE's PowerUnit power LaptopF?",
      TASK_DSL: "@q2 PowerUnit CAN_POWER LaptopF",
      ANSWEAR_NL: "PowerUnit=220V, Laptop needs 19V. 220>19, can power with regulator.",
      PROOF_DSL: `@p1 PowerUnit HAS_VOLTAGE 220
@p2 Battery HAS_VOLTAGE 19
@p3 higher_voltage CAN_POWER lower_with_regulator
@compare 220 GREATER_THAN 19
@higher $compare CONFIRMS higher_voltage
@apply $higher MATCHES $p3
@needs_regulator voltage_converter REQUIRED
@result $apply IS_A power_compatibility_proof
@proof $result PROVES $q2`,
      PROOF_NL: "220V > 19V → can power with regulator. Not direct compatible but possible."
    },
    {
      id: "q3", TASK_NL: "What type is BatteryX? (Deep hierarchy)",
      TASK_DSL: "@q3 BatteryX TYPE_CHAIN complete",
      ANSWEAR_NL: "BatteryX→lithium_battery→rechargeable→power_source. 3-level type chain.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 lithium_battery IS_A rechargeable
@p3 rechargeable IS_A power_source
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@chain $c2 REACHES power_source
@depth 3 LEVELS
@result $chain IS_A type_hierarchy_proof
@proof $result PROVES $q3`,
      PROOF_NL: "BatteryX→lithium→rechargeable→power_source. 3 levels to root."
    },
    {
      id: "q4", TASK_NL: "Compare BatteryX vs FuelCell type hierarchies",
      TASK_DSL: "@q4 battery_fuelcell HIERARCHY_COMPARE",
      ANSWEAR_NL: "BatteryX: lithium→rechargeable→power_source. FuelCell: hydrogen→power_source. Different paths, same root.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 lithium_battery IS_A rechargeable
@p3 rechargeable IS_A power_source
@p4 FuelCell IS_A hydrogen_cell
@p5 hydrogen_cell IS_A power_source
@path1 $p1 THROUGH $p2 TO $p3
@path2 $p4 TO $p5
@length1 $path1 HAS 3_steps
@length2 $path2 HAS 2_steps
@common $p3 EQUALS $p5
@ancestor power_source IS common_ancestor
@result $common IS_A hierarchy_comparison_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Battery: 3 steps to power_source. FuelCell: 2 steps. Common ancestor: power_source."
    },
    {
      id: "q5", TASK_NL: "Order all power sources by voltage",
      TASK_DSL: "@q5 voltage_ordering COMPLETE",
      ANSWEAR_NL: "220V (PowerUnit) > 48V (FuelCell) > 24V (BatteryY) > 19V (Battery) > 12V (BatteryX) > 5V (Micro/Slim)",
      PROOF_DSL: `@p1 PowerUnit HAS_VOLTAGE 220
@p2 FuelCell HAS_VOLTAGE 48
@p3 BatteryY HAS_VOLTAGE 24
@p4 Battery HAS_VOLTAGE 19
@p5 BatteryX HAS_VOLTAGE 12
@p6 MicroBattery HAS_VOLTAGE 5
@o1 220 GREATER_THAN 48
@o2 48 GREATER_THAN 24
@o3 24 GREATER_THAN 19
@o4 19 GREATER_THAN 12
@o5 12 GREATER_THAN 5
@chain $o1 THEN $o2 THEN $o3 THEN $o4 THEN $o5
@order PowerUnit FuelCell BatteryY Battery BatteryX MicroBattery
@result $order IS_A ordering_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Descending: 220>48>24>19>12>5. PowerUnit highest, MicroBattery lowest."
    },
    {
      id: "q6", TASK_NL: "Which devices use rechargeable batteries?",
      TASK_DSL: "@q6 rechargeable_users ENUMERATED",
      ANSWEAR_NL: "RobotA (BatteryX), RobotB (BatteryY) use lithium→rechargeable. Others use different types.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 BatteryY IS_A lithium_battery
@p3 lithium_battery IS_A rechargeable
@p4 RobotA USES BatteryX
@p5 RobotB USES BatteryY
@trace1 $p4 THROUGH $p1 TO $p3
@trace2 $p5 THROUGH $p2 TO $p3
@uses_rechargeable $trace1 AND $trace2
@list RobotA RobotB
@count 2 DEVICES
@result $list IS_A rechargeable_enumeration_proof
@proof $result PROVES $q6`,
      PROOF_NL: "RobotA→BatteryX→lithium→rechargeable. RobotB→BatteryY→lithium→rechargeable. 2 devices."
    },
    {
      id: "q7", TASK_NL: "Can RobotB's battery power RobotA?",
      TASK_DSL: "@q7 BatteryY CAN_POWER RobotA",
      ANSWEAR_NL: "BatteryY=24V, RobotA needs BatteryX=12V. 24>12 → can power with regulator.",
      PROOF_DSL: `@p1 BatteryY HAS_VOLTAGE 24
@p2 BatteryX HAS_VOLTAGE 12
@p3 RobotA USES BatteryX
@p4 higher_voltage CAN_POWER lower_with_regulator
@compare 24 GREATER_THAN 12
@can_supply $compare CONFIRMS sufficient_voltage
@apply $can_supply MATCHES $p4
@conclusion BatteryY CAN_POWER RobotA
@caveat regulator REQUIRED
@result $conclusion IS_A cross_power_proof
@proof $result PROVES $q7`,
      PROOF_NL: "24V > 12V → BatteryY can power RobotA with voltage regulator."
    },
    {
      id: "q8", TASK_NL: "Group devices by voltage class (low/medium/high)",
      TASK_DSL: "@q8 voltage_groups CLASSIFIED",
      ANSWEAR_NL: "Low (≤12V): PhoneG, TabletH, RobotA. Medium (13-50V): RobotB, LaptopF, VehicleD. High (>50V): ServerE.",
      PROOF_DSL: `@low_threshold 12
@high_threshold 50
@low1 MicroBattery 5 LESS_EQUAL 12
@low2 SlimBattery 5 LESS_EQUAL 12
@low3 BatteryX 12 LESS_EQUAL 12
@med1 Battery 19 IN_RANGE 13 TO 50
@med2 BatteryY 24 IN_RANGE 13 TO 50
@med3 FuelCell 48 IN_RANGE 13 TO 50
@high1 PowerUnit 220 GREATER 50
@low_group PhoneG TabletH RobotA
@med_group LaptopF RobotB VehicleD
@high_group ServerE
@all_classified 7 DEVICES
@result $all_classified IS_A classification_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Low (≤12V): 3 devices. Medium (13-50V): 3 devices. High (>50V): 1 device."
    }
  ]
};
