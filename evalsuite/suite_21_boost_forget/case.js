/**
 * Test Case: Comprehensive Boost/Forget - Priority Inheritance & Decay
 * Tests priority levels, boost/decay mechanics, and retention policies
 * Version: 5.0 - Complex proofs with priority inheritance and boost/decay chains
 */
module.exports = {
  id: "suite_21_boost_forget",
  name: "Comprehensive Boost/Forget - Priority Inheritance & Decay",

  theory_NL: "Priority system with boost and decay. Types: note, item, task, work, concept, scratch, temp, thing. Priority levels: concept=100, task=80, note=60, item=50, work=40, thing=30, temp=20, scratch=10. Boost: access increases priority by 15. Decay: inactivity decreases by 10/period. Threshold for forget: priority < 25. Essential items never decay.",

  theory_DSL: [
    "BaseEntity IS_A thing", "ImportantNote IS_A note", "CriticalItem IS_A item",
    "HighPriority IS_A task", "LowPriority IS_A work", "Essential IS_A concept",
    "ScratchNote IS_A scratch", "TempItem IS_A temp",
    "concept HAS_PRIORITY 100", "task HAS_PRIORITY 80", "note HAS_PRIORITY 60",
    "item HAS_PRIORITY 50", "work HAS_PRIORITY 40", "thing HAS_PRIORITY 30",
    "temp HAS_PRIORITY 20", "scratch HAS_PRIORITY 10",
    "access BOOSTS_BY 15", "inactivity DECAYS_BY 10",
    "forget_threshold IS 25", "concept IS essential", "essential NEVER decays"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "What is Essential's priority and why won't it decay?",
      TASK_DSL: "@q1 Essential PRIORITY_ANALYSIS done",
      ANSWEAR_NL: "Essential IS_A concept, concept HAS_PRIORITY 100. Concept IS essential → never decays.",
      PROOF_DSL: `@p1 Essential IS_A concept
@p2 concept HAS_PRIORITY 100
@p3 concept IS essential
@p4 essential NEVER decays
@c1 $p1 LEADS_TO $p2
@priority $c1 DERIVES 100
@c2 $p1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@protected $c3 PREVENTS decay
@result $priority AND $protected
@proof $result PROVES $q1`,
      PROOF_NL: "Essential→concept→priority 100. Concept is essential → decay protection."
    },
    {
      id: "q2", TASK_NL: "What is ScratchNote's priority and forget risk?",
      TASK_DSL: "@q2 ScratchNote FORGET_RISK analyzed",
      ANSWEAR_NL: "ScratchNote→scratch→priority 10. 10 < 25 (threshold) → at risk of being forgotten.",
      PROOF_DSL: `@p1 ScratchNote IS_A scratch
@p2 scratch HAS_PRIORITY 10
@p3 forget_threshold IS 25
@c1 $p1 LEADS_TO $p2
@priority $c1 DERIVES 10
@compare 10 LESS_THAN 25
@at_risk $compare MEANS below_threshold
@no_protection scratch NOT essential
@vulnerable $at_risk AND $no_protection
@result $vulnerable IS_A forget_risk_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Scratch priority=10 < threshold=25 → at risk. Not essential → no protection."
    },
    {
      id: "q3", TASK_NL: "What happens if we access ScratchNote?",
      TASK_DSL: "@q3 ScratchNote AFTER_ACCESS priority",
      ANSWEAR_NL: "Base 10 + boost 15 = 25. Just at threshold, temporarily safe.",
      PROOF_DSL: `@p1 scratch HAS_PRIORITY 10
@p2 access BOOSTS_BY 15
@p3 forget_threshold IS 25
@base $p1 PROVIDES 10
@boost $p2 ADDS 15
@new_priority $base PLUS $boost
@calculate 10 PLUS 15 EQUALS 25
@compare 25 EQUALS $p3
@at_threshold $compare MEANS barely_safe
@temporary $at_threshold UNTIL next_decay
@result $calculate IS_A boost_calculation_proof
@proof $result PROVES $q3`,
      PROOF_NL: "10 + 15 = 25. At threshold exactly. Temporary safety until decay."
    },
    {
      id: "q4", TASK_NL: "How many decay periods until TempItem is forgotten?",
      TASK_DSL: "@q4 TempItem DECAY_PERIODS calculated",
      ANSWEAR_NL: "Temp priority=20, decay=10/period, threshold=25. Already below! Immediate forget risk.",
      PROOF_DSL: `@p1 TempItem IS_A temp
@p2 temp HAS_PRIORITY 20
@p3 inactivity DECAYS_BY 10
@p4 forget_threshold IS 25
@priority $p2 EQUALS 20
@compare 20 LESS_THAN 25
@already_below $compare PROVES immediate_risk
@decay_irrelevant $already_below MEANS 0_periods
@result $already_below IS_A decay_analysis_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Temp=20 already < threshold=25. Already at forget risk, 0 periods needed."
    },
    {
      id: "q5", TASK_NL: "Compare HighPriority vs LowPriority retention",
      TASK_DSL: "@q5 priority_comparison DONE",
      ANSWEAR_NL: "HighPriority (task=80) vs LowPriority (work=40). Task survives longer: (80-25)/10=5.5 vs (40-25)/10=1.5 periods.",
      PROOF_DSL: `@p1 HighPriority IS_A task
@p2 task HAS_PRIORITY 80
@p3 LowPriority IS_A work
@p4 work HAS_PRIORITY 40
@p5 inactivity DECAYS_BY 10
@p6 forget_threshold IS 25
@high_priority $p2 EQUALS 80
@low_priority $p4 EQUALS 40
@high_margin 80 MINUS 25 EQUALS 55
@low_margin 40 MINUS 25 EQUALS 15
@high_periods 55 DIVIDED_BY 10
@low_periods 15 DIVIDED_BY 10
@compare $high_periods GREATER_THAN $low_periods
@result $compare IS_A retention_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Task (80-25)/10=5.5 periods. Work (40-25)/10=1.5 periods. Task survives ~4× longer."
    },
    {
      id: "q6", TASK_NL: "What is the priority hierarchy from highest to lowest?",
      TASK_DSL: "@q6 priority_hierarchy ORDERED",
      ANSWEAR_NL: "concept(100) > task(80) > note(60) > item(50) > work(40) > thing(30) > temp(20) > scratch(10)",
      PROOF_DSL: `@p1 concept HAS_PRIORITY 100
@p2 task HAS_PRIORITY 80
@p3 note HAS_PRIORITY 60
@p4 item HAS_PRIORITY 50
@p5 work HAS_PRIORITY 40
@p6 thing HAS_PRIORITY 30
@p7 temp HAS_PRIORITY 20
@p8 scratch HAS_PRIORITY 10
@order1 100 GREATER_THAN 80
@order2 80 GREATER_THAN 60
@order3 60 GREATER_THAN 50
@order4 50 GREATER_THAN 40
@order5 40 GREATER_THAN 30
@order6 30 GREATER_THAN 20
@order7 20 GREATER_THAN 10
@chain $order1 THEN $order2 THEN $order3
@chain2 $chain THEN $order4 THEN $order5
@full $chain2 THEN $order6 THEN $order7
@result $full IS_A ordering_proof
@proof $result PROVES $q6`,
      PROOF_NL: "8 levels ordered: concept > task > note > item > work > thing > temp > scratch."
    },
    {
      id: "q7", TASK_NL: "Which items are safe from forgetting (priority ≥ 25)?",
      TASK_DSL: "@q7 safe_items ENUMERATED",
      ANSWEAR_NL: "Safe: concept(100), task(80), note(60), item(50), work(40), thing(30). At risk: temp(20), scratch(10).",
      PROOF_DSL: `@p1 forget_threshold IS 25
@safe1 100 GREATER_THAN 25
@safe2 80 GREATER_THAN 25
@safe3 60 GREATER_THAN 25
@safe4 50 GREATER_THAN 25
@safe5 40 GREATER_THAN 25
@safe6 30 GREATER_THAN 25
@risk1 20 LESS_THAN 25
@risk2 10 LESS_THAN 25
@safe_list concept task note item work thing
@risk_list temp scratch
@count_safe 6 ITEMS safe
@count_risk 2 ITEMS at_risk
@result $count_safe IS_A safe_enumeration_proof
@proof $result PROVES $q7`,
      PROOF_NL: "6 safe (≥30), 2 at risk (<25). Threshold divides at work/thing boundary."
    },
    {
      id: "q8", TASK_NL: "How many boosts needed to save ScratchNote for 3 periods?",
      TASK_DSL: "@q8 ScratchNote BOOST_PLAN calculated",
      ANSWEAR_NL: "Need priority ≥ 25+30=55 to survive 3 decays. Currently 10. Need (55-10)/15 = 3 boosts.",
      PROOF_DSL: `@p1 scratch HAS_PRIORITY 10
@p2 access BOOSTS_BY 15
@p3 inactivity DECAYS_BY 10
@p4 forget_threshold IS 25
@target_decay 3 PERIODS times 10
@decay_amount 3 TIMES 10 EQUALS 30
@target_priority 25 PLUS 30 EQUALS 55
@current 10
@needed 55 MINUS 10 EQUALS 45
@boosts_needed 45 DIVIDED_BY 15 EQUALS 3
@plan 3 BOOSTS required
@result $boosts_needed IS_A boost_planning_proof
@proof $result PROVES $q8`,
      PROOF_NL: "To survive 3 periods: need 25+30=55. Have 10. Need 45 more. 45/15=3 boosts."
    }
  ]
};
