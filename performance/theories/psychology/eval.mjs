/**
 * Psychology Theory - Evaluation Cases
 *
 * Complex queries and proofs requiring deep reasoning.
 * Each case has:
 *   - input_nl: Natural language question
 *   - input_dsl: DSL query
 *   - expected_nl: Expected result (natural language)
 *   - proof_nl: Array of proof steps (natural language)
 */

export const name = 'Psychology';
export const description = 'Emotions, cognition, disorders, development, theories - deep reasoning tests';
export const min_complex = 74;

export const cases = [
  // =============================================================================
  // EMOTION THEORY DEEP PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that fear activates the fight-or-flight response',
    input_dsl: '@goal activates Fear fight_or_flight',
    expected_nl: 'True: Fear activates the fight-or-flight response',
    proof_nl: [
      'Given: Fear isA BasicEmotion',
      'By BasicEmotion_Fear graph: Fear has wide_eyes expression',
      'By BasicEmotion_Fear graph: Fear activates fight_or_flight',
      'By BasicEmotion_Fear graph: Fear triggers adrenaline_release',
      'By BasicEmotion_Fear graph: Fear associated with threat_perception',
      'By BasicEmotion_Fear graph: Fear leads to avoidance_or_escape behavior',
      'By BasicEmotion_Fear graph: Fear serves survival function',
      'Therefore: Fear activates fight-or-flight as protective response'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that joy has positive valence',
    input_dsl: '@goal associatedWith Joy positive_valence',
    expected_nl: 'True: Joy is associated with positive valence',
    proof_nl: [
      'Given: Joy isA BasicEmotion',
      'By BasicEmotion_Joy graph: Joy has smile expression',
      'By BasicEmotion_Joy graph: Joy causes increased_heart_rate',
      'By BasicEmotion_Joy graph: Joy associated with positive_valence',
      'By BasicEmotion_Joy graph: Joy leads to approach_tendency',
      'By BasicEmotion_Joy graph: Implies Joy positiveState',
      'Therefore: Joy has positive valence and promotes approach'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that shame focuses on the entire self while guilt focuses on specific behavior',
    input_dsl: '@goal differs Shame Guilt',
    expected_nl: 'True: Shame and guilt differ in focus',
    proof_nl: [
      'Given: Shame isA ComplexEmotion',
      'Given: Guilt isA ComplexEmotion',
      'By ComplexEmotion_Shame graph: Shame focuses entire_self',
      'By ComplexEmotion_Shame graph: Shame threatens self_identity',
      'By ComplexEmotion_Shame graph: Shame leads to hiding_concealment',
      'By ComplexEmotion_Guilt graph: Guilt focuses specific_behavior',
      'By ComplexEmotion_Guilt graph: Guilt involves moral_transgression',
      'By ComplexEmotion_Guilt graph: Guilt motivates reparation',
      'By comparison: Shame is global self-negation, Guilt is specific action focus',
      'Therefore: Shame and guilt differ fundamentally in their focus'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that reappraisal is more effective than suppression for emotion regulation',
    input_dsl: '@goal superior Reappraisal Suppression',
    expected_nl: 'True: Reappraisal is superior to suppression',
    proof_nl: [
      'By EmotionRegulation_Reappraisal graph: Reappraisal rated highly_effective',
      'By EmotionRegulation_Reappraisal graph: Reappraisal occurs before_emotion_peaks',
      'By EmotionRegulation_Reappraisal graph: Reappraisal associated with positive_outcomes',
      'By EmotionRegulation_Reappraisal graph: Reappraisal is antecedent_focused',
      'By EmotionRegulation_Suppression graph: Suppression rated less_effective',
      'By EmotionRegulation_Suppression graph: Suppression causes cognitive_load',
      'By EmotionRegulation_Suppression graph: Suppression associated with negative_outcomes',
      'By EmotionRegulation_Suppression graph: Suppression is response_focused',
      'By comparison: Reappraisal is healthier and more effective strategy',
      'Therefore: Reappraisal is superior to suppression for emotion regulation'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that the Schachter-Singer theory requires both arousal and cognitive labeling',
    input_dsl: '@goal requires SchachterSingerTheory arousal_and_label',
    expected_nl: 'True: Two-factor theory requires arousal plus cognitive label',
    proof_nl: [
      'By SchachterSinger_TwoFactor graph: Theory isA SchachterSingerTheory',
      'By SchachterSinger_TwoFactor graph: requires physiological_arousal',
      'By SchachterSinger_TwoFactor graph: requires cognitive_label',
      'By SchachterSinger_TwoFactor graph: describes arousal_plus_interpretation process',
      'By SchachterSinger_TwoFactor graph: demonstrates bridge_study',
      'By SchachterSinger_TwoFactor graph: demonstrates adrenaline_experiment',
      'By SchachterSinger_TwoFactor graph: context_determines_emotion',
      'By two-factor principle: Both components necessary for emotion',
      'Therefore: Schachter-Singer theory requires arousal and cognitive labeling'
    ]
  },

  // =============================================================================
  // MEMORY SYSTEM PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that working memory has multiple components',
    input_dsl: '@goal hasComponents WorkingMemory multiple',
    expected_nl: 'True: Working memory includes multiple components',
    proof_nl: [
      'By Memory_Working graph: WorkingMemory isA MemoryType',
      'By Memory_Working graph: Baddeley-Hitch model describes WorkingMemory',
      'By Memory_Working graph: includes phonological_loop component',
      'By Memory_Working graph: includes visuospatial_sketchpad component',
      'By Memory_Working graph: includes central_executive component',
      'By Memory_Working graph: includes episodic_buffer component',
      'By Memory_Working graph: enables active_processing function',
      'By Memory_Working graph: supports reasoning_comprehension tasks',
      'Therefore: Working memory has four distinct components'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that episodic and semantic memory are both types of long-term memory',
    input_dsl: '@goal bothTypes EpisodicMemory SemanticMemory LongTermMemory',
    expected_nl: 'True: Episodic and semantic memory are long-term memory types',
    proof_nl: [
      'By Memory_Episodic graph: EpisodicMemory isA LongTermMemory',
      'By Memory_Episodic graph: stores personal_experiences',
      'By Memory_Episodic graph: involves hippocampus',
      'By Memory_Episodic graph: Tulving proposed this type',
      'By Memory_Semantic graph: SemanticMemory isA LongTermMemory',
      'By Memory_Semantic graph: stores facts_and_concepts',
      'By Memory_Semantic graph: involves temporal_lobe',
      'Both require conscious recall (explicit memory)',
      'Both have potentially unlimited duration',
      'Therefore: Episodic and semantic memory are subtypes of long-term memory'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that procedural memory operates without conscious awareness',
    input_dsl: '@goal operates ProceduralMemory without_conscious_thought',
    expected_nl: 'True: Procedural memory operates unconsciously',
    proof_nl: [
      'By Memory_Procedural graph: ProceduralMemory isA LongTermMemory',
      'By Memory_Procedural graph: stores skills_and_habits',
      'By Memory_Procedural graph: operates without_conscious_thought',
      'By Memory_Procedural graph: examples include riding_bike and typing',
      'By Memory_Procedural graph: requires practice for acquisition',
      'By Memory_Procedural graph: involves basal_ganglia and cerebellum',
      'By Memory_Procedural graph: highly resistant_to_forgetting',
      'This is implicit rather than explicit memory',
      'Therefore: Procedural memory operates without conscious awareness'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that consolidation requires sleep',
    input_dsl: '@goal requires Consolidation sleep',
    expected_nl: 'True: Memory consolidation critically requires sleep',
    proof_nl: [
      'By MemoryProcess_Consolidation graph: Consolidation isA MemoryProcess',
      'By MemoryProcess_Consolidation graph: stabilizes memory_traces',
      'By MemoryProcess_Consolidation graph: occurs after_encoding',
      'By MemoryProcess_Consolidation graph: critically requires sleep',
      'By MemoryProcess_Consolidation graph: involves hippocampus_to_cortex transfer',
      'By MemoryProcess_Consolidation graph: vulnerable during process',
      'By MemoryProcess_Consolidation graph: involves protein_synthesis',
      'Sleep enables memory stabilization and integration',
      'Therefore: Consolidation critically requires sleep for memory stabilization'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that deep processing leads to better retention than shallow processing',
    input_dsl: '@goal superior deep_processing shallow_processing',
    expected_nl: 'True: Deep processing produces better retention',
    proof_nl: [
      'By MemoryProcess_Encoding graph: Encoding converts sensory_to_memory',
      'By MemoryProcess_Encoding graph: LevelsOfProcessing describes encoding',
      'By MemoryProcess_Encoding graph: shallow involves physical_features',
      'By MemoryProcess_Encoding graph: deep involves semantic_meaning',
      'By MemoryProcess_Encoding graph: deep superior better_retention',
      'Semantic processing creates more elaborate memory traces',
      'Shallow processing focuses only on surface characteristics',
      'Elaborative rehearsal exceeds maintenance rehearsal',
      'Therefore: Deep semantic processing leads to superior retention'
    ]
  },

  // =============================================================================
  // ATTENTION AND LEARNING PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that selective attention can cause inattentional blindness',
    input_dsl: '@goal causes SelectiveAttention inattentional_blindness',
    expected_nl: 'True: Selective attention causes inattentional blindness',
    proof_nl: [
      'By Attention_Selective graph: SelectiveAttention focuses specific_stimuli',
      'By Attention_Selective graph: demonstrates cocktail_party_effect',
      'By Attention_Selective graph: demonstrates invisible_gorilla',
      'By Attention_Selective graph: limitation causes inattentional_blindness',
      'Filter theory explains selection mechanisms',
      'Focusing on one stimulus prevents processing others',
      'The invisible gorilla study showed people miss obvious events',
      'Therefore: Selective attention causes inattentional blindness'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that observational learning requires attention, retention, reproduction, and motivation',
    input_dsl: '@goal requires ObservationalLearning four_processes',
    expected_nl: 'True: Observational learning requires four processes',
    proof_nl: [
      'By Learning_Observational graph: ObservationalLearning isA LearningType',
      'By Learning_Observational graph: Bandura studied this learning',
      'By Learning_Observational graph: learns by_watching_others',
      'By Learning_Observational graph: requires needs attention',
      'By Learning_Observational graph: requires needs retention',
      'By Learning_Observational graph: requires needs reproduction',
      'By Learning_Observational graph: requires needs motivation',
      'By Learning_Observational graph: famous bobo_doll_experiment demonstrates',
      'All four processes are necessary for successful modeling',
      'Therefore: Observational learning requires attention, retention, reproduction, and motivation'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that classical conditioning involves pairing stimuli',
    input_dsl: '@goal process ClassicalConditioning pairing',
    expected_nl: 'True: Classical conditioning pairs neutral with unconditioned stimuli',
    proof_nl: [
      'By Learning_Classical graph: ClassicalConditioning isA LearningType',
      'By Learning_Classical graph: Pavlov discovered this process',
      'By Learning_Classical graph: pairs neutral_with_unconditioned',
      'By Learning_Classical graph: neutral becomes conditioned_stimulus',
      'By Learning_Classical graph: produces conditioned_response',
      'By Learning_Classical graph: example dogs_salivation demonstrates',
      'By Learning_Classical graph: includes acquisition_extinction phenomenon',
      'By Learning_Classical graph: includes generalization_discrimination',
      'Therefore: Classical conditioning involves pairing neutral with unconditioned stimuli'
    ]
  },

  // =============================================================================
  // PSYCHOLOGICAL DISORDER PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that Major Depressive Disorder requires at least two weeks duration',
    input_dsl: '@goal requires MajorDepressiveDisorder two_weeks_minimum',
    expected_nl: 'True: Major Depression requires two weeks minimum',
    proof_nl: [
      'By Disorder_MajorDepression graph: MajorDepressiveDisorder isA MoodDisorder',
      'By Disorder_MajorDepression graph: core symptom depressed_mood',
      'By Disorder_MajorDepression graph: core symptom anhedonia',
      'By Disorder_MajorDepression graph: duration requires two_weeks_minimum',
      'This diagnostic criterion distinguishes clinical depression from normal sadness',
      'Symptoms must be present most of the day, nearly every day',
      'At least five total symptoms required for diagnosis',
      'Therefore: Major Depressive Disorder requires two weeks minimum duration'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Bipolar I Disorder requires a manic episode',
    input_dsl: '@goal requires BipolarIDisorder manic_episode',
    expected_nl: 'True: Bipolar I requires at least one manic episode',
    proof_nl: [
      'By Disorder_BipolarI graph: BipolarIDisorder isA MoodDisorder',
      'By Disorder_BipolarI graph: episode requires manic_episode',
      'By Disorder_BipolarI graph: manic lasts one_week_minimum',
      'By Disorder_BipolarI graph: manic symptom elevated_mood',
      'By Disorder_BipolarI graph: manic symptom grandiosity',
      'By Disorder_BipolarI graph: manic symptom decreased_sleep_need',
      'By Disorder_BipolarI graph: manic symptom racing_thoughts',
      'By Disorder_BipolarI graph: manic symptom risk_taking',
      'Manic episode is the defining feature of Bipolar I',
      'Therefore: Bipolar I Disorder requires at least one manic episode'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that schizophrenia involves both positive and negative symptoms',
    input_dsl: '@goal involves Schizophrenia positive_and_negative',
    expected_nl: 'True: Schizophrenia has positive and negative symptoms',
    proof_nl: [
      'By Disorder_Schizophrenia graph: Schizophrenia isA SchizophreniaSpectrum',
      'By Disorder_Schizophrenia graph: positive symptom delusions',
      'By Disorder_Schizophrenia graph: positive symptom hallucinations',
      'By Disorder_Schizophrenia graph: positive symptom disorganized_speech',
      'By Disorder_Schizophrenia graph: negative symptom flat_affect',
      'By Disorder_Schizophrenia graph: negative symptom avolition',
      'By Disorder_Schizophrenia graph: negative symptom alogia',
      'Positive symptoms add abnormal experiences',
      'Negative symptoms represent loss of normal functioning',
      'Therefore: Schizophrenia involves both positive and negative symptom categories'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that PTSD requires trauma exposure',
    input_dsl: '@goal requires PosttraumaticStressDisorder trauma_exposure',
    expected_nl: 'True: PTSD requires trauma exposure',
    proof_nl: [
      'By Disorder_PTSD graph: PosttraumaticStressDisorder isA TraumaRelatedDisorder',
      'By Disorder_PTSD graph: cause requires trauma_exposure',
      'By Disorder_PTSD graph: symptom cluster intrusion_symptoms',
      'By Disorder_PTSD graph: intrusion includes flashbacks and nightmares',
      'By Disorder_PTSD graph: symptom cluster avoidance',
      'By Disorder_PTSD graph: symptom cluster negative_cognitions_mood',
      'By Disorder_PTSD graph: symptom cluster arousal_reactivity',
      'By Disorder_PTSD graph: duration requires one_month_minimum',
      'Trauma exposure is Criterion A and is essential for diagnosis',
      'Therefore: PTSD definitionally requires trauma exposure'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that OCD involves both obsessions and compulsions',
    input_dsl: '@goal involves ObsessiveCompulsiveDisorder obsessions_and_compulsions',
    expected_nl: 'True: OCD involves obsessions and compulsions',
    proof_nl: [
      'By Disorder_OCD graph: ObsessiveCompulsiveDisorder isA OCDRelated',
      'By Disorder_OCD graph: symptom involves obsessions',
      'By Disorder_OCD graph: symptom involves compulsions',
      'By Disorder_OCD graph: obsessions are intrusive_thoughts',
      'By Disorder_OCD graph: obsessions cause anxiety',
      'By Disorder_OCD graph: compulsions are repetitive_behaviors',
      'By Disorder_OCD graph: compulsions reduce anxiety_temporarily',
      'By Disorder_OCD graph: themes include contamination and symmetry',
      'Obsessions and compulsions form a self-perpetuating cycle',
      'Therefore: OCD involves both obsessions and compulsions'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Autism Spectrum Disorder impairs social communication',
    input_dsl: '@goal impairs AutismSpectrumDisorder social_communication',
    expected_nl: 'True: Autism impairs social communication',
    proof_nl: [
      'By Disorder_AutismSpectrum graph: AutismSpectrumDisorder isA NeurodevelopmentalDisorder',
      'By Disorder_AutismSpectrum graph: domain impairs social_communication',
      'By Disorder_AutismSpectrum graph: symptom involves reduced_eye_contact',
      'By Disorder_AutismSpectrum graph: symptom involves difficulty_reading_social_cues',
      'By Disorder_AutismSpectrum graph: symptom involves difficulty_with_reciprocity',
      'Social communication deficits are core diagnostic criteria',
      'Severity varies across the spectrum',
      'Therefore: Autism Spectrum Disorder impairs social communication'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that ADHD has three subtypes',
    input_dsl: '@goal hasSubtypes AttentionDeficitHyperactivityDisorder three',
    expected_nl: 'True: ADHD has three subtypes',
    proof_nl: [
      'By Disorder_ADHD graph: AttentionDeficitHyperactivityDisorder isA NeurodevelopmentalDisorder',
      'By Disorder_ADHD graph: subtypes includes inattentive_type',
      'By Disorder_ADHD graph: subtypes includes hyperactive_impulsive_type',
      'By Disorder_ADHD graph: subtypes includes combined_type',
      'Inattentive type has predominantly attention deficits',
      'Hyperactive-impulsive type has predominantly hyperactivity and impulsivity',
      'Combined type has both inattentive and hyperactive-impulsive symptoms',
      'Therefore: ADHD has three distinct subtypes'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Borderline Personality Disorder involves emotional dysregulation',
    input_dsl: '@goal involves BorderlinePersonalityDisorder emotional_dysregulation',
    expected_nl: 'True: Borderline Personality Disorder involves emotional dysregulation',
    proof_nl: [
      'By Disorder_BorderlinePersonality graph: BorderlinePersonalityDisorder isA PersonalityDisorder',
      'By Disorder_BorderlinePersonality graph: cluster belongsTo cluster_B_dramatic',
      'By Disorder_BorderlinePersonality graph: symptom involves emotional_dysregulation',
      'By Disorder_BorderlinePersonality graph: symptom involves unstable_relationships',
      'By Disorder_BorderlinePersonality graph: symptom involves identity_disturbance',
      'By Disorder_BorderlinePersonality graph: treatment effective DBT',
      'Emotional dysregulation is a core feature',
      'Therefore: Borderline Personality Disorder centrally involves emotional dysregulation'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that the biopsychosocial model integrates multiple factors',
    input_dsl: '@goal integrates BiopsychosocialModel multiple_factors',
    expected_nl: 'True: Biopsychosocial model integrates biological, psychological, and social factors',
    proof_nl: [
      'By Model_Biopsychosocial graph: BiopsychosocialModel isA CausationModel',
      'By Model_Biopsychosocial graph: component includes biological_factors',
      'By Model_Biopsychosocial graph: component includes psychological_factors',
      'By Model_Biopsychosocial graph: component includes social_factors',
      'By Model_Biopsychosocial graph: biological includes genetics_neurobiology',
      'By Model_Biopsychosocial graph: psychological includes cognition_emotion',
      'By Model_Biopsychosocial graph: social includes culture_relationships',
      'By Model_Biopsychosocial graph: interaction emphasizes multifactorial_causation',
      'By Model_Biopsychosocial graph: comprehensive provides holistic_understanding',
      'Therefore: Biopsychosocial model integrates biological, psychological, and social factors'
    ]
  },

  // =============================================================================
  // DEVELOPMENTAL PSYCHOLOGY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that object permanence develops during the sensorimotor stage',
    input_dsl: '@goal develops SensorimotorStage object_permanence',
    expected_nl: 'True: Object permanence develops in sensorimotor stage',
    proof_nl: [
      'By Piaget_Sensorimotor graph: SensorimotorStage isA PiagetStage',
      'By Piaget_Sensorimotor graph: age ranges birth_to_2_years',
      'By Piaget_Sensorimotor graph: characteristic learning_through_senses_actions',
      'By Piaget_Sensorimotor graph: achievement develops object_permanence',
      'By Piaget_Sensorimotor graph: has six_substages',
      'Object permanence is understanding that objects exist when out of sight',
      'This typically emerges around 8 months of age',
      'Therefore: Object permanence develops during the sensorimotor stage'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that preoperational children lack conservation understanding',
    input_dsl: '@goal lacks PreoperationalStage conservation',
    expected_nl: 'True: Preoperational stage shows lack of conservation',
    proof_nl: [
      'By Piaget_Preoperational graph: PreoperationalStage isA PiagetStage',
      'By Piaget_Preoperational graph: age ranges 2_to_7_years',
      'By Piaget_Preoperational graph: characteristic involves symbolic_thought',
      'By Piaget_Preoperational graph: limitation shows lack_of_conservation',
      'By Piaget_Preoperational graph: limitation shows egocentrism',
      'By Piaget_Preoperational graph: limitation shows centration',
      'By Piaget_Preoperational graph: conservation_tasks demonstrate this limitation',
      'Conservation develops later in concrete operational stage',
      'Therefore: Preoperational children lack conservation understanding'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that formal operational thinking enables abstract reasoning',
    input_dsl: '@goal enables FormalOperationalStage abstract_thinking',
    expected_nl: 'True: Formal operations enable abstract reasoning',
    proof_nl: [
      'By Piaget_FormalOperational graph: FormalOperationalStage isA PiagetStage',
      'By Piaget_FormalOperational graph: age ranges 12_years_and_up',
      'By Piaget_FormalOperational graph: achievement develops abstract_thinking',
      'By Piaget_FormalOperational graph: achievement develops hypothetical_reasoning',
      'By Piaget_FormalOperational graph: achievement develops systematic_problem_solving',
      'By Piaget_FormalOperational graph: reasoning uses deductive_logic',
      'By Piaget_FormalOperational graph: pendulum_problem demonstrates this stage',
      'Abstract thinking allows reasoning about concepts not physically present',
      'Therefore: Formal operational thinking enables abstract reasoning'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that secure attachment results from responsive caregiving',
    input_dsl: '@goal results_from SecureAttachment responsive_caregiving',
    expected_nl: 'True: Secure attachment results from responsive caregiving',
    proof_nl: [
      'By Attachment_Secure graph: SecureAttachment isA AttachmentStyle',
      'By Attachment_Secure graph: percentage about 60_percent',
      'By Attachment_Secure graph: caregiver had responsive_sensitive',
      'By Attachment_Secure graph: behavior shows distress_at_separation',
      'By Attachment_Secure graph: behavior shows comfort_at_reunion',
      'By Attachment_Secure graph: exploration uses caregiver_as_base',
      'By Attachment_Secure graph: adult results healthy_relationships',
      'Responsive caregiving creates trust and security',
      'Therefore: Secure attachment results from responsive, sensitive caregiving'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that identity vs. role confusion occurs in adolescence',
    input_dsl: '@goal occurs_in IdentityVsRoleConfusion adolescence',
    expected_nl: 'True: Identity vs. role confusion is the adolescent crisis',
    proof_nl: [
      'By Erikson_IdentityVsRoleConfusion graph: IdentityVsRoleConfusion isA EriksonStage',
      'By Erikson_IdentityVsRoleConfusion graph: age ranges adolescence',
      'By Erikson_IdentityVsRoleConfusion graph: conflict involves identity_formation',
      'By Erikson_IdentityVsRoleConfusion graph: task explores different_roles',
      'By Erikson_IdentityVsRoleConfusion graph: task explores values_and_beliefs',
      'By Erikson_IdentityVsRoleConfusion graph: positive develops fidelity',
      'By Erikson_IdentityVsRoleConfusion graph: negative results role_confusion',
      'Adolescence is the key period for identity formation',
      'Therefore: Identity vs. role confusion occurs in adolescence'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Theory of Mind emerges around age 4',
    input_dsl: '@goal emerges TheoryOfMind age_4',
    expected_nl: 'True: Theory of Mind emerges around age 4',
    proof_nl: [
      'By Development_TheoryOfMind graph: TheoryOfMind isA CognitiveMilestone',
      'By Development_TheoryOfMind graph: definition understands mental_states_of_others',
      'By Development_TheoryOfMind graph: age emerges around_4_years',
      'By Development_TheoryOfMind graph: assessed by false_belief_task',
      'By Development_TheoryOfMind graph: assessed by Sally_Anne_test',
      'By Development_TheoryOfMind graph: requires perspective_taking',
      'This represents major cognitive developmental achievement',
      'Therefore: Theory of Mind emerges around age 4 years'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Kohlberg proposed three levels of moral development',
    input_dsl: '@goal proposed Kohlberg three_moral_levels',
    expected_nl: 'True: Kohlberg proposed three levels of moral development',
    proof_nl: [
      'By Moral_Preconventional graph: PreconventionalMorality isA MoralStage',
      'By Moral_Conventional graph: ConventionalMorality isA MoralStage',
      'By Moral_Postconventional graph: PostconventionalMorality isA MoralStage',
      'Preconventional focuses on consequences (punishment and self-interest)',
      'Conventional focuses on social approval and law',
      'Postconventional focuses on universal principles',
      'Each level has two stages, for six stages total',
      'Therefore: Kohlberg proposed three levels of moral development'
    ]
  },

  // =============================================================================
  // THEORETICAL SCHOOLS PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that behaviorism focuses on observable behavior',
    input_dsl: '@goal focuses Behaviorism observable_behavior',
    expected_nl: 'True: Behaviorism focuses on observable behavior',
    proof_nl: [
      'By School_Behaviorism graph: Behaviorism isA SchoolOfPsychology',
      'By School_Behaviorism graph: founder pioneered Watson',
      'By School_Behaviorism graph: founder developed Skinner',
      'By School_Behaviorism graph: focus studies observable_behavior',
      'By School_Behaviorism graph: rejects ignores mental_states',
      'By School_Behaviorism graph: method uses experimental_methods',
      'By School_Behaviorism graph: learning emphasizes conditioning',
      'Behaviorism arose as reaction to introspection and mentalism',
      'Therefore: Behaviorism focuses exclusively on observable behavior'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that psychoanalysis emphasizes unconscious processes',
    input_dsl: '@goal emphasizes Psychoanalysis unconscious_processes',
    expected_nl: 'True: Psychoanalysis focuses on unconscious processes',
    proof_nl: [
      'By School_Psychoanalysis graph: Psychoanalysis isA SchoolOfPsychology',
      'By School_Psychoanalysis graph: founder created Freud',
      'By School_Psychoanalysis graph: focus studies unconscious_processes',
      'By School_Psychoanalysis graph: structure proposes id_ego_superego',
      'By School_Psychoanalysis graph: therapy uses free_association',
      'By School_Psychoanalysis graph: therapy uses dream_analysis',
      'The unconscious is the central concept of psychoanalysis',
      'Therefore: Psychoanalysis emphasizes unconscious processes'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that cognitive-behavioral therapy targets thoughts and behaviors',
    input_dsl: '@goal targets CognitiveBehavioralTherapy thoughts_and_behaviors',
    expected_nl: 'True: CBT targets thoughts and behaviors',
    proof_nl: [
      'By Therapy_CBT graph: CognitiveBehavioralTherapy isA TherapyApproach',
      'By Therapy_CBT graph: founder developed Beck',
      'By Therapy_CBT graph: founder developed Ellis',
      'By Therapy_CBT graph: focus targets thoughts_and_behaviors',
      'By Therapy_CBT graph: assumption states thoughts_affect_feelings',
      'By Therapy_CBT graph: technique uses cognitive_restructuring',
      'By Therapy_CBT graph: technique uses behavioral_activation',
      'By Therapy_CBT graph: has strong_empirical_support',
      'CBT integrates cognitive and behavioral approaches',
      'Therefore: Cognitive-behavioral therapy targets thoughts and behaviors'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that the Big Five model has five personality factors',
    input_dsl: '@goal hasFive BigFiveModel personality_factors',
    expected_nl: 'True: Big Five model describes five personality factors',
    proof_nl: [
      'By Personality_BigFive graph: TraitTheory isA PersonalityTheory',
      'By Personality_BigFive graph: BigFiveModel describes five_factors',
      'By Personality_BigFive graph: factor includes openness',
      'By Personality_BigFive graph: factor includes conscientiousness',
      'By Personality_BigFive graph: factor includes extraversion',
      'By Personality_BigFive graph: factor includes agreeableness',
      'By Personality_BigFive graph: factor includes neuroticism',
      'By Personality_BigFive graph: acronym OCEAN',
      'These five factors are found across cultures',
      'Therefore: Big Five model has five personality factors (OCEAN)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Social Cognitive Theory proposes reciprocal determinism',
    input_dsl: '@goal proposes SocialCognitiveTheory reciprocal_determinism',
    expected_nl: 'True: Social Cognitive Theory proposes reciprocal determinism',
    proof_nl: [
      'By Personality_SocialCognitive graph: SocialCognitiveTheory isA PersonalityTheory',
      'By Personality_SocialCognitive graph: founder developed Bandura',
      'By Personality_SocialCognitive graph: concept proposes reciprocal_determinism',
      'By Personality_SocialCognitive graph: interaction between person_behavior_environment',
      'By Personality_SocialCognitive graph: emphasizes self_efficacy',
      'By Personality_SocialCognitive graph: involves observational_learning',
      'Reciprocal determinism means bidirectional influences',
      'Therefore: Social Cognitive Theory proposes reciprocal determinism'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Maslow organized needs in a hierarchy',
    input_dsl: '@goal organized Maslow needs_hierarchy',
    expected_nl: 'True: Maslow organized needs in hierarchical pyramid',
    proof_nl: [
      'By Motivation_Maslow graph: MaslowHierarchy isA MotivationTheory',
      'By Motivation_Maslow graph: structure organized hierarchical_pyramid',
      'By Motivation_Maslow graph: level1 base physiological_needs',
      'By Motivation_Maslow graph: level2 above safety_needs',
      'By Motivation_Maslow graph: level3 above love_belonging',
      'By Motivation_Maslow graph: level4 above esteem_needs',
      'By Motivation_Maslow graph: level5 top self_actualization',
      'By Motivation_Maslow graph: principle states lower_must_be_met_first',
      'Therefore: Maslow organized needs in a hierarchical pyramid'
    ]
  },

  // =============================================================================
  // SOCIAL PSYCHOLOGY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that the fundamental attribution error overestimates dispositional causes',
    input_dsl: '@goal overestimates FundamentalAttributionError dispositional',
    expected_nl: 'True: Fundamental attribution error overestimates dispositional causes',
    proof_nl: [
      'By Social_AttributionTheory graph: AttributionTheory describes causal_explanations',
      'By Social_AttributionTheory graph: internal attributes dispositional_factors',
      'By Social_AttributionTheory graph: external attributes situational_factors',
      'By Social_AttributionTheory graph: bias shows fundamental_attribution_error',
      'By Social_AttributionTheory graph: FAE overestimates dispositional_causes',
      'We tend to attribute others behavior to personality rather than situation',
      'We make the opposite error for our own behavior (actor-observer difference)',
      'Therefore: Fundamental attribution error overestimates dispositional causes'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that cognitive dissonance motivates consistency',
    input_dsl: '@goal motivates CognitiveDissonance consistency',
    expected_nl: 'True: Cognitive dissonance motivates reducing inconsistency',
    proof_nl: [
      'By Social_CognitiveDissonance graph: CognitiveDissonance isA SocialConcept',
      'By Social_CognitiveDissonance graph: founder proposed Festinger',
      'By Social_CognitiveDissonance graph: discomfort occurs inconsistent_cognitions',
      'By Social_CognitiveDissonance graph: motivation drives reduce_dissonance',
      'By Social_CognitiveDissonance graph: strategies includes change_behavior',
      'By Social_CognitiveDissonance graph: strategies includes change_belief',
      'By Social_CognitiveDissonance graph: demonstrates induced_compliance',
      'Dissonance creates psychological discomfort that drives change',
      'Therefore: Cognitive dissonance motivates achieving consistency'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that conformity can result from normative or informational influence',
    input_dsl: '@goal results_from Conformity two_influences',
    expected_nl: 'True: Conformity results from normative or informational influence',
    proof_nl: [
      'By Social_Conformity graph: Conformity isA SocialConcept',
      'By Social_Conformity graph: definition involves matching_group_behavior',
      'By Social_Conformity graph: normative based desire_for_acceptance',
      'By Social_Conformity graph: informational based desire_for_accuracy',
      'By Social_Conformity graph: Asch studied conformity',
      'By Social_Conformity graph: demonstrated line_judgment_task',
      'Normative influence is wanting to fit in',
      'Informational influence is assuming others know better',
      'Therefore: Conformity results from normative or informational influence'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that Milgram studied obedience to authority',
    input_dsl: '@goal studied Milgram obedience',
    expected_nl: 'True: Milgram studied obedience to authority',
    proof_nl: [
      'By Social_Obedience graph: Obedience isA SocialConcept',
      'By Social_Obedience graph: definition involves following_authority',
      'By Social_Obedience graph: famous studied Milgram',
      'By Social_Obedience graph: demonstrated shock_experiment',
      'By Social_Obedience graph: finding showed high_obedience_rate',
      'By Social_Obedience graph: factors increases proximity_to_authority',
      'By Social_Obedience graph: ethical raised ethical_concerns',
      'The Milgram experiments are foundational in social psychology',
      'Therefore: Milgram studied obedience to authority'
    ]
  },

  // =============================================================================
  // INTEGRATION AND COMPLEX REASONING
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that emotions and cognition influence each other bidirectionally',
    input_dsl: '@goal bidirectional emotion cognition',
    expected_nl: 'True: Emotions and cognition influence each other bidirectionally',
    proof_nl: [
      'By EmotionCognitionLink graph: BasicEmotion influences CognitiveProcess',
      'By EmotionCognitionLink graph: CognitiveProcess influences BasicEmotion',
      'By EmotionCognitionLink graph: bidirectional relationship exists',
      'By Lazarus theory: Cognitive appraisal determines emotion',
      'By mood-congruent memory: Emotion affects what we remember',
      'By affect-as-information: Emotions inform judgments',
      'This bidirectional influence is fundamental to human psychology',
      'Therefore: Emotions and cognition influence each other bidirectionally'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that effective therapy depends on matching treatment to disorder',
    input_dsl: '@goal depends effective_therapy treatment_disorder_match',
    expected_nl: 'True: Treatment effectiveness depends on disorder-treatment matching',
    proof_nl: [
      'By DisorderTreatmentLink graph: evidence supports treatment for disorder',
      'By DisorderTreatmentLink graph: outcome measured symptom_reduction',
      'Exposure therapy is highly effective for anxiety disorders',
      'CBT is effective for depression and anxiety',
      'DBT is specifically effective for Borderline Personality Disorder',
      'Antipsychotics are necessary for schizophrenia',
      'Treatment specificity improves outcomes',
      'Therefore: Effective therapy depends on matching treatment to disorder'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that development occurs within cultural context',
    input_dsl: '@goal occurs_within development cultural_context',
    expected_nl: 'True: Development occurs within cultural context',
    proof_nl: [
      'By DevelopmentCultureLink graph: culture influences development expression',
      'By DevelopmentCultureLink graph: culture influences development timing',
      'By DevelopmentCultureLink graph: universal core milestones exist',
      'By DevelopmentCultureLink graph: variation shows cultural_differences',
      'Attachment patterns vary somewhat across cultures',
      'Moral development reflects cultural values',
      'Identity formation involves cultural identity',
      'Vygotsky emphasized sociocultural influences on development',
      'Therefore: Development occurs within and is shaped by cultural context'
    ]
  },

  // =============================================================================
  // NEGATIVE TEST CASES (should fail or show limits)
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Can fear produce approach behavior? (should fail)',
    input_dsl: '@goal leadsto Fear approach_tendency',
    expected_nl: 'Cannot prove: Fear produces avoidance, not approach',
    proof_nl: [
      'By BasicEmotion_Fear graph: Fear leads to avoidance_or_escape',
      'Fear is associated with threat perception',
      'Fear activates fight-or-flight, which includes escape',
      'Approach tendency is associated with positive emotions like joy',
      'Fear and approach are incompatible behavioral tendencies',
      'Cannot establish that fear produces approach behavior'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is sensory memory long-lasting? (should fail)',
    input_dsl: '@goal lasts SensoryMemory prolonged_duration',
    expected_nl: 'Cannot prove: Sensory memory is very brief',
    proof_nl: [
      'By Memory_Sensory graph: SensoryMemory lasts less_than_1_second',
      'Sensory memory has very brief duration',
      'It decays rapidly without attention',
      'Long-term memory, not sensory memory, has prolonged duration',
      'Cannot prove sensory memory is long-lasting'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Does Major Depression require six months duration? (should fail)',
    input_dsl: '@goal requires MajorDepressiveDisorder six_months',
    expected_nl: 'Cannot prove: Major Depression requires two weeks, not six months',
    proof_nl: [
      'By Disorder_MajorDepression graph: duration requires two_weeks_minimum',
      'Two weeks is the diagnostic threshold',
      'Six months is not required for Major Depressive Disorder',
      'Persistent Depressive Disorder requires two years',
      'Cannot prove Major Depression requires six months'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Do preoperational children understand conservation? (should fail)',
    input_dsl: '@goal understands PreoperationalStage conservation',
    expected_nl: 'Cannot prove: Preoperational children lack conservation',
    proof_nl: [
      'By Piaget_Preoperational graph: limitation shows lack_of_conservation',
      'Preoperational children fail conservation tasks',
      'They are fooled by changes in appearance',
      'Conservation develops in concrete operational stage',
      'Cannot prove preoperational children understand conservation'
    ]
  }
];

export default { name, description, cases };
