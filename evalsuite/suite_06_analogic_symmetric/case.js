/**
 * Test Case: Comprehensive Analogical & Symmetric Relations
 * Tests symmetric inference, inverse relations, structural analogy, and relation composition
 * Version: 5.0 - Complex proofs with deep analogy chains, multi-hop symmetric reasoning, and structural mapping
 */
module.exports = {
  id: "suite_06_analogic_symmetric",
  name: "Comprehensive Analogical & Symmetric Relations",

  theory_NL: "Family relations with extended network: Maria is married to Ion. Marriage is symmetric. Maria and Ion are parents of Ana. Ana is sibling of Mihai. Maria and Ion are also parents of Mihai. Ana is married to Petru. Ana and Petru are parents of Sofia. Mihai is married to Ioana. Mihai and Ioana are parents of Radu. Grandparent relations derived from parent chains. Parent-child is inverse. Sibling is symmetric. Geography: Bucharest is capital of Romania. Paris is capital of France. France is part of EU. Romania is part of EU. Berlin is capital of Germany. Germany is part of EU. Madrid is capital of Spain. Spain is part of EU. Rome is capital of Italy. Italy is part of EU. Capital cities have embassies. Capitals represent their countries in diplomatic relations. Professional patterns: Doctor treats patient like Teacher teaches student like Lawyer represents client. Service provider serves client pattern. Each profession has core action and target. Profession analogies extend through hierarchies.",

  theory_DSL: [
    // Extended family network
    "Maria MARRIED_TO Ion",
    "Maria PARENT_OF Ana",
    "Ion PARENT_OF Ana",
    "Ana SIBLING_OF Mihai",
    "Maria PARENT_OF Mihai",
    "Ion PARENT_OF Mihai",
    // Next generation
    "Ana MARRIED_TO Petru",
    "Ana PARENT_OF Sofia",
    "Petru PARENT_OF Sofia",
    "Mihai MARRIED_TO Ioana",
    "Mihai PARENT_OF Radu",
    "Ioana PARENT_OF Radu",
    // Relation properties
    "MARRIED_TO IS_A symmetric_relation",
    "SIBLING_OF IS_A symmetric_relation",
    "CHILD_OF INVERSE_OF PARENT_OF",
    "GRANDCHILD_OF INVERSE_OF GRANDPARENT_OF",
    // Geography with hierarchy
    "Bucharest CAPITAL_OF Romania",
    "Paris CAPITAL_OF France",
    "Berlin CAPITAL_OF Germany",
    "Madrid CAPITAL_OF Spain",
    "Rome CAPITAL_OF Italy",
    "London CAPITAL_OF United_Kingdom",
    "Romania PART_OF EU",
    "France PART_OF EU",
    "Germany PART_OF EU",
    "Spain PART_OF EU",
    "Italy PART_OF EU",
    "capital_city HAS embassy",
    "capital_city REPRESENTS country",
    // Professional patterns (structural analogy)
    "doctor TREATS patient",
    "teacher TEACHES student",
    "lawyer REPRESENTS client",
    "chef COOKS food",
    "mechanic REPAIRS vehicle",
    "doctor IS_A service_provider",
    "teacher IS_A service_provider",
    "lawyer IS_A service_provider",
    "service_provider SERVES client_type",
    "patient IS_A client_type",
    "student IS_A client_type",
    "client IS_A client_type"
  ],

  tasks: [
    // Q1: Multi-hop symmetric reasoning with marriage
    {
      id: "q1",
      TASK_NL: "Is Petru married to Ana? (Symmetric inference with verification)",
      TASK_DSL: "@q1 Petru MARRIED_TO Ana",
      ANSWEAR_NL: "Yes, through symmetric property: Ana MARRIED_TO Petru → Petru MARRIED_TO Ana",
      PROOF_DSL: `@p1 Ana MARRIED_TO Petru
@p2 MARRIED_TO IS_A symmetric_relation
@p3 Maria MARRIED_TO Ion
@p4 Ion PARENT_OF Ana
@c1 $p1 ESTABLISHES base_marriage
@c2 $p2 DEFINES symmetry_rule
@c3 $c2 APPLIES_TO $c1
@invert $c3 GENERATES reverse_relation
@verify $p3 CONFIRMS marriage_pattern
@chain $p4 CONNECTS generation
@combine $invert AND $verify
@result $combine IS_A symmetric_inference_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Multi-step symmetric reasoning: Ana MARRIED_TO Petru is a fact. MARRIED_TO is symmetric. Apply symmetry rule to generate reverse. Verify pattern matches known marriages (Maria-Ion)."
    },

    // Q2: Inverse relation chain - grandchild derivation
    {
      id: "q2",
      TASK_NL: "Is Sofia a grandchild of Maria? (Inverse of grandparent chain)",
      TASK_DSL: "@q2 Sofia GRANDCHILD_OF Maria",
      ANSWEAR_NL: "Yes: Maria→Ana→Sofia parent chain, invert to get grandchild",
      PROOF_DSL: `@p1 Maria PARENT_OF Ana
@p2 Ana PARENT_OF Sofia
@p3 CHILD_OF INVERSE_OF PARENT_OF
@p4 GRANDCHILD_OF INVERSE_OF GRANDPARENT_OF
@c1 $p1 LEADS_TO $p2
@grandparent $c1 COMPUTES grandparent_relation
@c2 $p3 ESTABLISHES child_inverse
@c3 $p4 ESTABLISHES grandchild_inverse
@chain $c2 COMPOSES $c3
@apply $chain APPLIES_TO $grandparent
@invert $apply GENERATES inverse_chain
@result $invert IS_A inverse_chain_proof
@proof $result PROVES $q2`,
      PROOF_NL: "4-step inverse chain: parent→parent→grandparent, then apply inverse twice to derive grandchild. Uses composition of inverse relations."
    },

    // Q3: Deep symmetric + transitive - cousin derivation through siblings
    {
      id: "q3",
      TASK_NL: "Is Radu a cousin of Sofia? (Through sibling symmetry and parent chains)",
      TASK_DSL: "@q3 Radu COUSIN_OF Sofia",
      ANSWEAR_NL: "Yes: Mihai (Radu's parent) is sibling of Ana (Sofia's parent)",
      PROOF_DSL: `@p1 Mihai PARENT_OF Radu
@p2 Ana PARENT_OF Sofia
@p3 Ana SIBLING_OF Mihai
@p4 SIBLING_OF IS_A symmetric_relation
@c1 $p3 ESTABLISHES sibling_base
@c2 $p4 APPLIES_TO $c1
@symmetric $c2 DERIVES Mihai_SIBLING_OF_Ana
@parent1 $p1 ESTABLISHES radu_parent
@parent2 $p2 ESTABLISHES sofia_parent
@connect $symmetric LINKS $parent1
@connect2 $connect LINKS $parent2
@cousin_rule parents_are_siblings DEFINES cousin
@apply $cousin_rule APPLIES_TO $connect2
@result $apply IS_A cousin_derivation_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Cousin proof requires: 1) symmetric sibling relation, 2) two parent chains to children, 3) application of cousin rule (parents are siblings → children are cousins)."
    },

    // Q4: Structural analogy - professional patterns
    {
      id: "q4",
      TASK_NL: "What is the structural analogy between doctor:patient and lawyer:client?",
      TASK_DSL: "@q4 doctor_patient ANALOGOUS_TO lawyer_client",
      ANSWEAR_NL: "Both follow service_provider:client_type pattern - structural mapping",
      PROOF_DSL: `@p1 doctor TREATS patient
@p2 lawyer REPRESENTS client
@p3 doctor IS_A service_provider
@p4 lawyer IS_A service_provider
@p5 patient IS_A client_type
@p6 client IS_A client_type
@p7 service_provider SERVES client_type
@c1 $p3 LEADS_TO $p7
@c2 $p4 LEADS_TO $p7
@abstract1 $c1 ABSTRACTS doctor_role
@abstract2 $c2 ABSTRACTS lawyer_role
@map1 $p1 MAPS_TO $abstract1
@map2 $p2 MAPS_TO $abstract2
@structural $map1 PARALLELS $map2
@analogy $structural ESTABLISHES isomorphism
@result $analogy IS_A structural_analogy_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Structural analogy: Both professions abstract to service_provider. Both targets abstract to client_type. Actions map to SERVES. Parallel structure confirms analogy."
    },

    // Q5: Geographic analogy with hierarchy
    {
      id: "q5",
      TASK_NL: "Bucharest:Romania::Paris:? and both countries are in EU",
      TASK_DSL: "@q5 Paris_France SAME_PATTERN Bucharest_Romania",
      ANSWEAR_NL: "France. Both are capital:country pairs, both countries in EU",
      PROOF_DSL: `@p1 Bucharest CAPITAL_OF Romania
@p2 Paris CAPITAL_OF France
@p3 Romania PART_OF EU
@p4 France PART_OF EU
@pattern1 $p1 ESTABLISHES capital_pattern_1
@pattern2 $p2 ESTABLISHES capital_pattern_2
@c1 $pattern1 SAME_RELATION $pattern2
@eu1 $p3 ESTABLISHES eu_membership_1
@eu2 $p4 ESTABLISHES eu_membership_2
@c2 $eu1 SAME_RELATION $eu2
@multi_level $c1 AND $c2
@hierarchical $multi_level CONFIRMS nested_pattern
@analogy $hierarchical COMPLETES structural_mapping
@result $analogy IS_A hierarchical_analogy_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Two-level analogy: capitals match at city:country level, AND both countries match at country:EU level. Multi-level structural mapping."
    },

    // Q6: Complete family tree traversal
    {
      id: "q6",
      TASK_NL: "Find the path from Ion to Radu (multi-generation traversal)",
      TASK_DSL: "@q6 Ion ANCESTOR_OF Radu",
      ANSWEAR_NL: "Ion→Mihai→Radu (grandfather chain)",
      PROOF_DSL: `@p1 Ion PARENT_OF Mihai
@p2 Mihai PARENT_OF Radu
@p3 Ion PARENT_OF Ana
@p4 Ana SIBLING_OF Mihai
@c1 $p1 ESTABLISHES first_generation
@c2 $p2 ESTABLISHES second_generation
@chain $c1 LEADS_TO $c2
@alt_check $p3 ESTABLISHES alternate_path
@sibling_verify $p4 CONFIRMS sibling_relation
@path_select $chain PREFERRED_OVER indirect_path
@ancestor $path_select COMPUTES ancestor_relation
@depth $ancestor HAS depth_2
@result $depth IS_A ancestor_chain_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Direct path: Ion PARENT_OF Mihai PARENT_OF Radu. Verified against alternate sibling path. Depth-2 ancestor chain."
    },

    // Q7: Inverse with symmetric combination
    {
      id: "q7",
      TASK_NL: "Is Ion the father-in-law of Ioana? (Through marriage and inverse)",
      TASK_DSL: "@q7 Ion FATHER_IN_LAW_OF Ioana",
      ANSWEAR_NL: "Yes: Ion is parent of Mihai, Mihai is married to Ioana",
      PROOF_DSL: `@p1 Ion PARENT_OF Mihai
@p2 Mihai MARRIED_TO Ioana
@p3 MARRIED_TO IS_A symmetric_relation
@p4 Maria MARRIED_TO Ion
@c1 $p1 ESTABLISHES parent_relation
@c2 $p2 ESTABLISHES marriage_relation
@c3 $p3 CONFIRMS marriage_symmetry
@in_law parent_of_spouse DEFINES in_law_relation
@compose $c1 LEADS_TO $c2
@apply $in_law APPLIES_TO $compose
@verify $p4 CONFIRMS ion_married
@chain $apply AND $verify
@result $chain IS_A in_law_derivation_proof
@proof $result PROVES $q7`,
      PROOF_NL: "In-law derivation: parent_of_spouse pattern. Ion is parent of Mihai. Mihai is married to Ioana. Compose relations to derive father-in-law."
    },

    // Q8: Full analogy search - find all matching patterns
    {
      id: "q8",
      TASK_NL: "Find all professional patterns that match service_provider:client_type structure",
      TASK_DSL: "@q8 service_pattern SEARCH all_matches",
      ANSWEAR_NL: "doctor:patient, teacher:student, lawyer:client all match the pattern",
      PROOF_DSL: `@p1 doctor IS_A service_provider
@p2 teacher IS_A service_provider
@p3 lawyer IS_A service_provider
@p4 patient IS_A client_type
@p5 student IS_A client_type
@p6 client IS_A client_type
@p7 doctor TREATS patient
@p8 teacher TEACHES student
@p9 lawyer REPRESENTS client
@pattern service_provider SERVES client_type
@match1 $p1 MATCHES $pattern
@match2 $p2 MATCHES $pattern
@match3 $p3 MATCHES $pattern
@verify1 $p7 INSTANTIATES $match1
@verify2 $p8 INSTANTIATES $match2
@verify3 $p9 INSTANTIATES $match3
@collect $verify1 JOINS $verify2
@collect2 $collect JOINS $verify3
@search $collect2 RETURNS all_matches
@result $search IS_A pattern_search_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Pattern search: 1) Find all service_providers (doctor, teacher, lawyer). 2) Verify each has client_type target. 3) Confirm specific action relations exist. 4) Collect all matches."
    }
  ]
};
