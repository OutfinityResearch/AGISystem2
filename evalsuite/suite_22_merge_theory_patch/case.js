/**
 * Test Case: Comprehensive Merge Theory - Component Compatibility & Power Analysis
 * Tests component relationships, power requirements, and compatibility reasoning
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
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
    "FuelCell IS_A hydrogen_cell", "hydrogen_cell IS_A power_source",
    "5_volts IS low_voltage", "12_volts IS low_voltage",
    "19_volts IS medium_voltage", "24_volts IS medium_voltage", "48_volts IS medium_voltage",
    "220_volts IS high_voltage",
    "low_voltage IN_CLASS low", "medium_voltage IN_CLASS medium", "high_voltage IN_CLASS high"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Are MicroBattery and SlimBattery compatible?",
      TASK_DSL: "@q1 same_voltage MEANS compatible",
      ANSWEAR_NL: "Both 5V. Same voltage = compatible. PhoneG and TabletH can swap batteries.",
      PROOF_DSL: `@p1 MicroBattery HAS_VOLTAGE 5
@p2 SlimBattery HAS_VOLTAGE 5
@p3 same_voltage MEANS compatible
@c1 $p1 MATCHES $p2
@c2 $c1 CONFIRMS same_voltage
@c3 $c2 TRIGGERS $p3
@c4 MicroBattery COMPATIBLE_WITH SlimBattery
@c5 PhoneG CAN_USE SlimBattery
@c6 TabletH CAN_USE MicroBattery
@c7 $c5 COMBINES $c6
@result $c7 IS_A compatibility_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Both 5V → same_voltage → compatible. Batteries interchangeable."
    },
    {
      id: "q2", TASK_NL: "Can ServerE's PowerUnit power LaptopF?",
      TASK_DSL: "@q2 higher_voltage CAN_POWER lower_with_regulator",
      ANSWEAR_NL: "PowerUnit=220V, Laptop needs 19V. 220>19, can power with regulator.",
      PROOF_DSL: `@p1 PowerUnit HAS_VOLTAGE 220
@p2 Battery HAS_VOLTAGE 19
@p3 higher_voltage CAN_POWER lower_with_regulator
@p4 LaptopF USES Battery
@c1 220 GREATER_THAN 19
@c2 $c1 CONFIRMS higher_voltage
@c3 $c2 TRIGGERS $p3
@c4 PowerUnit CAN_POWER LaptopF
@c5 $c4 REQUIRES voltage_converter
@c6 $c5 CONFIRMS compatibility
@result $c6 IS_A power_compatibility_proof
@proof $result PROVES $q2`,
      PROOF_NL: "220V > 19V → can power with regulator. Not direct compatible but possible."
    },
    {
      id: "q3", TASK_NL: "What type is BatteryX? (Deep hierarchy)",
      TASK_DSL: "@q3 BatteryX IS_A power_source",
      ANSWEAR_NL: "BatteryX→lithium_battery→rechargeable→power_source. 3-level type chain.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 lithium_battery IS_A rechargeable
@p3 rechargeable IS_A power_source
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 REACHES power_source
@c4 $c3 HAS 3_levels
@chain $c4 COMPLETES hierarchy
@result $chain IS_A type_hierarchy_proof
@proof $result PROVES $q3`,
      PROOF_NL: "BatteryX→lithium→rechargeable→power_source. 3 levels to root."
    },
    {
      id: "q4", TASK_NL: "Compare BatteryX vs FuelCell type hierarchies",
      TASK_DSL: "@q4 power_source IS common_ancestor",
      ANSWEAR_NL: "BatteryX: lithium→rechargeable→power_source. FuelCell: hydrogen→power_source. Different paths, same root.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 lithium_battery IS_A rechargeable
@p3 rechargeable IS_A power_source
@p4 FuelCell IS_A hydrogen_cell
@p5 hydrogen_cell IS_A power_source
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $p4 LEADS_TO $p5
@c4 $c2 HAS 3_steps
@c5 $c3 HAS 2_steps
@c6 $p3 MATCHES $p5
@c7 power_source IS common_ancestor
@c8 $c4 DIFFERS $c5
@result $c7 IS_A hierarchy_comparison_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Battery: 3 steps to power_source. FuelCell: 2 steps. Common ancestor: power_source."
    },
    {
      id: "q5", TASK_NL: "Order all power sources by voltage",
      TASK_DSL: "@q5 PowerUnit HIGHEST voltage",
      ANSWEAR_NL: "220V (PowerUnit) > 48V (FuelCell) > 24V (BatteryY) > 19V (Battery) > 12V (BatteryX) > 5V (Micro/Slim)",
      PROOF_DSL: `@p1 PowerUnit HAS_VOLTAGE 220
@p2 FuelCell HAS_VOLTAGE 48
@p3 BatteryY HAS_VOLTAGE 24
@p4 Battery HAS_VOLTAGE 19
@p5 BatteryX HAS_VOLTAGE 12
@p6 MicroBattery HAS_VOLTAGE 5
@c1 220 GREATER_THAN 48
@c2 48 GREATER_THAN 24
@c3 24 GREATER_THAN 19
@c4 19 GREATER_THAN 12
@c5 12 GREATER_THAN 5
@c6 $c1 ESTABLISHES first
@c7 $c2 ESTABLISHES second
@c8 $c3 ESTABLISHES third
@c9 $c4 ESTABLISHES fourth
@c10 $c5 ESTABLISHES fifth
@order $c10 COMPLETES ranking
@result $order IS_A ordering_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Descending: 220>48>24>19>12>5. PowerUnit highest, MicroBattery lowest."
    },
    {
      id: "q6", TASK_NL: "Which devices use rechargeable batteries?",
      TASK_DSL: "@q6 lithium_battery IS_A rechargeable",
      ANSWEAR_NL: "RobotA (BatteryX), RobotB (BatteryY) use lithium→rechargeable. Others use different types.",
      PROOF_DSL: `@p1 BatteryX IS_A lithium_battery
@p2 BatteryY IS_A lithium_battery
@p3 lithium_battery IS_A rechargeable
@p4 RobotA USES BatteryX
@p5 RobotB USES BatteryY
@c1 $p4 THROUGH $p1
@c2 $c1 LEADS_TO $p3
@c3 $p5 THROUGH $p2
@c4 $c3 LEADS_TO $p3
@c5 RobotA USES_RECHARGEABLE true
@c6 RobotB USES_RECHARGEABLE true
@c7 $c5 COMBINES $c6
@result $c7 IS_A rechargeable_enumeration_proof
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
@c1 24 GREATER_THAN 12
@c2 $c1 CONFIRMS higher_voltage
@c3 $c2 TRIGGERS $p4
@c4 BatteryY CAN_POWER RobotA
@c5 $c4 REQUIRES regulator
@c6 $c5 CONFIRMS possibility
@result $c6 IS_A cross_power_proof
@proof $result PROVES $q7`,
      PROOF_NL: "24V > 12V → BatteryY can power RobotA with voltage regulator."
    },
    {
      id: "q8", TASK_NL: "Group devices by voltage class (low/medium/high)",
      TASK_DSL: "@q8 devices GROUPED_BY voltage_class",
      ANSWEAR_NL: "Low (≤12V): PhoneG, TabletH, RobotA. Medium (13-50V): RobotB, LaptopF, VehicleD. High (>50V): ServerE.",
      PROOF_DSL: `@p1 5_volts IS low_voltage
@p2 12_volts IS low_voltage
@p3 19_volts IS medium_voltage
@p4 24_volts IS medium_voltage
@p5 48_volts IS medium_voltage
@p6 220_volts IS high_voltage
@c1 PhoneG USES_VOLTAGE 5
@c2 TabletH USES_VOLTAGE 5
@c3 RobotA USES_VOLTAGE 12
@c4 LaptopF USES_VOLTAGE 19
@c5 RobotB USES_VOLTAGE 24
@c6 VehicleD USES_VOLTAGE 48
@c7 ServerE USES_VOLTAGE 220
@c8 $c1 IN_CLASS low
@c9 $c7 IN_CLASS high
@c10 $c4 IN_CLASS medium
@result $c10 IS_A classification_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Low (≤12V): 3 devices. Medium (13-50V): 3 devices. High (>50V): 1 device."
    }
  ]
};
