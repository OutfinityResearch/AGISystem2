/**
 * Test Case: Comprehensive Compositional Rules & Forward Chaining
 * Tests relation composition, rule derivation, transitive chains, and compositional inference
 * Version: 5.0 - Complex proofs with deep composition chains, rule application, and backtracking search
 */
module.exports = {
  id: "suite_07_compositional_rules",
  name: "Comprehensive Compositional Rules & Forward Chaining",

  theory_NL: "Extended genealogy with compositional rules. Ion is parent of Maria. Ana is also parent of Maria. Maria is parent of Andrei, Elena, and Cristian. Andrei is parent of Sofia and Matei. Elena is parent of Daria. Vasile is sibling of Ion. Vasile is parent of Cosmin. Cosmin is parent of Liviu. Compositional rules: Grandparent = parent of parent. Great-grandparent = parent of grandparent. Ancestor = transitive closure of parent. Uncle/Aunt = sibling of parent. Cousin = child of uncle/aunt. Second-cousin = grandchild of great-uncle/aunt. Siblings share at least one parent. Step-sibling shares one parent but not both. Descendant = inverse of ancestor. Rule composition: If A REQUIRES B and B REQUIRES C, then A transitively REQUIRES C. Access rules: Owner grants access. Manager delegates access. Access is transitive through delegation chains.",

  theory_DSL: [
    // Extended family tree
    "Ion PARENT_OF Maria",
    "Ana PARENT_OF Maria",
    "Maria PARENT_OF Andrei",
    "Maria PARENT_OF Elena",
    "Maria PARENT_OF Cristian",
    "Andrei PARENT_OF Sofia",
    "Andrei PARENT_OF Matei",
    "Elena PARENT_OF Daria",
    "Vasile SIBLING_OF Ion",
    "Vasile PARENT_OF Cosmin",
    "Cosmin PARENT_OF Liviu",
    // Compositional rules (meta-level)
    "grandparent COMPOSED_OF parent_of_parent",
    "great_grandparent COMPOSED_OF parent_of_grandparent",
    "ancestor TRANSITIVE_CLOSURE_OF parent",
    "uncle_aunt COMPOSED_OF sibling_of_parent",
    "cousin COMPOSED_OF child_of_uncle",
    "descendant INVERSE_OF ancestor",
    // Sibling derivation
    "Andrei SIBLING_OF Elena",
    "Andrei SIBLING_OF Cristian",
    "Elena SIBLING_OF Cristian",
    // Access control rules
    "owner GRANTS access",
    "manager DELEGATES access",
    "delegation TRANSITIVE_THROUGH manager_chain",
    "access_check REQUIRES authorization",
    "authorization REQUIRES authentication",
    "authentication REQUIRES credentials"
  ],

  tasks: [
    // Q1: 4-level ancestor chain - great-great relationship
    {
      id: "q1",
      TASK_NL: "Is Ion a great-great-grandparent of Sofia? (4-generation chain)",
      TASK_DSL: "@q1 Ion GREAT_GREAT_GRANDPARENT_OF Sofia",
      ANSWEAR_NL: "Yes: Ion→Maria→Andrei→Sofia (4 steps)",
      PROOF_DSL: `@p1 Ion PARENT_OF Maria
@p2 Maria PARENT_OF Andrei
@p3 Andrei PARENT_OF Sofia
@p4 grandparent COMPOSED_OF parent_of_parent
@p5 great_grandparent COMPOSED_OF parent_of_grandparent
@c1 $p1 LEADS_TO $p2
@grandparent_ion $c1 APPLIES $p4
@c2 $grandparent_ion LEADS_TO $p3
@great $c2 APPLIES $p5
@compose $p4 EXTENDS $p5
@four_gen $compose DERIVES great_great_grandparent
@apply $four_gen APPLIES_TO $great
@result $apply IS_A deep_composition_proof
@proof $result PROVES $q1`,
      PROOF_NL: "4-generation composition: parent→parent=grandparent, grandparent→parent=great-grandparent, extend pattern for 4 levels."
    },

    // Q2: Cousin derivation with search
    {
      id: "q2",
      TASK_NL: "Are Andrei and Cosmin cousins? (Search for common grandparent)",
      TASK_DSL: "@q2 Andrei COUSIN_OF Cosmin",
      ANSWEAR_NL: "Yes: Their parents (Maria, Vasile) have a common parent generation (Ion's parents)",
      PROOF_DSL: `@p1 Maria PARENT_OF Andrei
@p2 Vasile PARENT_OF Cosmin
@p3 Vasile SIBLING_OF Ion
@p4 Ion PARENT_OF Maria
@p5 cousin COMPOSED_OF child_of_uncle
@p6 uncle_aunt COMPOSED_OF sibling_of_parent
@c1 $p3 SATISFIES sibling_relation
@c2 $p4 ESTABLISHES ion_parent_of_maria
@c3 $c1 APPLIES $p6
@uncle $c3 DERIVES Vasile_uncle_of_Maria
@c4 $p2 ESTABLISHES cosmin_is_child
@c5 $p1 ESTABLISHES andrei_is_child
@cousin_path $uncle LEADS_TO $c4
@apply $cousin_path APPLIES $p5
@verify $c5 CONFIRMS same_generation
@result $apply IS_A cousin_composition_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Cousin derivation: 1) Vasile is sibling of Ion 2) Ion is parent of Maria 3) Apply uncle rule 4) Cosmin is child of uncle 5) Apply cousin rule."
    },

    // Q3: Second-cousin calculation
    {
      id: "q3",
      TASK_NL: "Are Sofia and Liviu second-cousins? (Deep relationship search)",
      TASK_DSL: "@q3 Sofia SECOND_COUSIN_OF Liviu",
      ANSWEAR_NL: "Yes: grandparents Maria/Cosmin are cousins (parents Ion/Vasile are siblings)",
      PROOF_DSL: `@p1 Andrei PARENT_OF Sofia
@p2 Cosmin PARENT_OF Liviu
@p3 Maria PARENT_OF Andrei
@p4 Vasile PARENT_OF Cosmin
@p5 Vasile SIBLING_OF Ion
@p6 Ion PARENT_OF Maria
@gp1 $p1 LEADS_TO $p3
@gp2 $p2 LEADS_TO $p4
@sibling $p5 ESTABLISHES uncle_relation
@parent_gen $p6 CONNECTS $sibling
@cousin_gen $gp1 AND $gp2
@first_cousin Maria COUSIN_OF Cosmin
@sc_rule second_cousin DERIVED_FROM parent_cousins
@apply $sc_rule APPLIES_TO $first_cousin
@chain $cousin_gen LEADS_TO $apply
@result $chain IS_A second_cousin_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Second-cousin: 1) Trace both to grandparents 2) Verify grandparents are cousins 3) If parents' parents are cousins, children are second-cousins."
    },

    // Q4: Multiple path ancestor verification
    {
      id: "q4",
      TASK_NL: "Count all paths from Ion to Daria (ancestor path enumeration)",
      TASK_DSL: "@q4 Ion ANCESTOR_OF Daria",
      ANSWEAR_NL: "One path: Ion→Maria→Elena→Daria (depth 3)",
      PROOF_DSL: `@p1 Ion PARENT_OF Maria
@p2 Maria PARENT_OF Elena
@p3 Elena PARENT_OF Daria
@p4 ancestor TRANSITIVE_CLOSURE_OF parent
@c1 $p1 STARTS path_1
@c2 $c1 LEADS_TO $p2
@c3 $c2 LEADS_TO $p3
@path $c3 COMPLETES ancestor_chain
@depth $path HAS length_3
@search alternative_paths NOT_FOUND
@unique $path IS_ONLY solution
@apply $p4 VALIDATES $path
@result $apply IS_A path_enumeration_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Path enumeration: BFS/DFS search from Ion to Daria. Single path found: Ion→Maria→Elena→Daria. Verified unique solution."
    },

    // Q5: Access control chain with rule composition
    {
      id: "q5",
      TASK_NL: "What does access_check ultimately require? (Rule composition chain)",
      TASK_DSL: "@q5 access_check REQUIRES credentials",
      ANSWEAR_NL: "access_check→authorization→authentication→credentials",
      PROOF_DSL: `@p1 access_check REQUIRES authorization
@p2 authorization REQUIRES authentication
@p3 authentication REQUIRES credentials
@compose1 $p1 LEADS_TO $p2
@compose2 $compose1 LEADS_TO $p3
@rule requires_is_transitive
@apply $rule APPLIES_TO $compose2
@chain $apply COMPUTES transitive_requirements
@depth $chain HAS length_3
@terminal credentials IS terminal_requirement
@result $chain IS_A requirement_composition_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Transitive requirement composition: Each REQUIRES relation chains to the next, computing full dependency graph."
    },

    // Q6: Sibling derivation from shared parents
    {
      id: "q6",
      TASK_NL: "Prove Andrei, Elena, Cristian are all siblings (shared parent proof)",
      TASK_DSL: "@q6 Andrei_Elena_Cristian ARE siblings",
      ANSWEAR_NL: "All three share parent Maria → all pairs are siblings",
      PROOF_DSL: `@p1 Maria PARENT_OF Andrei
@p2 Maria PARENT_OF Elena
@p3 Maria PARENT_OF Cristian
@p4 Andrei SIBLING_OF Elena
@p5 Andrei SIBLING_OF Cristian
@p6 Elena SIBLING_OF Cristian
@rule shared_parent DEFINES sibling_relation
@share1 $p1 SHARES_PARENT $p2
@share2 $p1 SHARES_PARENT $p3
@share3 $p2 SHARES_PARENT $p3
@apply1 $rule APPLIES_TO $share1
@apply2 $rule APPLIES_TO $share2
@apply3 $rule APPLIES_TO $share3
@verify1 $apply1 MATCHES $p4
@verify2 $apply2 MATCHES $p5
@verify3 $apply3 MATCHES $p6
@combine $verify1 AND $verify2
@all_siblings $combine AND $verify3
@result $all_siblings IS_A sibling_group_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Sibling group proof: 1) All share Maria as parent 2) Apply shared-parent→sibling rule to all pairs 3) Verify existing sibling facts match."
    },

    // Q7: Descendant search with backtracking
    {
      id: "q7",
      TASK_NL: "Find all descendants of Ion (complete tree traversal)",
      TASK_DSL: "@q7 Ion HAS_DESCENDANTS all_found",
      ANSWEAR_NL: "Maria, Andrei, Elena, Cristian, Sofia, Matei, Daria (7 descendants)",
      PROOF_DSL: `@p1 Ion PARENT_OF Maria
@p2 Maria PARENT_OF Andrei
@p3 Maria PARENT_OF Elena
@p4 Maria PARENT_OF Cristian
@p5 Andrei PARENT_OF Sofia
@p6 Andrei PARENT_OF Matei
@p7 Elena PARENT_OF Daria
@p8 descendant INVERSE_OF ancestor
@gen1 $p1 FINDS Maria
@gen2a $p2 FINDS Andrei
@gen2b $p3 FINDS Elena
@gen2c $p4 FINDS Cristian
@gen3a $p5 FINDS Sofia
@gen3b $p6 FINDS Matei
@gen3c $p7 FINDS Daria
@collect $gen1 COLLECTS level_1
@collect2 $gen2a AND $gen2b
@collect2b $collect2 AND $gen2c
@collect3 $gen3a AND $gen3b
@collect3b $collect3 AND $gen3c
@tree $collect JOINS $collect2b
@full $tree JOINS $collect3b
@count $full HAS count_7
@result $count IS_A tree_traversal_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Complete tree traversal: BFS from Ion collects all descendants. Generation 1: Maria. Generation 2: Andrei, Elena, Cristian. Generation 3: Sofia, Matei, Daria. Total: 7."
    },

    // Q8: Cross-branch relationship search
    {
      id: "q8",
      TASK_NL: "What is the relationship between Sofia and Liviu? (Cross-family search)",
      TASK_DSL: "@q8 Sofia RELATED_TO Liviu",
      ANSWEAR_NL: "Second cousins (their grandparents Maria and Cosmin are cousins)",
      PROOF_DSL: `@p1 Andrei PARENT_OF Sofia
@p2 Cosmin PARENT_OF Liviu
@p3 Maria PARENT_OF Andrei
@p4 Vasile PARENT_OF Cosmin
@p5 Ion PARENT_OF Maria
@p6 Vasile SIBLING_OF Ion
@trace1 $p1 LEADS_TO $p3
@trace2 $p2 LEADS_TO $p4
@trace3 $p3 LEADS_TO $p5
@trace4 $p4 LEADS_TO $p6
@sibling_link $p6 CONNECTS $p5
@search paths_meet_at $sibling_link
@compute_distance $trace1 AND $trace2
@add_up $trace3 AND $trace4
@total_distance $compute_distance PLUS $sibling_link
@classify $total_distance DETERMINES relationship_type
@second_cousin $classify EQUALS second_cousin
@result $second_cousin IS_A cross_branch_search_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Cross-branch search: 1) Trace Sofia up: Sofia→Andrei→Maria→Ion 2) Trace Liviu up: Liviu→Cosmin→Vasile 3) Find common ancestor area (Ion-Vasile siblings) 4) Compute relationship distance 5) Classify as second-cousins."
    }
  ]
};
