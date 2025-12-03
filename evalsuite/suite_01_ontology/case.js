/**
 * Test Case: Comprehensive Ontology & Taxonomy
 * Tests IS_A hierarchies, transitivity, DISJOINT_WITH, PART_OF, and type inference across multiple domains
 * Version: 3.0
 */
module.exports = {
  id: "suite_01_ontology",
  name: "Comprehensive Ontology & Taxonomy",
  // theory_NL is the natural language description of the theory
  theory_NL: `In biology: Dogs are mammals. Cats are mammals. Birds are animals but NOT mammals - birds are disjoint with mammals. All mammals are animals. All animals are living things. Fido is a dog. Whiskers is a cat. Sparky is a bird. In vehicles: Cars have wheels. Wheels are parts of vehicles. Tesla is a car. Boats are vehicles but they don't have wheels. In geography: Paris is located in France. France is located in Europe. Berlin is in Germany. Germany is in Europe. Tokyo is in Japan. Japan is in Asia. Europe and Asia are continents. In professions: Doctors are medical professionals. Nurses are medical professionals. Medical professionals help patients. Engineers design things. Software engineers are engineers.`,
  // theory_DSL is the Sys2DSL version of the theory
  theory_DSL: [
    "dog IS_A mammal",
    "cat IS_A mammal",
    "bird IS_A animal",
    "bird DISJOINT_WITH mammal",
    "mammal IS_A animal",
    "animal IS_A living_thing",
    "Fido IS_A dog",
    "Whiskers IS_A cat",
    "Sparky IS_A bird",
    "car HAS wheel",
    "wheel PART_OF vehicle",
    "Tesla IS_A car",
    "boat IS_A vehicle",
    "Paris LOCATED_IN France",
    "France LOCATED_IN Europe",
    "Berlin LOCATED_IN Germany",
    "Germany LOCATED_IN Europe",
    "Tokyo LOCATED_IN Japan",
    "Japan LOCATED_IN Asia",
    "Europe IS_A continent",
    "Asia IS_A continent",
    "doctor IS_A medical_professional",
    "nurse IS_A medical_professional",
    "medical_professional HELPS patient",
    "engineer DESIGNS things",
    "software_engineer IS_A engineer"
  ],
  // tasks are the individual test queries
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Fido a living thing?",
      TASK_DSL: "@q1 Fido IS_A living_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\", \"chain\": [\"Fido\", \"dog\", \"mammal\", \"animal\", \"living_thing\"]}",
      ANSWEAR_NL: "Yes, Fido is a living thing through the chain: Fido → dog → mammal → animal → living thing.",
      PROOF_DSL: "@p1 Fido IS_A dog\n@p2 dog IS_A mammal\n@p3 mammal IS_A animal\n@p4 animal IS_A living_thing\n@proof $p1 AND $p2 AND $p3 AND $p4",
      PROOF_NL: "This is proven by following the chain of IS_A relations: Fido is a dog, a dog is a mammal, a mammal is an animal, and an animal is a living thing."
    },
    {
      id: "q2",
      TASK_NL: "What type is Sparky? (Verify it's a bird, not mammal)",
      TASK_DSL: "@q2 Sparky IS_A bird",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Sparky is a bird (which is disjoint with mammals).",
      PROOF_DSL: "@proof Sparky IS_A bird",
      PROOF_NL: "This is a direct fact: Sparky is a bird."
    },
    {
      id: "q3",
      TASK_NL: "Is Whiskers an animal?",
      TASK_DSL: "@q3 Whiskers IS_A animal",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\", \"chain\": [\"Whiskers\", \"cat\", \"mammal\", \"animal\"]}",
      ANSWEAR_NL: "Yes, Whiskers is a cat, cats are mammals, mammals are animals.",
      PROOF_DSL: "@p1 Whiskers IS_A cat\n@p2 cat IS_A mammal\n@p3 mammal IS_A animal\n@proof $p1 AND $p2 AND $p3",
      PROOF_NL: "This is proven by following the chain of IS_A relations: Whiskers is a cat, a cat is a mammal, and a mammal is an animal."
    },
    {
      id: "q4",
      TASK_NL: "Is Paris in Europe?",
      TASK_DSL: "@q4 Paris LOCATED_IN Europe",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\", \"chain\": [\"Paris\", \"France\", \"Europe\"]}",
      ANSWEAR_NL: "Yes, Paris is in France and France is in Europe.",
      PROOF_DSL: "@p1 Paris LOCATED_IN France\n@p2 France LOCATED_IN Europe\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven because Paris is located in France, and France is located in Europe."
    },
    {
      id: "q5",
      TASK_NL: "Where is Tokyo located? (Verify it's in Japan/Asia, not Europe)",
      TASK_DSL: "@q5 Tokyo LOCATED_IN Japan",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Tokyo is in Japan (which is in Asia, not Europe).",
      PROOF_DSL: "@proof Tokyo LOCATED_IN Japan",
      PROOF_NL: "This is a direct fact: Tokyo is located in Japan."
    },
    {
      id: "q6",
      TASK_NL: "Is a software engineer an engineer?",
      TASK_DSL: "@q6 software_engineer IS_A engineer",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Yes, software engineers are a type of engineer.",
      PROOF_DSL: "@proof software_engineer IS_A engineer",
      PROOF_NL: "This is a direct fact from the theory."
    },
    {
      id: "q7",
      TASK_NL: "Do doctors help patients?",
      TASK_DSL: "@q7 doctor HELPS patient",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"inheritance\"}",
      ANSWEAR_NL: "Yes, doctors are medical professionals and medical professionals help patients.",
      PROOF_DSL: "@p1 doctor IS_A medical_professional\n@p2 medical_professional HELPS patient\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven because doctors are a type of medical professional, and medical professionals help patients."
    },
    {
      id: "q8",
      TASK_NL: "Does a Tesla have wheels?",
      TASK_DSL: "@q8 Tesla HAS wheel",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"inheritance\"}",
      ANSWEAR_NL: "Yes, Tesla is a car and cars have wheels.",
      PROOF_DSL: "@p1 Tesla IS_A car\n@p2 car HAS wheel\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven because a Tesla is a car, and cars have wheels."
    }
  ],
};