/**
 * Test Case: Comprehensive Ontology & Taxonomy
 * Tests IS_A hierarchies, transitivity, DISJOINT_WITH, property inheritance, and complex reasoning
 * Version: 5.0 - Complex proofs with genuine deduction, abduction, and multi-step reasoning
 */
module.exports = {
  id: "suite_01_ontology",
  name: "Comprehensive Ontology & Taxonomy",

  theory_NL: `In biology: Dogs are mammals. Cats are mammals. Birds are animals but NOT mammals - birds are disjoint with mammals. All mammals are animals. All animals are living things. Living things need oxygen. Fido is a dog. Whiskers is a cat. Sparky is a bird. In vehicles: Cars have wheels. Cars are vehicles. Vehicles can move. Things that move need energy. Tesla is a car. Boats are vehicles. In geography: Paris is located in France. France is located in Europe. Berlin is in Germany. Germany is in Europe. Tokyo is in Japan. Japan is in Asia. Europe and Asia are continents. Continents are landmasses. In professions: Doctors are medical professionals. Nurses are medical professionals. Medical professionals help patients. Medical professionals have medical_training. People with medical_training can diagnose. Engineers design things. Software engineers are engineers. Engineers solve problems.`,

  theory_DSL: [
    // Biology hierarchy (extended)
    "dog IS_A mammal",
    "cat IS_A mammal",
    "bird IS_A animal",
    "bird DISJOINT_WITH mammal",
    "mammal IS_A animal",
    "animal IS_A living_thing",
    "living_thing NEEDS oxygen",
    "living_thing CAN reproduce",
    "Fido IS_A dog",
    "Whiskers IS_A cat",
    "Sparky IS_A bird",
    // Vehicles (extended)
    "car IS_A vehicle",
    "car HAS wheel",
    "vehicle CAN move",
    "move REQUIRES energy",
    "Tesla IS_A car",
    "boat IS_A vehicle",
    "boat LACKS wheel",
    // Geography (extended)
    "Paris LOCATED_IN France",
    "France LOCATED_IN Europe",
    "Berlin LOCATED_IN Germany",
    "Germany LOCATED_IN Europe",
    "Tokyo LOCATED_IN Japan",
    "Japan LOCATED_IN Asia",
    "Europe IS_A continent",
    "Asia IS_A continent",
    "continent IS_A landmass",
    "landmass IS_A geographic_entity",
    // Professions (extended)
    "doctor IS_A medical_professional",
    "nurse IS_A medical_professional",
    "medical_professional HELPS patient",
    "medical_professional HAS medical_training",
    "medical_training ENABLES diagnose",
    "engineer DESIGNS things",
    "engineer SOLVES problems",
    "software_engineer IS_A engineer",
    "software_engineer USES computer"
  ],

  tasks: [
    // Q1: Deep transitive chain (6 steps) - Fido needs oxygen
    {
      id: "q1",
      TASK_NL: "Does Fido need oxygen? (Requires 5-step deduction through biology hierarchy)",
      TASK_DSL: "@q1 Fido NEEDS oxygen",
      ANSWEAR_NL: "Yes, through chain: Fido→dog→mammal→animal→living_thing→needs oxygen",
      PROOF_DSL: `@p1 Fido IS_A dog
@p2 dog IS_A mammal
@p3 mammal IS_A animal
@p4 animal IS_A living_thing
@p5 living_thing NEEDS oxygen
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@derive $c4 INFERS Fido_needs_oxygen
@result $derive IS_A deep_deduction_chain
@proof $result PROVES $q1`,
      PROOF_NL: "5-step deduction: Fido is a dog, dogs are mammals, mammals are animals, animals are living things, and living things need oxygen."
    },

    // Q2: Complex disjointness reasoning - Sparky is NOT a mammal
    {
      id: "q2",
      TASK_NL: "Is Sparky a mammal? (Requires disjointness reasoning)",
      TASK_DSL: "@q2 Sparky IS_A mammal",
      ANSWEAR_NL: "No - Sparky is a bird, and birds are disjoint with mammals.",
      PROOF_DSL: `@p1 Sparky IS_A bird
@p2 bird IS_A animal
@p3 bird DISJOINT_WITH mammal
@p4 mammal IS_A animal
@c1 $p1 LEADS_TO $p2
@c2 $p1 LEADS_TO $p3
@disjoint $c2 BLOCKS mammal_path
@negative $disjoint INFERS NOT_mammal
@result $negative IS_A disjointness_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Sparky is a bird, birds are disjoint with mammals, therefore Sparky cannot be a mammal despite both being animals."
    },

    // Q3: Property inheritance with multiple paths - Can Whiskers reproduce?
    {
      id: "q3",
      TASK_NL: "Can Whiskers reproduce? (Property inheritance through type hierarchy)",
      TASK_DSL: "@q3 Whiskers CAN reproduce",
      ANSWEAR_NL: "Yes, through inheritance: Whiskers→cat→mammal→animal→living_thing which CAN reproduce.",
      PROOF_DSL: `@p1 Whiskers IS_A cat
@p2 cat IS_A mammal
@p3 mammal IS_A animal
@p4 animal IS_A living_thing
@p5 living_thing CAN reproduce
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@inherit $c4 TRANSFERS reproduce_ability
@result $inherit IS_A property_inheritance_chain
@proof $result PROVES $q3`,
      PROOF_NL: "4-step type hierarchy followed by property inheritance: Whiskers inherits 'can reproduce' from living_thing."
    },

    // Q4: Multi-domain reasoning - Is Tokyo on a landmass?
    {
      id: "q4",
      TASK_NL: "Is Tokyo located on a landmass? (Geographic hierarchy reasoning)",
      TASK_DSL: "@q4 Tokyo LOCATED_IN landmass",
      ANSWEAR_NL: "Yes: Tokyo→Japan→Asia→continent→landmass",
      PROOF_DSL: `@p1 Tokyo LOCATED_IN Japan
@p2 Japan LOCATED_IN Asia
@p3 Asia IS_A continent
@p4 continent IS_A landmass
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@transitivity $c3 COMPOSES location_and_type
@result $transitivity IS_A cross_relation_chain
@proof $result PROVES $q4`,
      PROOF_NL: "Cross-relation reasoning: LOCATED_IN chain to Asia, then IS_A chain to landmass."
    },

    // Q5: Abductive reasoning - Why does a Tesla need energy?
    {
      id: "q5",
      TASK_NL: "Why does a Tesla need energy? (Abductive explanation)",
      TASK_DSL: "@q5 Tesla REQUIRES energy",
      ANSWEAR_NL: "Because Tesla is a car, cars are vehicles, vehicles can move, and moving requires energy.",
      PROOF_DSL: `@p1 Tesla IS_A car
@p2 car IS_A vehicle
@p3 vehicle CAN move
@p4 move REQUIRES energy
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@abduce $c3 EXPLAINS energy_requirement
@result $abduce IS_A abductive_explanation
@proof $result PROVES $q5`,
      PROOF_NL: "Abductive explanation through 4 steps: Tesla→car→vehicle→can move→requires energy."
    },

    // Q6: Negative reasoning - Does a boat have wheels?
    {
      id: "q6",
      TASK_NL: "Does a boat have wheels? (Negative property reasoning)",
      TASK_DSL: "@q6 boat HAS wheel",
      ANSWEAR_NL: "No - boats explicitly lack wheels despite being vehicles.",
      PROOF_DSL: `@p1 boat IS_A vehicle
@p2 boat LACKS wheel
@p3 car HAS wheel
@p4 car IS_A vehicle
@c1 $p1 ESTABLISHES vehicle_type
@c2 $p2 OVERRIDES default_assumption
@negative $c2 BLOCKS wheel_inheritance
@contrast $p3 CONTRASTS $p2
@result $negative IS_A exception_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Exception reasoning: Although boats are vehicles like cars, boats explicitly LACK wheels, overriding any potential inheritance."
    },

    // Q7: Complex role reasoning - Can doctors diagnose?
    {
      id: "q7",
      TASK_NL: "Can doctors diagnose patients? (Role and capability reasoning)",
      TASK_DSL: "@q7 doctor CAN diagnose",
      ANSWEAR_NL: "Yes: doctors are medical professionals, medical professionals have medical training, and medical training enables diagnosis.",
      PROOF_DSL: `@p1 doctor IS_A medical_professional
@p2 medical_professional HAS medical_training
@p3 medical_training ENABLES diagnose
@p4 medical_professional HELPS patient
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $p1 LEADS_TO $p4
@capability $c2 GRANTS diagnose_ability
@role $c3 ESTABLISHES patient_context
@combine $capability JOINS $role
@result $combine IS_A role_capability_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Multi-path reasoning: Type hierarchy gives medical_training, which enables diagnosis; parallel path establishes patient context."
    },

    // Q8: Comparative reasoning - Berlin and Tokyo are both in geographic entities
    {
      id: "q8",
      TASK_NL: "Are both Berlin and Tokyo located in geographic entities? (Parallel deduction)",
      TASK_DSL: "@q8 Berlin_Tokyo BOTH_IN geographic_entity",
      ANSWEAR_NL: "Yes: Berlin→Germany→Europe→continent→landmass→geographic_entity AND Tokyo→Japan→Asia→continent→landmass→geographic_entity",
      PROOF_DSL: `@p1 Berlin LOCATED_IN Germany
@p2 Germany LOCATED_IN Europe
@p3 Europe IS_A continent
@p4 continent IS_A landmass
@p5 landmass IS_A geographic_entity
@p6 Tokyo LOCATED_IN Japan
@p7 Japan LOCATED_IN Asia
@p8 Asia IS_A continent
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@c5 $p6 LEADS_TO $p7
@c6 $c5 LEADS_TO $p8
@c7 $c6 LEADS_TO $p4
@c8 $c7 LEADS_TO $p5
@parallel $c4 JOINS $c8
@result $parallel IS_A parallel_deduction_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Parallel 5-step deductions for both cities, proving both reach geographic_entity through different continental paths."
    }
  ]
};
