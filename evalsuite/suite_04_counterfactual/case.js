/**
 * Test Case: Comprehensive Counterfactual & Temporal
 * Tests what-if scenarios, intervention reasoning, temporal chains, and hypothetical inference
 * Version: 5.0 - Complex proofs with real counterfactual analysis, causal intervention, temporal ordering
 */
module.exports = {
  id: "suite_04_counterfactual",
  name: "Comprehensive Counterfactual & Temporal",

  theory_NL: "Physical causal chains: Water boils at 100°C. Boiling water creates steam. Steam drives turbines. Turbines generate electricity. Ice melts at 0°C. Melted ice becomes water. Fire requires oxygen and fuel. Fire produces heat and light. Heat causes expansion. Expansion causes pressure. Gravity pulls objects down. Falling objects gain velocity. Velocity causes impact force. Temporal sequences with dependencies: Requirements gathering BEFORE design. Design BEFORE implementation. Implementation BEFORE testing. Testing BEFORE deployment. Each phase REQUIRES completion of previous. Historical chain: Renaissance enabled Scientific Revolution. Scientific Revolution enabled Industrial Revolution. Industrial Revolution enabled Information Age. Process prerequisites: Planning requires resources. Execution requires planning. Approval enables execution. Monitoring follows execution.",

  theory_DSL: [
    // Physical causal chains (extended)
    "water BOILS_AT celsius_100",
    "boiling_water PRODUCES steam",
    "steam DRIVES turbine",
    "turbine GENERATES electricity",
    "ice MELTS_AT celsius_0",
    "melted_ice BECOMES water",
    "room_temperature IS celsius_20",
    "celsius_20 LESS_THAN celsius_100",
    // Fire chain
    "fire REQUIRES oxygen",
    "fire REQUIRES fuel",
    "fire PRODUCES heat",
    "fire PRODUCES light",
    "heat CAUSES expansion",
    "expansion CAUSES pressure",
    // Physics chain
    "gravity CAUSES falling",
    "falling INCREASES velocity",
    "velocity DETERMINES impact_force",
    // Software development temporal chain
    "requirements BEFORE design",
    "design BEFORE implementation",
    "implementation BEFORE testing",
    "testing BEFORE deployment",
    "design REQUIRES requirements_complete",
    "implementation REQUIRES design_complete",
    "design_complete REQUIRES design_done",
    "testing REQUIRES implementation_complete",
    // Historical chain
    "renaissance ENABLES scientific_revolution",
    "scientific_revolution ENABLES industrial_revolution",
    "industrial_revolution ENABLES information_age",
    // Process chain
    "planning REQUIRES resources",
    "execution REQUIRES planning_complete",
    "approval ENABLES execution",
    "monitoring FOLLOWS execution"
  ],

  tasks: [
    // Q1: Counterfactual intervention - What if no oxygen?
    {
      id: "q1",
      TASK_NL: "If oxygen were removed, what happens to the fire→heat→expansion→pressure chain?",
      TASK_DSL: "@q1 no_oxygen PREVENTS pressure",
      ANSWEAR_NL: "Removing oxygen breaks the entire chain: no fire → no heat → no expansion → no pressure.",
      PROOF_DSL: `@p1 fire REQUIRES oxygen
@p2 fire PRODUCES heat
@p3 heat CAUSES expansion
@p4 expansion CAUSES pressure
@c1 $p2 LEADS_TO $p3
@c2 $c1 LEADS_TO $p4
@chain $c2 ESTABLISHES causal_sequence
@intervene no_oxygen BLOCKS $p1
@propagate $intervene BREAKS fire_existence
@cascade $propagate PREVENTS $p2
@cascade2 $cascade PREVENTS $p3
@cascade3 $cascade2 PREVENTS $p4
@result $cascade3 IS_A intervention_cascade_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Counterfactual intervention: Removing oxygen blocks fire (which requires it). No fire means no heat, no expansion, no pressure - the entire downstream chain is broken."
    },

    // Q2: Temporal ordering transitivity
    {
      id: "q2",
      TASK_NL: "Must requirements come before deployment? (Transitive temporal reasoning)",
      TASK_DSL: "@q2 requirements BEFORE deployment",
      ANSWEAR_NL: "Yes: requirements→design→implementation→testing→deployment",
      PROOF_DSL: `@p1 requirements BEFORE design
@p2 design BEFORE implementation
@p3 implementation BEFORE testing
@p4 testing BEFORE deployment
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@transitive $c3 COMPUTES temporal_ordering
@result $transitive IS_A transitive_temporal_proof
@proof $result PROVES $q2`,
      PROOF_NL: "4-step temporal transitivity: requirements→design→implementation→testing→deployment proves requirements must come before deployment."
    },

    // Q3: What if water boiled at 50°C?
    {
      id: "q3",
      TASK_NL: "If water boiled at 50°C, could we have liquid water at room temperature (20°C)?",
      TASK_DSL: "@q3 counterfactual_water LIQUID_AT celsius_20",
      ANSWEAR_NL: "Yes, because 20°C < 50°C (hypothetical boiling point), water remains liquid.",
      PROOF_DSL: `@p1 room_temperature IS celsius_20
@p2 celsius_20 LESS_THAN celsius_100
@hypothetical boiling_point IS celsius_50
@compare celsius_20 LESS_THAN celsius_50
@c1 $p1 ESTABLISHES current_temp
@c2 $compare VALIDATES below_boiling
@c3 $hypothetical MODIFIES normal_physics
@reason $c2 UNDER $c3
@liquid $reason IMPLIES water_liquid
@result $liquid IS_A counterfactual_reasoning_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Counterfactual: Under modified physics (boiling at 50°C), room temperature (20°C) is still below boiling, so water remains liquid."
    },

    // Q4: Historical chain - Did renaissance enable information age?
    {
      id: "q4",
      TASK_NL: "Did the Renaissance ultimately enable the Information Age? (Historical causation)",
      TASK_DSL: "@q4 renaissance ENABLES information_age",
      ANSWEAR_NL: "Yes: renaissance→scientific_revolution→industrial_revolution→information_age",
      PROOF_DSL: `@p1 renaissance ENABLES scientific_revolution
@p2 scientific_revolution ENABLES industrial_revolution
@p3 industrial_revolution ENABLES information_age
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@historical $c2 TRACES causal_history
@result $historical IS_A historical_causation_proof
@proof $result PROVES $q4`,
      PROOF_NL: "3-step historical causation: Each era enabled the next, creating a chain from Renaissance to Information Age."
    },

    // Q5: What if design phase was skipped?
    {
      id: "q5",
      TASK_NL: "If design phase is skipped, can implementation proceed? (Dependency violation)",
      TASK_DSL: "@q5 skip_design BLOCKS implementation",
      ANSWEAR_NL: "No - implementation requires design_complete, which requires design to happen.",
      PROOF_DSL: `@p1 design BEFORE implementation
@p2 implementation REQUIRES design_complete
@p3 design_complete REQUIRES design_done
@intervene skip_design REMOVES design
@c1 $intervene PREVENTS design_done
@c2 $c1 PREVENTS design_complete
@c3 $c2 PREVENTS $p2
@dependency $c3 VIOLATES process_requirement
@result $dependency IS_A dependency_violation_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Dependency reasoning: Skipping design means design_complete cannot be achieved, which blocks implementation that requires it."
    },

    // Q6: Steam to electricity chain
    {
      id: "q6",
      TASK_NL: "How does boiling water lead to electricity? (Physical chain)",
      TASK_DSL: "@q6 boiling_water PRODUCES electricity",
      ANSWEAR_NL: "boiling_water→steam→turbine→electricity",
      PROOF_DSL: `@p1 boiling_water PRODUCES steam
@p2 steam DRIVES turbine
@p3 turbine GENERATES electricity
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@physical $c2 MODELS energy_conversion
@result $physical IS_A physical_chain_proof
@proof $result PROVES $q6`,
      PROOF_NL: "3-step energy conversion: Boiling water produces steam, steam drives turbine, turbine generates electricity."
    },

    // Q7: Gravity chain with counterfactual
    {
      id: "q7",
      TASK_NL: "If there was no gravity, would falling objects have impact force?",
      TASK_DSL: "@q7 no_gravity PREVENTS impact_force",
      ANSWEAR_NL: "No gravity means no falling, no velocity increase, thus no impact force.",
      PROOF_DSL: `@p1 gravity CAUSES falling
@p2 falling INCREASES velocity
@p3 velocity DETERMINES impact_force
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@intervene no_gravity REMOVES $p1
@cascade $intervene PREVENTS falling
@cascade2 $cascade PREVENTS velocity_increase
@cascade3 $cascade2 PREVENTS impact_force
@result $cascade3 IS_A physics_counterfactual_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Physics counterfactual: Without gravity, the entire chain breaks - no falling, no velocity, no impact force."
    },

    // Q8: Process chain with approval gate
    {
      id: "q8",
      TASK_NL: "What happens if approval is denied before execution?",
      TASK_DSL: "@q8 denied_approval BLOCKS monitoring",
      ANSWEAR_NL: "No approval → no execution → no monitoring (since monitoring follows execution).",
      PROOF_DSL: `@p1 approval ENABLES execution
@p2 execution REQUIRES planning_complete
@p3 monitoring FOLLOWS execution
@intervene denied_approval BLOCKS $p1
@c1 $intervene PREVENTS execution
@c2 $c1 PREVENTS $p3
@gate $c2 ENFORCES approval_gate
@downstream $gate BLOCKS monitoring
@result $downstream IS_A gated_process_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Gated process: Denial of approval blocks execution (which it enables), and since monitoring follows execution, it's also blocked."
    }
  ]
};
