/**
 * Test Case: Comprehensive Format & Summarize - Category Hierarchy Reasoning
 * Tests category membership, cross-category comparisons, and hierarchy navigation
 * Version: 5.0 - Complex proofs with category analysis and membership counting
 */
module.exports = {
  id: "suite_20_format_summarize",
  name: "Comprehensive Format & Summarize - Category Hierarchy Reasoning",

  theory_NL: "Category hierarchy. Fruits (Apple, Banana, Orange, Mango) are food, grow on plants. Vehicles (Car, Bike, Bus) are transport, have wheels. Animals (Dog, Cat) are living, can move. Hierarchy: fruit→food→consumable. vehicle→transport→artifact. animal→living_thing→entity. Properties inherited through chains.",

  theory_DSL: [
    "Apple IS_A fruit", "Banana IS_A fruit", "Orange IS_A fruit", "Mango IS_A fruit",
    "Car IS_A vehicle", "Bike IS_A vehicle", "Bus IS_A vehicle",
    "Dog IS_A animal", "Cat IS_A animal",
    "fruit IS_A food", "food IS_A consumable",
    "vehicle IS_A transport", "transport IS_A artifact",
    "animal IS_A living_thing", "living_thing IS_A entity",
    "fruit GROWS_ON plant", "vehicle HAS_PROPERTY wheels", "animal CAN move",
    "consumable HAS_PROPERTY edible", "artifact HAS_PROPERTY manufactured"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Is Apple edible? (Deep inheritance chain)",
      TASK_DSL: "@q1 Apple HAS_PROPERTY edible",
      ANSWEAR_NL: "Apple→fruit→food→consumable→edible. 4-step inheritance.",
      PROOF_DSL: `@p1 Apple IS_A fruit
@p2 fruit IS_A food
@p3 food IS_A consumable
@p4 consumable HAS_PROPERTY edible
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@inherit $c3 DERIVES Apple_edible
@result $inherit IS_A deep_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "4-step: Apple→fruit→food→consumable→edible."
    },
    {
      id: "q2", TASK_NL: "Is Car manufactured? (Artifact chain)",
      TASK_DSL: "@q2 Car HAS_PROPERTY manufactured",
      ANSWEAR_NL: "Car→vehicle→transport→artifact→manufactured. Artifact property inherited.",
      PROOF_DSL: `@p1 Car IS_A vehicle
@p2 vehicle IS_A transport
@p3 transport IS_A artifact
@p4 artifact HAS_PROPERTY manufactured
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@inherit $c3 DERIVES Car_manufactured
@result $inherit IS_A artifact_chain_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Car→vehicle→transport→artifact→manufactured."
    },
    {
      id: "q3", TASK_NL: "How many fruits exist in KB?",
      TASK_DSL: "@q3 Apple IS_A fruit",
      ANSWEAR_NL: "4 fruits: Apple, Banana, Orange, Mango.",
      PROOF_DSL: `@p1 Apple IS_A fruit
@p2 Banana IS_A fruit
@p3 Orange IS_A fruit
@p4 Mango IS_A fruit
@c1 $p1 COMBINES $p2
@c2 $c1 COMBINES $p3
@c3 $c2 COMBINES $p4
@c4 $c3 HAS 4_items
@result $c4 IS_A enumeration_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Search all X where X IS_A fruit. Found: Apple, Banana, Orange, Mango = 4."
    },
    {
      id: "q4", TASK_NL: "Compare fruit vs vehicle: what properties differ?",
      TASK_DSL: "@q4 fruit_vehicle COMPARISON done",
      ANSWEAR_NL: "Fruit: grows_on plant, edible. Vehicle: has wheels, manufactured. Different hierarchies.",
      PROOF_DSL: `@p1 fruit GROWS_ON plant
@p2 vehicle HAS_PROPERTY wheels
@p3 consumable HAS_PROPERTY edible
@p4 artifact HAS_PROPERTY manufactured
@fruit_props $p1 AND $p3
@vehicle_props $p2 AND $p4
@compare $fruit_props DIFFERS $vehicle_props
@hierarchy1 fruit TO consumable
@hierarchy2 vehicle TO artifact
@disjoint $hierarchy1 DIFFERS $hierarchy2
@result $compare IS_A cross_category_comparison
@proof $result PROVES $q4`,
      PROOF_NL: "Fruit hierarchy→consumable (organic). Vehicle hierarchy→artifact (made). Different properties."
    },
    {
      id: "q5", TASK_NL: "Is Dog an entity? (Longest chain)",
      TASK_DSL: "@q5 Dog IS_A entity",
      ANSWEAR_NL: "Dog→animal→living_thing→entity. 3-step chain to root.",
      PROOF_DSL: `@p1 Dog IS_A animal
@p2 animal IS_A living_thing
@p3 living_thing IS_A entity
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@chain $c2 REACHES entity
@verify $chain PROVES Dog_is_entity
@result $chain IS_A transitive_closure_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Dog→animal→living_thing→entity. Transitive IS_A closure."
    },
    {
      id: "q6", TASK_NL: "Do all vehicles have wheels?",
      TASK_DSL: "@q6 vehicle HAS_PROPERTY wheels",
      ANSWEAR_NL: "Vehicle HAS_PROPERTY wheels. All vehicles (Car, Bike, Bus) inherit this.",
      PROOF_DSL: `@p1 vehicle HAS_PROPERTY wheels
@p2 Car IS_A vehicle
@p3 Bike IS_A vehicle
@p4 Bus IS_A vehicle
@c1 $p2 LEADS_TO $p1
@c2 $p3 LEADS_TO $p1
@c3 $p4 LEADS_TO $p1
@c4 $c1 COMBINES $c2
@c5 $c4 COMBINES $c3
@c6 $c5 PROVES all_have_wheels
@result $c6 IS_A universal_property_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Vehicle→wheels. Car, Bike, Bus all inherit wheels from vehicle."
    },
    {
      id: "q7", TASK_NL: "What can animals do that vehicles can't?",
      TASK_DSL: "@q7 animal CAN move",
      ANSWEAR_NL: "Animal CAN move (autonomous). Vehicles transport but don't move autonomously.",
      PROOF_DSL: `@p1 animal CAN move
@p2 Dog IS_A animal
@p3 Cat IS_A animal
@p4 vehicle HAS_PROPERTY wheels
@c1 $p1 IS autonomous
@c2 $p2 INHERITS $p1
@c3 $p3 INHERITS $p1
@c4 $c2 COMBINES $c3
@c5 $p1 EXCLUSIVE_TO animal
@c6 $c5 DIFFERS $p4
@result $c5 IS_A unique_capability_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Animal CAN move (not found for vehicle). Unique to living things."
    },
    {
      id: "q8", TASK_NL: "Find all entities in KB (breadth search)",
      TASK_DSL: "@q8 Dog IS_A animal",
      ANSWEAR_NL: "Dog, Cat (via animal→living_thing→entity). 2 entities via living_thing path.",
      PROOF_DSL: `@p1 living_thing IS_A entity
@p2 animal IS_A living_thing
@p3 Dog IS_A animal
@p4 Cat IS_A animal
@c1 $p3 LEADS_TO $p2
@c2 $c1 LEADS_TO $p1
@c3 $p4 LEADS_TO $p2
@c4 $c3 LEADS_TO $p1
@c5 $c2 REACHES entity
@c6 $c4 REACHES entity
@c7 $c5 COMBINES $c6
@c8 $c7 HAS 2_entities
@result $c8 IS_A breadth_search_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Search all X where X reaches entity. Found: Dog, Cat via living_thing chain."
    }
  ]
};
