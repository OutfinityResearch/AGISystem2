/**
 * Test Case: Comprehensive Deontic Rules & Permissions
 * Tests PERMITTED_TO, PROHIBITED_FROM, REQUIRED_TO with role inheritance, exception handling, and conflict resolution
 * Version: 5.0 - Complex proofs with permission inheritance, delegation, and multi-level authorization
 */
module.exports = {
  id: "suite_03_deontic",
  name: "Comprehensive Deontic Rules & Permissions",

  theory_NL: "In drone regulations: Medical drones are permitted to fly over hospitals. Emergency drones inherit all medical drone permissions. Commercial drones are prohibited from city centers. All drones require registration. Emergency situations override normal prohibitions. In workplace: Employees are required to wear safety equipment. Senior employees are employees. Managers are senior employees. Managers can delegate access. Managers are permitted to access confidential files. Interns are prohibited from accessing confidential files. Department heads can override intern restrictions. In finance: Transactions over 10000 require approval. Approval requires manager signature. Manager signature requires authentication. International transfers require compliance check. Compliance check requires documentation. In healthcare: Doctors are medical professionals. Medical professionals are permitted to access patient records. Doctors are permitted to prescribe medication. Nurses can administer but not prescribe. Controlled substances require extra authorization. Emergency situations allow nurses to give certain medications.",

  theory_DSL: [
    // Drone regulations (with inheritance)
    "medical_drone PERMITTED_TO fly_over_hospital",
    "emergency_drone IS_A medical_drone",
    "emergency_drone PERMITTED_TO fly_anywhere",
    "commercial_drone PROHIBITED_FROM city_center",
    "drone REQUIRES registration",
    "emergency_situation OVERRIDES normal_prohibition",
    "emergency_situation IS_A active_condition",
    "emergency_protocol IS_A active_situation",
    // Workplace (with role hierarchy)
    "employee REQUIRED_TO wear_safety_equipment",
    "senior_employee IS_A employee",
    "manager IS_A senior_employee",
    "manager CAN delegate_access",
    "manager PERMITTED_TO access_confidential_files",
    "intern PROHIBITED_FROM access_confidential_files",
    "department_head IS_A manager",
    "department_head CAN override_restriction",
    // Finance (with requirement chains)
    "large_transaction REQUIRES approval",
    "approval REQUIRES manager_signature",
    "manager_signature REQUIRES authentication",
    "authentication REQUIRES valid_credentials",
    "international_transfer REQUIRES compliance_check",
    "compliance_check REQUIRES documentation",
    "documentation REQUIRES source_verification",
    // Healthcare (with role-based access)
    "doctor IS_A medical_professional",
    "nurse IS_A medical_professional",
    "medical_professional PERMITTED_TO access_patient_records",
    "doctor PERMITTED_TO prescribe_medication",
    "nurse PERMITTED_TO administer_medication",
    "nurse PROHIBITED_FROM prescribe_medication",
    "controlled_substance REQUIRES extra_authorization",
    "extra_authorization REQUIRES two_signatures",
    "emergency_protocol ENABLES nurse_medication_override"
  ],

  tasks: [
    // Q1: Permission inheritance through type hierarchy
    {
      id: "q1",
      TASK_NL: "Can an emergency drone fly over a hospital? (Permission inheritance)",
      TASK_DSL: "@q1 emergency_drone PERMITTED_TO fly_over_hospital",
      ANSWEAR_NL: "Yes, through inheritance: emergency_drone IS_A medical_drone, medical_drone PERMITTED_TO fly_over_hospital",
      PROOF_DSL: `@p1 emergency_drone IS_A medical_drone
@p2 medical_drone PERMITTED_TO fly_over_hospital
@p3 emergency_drone PERMITTED_TO fly_anywhere
@c1 $p1 LEADS_TO $p2
@inherit $c1 TRANSFERS permission
@alt $p3 PROVIDES direct_permission
@combine $inherit JOINS $alt
@result $combine IS_A permission_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Permission inheritance: emergency drones inherit permissions from medical drones, plus they have direct permission to fly anywhere."
    },

    // Q2: Prohibition with conflict detection
    {
      id: "q2",
      TASK_NL: "Can a commercial drone operate in city center during emergency? (Override reasoning)",
      TASK_DSL: "@q2 commercial_drone PERMITTED_TO city_center_emergency",
      ANSWEAR_NL: "Complex: normally prohibited, but emergency_situation can override.",
      PROOF_DSL: `@p1 commercial_drone PROHIBITED_FROM city_center
@p2 emergency_situation OVERRIDES normal_prohibition
@p3 emergency_situation IS_A active_condition
@c1 $p1 ESTABLISHES default_prohibition
@c2 $p2 ENABLES override_mechanism
@c3 $p3 ACTIVATES $c2
@conditional $c3 LEADS_TO $c2
@resolve $conditional RESOLVES $c1
@result $resolve IS_A conditional_override_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Override reasoning: Default prohibition exists, but emergency_situation provides an override mechanism that can resolve the conflict when active."
    },

    // Q3: Role hierarchy permission inheritance (manager from employee)
    {
      id: "q3",
      TASK_NL: "Is a manager required to wear safety equipment? (Role inheritance)",
      TASK_DSL: "@q3 manager REQUIRED_TO wear_safety_equipment",
      ANSWEAR_NL: "Yes: manager IS_A senior_employee IS_A employee, employee REQUIRED_TO wear_safety_equipment",
      PROOF_DSL: `@p1 manager IS_A senior_employee
@p2 senior_employee IS_A employee
@p3 employee REQUIRED_TO wear_safety_equipment
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@inherit $c2 TRANSFERS requirement
@obligation $inherit ESTABLISHES binding_duty
@result $obligation IS_A inherited_requirement_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Requirement inheritance: manager→senior_employee→employee, and employees are required to wear safety equipment. Requirements propagate down the hierarchy."
    },

    // Q4: Conflicting permissions - intern vs manager delegation
    {
      id: "q4",
      TASK_NL: "Can department head give intern access to confidential files? (Delegation vs prohibition)",
      TASK_DSL: "@q4 department_head DELEGATES access_to_intern",
      ANSWEAR_NL: "Yes: department head can override restrictions, resolving the conflict.",
      PROOF_DSL: `@p1 intern PROHIBITED_FROM access_confidential_files
@p2 department_head IS_A manager
@p3 manager CAN delegate_access
@p4 department_head CAN override_restriction
@c1 $p2 LEADS_TO $p3
@c2 $p2 LEADS_TO $p4
@capability $c1 GRANTS delegation_power
@override $c2 GRANTS restriction_override
@apply $override TARGETS $p1
@resolve $apply SUPERSEDES $p1
@result $resolve IS_A delegation_override_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Delegation with override: Department head inherits manager's delegation power AND has override capability. Override supersedes the intern prohibition."
    },

    // Q5: Requirement chain - what does a large transaction need?
    {
      id: "q5",
      TASK_NL: "What is ultimately required for a large transaction? (Requirement chain)",
      TASK_DSL: "@q5 large_transaction REQUIRES valid_credentials",
      ANSWEAR_NL: "Through chain: large_transaction→approval→manager_signature→authentication→valid_credentials",
      PROOF_DSL: `@p1 large_transaction REQUIRES approval
@p2 approval REQUIRES manager_signature
@p3 manager_signature REQUIRES authentication
@p4 authentication REQUIRES valid_credentials
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 COMPUTES transitive_requirements
@result $chain IS_A requirement_chain_proof
@proof $result PROVES $q5`,
      PROOF_NL: "4-step requirement chain: Each requirement has its own prerequisite, forming a chain of dependencies."
    },

    // Q6: Can nurse prescribe? (Direct prohibition despite role)
    {
      id: "q6",
      TASK_NL: "Can a nurse prescribe medication? (Explicit prohibition despite role)",
      TASK_DSL: "@q6 nurse PERMITTED_TO prescribe_medication",
      ANSWEAR_NL: "No - despite being medical professional, nurses have explicit prohibition on prescribing.",
      PROOF_DSL: `@p1 nurse IS_A medical_professional
@p2 medical_professional PERMITTED_TO access_patient_records
@p3 nurse PERMITTED_TO administer_medication
@p4 nurse PROHIBITED_FROM prescribe_medication
@p5 doctor PERMITTED_TO prescribe_medication
@c1 $p1 LEADS_TO $p2
@c2 $p4 BLOCKS prescription_permission
@c3 $p5 CONTRASTS $p4
@explicit $c2 OVERRIDES implicit_inheritance
@result $explicit IS_A explicit_prohibition_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Explicit prohibition: Although nurses inherit some permissions from medical_professional, the explicit PROHIBITED_FROM on prescribing overrides any potential inheritance."
    },

    // Q7: International transfer full requirement chain
    {
      id: "q7",
      TASK_NL: "What documentation chain is needed for international transfer?",
      TASK_DSL: "@q7 international_transfer REQUIRES source_verification",
      ANSWEAR_NL: "international_transfer→compliance_check→documentation→source_verification",
      PROOF_DSL: `@p1 international_transfer REQUIRES compliance_check
@p2 compliance_check REQUIRES documentation
@p3 documentation REQUIRES source_verification
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@transitive $c2 DERIVES ultimate_requirement
@result $transitive IS_A transitive_requirement_proof
@proof $result PROVES $q7`,
      PROOF_NL: "3-step transitive requirement: Each step in the compliance chain adds another requirement."
    },

    // Q8: Emergency protocol override
    {
      id: "q8",
      TASK_NL: "Can nurse give medication in emergency without prescription? (Protocol override)",
      TASK_DSL: "@q8 nurse PERMITTED_TO emergency_medication",
      ANSWEAR_NL: "Yes - emergency_protocol enables nurse medication override, superseding normal prohibition.",
      PROOF_DSL: `@p1 nurse PROHIBITED_FROM prescribe_medication
@p2 emergency_protocol ENABLES nurse_medication_override
@p3 emergency_protocol IS_A active_situation
@p4 nurse PERMITTED_TO administer_medication
@c1 $p2 PROVIDES override_capability
@c2 $p3 ACTIVATES $c1
@c3 $p4 ESTABLISHES base_permission
@activate $c2 TRIGGERS $c1
@override $activate SUPERSEDES $p1
@combine $override EXTENDS $c3
@result $combine IS_A emergency_override_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Emergency override: Normal prohibition is superseded by emergency protocol that enables medication override for nurses, extending their base administration permission."
    }
  ]
};
