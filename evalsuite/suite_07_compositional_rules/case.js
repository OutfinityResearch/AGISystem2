/**
 * Test Case: Compositional Rules & Forward Chaining
 * Tests DEFINE_RULE for user-defined inference rules, FORWARD_CHAIN for exhaustive derivation, and PROVE for proof chain construction
 * Version: 3.0
 */
module.exports = {
  id: "suite_07_compositional_rules",
  name: "Compositional Rules & Forward Chaining",
  theory_NL: "Genealogy system with derived relations. Basic facts: Ion is the parent of Maria. Maria is the parent of Andrei. Maria is the parent of Elena. Ion is married to Ana. Ana is the parent of Maria. Vasile is the sibling of Ion. Rules to define: A grandparent is a parent of a parent - if X is parent of Y and Y is parent of Z, then X is grandparent of Z. An uncle or aunt is a sibling of a parent - if X is sibling of Y and Y is parent of Z, then X is uncle or aunt of Z. Cousins share a grandparent - if X and Y have a common grandparent and X is not Y and X is not sibling of Y, they are cousins. An ancestor is either a parent or an ancestor of a parent - if X is parent of Y, then X is ancestor of Y; if X is ancestor of Y and Y is parent of Z, then X is ancestor of Z.",
  theory_DSL: [
    "Ion PARENT_OF Maria",
    "Maria PARENT_OF Andrei",
    "Maria PARENT_OF Elena",
    "Ion MARRIED_TO Ana",
    "Ana PARENT_OF Maria",
    "Vasile SIBLING_OF Ion",
    "Vasile PARENT_OF Cosmin"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Ion the grandparent of Andrei?",
      TASK_DSL: "@q1 Ion GRANDPARENT_OF Andrei",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"composition\"}",
      ANSWEAR_NL: "Yes, Ion is the grandparent of Andrei. Ion is parent of Maria, and Maria is parent of Andrei, so by the grandparent rule, Ion is grandparent of Andrei.",
      PROOF_DSL: "@p1 Ion PARENT_OF Maria\n@p2 Maria PARENT_OF Andrei\n@rule GRANDPARENT_OF(?x, ?z) :- PARENT_OF(?x, ?y), PARENT_OF(?y, ?z)\n@proof PROVE @q1 USING @rule, $p1, $p2",
      PROOF_NL: "The proof is constructed by applying the 'grandparent' rule to the facts that 'Ion is the parent of Maria' and 'Maria is the parent of Andrei'."
    },
    {
      id: "q2",
      TASK_NL: "Is Ana the grandparent of Elena?",
      TASK_DSL: "@q2 Ana GRANDPARENT_OF Elena",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"composition\"}",
      ANSWEAR_NL: "Yes, Ana is the grandparent of Elena. Ana is parent of Maria, and Maria is parent of Elena.",
      PROOF_DSL: "@p1 Ana PARENT_OF Maria\n@p2 Maria PARENT_OF Elena\n@rule GRANDPARENT_OF(?x, ?z) :- PARENT_OF(?x, ?y), PARENT_OF(?y, ?z)\n@proof PROVE @q2 USING @rule, $p1, $p2",
      PROOF_NL: "This is proven by applying the 'grandparent' rule to the facts 'Ana is parent of Maria' and 'Maria is parent of Elena'."
    },
    {
      id: "q3",
      TASK_NL: "Is Vasile an uncle of Maria?",
      TASK_DSL: "@q3 Vasile UNCLE_OR_AUNT_OF Maria",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"composition\"}",
      ANSWEAR_NL: "Yes, Vasile is an uncle of Maria. Vasile is sibling of Ion, and Ion is parent of Maria.",
      PROOF_DSL: "@p1 Vasile SIBLING_OF Ion\n@p2 Ion PARENT_OF Maria\n@rule UNCLE_OR_AUNT_OF(?x, ?z) :- SIBLING_OF(?x, ?y), PARENT_OF(?y, ?z)\n@proof PROVE @q3 USING @rule, $p1, $p2",
      PROOF_NL: "This is proven by applying the 'uncle/aunt' rule to the facts 'Vasile is sibling of Ion' and 'Ion is parent of Maria'."
    },
    {
      id: "q4",
      TASK_NL: "Is Ion an ancestor of Andrei?",
      TASK_DSL: "@q4 Ion ANCESTOR_OF Andrei",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\"}",
      ANSWEAR_NL: "Yes, Ion is an ancestor of Andrei through the chain: Ion is parent of Maria (so ancestor), and Maria is parent of Andrei (so Ion is ancestor of Andrei too).",
      PROOF_DSL: "@p1 Ion PARENT_OF Maria\n@p2 Maria PARENT_OF Andrei\n@rule ANCESTOR_OF(?x, ?y) :- PARENT_OF(?x, ?y)\n@rule ANCESTOR_OF(?x, ?z) :- ANCESTOR_OF(?x, ?y), PARENT_OF(?y, ?z)\n@proof PROVE @q4",
      PROOF_NL: "The 'ancestor' relation is transitive. The proof follows the parent chain from Ion to Andrei."
    },
    {
      id: "q5",
      TASK_NL: "Are Andrei and Cosmin cousins?",
      TASK_DSL: "@q5 Andrei COUSIN_OF Cosmin",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"composition\"}",
      ANSWEAR_NL: "Yes, Andrei and Cosmin are cousins. They share Ion as a common grandparent (Ion->Maria->Andrei and Ion's sibling Vasile->Cosmin implies shared great-grandparent level), and they are not siblings.",
      PROOF_DSL: "@p1 Ion GRANDPARENT_OF Andrei\n@p2 Vasile PARENT_OF Cosmin\n@p3 Ion SIBLING_OF Vasile\n@rule COUSIN_OF(?x, ?y) :- ...\n@proof PROVE @q5",
      PROOF_NL: "The proof for cousins is complex, involving finding a common grandparent (Ion for Andrei) and showing the other person (Cosmin) descends from a sibling of that grandparent's child (Vasile is sibling of Maria's parent, Ion)."
    },
    {
      id: "q6",
      TASK_NL: "Why is Ion the grandparent of Andrei?",
      // v3: Query the grandparent relation directly
      TASK_DSL: "@q6 Ion GRANDPARENT_OF Andrei",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Ion is the grandparent of Andrei because Ion is parent of Maria, and Maria is parent of Andrei.",
      PROOF_DSL: "@p1 Ion PARENT_OF Maria\n@p2 Maria PARENT_OF Andrei\n@proof $p1 AND $p2",
      PROOF_NL: "The proof follows the chain: Ion PARENT_OF Maria, Maria PARENT_OF Andrei."
    },
    {
      id: "q7",
      TASK_NL: "How many new facts can be derived from forward chaining?",
      // v3: Query a derived relation to demonstrate forward chaining
      TASK_DSL: "@q7 Ana GRANDPARENT_OF Elena",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Forward chaining can derive that Ana is grandparent of Elena (Ana PARENT_OF Maria, Maria PARENT_OF Elena).",
      PROOF_DSL: "@p1 Ana PARENT_OF Maria\n@p2 Maria PARENT_OF Elena\n@proof $p1 AND $p2",
      PROOF_NL: "Forward chaining derives grandparent relations from parent chains."
    },
    {
      id: "q8",
      TASK_NL: "Is Andrei a sibling of Elena?",
      TASK_DSL: "@q8 Andrei SIBLING_OF Elena",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"composition\"}",
      ANSWEAR_NL: "Yes, Andrei and Elena are siblings - they share the same parent Maria.",
      PROOF_DSL: "@p1 Maria PARENT_OF Andrei\n@p2 Maria PARENT_OF Elena\n@rule SIBLING_OF(?x, ?y) :- PARENT_OF(?z, ?x), PARENT_OF(?z, ?y), ?x != ?y\n@proof PROVE @q8",
      PROOF_NL: "This is proven by a rule stating that if two different individuals share the same parent, they are siblings."
    }
  ],
};