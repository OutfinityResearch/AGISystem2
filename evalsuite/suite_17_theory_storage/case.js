/**
 * Test Case: Theory Storage - Component Relations
 * Tests component relationships for hardware systems
 * Version: 3.0
 */

module.exports = {
  id: "suite_17_theory_storage",
  name: "Theory Storage - Component Relations",
  description: "Tests component relationships: parts, connections, power, and cooling in hardware systems.",
  theory_NL: "We have several components: DiskA is part of a Computer, MemoryB is part of a Server, CPUC is part of a Workstation, NetworkD connects to a Router, PowerSupply powers Computer, CoolingFan cools Server, GraphicsCard is part of Workstation, Switch connects to Router.",
  theory_DSL: [
    "DiskA PART_OF Computer",
    "MemoryB PART_OF Server",
    "CPUC PART_OF Workstation",
    "NetworkD CONNECTS_TO Router",
    "PowerSupply POWERS Computer",
    "CoolingFan COOLS Server",
    "GraphicsCard PART_OF Workstation",
    "Switch CONNECTS_TO Router"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is DiskA part of Computer?",
      TASK_DSL: "@q1 DiskA PART_OF Computer",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, DiskA is part of Computer."
    },
    {
      id: "q2",
      TASK_NL: "Is MemoryB part of Server?",
      TASK_DSL: "@q2 MemoryB PART_OF Server",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, MemoryB is part of Server."
    },
    {
      id: "q3",
      TASK_NL: "Is CPUC part of Workstation?",
      TASK_DSL: "@q3 CPUC PART_OF Workstation",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, CPUC is part of Workstation."
    },
    {
      id: "q4",
      TASK_NL: "Does NetworkD connect to Router?",
      TASK_DSL: "@q4 NetworkD CONNECTS_TO Router",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, NetworkD connects to Router."
    },
    {
      id: "q5",
      TASK_NL: "Does PowerSupply power Computer?",
      TASK_DSL: "@q5 PowerSupply POWERS Computer",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, PowerSupply powers Computer."
    },
    {
      id: "q6",
      TASK_NL: "Does CoolingFan cool Server?",
      TASK_DSL: "@q6 CoolingFan COOLS Server",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, CoolingFan cools Server."
    },
    {
      id: "q7",
      TASK_NL: "Is GraphicsCard part of Workstation?",
      TASK_DSL: "@q7 GraphicsCard PART_OF Workstation",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, GraphicsCard is part of Workstation."
    },
    {
      id: "q8",
      TASK_NL: "Does Switch connect to Router?",
      TASK_DSL: "@q8 Switch CONNECTS_TO Router",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Switch connects to Router."
    }
  ],
};
