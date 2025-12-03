/**
 * Test Case: Comprehensive Deontic Rules & Permissions
 * Tests PERMITS, PROHIBITS, REQUIRES, OBLIGATES for regulatory and policy reasoning
 * Version: 3.0
 */
module.exports = {
  id: "suite_03_deontic",
  name: "Comprehensive Deontic Rules & Permissions",
  theory_NL: "In drone regulations: Medical drones are permitted to fly over hospitals. Commercial drones are prohibited from flying in city centers. All drones require registration. Emergency drones are permitted everywhere. Regular drones can only fly in rural areas. In workplace: Employees are required to wear safety equipment in the factory. Managers are permitted to access confidential files. Interns are prohibited from accessing confidential files. All employees must complete safety training. In finance: Transactions over 10000 dollars require approval. International transfers require compliance check. Cash withdrawals over 5000 require ID verification. Customers are permitted to view their own accounts. In healthcare: Doctors are permitted to prescribe medication. Nurses are permitted to administer prescribed medication. Only doctors can prescribe controlled substances. Patients are required to give consent for treatment. Medical records require patient authorization to share.",
  theory_DSL: [
    "medical_drone PERMITTED_TO fly_over_hospital",
    "commercial_drone PROHIBITED_FROM city_center",
    "drone REQUIRES registration",
    "emergency_drone PERMITTED_TO fly_everywhere",
    "regular_drone PERMITTED_TO fly_rural_area",
    "employee REQUIRED_TO wear_safety_equipment",
    "manager PERMITTED_TO access_confidential_files",
    "intern PROHIBITED_FROM access_confidential_files",
    "employee REQUIRED_TO complete_safety_training",
    "large_transaction REQUIRES approval",
    "international_transfer REQUIRES compliance_check",
    "large_cash_withdrawal REQUIRES id_verification",
    "customer PERMITTED_TO view_own_account",
    "doctor PERMITTED_TO prescribe_medication",
    "nurse PERMITTED_TO administer_medication",
    "controlled_substance REQUIRES doctor_prescription",
    "treatment REQUIRES patient_consent",
    "medical_record_sharing REQUIRES patient_authorization"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Can a medical drone fly over a hospital?",
      TASK_DSL: `@q1 medical_drone PERMITTED_TO fly_over_hospital`,
      ANSWEAR_DSL: `{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}`,
      ANSWEAR_NL: "Yes, medical drones are permitted to fly over hospitals.",
      PROOF_DSL: `@proof medical_drone PERMITTED_TO fly_over_hospital`,
      PROOF_NL: "This is a direct fact in the knowledge base."
    },
    {
      id: "q2",
      TASK_NL: "Is a commercial drone allowed in the city center?",
      TASK_DSL: `@q2 commercial_drone PERMITTED_TO city_center`,
      ANSWEAR_DSL: `{\"truth\": \"FALSE\", \"method\": \"contradiction\", \"reason\": \"PROHIBITED_FROM city_center\"}`,
      ANSWEAR_NL: "No, commercial drones are prohibited from city centers.",
      PROOF_DSL: `@proof commercial_drone PROHIBITED_FROM city_center`,
      PROOF_NL: "This is proven false because there is a direct fact prohibiting this action."
    },
    {
      id: "q3",
      TASK_NL: "Can an intern access confidential files?",
      TASK_DSL: `@q3 intern PERMITTED_TO access_confidential_files`,
      ANSWEAR_DSL: `{\"truth\": \"FALSE\", \"method\": \"contradiction\", \"reason\": \"PROHIBITED_FROM access_confidential_files\"}`,
      ANSWEAR_NL: "No, interns are prohibited from accessing confidential files.",
      PROOF_DSL: `@proof intern PROHIBITED_FROM access_confidential_files`,
      PROOF_NL: "This is proven false due to a direct prohibition rule."
    },
    {
      id: "q4",
      TASK_NL: "Can a manager access confidential files?",
      TASK_DSL: `@q4 manager PERMITTED_TO access_confidential_files`,
      ANSWEAR_DSL: `{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}`,
      ANSWEAR_NL: "Yes, managers are permitted to access confidential files.",
      PROOF_DSL: `@proof manager PERMITTED_TO access_confidential_files`,
      PROOF_NL: "This is a direct fact in the knowledge base."
    },
    {
        "id": "q5",
        "TASK_NL": "Does an international transfer require a compliance check?",
        "TASK_DSL": "@q5 international_transfer REQUIRES compliance_check",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, international transfers require a compliance check.",
        "PROOF_DSL": "@proof international_transfer REQUIRES compliance_check",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q6",
        "TASK_NL": "Can a nurse prescribe medication?",
        "TASK_DSL": "@q6 nurse PERMITTED_TO prescribe_medication",
        "ANSWEAR_DSL": "{\"truth\": \"FALSE\", \"method\": \"no_path\"}",
        "ANSWEAR_NL": "No, nurses can only administer medication, not prescribe it. Only doctors can prescribe.",
        "PROOF_DSL": "@p1 nurse PERMITTED_TO administer_medication\n@p2 doctor PERMITTED_TO prescribe_medication\n@proof $p1 AND ($p2 NOT any)",
        "PROOF_NL": "The knowledge base states that nurses can 'administer' medication, but the permission to 'prescribe' is explicitly given only to doctors. There is no rule granting this permission to nurses."
    },
    {
        "id": "q7",
        "TASK_NL": "Is patient consent required for treatment?",
        "TASK_DSL": "@q7 treatment REQUIRES patient_consent",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, treatment requires patient consent.",
        "PROOF_DSL": "@proof treatment REQUIRES patient_consent",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q8",
        "TASK_NL": "Can a customer view their own account?",
        "TASK_DSL": "@q8 customer PERMITTED_TO view_own_account",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, customers are permitted to view their own accounts.",
        "PROOF_DSL": "@proof customer PERMITTED_TO view_own_account",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    }
  ],
};