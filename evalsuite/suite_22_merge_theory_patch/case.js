/**
 * Test Case: Merge Theory - Device and Component Relations
 * Tests device-component usage relationships
 * Version: 3.0
 */

module.exports = {
  id: "suite_22_merge_theory_patch",
  name: "Merge Theory - Device and Component Relations",
  description: "Tests device-component usage relationships: robots, drones, vehicles, and devices using various power sources.",
  theory_NL: "We have robots and their components: RobotA uses BatteryX, RobotB uses BatteryY, DroneC uses MotorZ, VehicleD uses FuelCell, ServerE uses PowerUnit, LaptopF uses Battery, PhoneG uses MicroBattery, TabletH uses SlimBattery.",
  theory_DSL: [
    "RobotA USES BatteryX",
    "RobotB USES BatteryY",
    "DroneC USES MotorZ",
    "VehicleD USES FuelCell",
    "ServerE USES PowerUnit",
    "LaptopF USES Battery",
    "PhoneG USES MicroBattery",
    "TabletH USES SlimBattery"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Does RobotA use BatteryX?",
      TASK_DSL: "@q1 RobotA USES BatteryX",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, RobotA uses BatteryX."
    },
    {
      id: "q2",
      TASK_NL: "Does RobotB use BatteryY?",
      TASK_DSL: "@q2 RobotB USES BatteryY",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, RobotB uses BatteryY."
    },
    {
      id: "q3",
      TASK_NL: "Does DroneC use MotorZ?",
      TASK_DSL: "@q3 DroneC USES MotorZ",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, DroneC uses MotorZ."
    },
    {
      id: "q4",
      TASK_NL: "Does VehicleD use FuelCell?",
      TASK_DSL: "@q4 VehicleD USES FuelCell",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, VehicleD uses FuelCell."
    },
    {
      id: "q5",
      TASK_NL: "Does ServerE use PowerUnit?",
      TASK_DSL: "@q5 ServerE USES PowerUnit",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, ServerE uses PowerUnit."
    },
    {
      id: "q6",
      TASK_NL: "Does LaptopF use Battery?",
      TASK_DSL: "@q6 LaptopF USES Battery",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, LaptopF uses Battery."
    },
    {
      id: "q7",
      TASK_NL: "Does PhoneG use MicroBattery?",
      TASK_DSL: "@q7 PhoneG USES MicroBattery",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, PhoneG uses MicroBattery."
    },
    {
      id: "q8",
      TASK_NL: "Does TabletH use SlimBattery?",
      TASK_DSL: "@q8 TabletH USES SlimBattery",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, TabletH uses SlimBattery."
    }
  ],
};
