/**
 * Test Case: Contradiction Detection & Constraint Validation
 * Tests automatic contradiction detection on fact creation, functional constraints, cardinality constraints, and DISJOINT_WITH enforcement. In v3.0, contradiction detection is AUTOMATIC - no special command needed.
 * Version: 3.0
 */

module.exports = {
  id: "suite_09_contradictions",
  name: "Contradiction Detection & Constraint Validation",
  description: "Tests automatic contradiction detection on fact creation, functional constraints, cardinality constraints, and DISJOINT_WITH enforcement. In v3.0, contradiction detection is AUTOMATIC - no special command needed.",
  theory: {
    natural_language: "Medical records system with strict constraints. Functional constraints (single value only): A person can only be born in one place. A person can only have one biological mother. A person can only have one biological father. Cardinality constraints: A patient must have at least 1 doctor but no more than 3 doctors assigned. A doctor can have between 1 and 50 patients. Disjoint categories: A person cannot be both alive and dead. A diagnosis cannot be both confirmed and ruled_out. An employee cannot be both active and terminated. Current facts: Patient John was born in Chicago. John's biological mother is Mary. John's biological father is Robert. John is alive. John has DrSmith as doctor. John has DrJones as doctor. DrSmith is a cardiologist. DrJones is a neurologist. John's diagnosis of diabetes is confirmed.",
    expected_facts: [
          "John IS_A patient",
          "John BORN_IN Chicago",
          "John BIOLOGICAL_MOTHER Mary",
          "John BIOLOGICAL_FATHER Robert",
          "John IS_A alive",
          "John HAS_DOCTOR DrSmith",
          "John HAS_DOCTOR DrJones",
          "DrSmith IS_A cardiologist",
          "DrJones IS_A neurologist",
          "John HAS_DIAGNOSIS diabetes",
          "diabetes_diagnosis STATUS confirmed"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Would it be a contradiction to say John was born in New York?",
      expected_dsl: `@q1 John BORN_IN New_York`,
      expected_answer: {
        natural_language: "Yes, this would be a contradiction. John is already recorded as born in Chicago, and BORN_IN is a functional relation - a person can only be born in one place.",
        truth: "CONFLICT",
        explanation: "Functional constraint violation: BORN_IN allows only one value. Result point has kind='conflict'.",
        existence: undefined
      }
    },
    {
      id: "q2",
      natural_language: "Would it be a contradiction to say John has a second biological mother named Susan?",
      expected_dsl: `@q2 John BIOLOGICAL_MOTHER Susan`,
      expected_answer: {
        natural_language: "Yes, this would be a contradiction. John already has Mary as biological mother, and BIOLOGICAL_MOTHER is functional.",
        truth: "CONFLICT",
        explanation: "Functional constraint: only one biological mother allowed",
        existence: undefined
      }
    },
    {
      id: "q3",
      natural_language: "Would it be a contradiction to say John is dead?",
      expected_dsl: `@q3 John IS_A dead`,
      expected_answer: {
        natural_language: "Yes, this would be a contradiction. John is currently recorded as alive, and alive and dead are disjoint - a person cannot be both.",
        truth: "CONFLICT",
        explanation: "Disjoint violation: alive DISJOINT_WITH dead",
        existence: undefined
      }
    },
    {
      id: "q4",
      natural_language: "Is the current theory consistent?",
      expected_dsl: `@q4 current_theory VALIDATE any`,
      expected_answer: {
        natural_language: "Yes, the current theory is consistent. No functional constraints are violated, no disjoint types are assigned to the same entity, and cardinality constraints are satisfied.",
        truth: "TRUE_CERTAIN",
        explanation: "VALIDATE checks all constraints and finds no violations",
        existence: "positive"
      }
    },
    {
      id: "q5",
      natural_language: "Can John have a fourth doctor assigned?",
      expected_dsl: `
        @_ John HAS_DOCTOR DrWilson
        @q5 John HAS_DOCTOR DrBrown
      `,
      expected_answer: {
        natural_language: "No, if John already has 3 doctors, adding a fourth would violate the cardinality constraint (max 3 doctors per patient).",
        truth: "CONFLICT",
        explanation: "Cardinality violation: max=3 for HAS_DOCTOR",
        existence: undefined
      }
    },
    {
      id: "q6",
      natural_language: "Would saying 'cat IS_A mammal AND cat IS_A fish' be a contradiction?",
      expected_dsl: `
        @_ cat IS_A mammal
        @q6 cat IS_A fish
      `,
      expected_answer: {
        natural_language: "Yes, this would be a contradiction. Mammals and fish are disjoint categories - nothing can be both a mammal and a fish.",
        truth: "CONFLICT",
        explanation: "Taxonomic contradiction via inherited disjointness",
        existence: undefined
      }
    },
    {
      id: "q7",
      natural_language: "Can John's diabetes diagnosis be both confirmed and ruled out?",
      expected_dsl: `@q7 diabetes_diagnosis STATUS ruled_out`,
      expected_answer: {
        natural_language: "No, this would be a contradiction. The diagnosis is already confirmed, and confirmed and ruled_out are disjoint states.",
        truth: "CONFLICT",
        explanation: "Disjoint status values cannot coexist",
        existence: undefined
      }
    },
    {
      id: "q8",
      natural_language: "Why would having two birth places be a contradiction?",
      expected_dsl: `
        @_ TestPerson BORN_IN PlaceA
        @conflict TestPerson BORN_IN PlaceB
        @q8 $conflict EXPLAIN any
      `,
      expected_answer: {
        natural_language: "BORN_IN is registered as a functional relation, meaning each subject can have at most one value for this relation. A person can only be born in one place - this is a real-world constraint that the system enforces.",
        truth: "TRUE_CERTAIN",
        explanation: "EXPLAIN returns reasoning about the conflict",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
