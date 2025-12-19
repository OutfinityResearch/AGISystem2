export const cases = [
    {
        name: "Modus Ponens",
        theorem: "Modus_Ponens",
        args: ["RainingOutside", "GroundIsWet"],
        expected_nl: [
            "If it is raining outside, then the ground is wet",
            "It is raining outside",
            "Therefore, the ground is wet"
        ],
        proof_nl: [
            "Premise 1: It is raining outside (P is true)",
            "Premise 2: If it is raining outside, then the ground is wet (P implies Q)",
            "By Modus Ponens: When P is true and P implies Q, we can conclude Q",
            "Conclusion: The ground is wet"
        ]
    },
    {
        name: "Modus Tollens",
        theorem: "Modus_Tollens",
        args: ["PlantWatered", "PlantAlive"],
        expected_nl: [
            "If the plant was watered, then the plant is alive",
            "The plant is not alive",
            "Therefore, the plant was not watered"
        ],
        proof_nl: [
            "Premise 1: The plant is not alive (not Q)",
            "Premise 2: If the plant was watered, then the plant is alive (P implies Q)",
            "By Modus Tollens: When not Q is true and P implies Q, we can conclude not P",
            "Conclusion: The plant was not watered"
        ]
    },
    {
        name: "Hypothetical Syllogism",
        theorem: "Hypothetical_Syllogism",
        args: ["StudyHard", "GetGoodGrades", "GetIntoCollege"],
        expected_nl: [
            "If I study hard, then I will get good grades",
            "If I get good grades, then I will get into college",
            "Therefore, if I study hard, then I will get into college"
        ],
        proof_nl: [
            "Premise 1: If I study hard, then I will get good grades (P implies Q)",
            "Premise 2: If I get good grades, then I will get into college (Q implies R)",
            "By Hypothetical Syllogism: Chain the implications together",
            "Conclusion: If I study hard, then I will get into college (P implies R)"
        ]
    },
    {
        name: "Disjunctive Syllogism",
        theorem: "Disjunctive_Syllogism",
        args: ["TrainOnTime", "TakeTaxi"],
        expected_nl: [
            "Either the train is on time or I will take a taxi",
            "The train is not on time",
            "Therefore, I will take a taxi"
        ],
        proof_nl: [
            "Premise 1: Either the train is on time or I will take a taxi (P or Q)",
            "Premise 2: The train is not on time (not P)",
            "By Disjunctive Syllogism: Eliminate the false disjunct",
            "Conclusion: I will take a taxi (Q)"
        ]
    },
    {
        name: "Valid and Sound Argument",
        theorem: "Sound_Argument",
        args: ["AllMenMortalSocratesMan", "SocratesMortal"],
        expected_nl: [
            "All men are mortal",
            "Socrates is a man",
            "Therefore, Socrates is mortal"
        ],
        proof_nl: [
            "The argument is valid: conclusion follows necessarily from premises",
            "The premises are true: all men are indeed mortal, and Socrates is a man",
            "A sound argument is both valid and has true premises",
            "Therefore, this argument is sound and the conclusion is guaranteed true"
        ]
    },
    {
        name: "Categorical Imperative",
        theorem: "Categorical_Imperative",
        args: ["TellTheTruth"],
        expected_nl: [
            "Can the maxim 'always tell the truth' be a universal law?",
            "If everyone always told the truth, the world would function coherently",
            "Therefore, telling the truth satisfies the categorical imperative"
        ],
        proof_nl: [
            "Test: Can the maxim be universalized without contradiction?",
            "If everyone lied when convenient, lying would become meaningless",
            "But if everyone always told the truth, communication remains functional",
            "Therefore, truthfulness can be a universal law and is morally required"
        ]
    },
    {
        name: "Kant Formula of Humanity",
        theorem: "Kant_Formula_Of_Humanity",
        args: ["HiringEmployees", "Employee"],
        expected_nl: [
            "When hiring employees, treat them as ends in themselves",
            "Do not use employees merely as means to profit",
            "Respect their autonomy and dignity",
            "Therefore, the hiring practice is moral"
        ],
        proof_nl: [
            "Kant's Formula of Humanity: Act so that you treat humanity always as an end, never merely as a means",
            "Hiring that respects workers' autonomy treats them as ends",
            "Exploitation treats workers merely as means",
            "Moral hiring must respect human dignity and provide fair treatment"
        ]
    },
    {
        name: "Utilitarian Principle",
        theorem: "Utilitarian_Principle",
        args: ["DonateToCharity"],
        expected_nl: [
            "Donating to effective charities maximizes overall happiness",
            "It minimizes suffering by helping those in need",
            "Therefore, donating to charity is morally right"
        ],
        proof_nl: [
            "Utilitarianism judges actions by their consequences",
            "Donating to charity increases total happiness and reduces suffering",
            "The marginal value to recipients exceeds the marginal cost to donors",
            "Therefore, by utilitarian principles, charitable donation is moral"
        ]
    },
    {
        name: "Aristotle Golden Mean",
        theorem: "Virtue_Ethics_Golden_Mean",
        args: ["Courage", "Rashness", "Cowardice"],
        expected_nl: [
            "Courage is the mean between rashness and cowardice",
            "Rashness is excessive boldness",
            "Cowardice is deficient boldness",
            "Therefore, courage is a virtue"
        ],
        proof_nl: [
            "Aristotle's doctrine: virtue lies in the mean between extremes",
            "Rashness is too much boldness, risking harm needlessly",
            "Cowardice is too little boldness, failing to act when appropriate",
            "Courage finds the right balance, acting boldly when appropriate",
            "Therefore, courage is a virtue as the mean between excess and deficiency"
        ]
    },
    {
        name: "Knowledge as JTB",
        theorem: "Knowledge_JTB",
        args: ["Alice", "EarthIsRound"],
        expected_nl: [
            "Alice believes the Earth is round",
            "The Earth is round (the belief is true)",
            "Alice's belief is justified by evidence",
            "Therefore, Alice knows the Earth is round"
        ],
        proof_nl: [
            "Classical analysis: Knowledge is justified true belief",
            "Condition 1: Alice believes the proposition (belief)",
            "Condition 2: The proposition is true (truth)",
            "Condition 3: Alice has good reasons/evidence (justification)",
            "All three conditions satisfied, so Alice has knowledge"
        ]
    },
    {
        name: "Gettier Problem",
        theorem: "Gettier_Problem",
        args: ["Smith", "JonesOwnsAFord"],
        expected_nl: [
            "Smith has justified true belief that Jones owns a Ford",
            "But Smith's belief is only true by luck",
            "Jones doesn't own a Ford, but someone else in the office does",
            "Therefore, Smith doesn't have genuine knowledge"
        ],
        proof_nl: [
            "Gettier cases show JTB is insufficient for knowledge",
            "Smith's belief satisfies all three JTB conditions",
            "But the belief is true only accidentally/luckily",
            "The justification doesn't properly connect to the truth",
            "Therefore, luck undermines knowledge despite satisfying JTB"
        ]
    },
    {
        name: "Cogito Ergo Sum",
        theorem: "Cogito_Ergo_Sum",
        args: ["Descartes"],
        expected_nl: [
            "Descartes doubts everything that can be doubted",
            "But Descartes cannot doubt that he is thinking",
            "If Descartes is thinking, then Descartes must exist",
            "Therefore, Descartes exists"
        ],
        proof_nl: [
            "The cogito is Descartes' foundational certainty",
            "Even if an evil demon deceives about everything else",
            "The very act of thinking/doubting proves existence",
            "I think, therefore I am - cannot be doubted",
            "This provides an indubitable foundation for knowledge"
        ]
    },
    {
        name: "Hume Problem of Induction",
        theorem: "Hume_Problem_Of_Induction",
        args: ["TomorrowSunRises", "PastSunrises"],
        expected_nl: [
            "The sun has risen every day in the past",
            "We infer the sun will rise tomorrow",
            "But past regularities don't logically guarantee future ones",
            "Therefore, induction is not rationally justified"
        ],
        proof_nl: [
            "Hume's skeptical challenge to inductive reasoning",
            "We assume nature is uniform, but this assumes what needs proving",
            "No logical contradiction in nature changing its patterns",
            "Any argument for uniformity is itself inductive, thus circular",
            "Therefore, induction lacks rational foundation despite practical necessity"
        ]
    },
    {
        name: "Berkeley Esse Est Percipi",
        theorem: "Berkeley_Esse_Est_Percipi",
        args: ["Tree"],
        expected_nl: [
            "For a tree to exist is for it to be perceived",
            "If no one perceives the tree, it doesn't exist",
            "But God always perceives everything",
            "Therefore, things exist continuously through God's perception"
        ],
        proof_nl: [
            "Berkeley's idealism: to be is to be perceived (esse est percipi)",
            "Material substance is incoherent; only minds and ideas exist",
            "Objects are collections of sensory ideas",
            "God's perception maintains continuity when humans don't observe",
            "Therefore, reality is fundamentally mental, not material"
        ]
    },
    {
        name: "Free Will vs Determinism",
        theorem: "Incompatibilism",
        args: ["Determinism", "FreeWill"],
        expected_nl: [
            "If determinism is true, all actions are caused by prior events",
            "If free will is true, we can choose otherwise",
            "Determinism and free will are incompatible",
            "We must choose between them or accept neither"
        ],
        proof_nl: [
            "Incompatibilism holds determinism and free will cannot both be true",
            "If all events are causally determined, no alternative possibilities exist",
            "Free will seems to require ability to choose otherwise",
            "Therefore, accepting determinism requires rejecting free will",
            "Hard determinists accept determinism; libertarians accept free will"
        ]
    },
    {
        name: "Existence Precedes Essence",
        theorem: "Existence_Precedes_Essence",
        args: ["HumanBeing"],
        expected_nl: [
            "Humans first exist without predetermined nature",
            "Then through choices and actions create their essence",
            "There is no fixed human nature",
            "We are radically free and responsible"
        ],
        proof_nl: [
            "Sartre's existentialist slogan: existence precedes essence",
            "Unlike artifacts (designed with purpose), humans have no designer",
            "We are thrown into existence first, then define ourselves",
            "Radical freedom means we create our own meaning and values",
            "Therefore, we are condemned to be free and totally responsible"
        ]
    },
    {
        name: "Ontological Argument",
        theorem: "Ontological_Argument_Anselm",
        args: ["God"],
        expected_nl: [
            "God is that than which nothing greater can be conceived",
            "Something existing in reality is greater than existing only in mind",
            "If God existed only in mind, we could conceive something greater",
            "Therefore, God must exist in reality"
        ],
        proof_nl: [
            "Anselm's a priori argument for God from concept alone",
            "Define God as maximally great being",
            "Existence in reality is greater than existence in understanding alone",
            "If God lacked existence, something greater could be conceived",
            "This contradicts the definition, so God must exist"
        ]
    },
    {
        name: "Problem of Evil",
        theorem: "Problem_Of_Evil",
        args: ["God", "Evil"],
        expected_nl: [
            "If God is omnipotent, He can prevent all evil",
            "If God is omnibenevolent, He wants to prevent all evil",
            "Yet evil exists in the world",
            "Therefore, an omnipotent and omnibenevolent God cannot exist"
        ],
        proof_nl: [
            "Classical argument against traditional theism",
            "Omnipotence means God has power to prevent evil",
            "Omnibenevolence means God desires to prevent evil",
            "Evil's existence seems incompatible with both attributes",
            "Responses include free will defense and soul-making theodicy"
        ]
    },
    {
        name: "Plato Theory of Forms",
        theorem: "Plato_Theory_Of_Forms",
        args: ["BeautifulPainting", "FormOfBeauty"],
        expected_nl: [
            "This painting is beautiful",
            "The painting participates in the Form of Beauty",
            "The Form of Beauty is perfect and eternal",
            "The painting imperfectly reflects the Form"
        ],
        proof_nl: [
            "Plato's metaphysics: perfect Forms exist beyond physical world",
            "Physical things are imperfect copies of eternal Forms",
            "Particulars participate in universal Forms",
            "Forms are known by reason, not senses",
            "True knowledge is of Forms, not changing physical world"
        ]
    },
    {
        name: "Ship of Theseus",
        theorem: "Ship_Of_Theseus",
        args: ["TheseusShip", "OriginalPlanks", "NewPlanks"],
        expected_nl: [
            "Theseus' ship has all its planks gradually replaced",
            "After all parts are replaced, is it the same ship?",
            "What if the original planks are reassembled?",
            "This raises puzzles about identity over time"
        ],
        proof_nl: [
            "Classic puzzle about persistence of identity through change",
            "Continuity suggests it remains the same ship",
            "Complete replacement suggests it's a different ship",
            "If originals are reassembled, which is the real ship?",
            "Illustrates problems with both continuity and constitution views"
        ]
    },
    {
        name: "Chinese Room Argument",
        theorem: "Chinese_Room_Argument",
        args: ["ChineseRoomSystem", "ChineseSyntax", "ChineseSemantics"],
        expected_nl: [
            "A person in a room manipulates Chinese symbols by rules",
            "The person produces correct Chinese responses",
            "But the person doesn't understand Chinese",
            "Therefore, syntax alone doesn't constitute semantics"
        ],
        proof_nl: [
            "Searle's argument against strong AI",
            "Computer programs manipulate formal symbols syntactically",
            "Understanding requires grasping meaning, not just symbol manipulation",
            "The room produces correct outputs without understanding",
            "Therefore, computation is insufficient for genuine understanding"
        ]
    },
    {
        name: "Trolley Problem",
        theorem: "Trolley_Problem",
        args: ["DivertTrolley", "SaveFive", "KillOne"],
        expected_nl: [
            "A runaway trolley will kill five people on the track",
            "You can divert it to kill one person instead",
            "Is it permissible to divert the trolley?",
            "This tests intuitions about doing versus allowing harm"
        ],
        proof_nl: [
            "Classic thought experiment in ethics",
            "Utilitarian view: save more lives, so divert",
            "Deontological concern: actively killing versus letting die",
            "Most people say it's permissible to divert",
            "But resist pushing someone in front (Fat Man variant)",
            "Reveals complex moral intuitions about action and intention"
        ]
    },
    {
        name: "Veil of Ignorance",
        theorem: "Rawls_Veil_Of_Ignorance",
        args: ["JusticePrinciples"],
        expected_nl: [
            "Choose principles of justice behind a veil of ignorance",
            "Don't know your position in society",
            "Rational choice leads to fair principles",
            "Therefore, these principles are just"
        ],
        proof_nl: [
            "Rawls' device for deriving principles of justice",
            "Behind veil, don't know race, class, talents, etc.",
            "Ensures impartiality in choosing principles",
            "Would choose principles protecting worst-off",
            "Results in liberty principle and difference principle"
        ]
    },
    {
        name: "Social Contract",
        theorem: "Social_Contract_Theory",
        args: ["NoMurderRule", "Society"],
        expected_nl: [
            "We agree not to murder each other",
            "This agreement is rational for mutual benefit",
            "Therefore, the rule against murder is legitimate"
        ],
        proof_nl: [
            "Social contract grounds political legitimacy",
            "Rules are justified by rational agreement",
            "Even if not actual, hypothetical agreement matters",
            "Mutual benefit motivates cooperation",
            "Therefore, legitimate authority derives from consent"
        ]
    },
    {
        name: "Is-Ought Problem",
        theorem: "Hume_Is_Ought_Problem",
        args: ["FactualStatement", "MoralConclusion"],
        expected_nl: [
            "People generally seek pleasure (is)",
            "Therefore, people ought to seek pleasure (ought)",
            "But this inference is invalid",
            "You cannot derive ought from is"
        ],
        proof_nl: [
            "Hume's law: cannot validly derive prescriptive from descriptive",
            "Facts about what is don't entail what ought to be",
            "Moral conclusions require moral premises",
            "Attempts to derive ought from is commit naturalistic fallacy",
            "Challenges naturalistic ethics and requires non-natural moral properties"
        ]
    },
    {
        name: "Hard Problem of Consciousness",
        theorem: "Hard_Problem_Of_Consciousness",
        args: ["PhysicalBrain", "SubjectiveExperience"],
        expected_nl: [
            "Physical processes in the brain can be explained",
            "But why is there subjective experience?",
            "Why is there something it's like to be conscious?",
            "This is the hard problem"
        ],
        proof_nl: [
            "Chalmers distinguishes easy and hard problems",
            "Easy problems: explaining cognitive functions",
            "Hard problem: explaining why there is subjective experience",
            "Physical explanation seems to leave out qualia",
            "Gap between objective description and subjective experience"
        ]
    },
    {
        name: "Kripke Rigid Designator",
        theorem: "Kripke_Rigid_Designator",
        args: ["Aristotle", "ThePhilosopher"],
        expected_nl: [
            "The name 'Aristotle' refers to the same person in all possible worlds",
            "It rigidly designates that individual",
            "Unlike descriptions which may apply to different people",
            "Therefore, 'Aristotle' is a rigid designator"
        ],
        proof_nl: [
            "Kripke's semantic theory of proper names",
            "Names refer directly, not via descriptions",
            "In counterfactual situations, names still refer to same individual",
            "Descriptions are not rigid - they pick out different things in different worlds",
            "Names are rigid designators, essential for modal reasoning"
        ]
    },
    {
        name: "Verification Principle",
        theorem: "Verification_Principle",
        args: ["MetaphysicalStatement"],
        expected_nl: [
            "The statement 'The Absolute is perfect' is not verifiable",
            "It is not analytic either",
            "Therefore, it is meaningless"
        ],
        proof_nl: [
            "Logical positivism's criterion of meaning",
            "Meaningful statements are either empirically verifiable or analytic",
            "Metaphysical claims are neither",
            "Therefore, metaphysics is literally nonsense",
            "Self-defeating: verification principle itself seems unverifiable"
        ]
    },
    {
        name: "Searle's Chinese Room",
        theorem: "Chinese_Room_Argument",
        args: ["AIProgram", "Syntax", "Semantics"],
        expected_nl: [
            "An AI program manipulates symbols according to rules",
            "It produces intelligent-seeming outputs",
            "But it doesn't understand meaning",
            "Therefore, AI cannot achieve genuine understanding"
        ],
        proof_nl: [
            "Argument against computational theory of mind",
            "Syntax (formal symbol manipulation) is insufficient for semantics (meaning)",
            "Person in room follows rules without understanding Chinese",
            "Similarly, computers process syntax without semantic understanding",
            "Intentionality requires more than computational processes"
        ]
    },
    {
        name: "Modal Realism",
        theorem: "Modal_Realism",
        args: ["AlternativeWorld"],
        expected_nl: [
            "Possible worlds exist as concrete realities",
            "Each world is just as real as the actual world",
            "Modal truths are about what exists in these worlds",
            "Therefore, possibility and necessity are grounded in reality"
        ],
        proof_nl: [
            "Lewis' controversial metaphysical thesis",
            "Possible worlds are not abstract but concrete",
            "Our world is actual for us, but each world is actual for its inhabitants",
            "Modal claims quantify over concrete possible worlds",
            "Provides elegant semantics but ontologically extravagant"
        ]
    },
    {
        name: "Mary the Color Scientist",
        theorem: "Mary_The_Color_Scientist",
        args: ["Mary", "PhysicalKnowledge"],
        expected_nl: [
            "Mary knows all physical facts about color vision",
            "But she has lived in a black and white room",
            "When she sees red for the first time, she learns something new",
            "Therefore, there are non-physical facts about consciousness"
        ],
        proof_nl: [
            "Jackson's knowledge argument against physicalism",
            "Mary knows all physical information about color",
            "Yet she learns something new when experiencing color",
            "What she learns (qualia) is not physical information",
            "Therefore, not all facts are physical facts"
        ]
    },
    {
        name: "Nietzsche Will to Power",
        theorem: "Nietzsche_Will_To_Power",
        args: ["Human", "Striving"],
        expected_nl: [
            "All human behavior is driven by will to power",
            "We seek to overcome resistance and dominate",
            "This is more fundamental than survival or pleasure",
            "Therefore, will to power is the basic drive"
        ],
        proof_nl: [
            "Nietzsche's psychological/metaphysical thesis",
            "Traditional values mask will to power",
            "Life essentially seeks to grow, expand, dominate",
            "Creative self-overcoming is highest expression",
            "Revalues traditional morality in light of power"
        ]
    },
    {
        name: "Heidegger Being-toward-Death",
        theorem: "Heidegger_Being_Toward_Death",
        args: ["Dasein", "Death"],
        expected_nl: [
            "Dasein (human being) is always being-toward-death",
            "Facing one's own death authentically",
            "Reveals the structure of authentic existence",
            "Therefore, confronting mortality is essential to authenticity"
        ],
        proof_nl: [
            "Heidegger's existential analysis",
            "Death is Dasein's ownmost possibility",
            "Cannot be outstripped or transferred to another",
            "Facing death individualizes and reveals authentic being",
            "Fleeing from death leads to inauthentic everyday existence"
        ]
    },
    {
        name: "Wittgenstein Language Games",
        theorem: "Wittgenstein_Language_Games",
        args: ["Word", "Use"],
        expected_nl: [
            "The meaning of a word is its use in language",
            "Language consists of multiple overlapping games",
            "Each game has its own rules and context",
            "Therefore, meaning is not fixed reference but use in practice"
        ],
        proof_nl: [
            "Later Wittgenstein's philosophy of language",
            "Rejects picture theory for use theory of meaning",
            "Words get meaning from role in language games",
            "Language games embedded in forms of life",
            "No private language - meaning requires public practice"
        ]
    },
    {
        name: "Frankfurt Compatibilism",
        theorem: "Frankfurt_Compatibilism",
        args: ["Agent", "Action", "Alternative"],
        expected_nl: [
            "An agent is morally responsible for an action",
            "Even though the agent had no alternative possibilities",
            "What matters is that action flows from agent's will",
            "Therefore, alternative possibilities are not required for responsibility"
        ],
        proof_nl: [
            "Frankfurt's attack on principle of alternative possibilities",
            "Counterfactual intervener would prevent different choice",
            "But agent acts on own without intervention",
            "Agent is responsible despite lacking alternatives",
            "Compatibilism: freedom is acting from one's will, not having alternatives"
        ]
    },
    {
        name: "Parfit on Personal Identity",
        theorem: "Parfit_Personal_Identity",
        args: ["Person", "PsychologicalContinuity"],
        expected_nl: [
            "Personal identity is not what matters for survival",
            "What matters is psychological continuity and connectedness",
            "Identity can be indeterminate in fission cases",
            "Therefore, we should care about continuity, not identity"
        ],
        proof_nl: [
            "Parfit's reductionist view of personal identity",
            "Identity is not a deep further fact",
            "Psychological continuity admits of degrees",
            "In fission cases, identity becomes indeterminate",
            "Practical implications: changes how we think about self-interest and ethics"
        ]
    },
    {
        name: "Singer Animal Liberation",
        theorem: "Singer_Animal_Liberation",
        args: ["Dog", "Sentient"],
        expected_nl: [
            "The dog is sentient and can suffer",
            "Sentience grounds moral consideration",
            "Therefore, the dog deserves moral consideration",
            "Speciesism is analogous to racism"
        ],
        proof_nl: [
            "Singer's utilitarian argument for animal rights",
            "Capacity to suffer is basis for moral status",
            "Species membership alone is morally irrelevant",
            "Equal consideration of equal interests",
            "Revolutionary implications for treatment of animals"
        ]
    },
    {
        name: "Camus Absurdism",
        theorem: "Camus_Absurdism",
        args: ["Human", "Meaning", "Universe"],
        expected_nl: [
            "Humans seek meaning and purpose",
            "The universe is silent and meaningless",
            "The confrontation creates the absurd",
            "We must revolt against absurdity and create our own meaning"
        ],
        proof_nl: [
            "Camus' response to nihilism",
            "Absurd emerges from collision of human need and cosmic silence",
            "Suicide is rejecting the struggle",
            "Revolt is living fully despite absurdity",
            "Like Sisyphus, we can be happy in our revolt"
        ]
    },
    {
        name: "Stoic Dichotomy of Control",
        theorem: "Stoic_Dichotomy_Of_Control",
        args: ["MyBeliefs"],
        expected_nl: [
            "My beliefs and judgments are in my control",
            "I should focus my attention on what I control",
            "External events are not in my control",
            "I should not be disturbed by externals"
        ],
        proof_nl: [
            "Fundamental Stoic principle for tranquility",
            "Distinguish what is up to us from what is not",
            "Focus effort only on what we can control",
            "Accept what we cannot control with equanimity",
            "Freedom and happiness come from focusing on the internal"
        ]
    },
    {
        name: "Ockham's Razor",
        theorem: "Ockham_Razor",
        args: ["SimpleTheory", "ComplexTheory"],
        expected_nl: [
            "Two theories explain the data equally well",
            "One theory is simpler than the other",
            "We should prefer the simpler theory",
            "Don't multiply entities beyond necessity"
        ],
        proof_nl: [
            "Principle of parsimony in explanation",
            "Among equally good explanations, prefer simpler",
            "Occam: entities should not be multiplied without necessity",
            "Methodological principle, not metaphysical claim",
            "Widely used in science and philosophy"
        ]
    },
    {
        name: "Moore's Open Question",
        theorem: "Moore_Open_Question",
        args: ["Pleasure", "Good"],
        expected_nl: [
            "Some claim good is identical to pleasure",
            "But 'Is pleasure good?' remains an open question",
            "If they were identical, the question would be trivial",
            "Therefore, good is not identical to pleasure"
        ],
        proof_nl: [
            "Moore's argument against naturalistic definitions of good",
            "For any natural property X, 'Is X good?' is meaningful",
            "If good = X, the question would be like 'Is X X?'",
            "Since the question is meaningful, good ≠ X",
            "Good is a simple, unanalyzable, non-natural property"
        ]
    },
    {
        name: "Rawls Difference Principle",
        theorem: "Rawls_Difference_Principle",
        args: ["EconomicPolicy"],
        expected_nl: [
            "An economic policy benefits the least advantaged",
            "This policy would be chosen behind the veil of ignorance",
            "Therefore, the policy is just"
        ],
        proof_nl: [
            "Rawls' second principle of justice",
            "Inequalities permissible only if benefiting worst-off",
            "Derived from original position behind veil of ignorance",
            "Risk-averse choice protects against worst outcomes",
            "Balances efficiency with concern for least advantaged"
        ]
    },
    {
        name: "Kant Good Will",
        theorem: "Kant_Good_Will",
        args: ["GoodWill"],
        expected_nl: [
            "A good will is good in itself",
            "It is the only thing good without qualification",
            "Talents and gifts can be used for evil",
            "But a good will is intrinsically and unconditionally good"
        ],
        proof_nl: [
            "Opening of Kant's Groundwork",
            "Intelligence, courage, etc. can serve evil ends",
            "Only a good will is good in all circumstances",
            "Good will acts from duty, not inclination",
            "Foundation of Kantian moral theory"
        ]
    },
    {
        name: "Aristotle Eudaimonia",
        theorem: "Aristotle_Eudaimonia",
        args: ["Virtuous Person", "Virtues"],
        expected_nl: [
            "A person practices virtues consistently",
            "Virtue includes courage, temperance, justice, wisdom",
            "Through virtuous activity, one achieves eudaimonia",
            "Eudaimonia is human flourishing and the highest good"
        ],
        proof_nl: [
            "Aristotle's virtue ethics and teleology",
            "Human function is rational activity",
            "Virtues are excellences of character and intellect",
            "Eudaimonia achieved through virtuous rational activity",
            "This is the ultimate end of human life"
        ]
    },
    {
        name: "Hume Reason Slave of Passions",
        theorem: "Hume_Reason_Slave_Of_Passions",
        args: ["Reason", "Passion"],
        expected_nl: [
            "Reason alone cannot motivate action",
            "Only passions and desires can move us to act",
            "Reason is the slave of the passions",
            "It should be, and can only be"
        ],
        proof_nl: [
            "Hume's moral psychology",
            "Reason discovers truth and falsehood",
            "But motivation requires desire/passion",
            "Reason calculates means to satisfy passions",
            "Therefore, reason serves passion, not vice versa"
        ]
    },
    {
        name: "Descartes Method of Doubt",
        theorem: "Descartes_Method_Of_Doubt",
        args: ["SenseBelief"],
        expected_nl: [
            "This belief comes from the senses",
            "The senses sometimes deceive",
            "Anything that can be doubted should be rejected",
            "Therefore, reject beliefs based on senses"
        ],
        proof_nl: [
            "Descartes' method for finding certainty",
            "Systematically doubt everything that can be doubted",
            "Senses sometimes deceive, so might always deceive",
            "Dream argument: can't tell dreaming from waking",
            "Evil demon could deceive about everything",
            "Search for what survives all doubt"
        ]
    },
    {
        name: "Spinoza Determinism",
        theorem: "Spinoza_Determinism",
        args: ["HumanAction"],
        expected_nl: [
            "Every human action follows from the nature of substance",
            "Nothing is contingent; all is necessary",
            "Free will is an illusion of ignorance",
            "Understanding this brings freedom from passions"
        ],
        proof_nl: [
            "Spinoza's necessitarian metaphysics",
            "All follows from God/Nature's essence",
            "Humans are modes of infinite substance",
            "Actions determined by prior causes",
            "Freedom is understanding necessity, not escaping it"
        ]
    },
    {
        name: "Locke Tabula Rasa",
        theorem: "Locke_Tabula_Rasa",
        args: ["NewbornMind", "Birth"],
        expected_nl: [
            "A newborn's mind is a blank slate",
            "It has no innate ideas at birth",
            "All knowledge comes from experience",
            "Sensation and reflection fill the blank slate"
        ],
        proof_nl: [
            "Locke's empiricist epistemology",
            "Argues against Cartesian innate ideas",
            "Mind begins empty, filled by experience",
            "Simple ideas from sensation and reflection",
            "Complex ideas built from simple ones",
            "All knowledge ultimately traced to experience"
        ]
    },
    {
        name: "Leibniz Best of All Possible Worlds",
        theorem: "Leibniz_Best_Of_All_Possible_Worlds",
        args: ["ActualWorld", "God"],
        expected_nl: [
            "God created the actual world",
            "God is perfect and would choose the best",
            "Therefore, this must be the best of all possible worlds",
            "Evil exists but is minimized in this best world"
        ],
        proof_nl: [
            "Leibniz's theodicy and optimism",
            "God considers all possible worlds",
            "Perfect goodness and wisdom choose best",
            "This world has optimal balance of good and evil",
            "Voltaire satirized this in Candide"
        ]
    },
    {
        name: "Quine Web of Belief",
        theorem: "Quine_Web_Of_Belief",
        args: ["BeliefSystem", "Experience"],
        expected_nl: [
            "Our beliefs form an interconnected web",
            "Experience impinges only at the edges",
            "We adjust the web holistically to preserve coherence",
            "No belief is immune from revision"
        ],
        proof_nl: [
            "Quine's holistic epistemology",
            "Rejects foundationalism and sharp analytic-synthetic distinction",
            "Beliefs face tribunal of experience together",
            "Can revise any belief to maintain coherence",
            "Even logic and mathematics are revisable",
            "Underdetermination: multiple webs fit same evidence"
        ]
    },
    {
        name: "Popper Falsificationism",
        theorem: "Popper_Falsificationism",
        args: ["ScientificTheory"],
        expected_nl: [
            "A theory is scientific only if it is falsifiable",
            "Falsifiable means making risky predictions",
            "Unfalsifiable theories are pseudo-science",
            "Science progresses by bold conjectures and severe tests"
        ],
        proof_nl: [
            "Popper's demarcation criterion",
            "Science advances by trying to falsify theories",
            "Theories that survive severe tests are corroborated",
            "But never verified or proven true",
            "Distinguishes science from pseudo-science like astrology"
        ]
    }
];
