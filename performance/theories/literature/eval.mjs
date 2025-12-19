export const testCases = [
    {
        name: "Shakespearean Sonnet Structure",
        query: "What defines the structure of a Shakespearean sonnet?",
        expected_nl: [
            "A sonnet has fourteen lines with specific meter and rhyme scheme",
            "The combination of strict form, regular meter, and rhyme creates a structured poetic expression",
            "Poetry uses condensed language with heightened attention to form"
        ],
        proof_nl: [
            "Apply Poetry_Forms theorem to establish sonnet structure",
            "The sonnet form requires fourteen lines as a constraint",
            "Meter and rhyme scheme combine to create poetic structure",
            "The structured form implies organized poetic expression"
        ]
    },
    {
        name: "Epic Poetry Characteristics",
        query: "What are the essential characteristics of epic poetry?",
        expected_nl: [
            "Epic poetry features heroic protagonists on grand journeys",
            "Epic conventions feature heroes on grand supernatural journeys",
            "The elevated style and scope create a heroic narrative tradition"
        ],
        proof_nl: [
            "Apply Epic_Poetry theorem to identify epic characteristics",
            "The epic includes a heroic protagonist undertaking a journey",
            "Grand scale and elevated style are essential components",
            "Apply Epic_Conventions theorem for comprehensive epic features",
            "Supernatural elements and elevated diction combine with epic style"
        ]
    },
    {
        name: "Tragic Hero Analysis",
        query: "What makes a character a tragic hero?",
        expected_nl: [
            "Tragic heroes are noble figures with fatal flaws",
            "The noble protagonist has a tragic flaw that leads to downfall",
            "Recognition and catharsis are achieved through the hero's suffering"
        ],
        proof_nl: [
            "Apply Tragic_Hero theorem to define tragic hero characteristics",
            "The character must possess noble qualities",
            "A tragic flaw (hamartia) is essential to the tragic hero",
            "The flaw leads to downfall and suffering",
            "Recognition (anagnorisis) occurs during the tragedy",
            "Catharsis is evoked in the audience through pity and fear"
        ]
    },
    {
        name: "Stream of Consciousness Technique",
        query: "How does stream of consciousness work as a narrative technique?",
        expected_nl: [
            "Stream of consciousness reveals unfiltered interior thoughts",
            "Stream of consciousness captures unfiltered thought flow",
            "The uninterrupted flow uses associative logic to mimic realistic thought"
        ],
        proof_nl: [
            "Apply Stream_Of_Consciousness theorem to explain the technique",
            "Interior thoughts are revealed without filtering",
            "The flow is uninterrupted and continuous",
            "Associative logic connects thoughts naturally",
            "Apply Stream_Consciousness_Full for comprehensive understanding",
            "Time is disrupted and memory is incorporated",
            "Psychological realism is achieved through this technique"
        ]
    },
    {
        name: "Metaphor vs Simile",
        query: "What is the difference between metaphor and simile?",
        expected_nl: [
            "Metaphor creates implicit comparison between different things",
            "Simile makes explicit comparison using like or as",
            "Metaphor is implicit while simile is explicit in comparison"
        ],
        proof_nl: [
            "Apply Metaphor_Device theorem for implicit comparison",
            "Metaphor uses tenor and vehicle without explicit connector",
            "Apply Simile_Device theorem for explicit comparison",
            "Simile explicitly uses 'like' or 'as' to make clear comparison",
            "Both create figurative language but differ in directness"
        ]
    },
    {
        name: "Gothic Atmosphere Creation",
        query: "How is gothic atmosphere created in literature?",
        expected_nl: [
            "Gothic fiction combines mystery, horror, and supernatural elements",
            "Gothic atmosphere uses dark settings and supernatural terror",
            "Dark atmosphere, mystery, supernatural elements, and terror create gothic effect"
        ],
        proof_nl: [
            "Apply Gothic_Fiction theorem for basic gothic elements",
            "Dark atmosphere is essential to gothic mode",
            "Mystery and supernatural elements are incorporated",
            "Apply Gothic_Atmosphere_Creation for complete analysis",
            "Dark settings, mystery, supernatural, terror, and sublime combine",
            "Decay and darkness are emphasized throughout",
            "These elements together create the gothic effect"
        ]
    },
    {
        name: "Modernist Experimentation",
        query: "What characterizes modernist literary experimentation?",
        expected_nl: [
            "Modernism experiments with fragmented forms and consciousness",
            "Modernist experimentation breaks from tradition innovatively",
            "Experimentation, fragmentation, alienation, and subjective emphasis define modernism"
        ],
        proof_nl: [
            "Apply Modernism_Movement theorem for modernist characteristics",
            "Experimentation with form is central to modernism",
            "Fragmentation disrupts traditional narrative unity",
            "Stream of consciousness explores interior experience",
            "Apply Modernist_Experimentation theorem for full analysis",
            "Breaking from tradition enables innovation",
            "Consciousness exploration and fragmentation are emphasized",
            "Subjective experience is prioritized over objective reality"
        ]
    },
    {
        name: "Free Indirect Discourse",
        query: "What is free indirect discourse and how does it function?",
        expected_nl: [
            "Free indirect discourse blends third-person with interior perspective",
            "Third-person narration accesses interior thoughts creating intimacy",
            "Perspectives are blended allowing flexibility in narration"
        ],
        proof_nl: [
            "Apply Free_Indirect_Discourse theorem to explain the technique",
            "Third-person narration is maintained as base",
            "Interior consciousness is accessed despite external perspective",
            "Perspectives are blended creating hybrid narration",
            "Intimacy is created while maintaining narrative distance",
            "Flexibility allows movement between external and internal"
        ]
    },
    {
        name: "Feminist Literary Criticism",
        query: "What does feminist literary criticism examine?",
        expected_nl: [
            "Feminist criticism examines gender, power, and representation",
            "Gender analysis focuses on power relations and patriarchy",
            "Feminist representation develops characters with voice and agency"
        ],
        proof_nl: [
            "Apply Feminist_Criticism theorem for critical approach",
            "Gender construction and representation are examined",
            "Power dynamics, especially patriarchal power, are analyzed",
            "Representation of women in literature is studied critically",
            "Apply Feminist_Representation for creative approach",
            "Female characters are developed with complexity",
            "Voice and agency are given to marginalized perspectives",
            "Patriarchal norms are critiqued and subverted"
        ]
    },
    {
        name: "Tragic Plot Structure",
        query: "What are the essential elements of a tragic plot?",
        expected_nl: [
            "Tragic plots feature hamartia, peripeteia, anagnorisis, and catastrophe",
            "Tragic structure includes hero, flaw, recognition, and catharsis",
            "The fatal flaw leads to reversal, recognition, and inevitable catastrophe"
        ],
        proof_nl: [
            "Apply Tragedy_Plot theorem for plot elements",
            "Hamartia (tragic flaw) initiates the tragic sequence",
            "Peripeteia (reversal) occurs as consequences unfold",
            "Anagnorisis (recognition) provides moment of insight",
            "Catastrophe concludes the tragic action",
            "Apply Tragic_Structure_Complete for comprehensive analysis",
            "The tragic hero is established with noble qualities",
            "Suffering is depicted leading to catharsis",
            "Pity and fear are evoked in the audience"
        ]
    },
    {
        name: "Symbolism in Literature",
        query: "How does symbolism function in literary works?",
        expected_nl: [
            "Symbolism uses objects to represent abstract meanings",
            "Objects represent deeper significance requiring interpretation",
            "Symbolic network creates patterns generating layered meaning"
        ],
        proof_nl: [
            "Apply Symbolism_Device theorem for basic symbolism",
            "Objects or images carry symbolic weight",
            "Abstract meanings are represented through concrete symbols",
            "Deeper significance requires active interpretation",
            "Apply Symbolic_Network for complex symbolic systems",
            "Symbols form patterns throughout the work",
            "Meanings are layered and interconnected",
            "Themes are reinforced through symbolic connections"
        ]
    },
    {
        name: "Postmodern Literature Features",
        query: "What are the key features of postmodern literature?",
        expected_nl: [
            "Postmodernism uses irony, metafiction, and pastiche playfully",
            "Postmodern playfulness blurs reality and fiction ironically",
            "Irony, metafiction, pastiche, playfulness, and skepticism define postmodernism"
        ],
        proof_nl: [
            "Apply Postmodernism_Movement theorem for postmodern features",
            "Irony is employed throughout postmodern works",
            "Pastiche mixes styles and references",
            "Metafiction draws attention to fictional status",
            "Apply Postmodern_Playfulness theorem for comprehensive view",
            "Reality and fiction are deliberately blurred",
            "Self-awareness is central to postmodern technique",
            "Skepticism toward grand narratives is expressed"
        ]
    },
    {
        name: "Unreliable Narrator Effect",
        query: "What effect does an unreliable narrator create?",
        expected_nl: [
            "Unreliable narrators create distortion through bias or limitation",
            "Limited or biased perspective creates narrative distortion",
            "Reader engagement increases through interpretive challenge"
        ],
        proof_nl: [
            "Apply Unreliable_Narrator theorem to analyze effect",
            "The narrator has limited or distorted perspective",
            "Distortion is created through bias or mental state",
            "The reader must actively interpret and question",
            "Engagement is increased through this narrative play",
            "Perspective becomes a subject of the work itself"
        ]
    },
    {
        name: "Hero's Journey Structure",
        query: "What is the structure of the hero's journey?",
        expected_nl: [
            "The hero's journey involves departure, initiation, and return",
            "The journey includes ordinary world, call, departure, initiation, and return",
            "Transformation is achieved through the complete journey cycle"
        ],
        proof_nl: [
            "Apply Heros_Journey theorem for journey structure",
            "The hero begins in the ordinary world",
            "A call to adventure is received",
            "Departure from familiar world occurs",
            "Initiation involves trials and transformation",
            "Return brings the hero back transformed",
            "The complete cycle represents the monomyth pattern"
        ]
    },
    {
        name: "Romantic Period Ideals",
        query: "What ideals characterize Romantic period literature?",
        expected_nl: [
            "Romantic period celebrates emotion, nature, and imagination",
            "Romantic idealization celebrates emotion and imagination",
            "Emotion, nature, imagination, individual, and transcendence define Romanticism"
        ],
        proof_nl: [
            "Apply Romantic_Period theorem for period characteristics",
            "Emotion is emphasized over reason",
            "Nature is celebrated and idealized",
            "Individual experience is valued highly",
            "Imagination is prized as creative faculty",
            "Apply Romantic_Idealization for comprehensive ideals",
            "Transcendence is sought through nature and imagination",
            "The sublime is pursued as aesthetic goal",
            "Spontaneity is valued over formal constraint"
        ]
    },
    {
        name: "Bildungsroman Elements",
        query: "What are the essential elements of a bildungsroman?",
        expected_nl: [
            "Bildungsroman shows youth achieving maturity through experience",
            "Youth, education, experience, maturity, identity, and social integration define bildungsroman",
            "Coming of age themes show youth maturing through experience"
        ],
        proof_nl: [
            "Apply Bildungsroman_Complete theorem for genre definition",
            "The narrative begins with youth or adolescence",
            "Education (formal and informal) is central",
            "Experiences shape the protagonist's development",
            "Maturity is achieved through trials and growth",
            "Identity is formed through the process",
            "Integration into society completes the journey",
            "Overall growth from innocence to maturity defines the form"
        ]
    },
    {
        name: "Dramatic Irony Function",
        query: "How does dramatic irony function in literature?",
        expected_nl: [
            "Dramatic irony creates tension through audience knowledge",
            "Audience knows what characters don't creating tension",
            "Knowledge gap between audience and characters builds suspense"
        ],
        proof_nl: [
            "Apply Dramatic_Irony theorem to explain function",
            "The audience possesses knowledge characters lack",
            "Characters remain ignorant of crucial information",
            "Tension is created through this knowledge gap",
            "Suspense builds as audience anticipates consequences",
            "The gap between knowledge states creates ironic effect"
        ]
    },
    {
        name: "Realist Literary Technique",
        query: "What techniques define literary realism?",
        expected_nl: [
            "Realism depicts ordinary contemporary life truthfully",
            "Realist technique uses detail depicting ordinary life",
            "Detailed description, ordinary subjects, and plausibility define realism"
        ],
        proof_nl: [
            "Apply Realism_Mode theorem for basic realism",
            "Truthfulness to life is the primary goal",
            "Ordinary people and situations are depicted",
            "Contemporary society is reflected accurately",
            "Apply Realist_Technique_Full for comprehensive technique",
            "Minute detail creates verisimilitude",
            "Plausibility is maintained throughout",
            "Social issues are addressed realistically",
            "Objectivity is strived for in narration"
        ]
    },
    {
        name: "Satire Purpose and Method",
        query: "What is the purpose and method of satire?",
        expected_nl: [
            "Satire employs irony and ridicule to criticize and reform",
            "Satire technique uses irony and ridicule for reform",
            "Target is criticized through irony, exaggeration, and ridicule"
        ],
        proof_nl: [
            "Apply Satire_Mode theorem for satirical approach",
            "A target for criticism is identified",
            "Criticism is delivered through ridicule and irony",
            "Reform or change is the ultimate purpose",
            "Apply Satire_Full_Technique for complete method",
            "Irony reveals contradictions and absurdities",
            "Exaggeration highlights flaws and problems",
            "Wit makes the criticism entertaining and memorable",
            "Critical stance aims at social or moral improvement"
        ]
    },
    {
        name: "First Person Point of View",
        query: "What are the characteristics of first-person point of view?",
        expected_nl: [
            "First-person POV uses I narration with subjective perspective",
            "The narrator uses 'I' creating subjective intimacy",
            "Limited knowledge and potential bias characterize first-person"
        ],
        proof_nl: [
            "Apply First_Person_POV theorem for perspective analysis",
            "The narrator uses 'I' pronoun throughout",
            "Perspective is inherently subjective",
            "Knowledge is limited to narrator's experience",
            "Intimacy is created with reader",
            "Bias may color the narration",
            "Personal narrative voice is established"
        ]
    },
    {
        name: "Allegory Structure",
        query: "How does allegory structure meaning in literature?",
        expected_nl: [
            "Allegory is extended metaphor with systematic moral meaning",
            "Extended metaphor creates systematic correspondence to moral meaning",
            "Narrative surface and deeper meaning correspond systematically"
        ],
        proof_nl: [
            "Apply Allegory_Device theorem for allegorical structure",
            "Allegory extends metaphor throughout entire work",
            "Narrative surface tells one story",
            "Deeper meaning conveys another level",
            "Moral or philosophical truth is communicated",
            "Systematic correspondence connects surface to depth",
            "Interpretation reveals the allegorical meaning"
        ]
    },
    {
        name: "Character Arc Development",
        query: "What constitutes effective character arc development?",
        expected_nl: [
            "Dynamic characters undergo change and growth over time",
            "Character complexity involves traits, motivation, and development",
            "Change, growth, and transformation define character arcs"
        ],
        proof_nl: [
            "Apply Dynamic_Character theorem for character change",
            "The character undergoes significant change",
            "Growth occurs through experiences and challenges",
            "Character arc traces the development trajectory",
            "Apply Character_Complexity for depth analysis",
            "Multiple traits create realistic complexity",
            "Complex motivation drives behavior",
            "Internal conflict provides depth",
            "Psychological depth enhances believability"
        ]
    },
    {
        name: "Gothic Fiction Elements",
        query: "What elements combine to create gothic fiction?",
        expected_nl: [
            "Gothic fiction combines mystery, horror, and supernatural elements",
            "Dark atmosphere, mystery, supernatural, gothic setting, and terror define gothic",
            "Mystery, horror, supernatural, and dark romance create gothic fiction"
        ],
        proof_nl: [
            "Apply Gothic_Fiction theorem for gothic elements",
            "Dark atmosphere pervades the work",
            "Mystery creates suspense and uncertainty",
            "Supernatural elements introduce otherworldly dimension",
            "Gothic settings (castles, ruins) provide backdrop",
            "Terror is evoked in readers",
            "These combine to create dark romance mode"
        ]
    },
    {
        name: "Thematic Development Process",
        query: "How are themes developed in literary works?",
        expected_nl: [
            "Thematic development uses symbols and motifs for meaning",
            "Theme is introduced and reinforced through symbols, motifs, and patterns",
            "Symbols, motifs, and patterns build to create thematic meaning"
        ],
        proof_nl: [
            "Apply Thematic_Development theorem for theme building",
            "Central theme is introduced early in work",
            "Symbols are used to represent thematic ideas",
            "Motifs recur to reinforce theme",
            "Patterns emerge through repetition and variation",
            "Meaning builds cumulatively through these elements",
            "Reinforcement creates thematic unity",
            "Overall thematic coherence is achieved"
        ]
    },
    {
        name: "Modernist Consciousness Exploration",
        query: "How does modernist literature explore consciousness?",
        expected_nl: [
            "Stream of consciousness captures unfiltered thought flow",
            "Modernism experiments with fragmented forms and consciousness",
            "Interior flow, association, disrupted time, and memory capture consciousness"
        ],
        proof_nl: [
            "Apply Modernism_Movement for modernist approach",
            "Stream of consciousness technique is employed",
            "Fragmentation reflects mental processes",
            "Apply Stream_Consciousness_Full for technique details",
            "Interior thoughts are captured directly",
            "Unbroken flow mimics actual consciousness",
            "Associative logic connects thoughts naturally",
            "Time is disrupted matching mental experience",
            "Memory is woven into present consciousness",
            "Psychological realism is achieved"
        ]
    },
    {
        name: "Foreshadowing Technique",
        query: "How does foreshadowing work as a narrative technique?",
        expected_nl: [
            "Foreshadowing provides hints about future events",
            "Hints point to future events creating anticipation and suspense",
            "Reader preparation and suspense building define foreshadowing"
        ],
        proof_nl: [
            "Apply Foreshadowing_Device theorem for technique analysis",
            "Hints are provided early in narrative",
            "Future events are suggested without full revelation",
            "Anticipation is created in reader",
            "Suspense builds toward foreshadowed events",
            "Reader is prepared for later developments",
            "Anticipatory effect enhances narrative engagement"
        ]
    },
    {
        name: "Omniscient Narration",
        query: "What capabilities does omniscient narration provide?",
        expected_nl: [
            "Third-person omniscient provides all-knowing comprehensive perspective",
            "Unlimited knowledge accesses multiple characters and can be objective",
            "All-knowing perspective provides comprehensive narrative scope"
        ],
        proof_nl: [
            "Apply Third_Person_Omniscient_POV theorem for narration type",
            "The narrator is all-knowing",
            "Multiple characters' perspectives are accessed",
            "Objectivity is possible though not required",
            "Knowledge is unlimited across time and space",
            "God-like perspective provides comprehensive view",
            "Complete narrative scope is achieved"
        ]
    },
    {
        name: "Frame Narrative Structure",
        query: "How does frame narrative structure work?",
        expected_nl: [
            "Frame narratives embed stories within outer story frames",
            "Outer story contains inner story creating nested narrative levels",
            "Multiple levels and narrative distance characterize frame structure"
        ],
        proof_nl: [
            "Apply Frame_Narrative theorem for structure analysis",
            "Outer story establishes framing narrative",
            "Inner story is embedded within frame",
            "Stories are nested creating multiple levels",
            "Distance is created between narrative levels",
            "Embedded structure allows complex storytelling"
        ]
    },
    {
        name: "Tragic Catharsis",
        query: "How does tragedy achieve catharsis?",
        expected_nl: [
            "Tragic structure includes hero, flaw, recognition, and catharsis",
            "Pity and fear are evoked leading to catharsis",
            "Suffering, recognition, and emotional release create cathartic effect"
        ],
        proof_nl: [
            "Apply Tragedy_Genre theorem for tragic effect",
            "Tragic hero is established with nobility",
            "Tragic flaw leads to inevitable downfall",
            "Suffering is depicted powerfully",
            "Catharsis is produced through witnessing downfall",
            "Pity is evoked for the tragic hero",
            "Fear is evoked for similar fate",
            "Apply Tragic_Structure_Complete for full process",
            "Recognition and reversal intensify effect",
            "Emotional release (catharsis) is achieved"
        ]
    },
    {
        name: "Intertextuality Function",
        query: "How does intertextuality function in literature?",
        expected_nl: [
            "Intertextual relations reference other texts through allusion",
            "References to other texts create dialogue and enrich context",
            "Allusion, reference, and dialogue create textual network"
        ],
        proof_nl: [
            "Apply Intertextual_Relations theorem for intertextual analysis",
            "The work references other texts explicitly or implicitly",
            "Allusions are made to cultural or literary material",
            "Dialogue is created between texts across time",
            "Context is enriched through these connections",
            "Layers of meaning are added through references",
            "Textual network connects works in tradition"
        ]
    },
    {
        name: "Lyric Poetry Expression",
        query: "What characterizes lyric poetry?",
        expected_nl: [
            "Lyric poetry expresses personal emotions through musical language",
            "Personal voice and musicality create subjective expression",
            "Emotion, personal voice, and musicality define lyric mode"
        ],
        proof_nl: [
            "Apply Lyric_Poetry theorem for lyric characteristics",
            "The speaker expresses personal emotion",
            "Musical quality is present in language",
            "Personal voice is emphasized",
            "Subjective expression is central",
            "These elements combine for lyric effect"
        ]
    },
    {
        name: "Comedy Structure and Purpose",
        query: "What is the structure and purpose of comedy?",
        expected_nl: [
            "Comedy uses humor to address social issues with happy endings",
            "Humor, conflict resolution, and social commentary define comedy",
            "Happy resolution following conflict creates joy and social critique"
        ],
        proof_nl: [
            "Apply Comedy_Genre theorem for comic structure",
            "Humor is employed throughout the work",
            "Conflict is presented but leads to resolution",
            "Happy resolution concludes the action",
            "Social issues are addressed through humor",
            "Joy is created for audience",
            "Comic effect combines entertainment with critique"
        ]
    },
    {
        name: "Personification Effect",
        query: "What effect does personification create?",
        expected_nl: [
            "Personification gives human qualities to non-human things",
            "Human traits attributed to non-human create vivid imagery",
            "Animation of inanimate creates anthropomorphic effect"
        ],
        proof_nl: [
            "Apply Personification_Device theorem for technique",
            "Human traits are attributed to non-human entities",
            "Non-human subjects receive human qualities",
            "Vivid imagery is created through humanization",
            "Inanimate objects are animated",
            "Anthropomorphic device makes abstract concrete"
        ]
    },
    {
        name: "Novel Form Characteristics",
        query: "What characterizes the novel as a literary form?",
        expected_nl: [
            "Novels are extended prose narratives with complex plots",
            "Extended length, prose form, complex plot, and developed characters define novels",
            "Extended fiction allows comprehensive character and plot development"
        ],
        proof_nl: [
            "Apply Novel_Form theorem for novel characteristics",
            "The work uses prose rather than verse",
            "Extended length allows development",
            "Plot is complex with multiple threads",
            "Characters are fully developed",
            "These elements create extended fiction form"
        ]
    },
    {
        name: "Magical Realism Technique",
        query: "What defines magical realism as a literary technique?",
        expected_nl: [
            "Magical realism blends magic seamlessly into realistic settings",
            "Realistic setting with magical elements presented matter-of-factly creates hybrid mode",
            "Seamless integration of magic and reality defines the technique"
        ],
        proof_nl: [
            "Apply Magical_Realism theorem for technique definition",
            "Realistic setting provides grounded backdrop",
            "Magical elements are included naturally",
            "Magic is presented matter-of-factly without explanation",
            "Reality and magic are blended seamlessly",
            "Seamless integration creates unique hybrid mode"
        ]
    },
    {
        name: "Imagery Creation",
        query: "How does imagery function in literary works?",
        expected_nl: [
            "Imagery uses sensory details to create vivid experiences",
            "Sensory details and vivid description create experiential language",
            "Concrete sensory details produce vivid reader experience"
        ],
        proof_nl: [
            "Apply Imagery_Device theorem for imagery analysis",
            "Sensory details are employed (visual, auditory, tactile, etc.)",
            "Visual images are created through description",
            "Vivid quality brings scenes to life",
            "Experience is created for reader",
            "Concrete details ground abstract ideas",
            "Descriptive language engages senses"
        ]
    },
    {
        name: "Postcolonial Criticism Focus",
        query: "What does postcolonial criticism examine in literature?",
        expected_nl: [
            "Postcolonial criticism examines empire, identity, and resistance",
            "Empire, otherness, identity, power, and resistance are analyzed",
            "Colonial power relations and resistance strategies are examined"
        ],
        proof_nl: [
            "Apply Postcolonial_Criticism theorem for critical approach",
            "Empire and colonial history are examined",
            "Otherness and how colonized are represented is analyzed",
            "Identity formation under colonialism is studied",
            "Colonial power structures are critiqued",
            "Resistance to colonial domination is explored",
            "Colonial analysis reveals power dynamics"
        ]
    },
    {
        name: "Soliloquy Dramatic Function",
        query: "What is the dramatic function of a soliloquy?",
        expected_nl: [
            "Soliloquy presents character speaking thoughts alone",
            "Character alone speaks thoughts aloud to audience revealing interior",
            "Direct revelation of thoughts to audience while alone defines soliloquy"
        ],
        proof_nl: [
            "Apply Soliloquy_Device theorem for dramatic technique",
            "Character is alone on stage",
            "Character speaks aloud despite being alone",
            "Interior thoughts are revealed directly",
            "Audience is addressed or overhears",
            "Interior state becomes accessible",
            "Solo speech reveals character psychology"
        ]
    },
    {
        name: "Blank Verse Characteristics",
        query: "What are the characteristics of blank verse?",
        expected_nl: [
            "Blank verse is unrhymed iambic pentameter",
            "Unrhymed iambic pentameter with elevated style creates dramatic verse",
            "Flexibility and natural sound characterize blank verse"
        ],
        proof_nl: [
            "Apply Blank_Verse theorem for verse form",
            "The verse is unrhymed throughout",
            "Iambic pentameter provides metrical structure",
            "Elevated style suits serious subjects",
            "Flexibility allows natural speech patterns",
            "Natural-sounding despite metrical constraint",
            "Dramatic verse form widely used in theater"
        ]
    },
    {
        name: "Protagonist Role",
        query: "What role does the protagonist play in narrative?",
        expected_nl: [
            "Protagonists are central characters who drive stories forward",
            "Central role, drive, main conflict, and change define protagonist",
            "The main character engages reader and drives narrative"
        ],
        proof_nl: [
            "Apply Protagonist_Role theorem for character function",
            "Protagonist has central role in narrative",
            "Character's drive motivates action",
            "Main conflict centers on protagonist",
            "Character undergoes change or development",
            "Reader engagement focuses on protagonist",
            "Main character status drives plot forward"
        ]
    },
    {
        name: "Romanticism vs Enlightenment",
        query: "How does Romanticism differ from Enlightenment literature?",
        expected_nl: [
            "Romantic period celebrates emotion, nature, and imagination",
            "Enlightenment period emphasizes reason, science, and progress",
            "Romanticism reacts against Enlightenment rationalism"
        ],
        proof_nl: [
            "Apply Romantic_Period theorem for Romantic characteristics",
            "Emotion is emphasized in Romantic literature",
            "Nature is celebrated and idealized",
            "Imagination is prized over reason",
            "Reaction against Enlightenment is explicit",
            "Apply Enlightenment_Period for contrast",
            "Reason is emphasized in Enlightenment",
            "Science and progress are valued",
            "Rational approach dominates Enlightenment",
            "The periods represent opposing values"
        ]
    },
    {
        name: "Juxtaposition Effect",
        query: "What effect does juxtaposition create in literature?",
        expected_nl: [
            "Juxtaposition places elements in contrast for effect",
            "Contrast and comparison highlight differences and emphasize qualities",
            "Placing elements side-by-side creates contrastive effect"
        ],
        proof_nl: [
            "Apply Juxtaposition_Technique theorem for technique analysis",
            "Elements are placed in contrast deliberately",
            "Comparison is created through proximity",
            "Specific effect results from contrast",
            "Differences are highlighted through juxtaposition",
            "Qualities are emphasized by comparison",
            "Contrastive technique enhances meaning"
        ]
    },
    {
        name: "Irony Types and Effects",
        query: "How does irony function to create meaning?",
        expected_nl: [
            "Irony creates contrast between expectation and reality",
            "Contrast between expectation and reality showing opposite creates ironic effect",
            "Dramatic irony creates tension through audience knowledge"
        ],
        proof_nl: [
            "Apply Irony_Device theorem for ironic technique",
            "Contrast is central to irony",
            "Expectation is established in reader",
            "Reality contradicts expectation",
            "Opposite of expected is revealed",
            "Ironic effect results from gap",
            "Apply Dramatic_Irony for specific type",
            "Audience knowledge exceeds character knowledge",
            "Tension builds from knowledge gap"
        ]
    },
    {
        name: "Short Story Unity",
        query: "What creates unity in a short story?",
        expected_nl: [
            "Short stories are brief narratives focused on single effects",
            "Brief length, single focus, unified effect, and condensation create compact narrative",
            "Unity of effect defines short story form"
        ],
        proof_nl: [
            "Apply Short_Story theorem for form analysis",
            "Brief length constrains scope",
            "Single focus concentrates narrative",
            "Unified effect is the goal",
            "Condensation eliminates non-essential elements",
            "Compact narrative achieves intensity",
            "Unity is maintained through brevity and focus"
        ]
    },
    {
        name: "Psychoanalytic Criticism Approach",
        query: "What does psychoanalytic criticism analyze in literature?",
        expected_nl: [
            "Psychoanalytic criticism examines unconscious desires and symbols",
            "Unconscious, desire, symbols, dreams, and repression are analyzed",
            "Psychological analysis reveals hidden meanings and motivations"
        ],
        proof_nl: [
            "Apply Psychoanalytic_Criticism theorem for critical method",
            "Unconscious motivations are examined in characters",
            "Desire and its sublimation are analyzed",
            "Symbols are interpreted psychologically",
            "Dreams and dream-like sequences are studied",
            "Repression and its effects are explored",
            "Psychological analysis reveals hidden dimensions"
        ]
    }
];
