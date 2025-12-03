/**
 * Test Case: Comprehensive Boost/Forget - Priority Inheritance & Decay
 * Tests priority levels, boost/decay mechanics, and retention policies
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
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
    "forget_threshold IS 25", "concept IS essential", "essential NEVER decays",
    "100 GREATER_THAN 25", "80 GREATER_THAN 25", "60 GREATER_THAN 25",
    "50 GREATER_THAN 25", "40 GREATER_THAN 25", "30 GREATER_THAN 25",
    "20 LESS_THAN 25", "10 LESS_THAN 25",
    "100 GREATER_THAN 80", "80 GREATER_THAN 60", "60 GREATER_THAN 50",
    "50 GREATER_THAN 40", "40 GREATER_THAN 30", "30 GREATER_THAN 20", "20 GREATER_THAN 10",
    "boosted_scratch EQUALS 25", "3_boosts EQUALS 45"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "What is Essential's priority and why won't it decay?",
      TASK_DSL: "@q1 Essential IS_A concept",
      ANSWEAR_NL: "Essential IS_A concept, concept HAS_PRIORITY 100. Concept IS essential → never decays.",
      PROOF_DSL: `@p1 Essential IS_A concept
@p2 concept HAS_PRIORITY 100
@p3 concept IS essential
@p4 essential NEVER decays
@c1 $p1 LEADS_TO $p2
@c2 $c1 DERIVES priority_100
@c3 $p1 LEADS_TO $p3
@c4 $c3 LEADS_TO $p4
@c5 $c4 PREVENTS decay
@c6 $c2 COMBINES $c5
@result $c6 IS_A priority_analysis_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Essential→concept→priority 100. Concept is essential → decay protection."
    },
    {
      id: "q2", TASK_NL: "What is ScratchNote's priority and forget risk?",
      TASK_DSL: "@q2 10 LESS_THAN 25",
      ANSWEAR_NL: "ScratchNote→scratch→priority 10. 10 < 25 (threshold) → at risk of being forgotten.",
      PROOF_DSL: `@p1 ScratchNote IS_A scratch
@p2 scratch HAS_PRIORITY 10
@p3 forget_threshold IS 25
@p4 10 LESS_THAN 25
@c1 $p1 LEADS_TO $p2
@c2 $c1 DERIVES priority_10
@c3 $c2 COMPARES $p3
@c4 $c3 USES $p4
@c5 $c4 CONFIRMS below_threshold
@c6 scratch NOT essential
@c7 $c6 LACKS protection
@result $c7 IS_A forget_risk_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Scratch priority=10 < threshold=25 → at risk. Not essential → no protection."
    },
    {
      id: "q3", TASK_NL: "What happens if we access ScratchNote?",
      TASK_DSL: "@q3 boosted_scratch EQUALS 25",
      ANSWEAR_NL: "Base 10 + boost 15 = 25. Just at threshold, temporarily safe.",
      PROOF_DSL: `@p1 scratch HAS_PRIORITY 10
@p2 access BOOSTS_BY 15
@p3 forget_threshold IS 25
@p4 boosted_scratch EQUALS 25
@c1 $p1 PROVIDES base_10
@c2 $p2 ADDS boost_15
@c3 $c1 PLUS $c2
@c4 $c3 EQUALS 25
@c5 $c4 MATCHES $p3
@c6 $c5 CONFIRMS barely_safe
@c7 $c6 UNTIL next_decay
@result $c7 IS_A boost_calculation_proof
@proof $result PROVES $q3`,
      PROOF_NL: "10 + 15 = 25. At threshold exactly. Temporary safety until decay."
    },
    {
      id: "q4", TASK_NL: "How many decay periods until TempItem is forgotten?",
      TASK_DSL: "@q4 20 LESS_THAN 25",
      ANSWEAR_NL: "Temp priority=20, decay=10/period, threshold=25. Already below! Immediate forget risk.",
      PROOF_DSL: `@p1 TempItem IS_A temp
@p2 temp HAS_PRIORITY 20
@p3 inactivity DECAYS_BY 10
@p4 forget_threshold IS 25
@p5 20 LESS_THAN 25
@c1 $p1 LEADS_TO $p2
@c2 $c1 DERIVES priority_20
@c3 $c2 COMPARES $p4
@c4 $c3 USES $p5
@c5 $c4 CONFIRMS already_below
@c6 $c5 PROVES immediate_risk
@c7 decay IRRELEVANT here
@result $c6 IS_A decay_analysis_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Temp=20 already < threshold=25. Already at forget risk, 0 periods needed."
    },
    {
      id: "q5", TASK_NL: "Compare HighPriority vs LowPriority retention",
      TASK_DSL: "@q5 80 GREATER_THAN 40",
      ANSWEAR_NL: "HighPriority (task=80) vs LowPriority (work=40). Task survives longer: (80-25)/10=5.5 vs (40-25)/10=1.5 periods.",
      PROOF_DSL: `@p1 HighPriority IS_A task
@p2 task HAS_PRIORITY 80
@p3 LowPriority IS_A work
@p4 work HAS_PRIORITY 40
@p5 inactivity DECAYS_BY 10
@p6 forget_threshold IS 25
@c1 $p1 LEADS_TO $p2
@c2 $p3 LEADS_TO $p4
@c3 80 MINUS 25
@c4 $c3 EQUALS 55_margin
@c5 40 MINUS 25
@c6 $c5 EQUALS 15_margin
@c7 $c4 GREATER_THAN $c6
@c8 $c7 PROVES longer_retention
@result $c8 IS_A retention_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Task (80-25)=55 vs Work (40-25)=15. Task survives ~4× longer."
    },
    {
      id: "q6", TASK_NL: "What is the priority hierarchy from highest to lowest?",
      TASK_DSL: "@q6 100 GREATER_THAN 80",
      ANSWEAR_NL: "concept(100) > task(80) > note(60) > item(50) > work(40) > thing(30) > temp(20) > scratch(10)",
      PROOF_DSL: `@p1 concept HAS_PRIORITY 100
@p2 task HAS_PRIORITY 80
@p3 note HAS_PRIORITY 60
@p4 item HAS_PRIORITY 50
@p5 work HAS_PRIORITY 40
@p6 thing HAS_PRIORITY 30
@p7 temp HAS_PRIORITY 20
@p8 scratch HAS_PRIORITY 10
@p9 100 GREATER_THAN 80
@p10 80 GREATER_THAN 60
@c1 $p9 ESTABLISHES first
@c2 $p10 ESTABLISHES second
@c3 $c1 COMBINES $c2
@c4 60 GREATER_THAN 50
@c5 50 GREATER_THAN 40
@c6 $c4 COMBINES $c5
@c7 $c3 EXTENDS $c6
@c8 $c7 COMPLETES hierarchy
@result $c8 IS_A ordering_proof
@proof $result PROVES $q6`,
      PROOF_NL: "8 levels ordered: concept > task > note > item > work > thing > temp > scratch."
    },
    {
      id: "q7", TASK_NL: "Which items are safe from forgetting (priority ≥ 25)?",
      TASK_DSL: "@q7 30 GREATER_THAN 25",
      ANSWEAR_NL: "Safe: concept(100), task(80), note(60), item(50), work(40), thing(30). At risk: temp(20), scratch(10).",
      PROOF_DSL: `@p1 forget_threshold IS 25
@p2 100 GREATER_THAN 25
@p3 80 GREATER_THAN 25
@p4 60 GREATER_THAN 25
@p5 50 GREATER_THAN 25
@p6 40 GREATER_THAN 25
@p7 30 GREATER_THAN 25
@p8 20 LESS_THAN 25
@p9 10 LESS_THAN 25
@c1 $p2 CONFIRMS concept_safe
@c2 $p7 CONFIRMS thing_safe
@c3 $c1 COMBINES $c2
@c4 $p8 CONFIRMS temp_risk
@c5 $p9 CONFIRMS scratch_risk
@c6 $c4 COMBINES $c5
@c7 6 TYPES safe
@c8 2 TYPES at_risk
@result $c7 IS_A safe_enumeration_proof
@proof $result PROVES $q7`,
      PROOF_NL: "6 safe (≥30), 2 at risk (<25). Threshold divides at work/thing boundary."
    },
    {
      id: "q8", TASK_NL: "How many boosts needed to save ScratchNote for 3 periods?",
      TASK_DSL: "@q8 3_boosts EQUALS 45",
      ANSWEAR_NL: "Need priority ≥ 25+30=55 to survive 3 decays. Currently 10. Need (55-10)/15 = 3 boosts.",
      PROOF_DSL: `@p1 scratch HAS_PRIORITY 10
@p2 access BOOSTS_BY 15
@p3 inactivity DECAYS_BY 10
@p4 forget_threshold IS 25
@c1 3 PERIODS_OF $p3
@c2 $c1 EQUALS 30_decay
@c3 25 PLUS 30
@c4 $c3 EQUALS 55_target
@c5 55 MINUS 10
@c6 $c5 EQUALS 45_needed
@c7 45 DIVIDED_BY 15
@c8 $c7 EQUALS 3_boosts
@c9 $c8 CONFIRMS plan
@result $c9 IS_A boost_planning_proof
@proof $result PROVES $q8`,
      PROOF_NL: "To survive 3 periods: need 25+30=55. Have 10. Need 45 more. 45/15=3 boosts."
    }
  ]
};
