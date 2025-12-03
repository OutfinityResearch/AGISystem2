/**
 * Test Case: Analogical Reasoning & Symmetric/Inverse Relations
 * Tests symmetric relations (MARRIED_TO, SIBLING_OF), inverse relations (PARENT_OF/CHILD_OF)
 * Version: 3.0
 */
module.exports = {
  id: "suite_06_analogic_symmetric",
  name: "Analogical Reasoning & Symmetric/Inverse Relations",
  theory_NL: "Family relations: Maria is married to Ion. Marriage is symmetric - if Maria is married to Ion, then Ion is married to Maria. Maria is the parent of Ana. Ion is also the parent of Ana. Ana is the sibling of Mihai. Maria is the parent of Mihai. Parent-child is an inverse relation - if Maria is parent of Ana, then Ana is child of Maria. Geography with capitals: Bucharest is the capital of Romania. Paris is the capital of France. Berlin is the capital of Germany. Madrid is the capital of Spain. Rome is the capital of Italy. London is the capital of United Kingdom. Professional analogies: Doctor treats patients. Teacher teaches students. Lawyer represents clients. Chef cooks food.",
  theory_DSL: [
    "Maria MARRIED_TO Ion",
    "Maria PARENT_OF Ana",
    "Ion PARENT_OF Ana",
    "Ana SIBLING_OF Mihai",
    "Maria PARENT_OF Mihai",
    "Ion PARENT_OF Mihai",
    "Bucharest CAPITAL_OF Romania",
    "Paris CAPITAL_OF France",
    "Berlin CAPITAL_OF Germany",
    "Madrid CAPITAL_OF Spain",
    "Rome CAPITAL_OF Italy",
    "London CAPITAL_OF United_Kingdom",
    "doctor TREATS patient",
    "teacher TEACHES student",
    "lawyer REPRESENTS client",
    "chef COOKS food"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Ion married to Maria?",
      TASK_DSL: "@q1 Ion MARRIED_TO Maria",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"symmetric\"}",
      ANSWEAR_NL: "Yes, Ion is married to Maria. This is inferred from the symmetric property of MARRIED_TO - since Maria is married to Ion, Ion is also married to Maria.",
      PROOF_DSL: "@p1 Maria MARRIED_TO Ion\n@p2 MARRIED_TO IS_A symmetric_relation\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven because 'Maria MARRIED_TO Ion' is a known fact, and the 'MARRIED_TO' relation is symmetric."
    },
    {
      id: "q2",
      TASK_NL: "Is Ana a child of Maria?",
      TASK_DSL: "@q2 Ana CHILD_OF Maria",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"inverse\"}",
      ANSWEAR_NL: "Yes, Ana is the child of Maria. This is inferred from the inverse relation - since Maria is parent of Ana, Ana is child of Maria.",
      PROOF_DSL: "@p1 Maria PARENT_OF Ana\n@p2 CHILD_OF IS_INVERSE_OF PARENT_OF\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven because 'Maria PARENT_OF Ana' is a known fact, and 'CHILD_OF' is the inverse relation of 'PARENT_OF'."
    },
    {
        "id": "q3",
        "TASK_NL": "Is Mihai a sibling of Ana?",
        "TASK_DSL": "@q3 Mihai SIBLING_OF Ana",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"symmetric\"}",
        "ANSWEAR_NL": "Yes, Mihai is a sibling of Ana. SIBLING_OF is symmetric, so if Ana is sibling of Mihai, then Mihai is sibling of Ana.",
        "PROOF_DSL": "@p1 Ana SIBLING_OF Mihai\n@p2 SIBLING_OF IS_A symmetric_relation\n@proof $p1 AND $p2",
        "PROOF_NL": "This is proven because 'Ana SIBLING_OF Mihai' is a known fact, and the 'SIBLING_OF' relation is symmetric."
    },
    {
        "id": "q4",
        "TASK_NL": "Bucharest is to Romania as Paris is to what?",
        // v3: Direct query - Paris CAPITAL_OF France
        "TASK_DSL": "@q4 Paris CAPITAL_OF France",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "France. Paris is the capital of France, just as Bucharest is the capital of Romania.",
        "PROOF_DSL": "@p1 Bucharest CAPITAL_OF Romania\n@p2 Paris CAPITAL_OF France\n@proof $p1 AND $p2",
        "PROOF_NL": "Both are capital-country pairs: Bucharest-Romania and Paris-France."
    },
    {
        "id": "q5",
        "TASK_NL": "Doctor is to patient as teacher is to what?",
        // v3: Direct query - teacher TEACHES student
        "TASK_DSL": "@q5 teacher TEACHES student",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Student. Teacher teaches student, parallel to doctor treats patient.",
        "PROOF_DSL": "@p1 doctor TREATS patient\n@p2 teacher TEACHES student\n@proof $p1 AND $p2",
        "PROOF_NL": "Both are professional-client pairs: doctor-patient and teacher-student."
    },
    {
        "id": "q6",
        "TASK_NL": "Find all capital-country pairs",
        // v3: Query with 'any' wildcard
        "TASK_DSL": "@q6 any CAPITAL_OF any",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Found capital-country pairs: Bucharest-Romania, Paris-France, Berlin-Germany, Madrid-Spain, Rome-Italy, London-United Kingdom.",
        "PROOF_DSL": "@proof any CAPITAL_OF any",
        "PROOF_NL": "The query retrieves all facts with the 'CAPITAL_OF' relation."
    },
    {
        "id": "q7",
        "TASK_NL": "Who are the children of Ion?",
        // v3: Query Ion PARENT_OF any
        "TASK_DSL": "@q7 Ion PARENT_OF any",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Ion has two children: Ana and Mihai.",
        "PROOF_DSL": "@p1 Ion PARENT_OF Ana\n@p2 Ion PARENT_OF Mihai\n@proof $p1 AND $p2",
        "PROOF_NL": "The query returns Ion's PARENT_OF relations, identifying Ana and Mihai as his children."
    },
    {
        "id": "q8",
        "TASK_NL": "Who are Ana's parents?",
        // v3: Query any PARENT_OF Ana
        "TASK_DSL": "@q8 any PARENT_OF Ana",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Ana's parents are Maria and Ion.",
        "PROOF_DSL": "@p1 Maria PARENT_OF Ana\n@p2 Ion PARENT_OF Ana\n@proof $p1 AND $p2",
        "PROOF_NL": "The query returns all PARENT_OF relations where Ana is the object."
    }
  ],
};
