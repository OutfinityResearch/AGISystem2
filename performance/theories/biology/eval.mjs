/**
 * Biology Theory - Evaluation Cases
 *
 * Complex queries and proofs requiring deep reasoning.
 * Each case has:
 *   - input_nl: Natural language question
 *   - input_dsl: DSL query
 *   - expected_nl: Expected result (natural language)
 *   - proof_nl: Array of proof steps (natural language)
 */

export const name = 'Biology';
export const description = 'Taxonomy, cell biology, genetics, ecology, physiology, evolution - deep reasoning tests';
export const min_complex = 76;

export const cases = [
  // =============================================================================
  // TAXONOMY DEEP CHAIN PROOFS (8-10 steps)
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that Homo sapiens belongs to Domain Eukarya',
    input_dsl: '@goal memberOfDomain HomoSapiens Eukarya',
    expected_nl: 'True: Homo sapiens belongs to Domain Eukarya',
    proof_nl: [
      'Given: HomoSapiens isA Species in Genus Homo',
      'By Taxonomy_Transitivity: Homo belongsTo Family Hominidae',
      'By Taxonomy_Transitivity: Hominidae belongsTo Order Primates',
      'By Taxonomy_Transitivity: Primates belongsTo Class Mammalia',
      'By Taxonomy_Transitivity: Mammalia belongsTo Phylum Chordata',
      'By Taxonomy_Transitivity: Chordata belongsTo Kingdom Animalia',
      'By Kingdom_Eukarya_Animalia: Animalia belongsTo Domain Eukarya',
      'By transitive chain: HomoSapiens belongs to Eukarya'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that a lion (Panthera leo) is a Chordate',
    input_dsl: '@goal belongsTo PantheraLeo Chordata',
    expected_nl: 'True: A lion is a Chordate',
    proof_nl: [
      'Given: PantheraLeo isA Species in Genus Panthera',
      'By Species_Panthera_Leo: Panthera leo belongsTo Genus Panthera',
      'By Genus_Felidae_Panthera: Panthera belongsTo Family Felidae',
      'By Family_Carnivora_Felidae: Felidae belongsTo Order Carnivora',
      'By Order_Mammalia_Carnivora: Carnivora belongsTo Class Mammalia',
      'By Class_Chordata_Mammalia: Mammalia belongsTo Phylum Chordata',
      'By transitive chain: PantheraLeo belongs to Chordata'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that a butterfly belongs to Kingdom Animalia',
    input_dsl: '@goal belongsTo Lepidoptera Animalia',
    expected_nl: 'True: Butterflies belong to Kingdom Animalia',
    proof_nl: [
      'Given: Lepidoptera isA Order (butterflies and moths)',
      'By Order_Insecta_Lepidoptera: Lepidoptera belongsTo Class Insecta',
      'By Class_Arthropoda_Insecta: Insecta belongsTo Phylum Arthropoda',
      'By Phylum_Animal_Arthropoda: Arthropoda belongsTo Kingdom Animalia',
      'By transitive chain: Lepidoptera belongs to Animalia'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that humans and chimpanzees share a common ancestor',
    input_dsl: '@goal shareCommonAncestor HomoSapiens PanTroglodytes',
    expected_nl: 'True: Humans and chimpanzees share a common ancestor',
    proof_nl: [
      'Given: HomoSapiens belongsTo Genus Homo',
      'Given: PanTroglodytes belongsTo Genus Pan',
      'By Genus_Hominidae_Homo: Homo belongsTo Family Hominidae',
      'By Genus_Hominidae_Pan: Pan belongsTo Family Hominidae',
      'By Common_Ancestor_Inference: organisms in same Family share ancestor',
      'The common ancestor of Hominidae lived approximately 6-7 million years ago',
      'Apply molecular evidence: 98.8% DNA similarity confirms relationship',
      'Therefore: HomoSapiens and PanTroglodytes share a common ancestor'
    ]
  },

  // =============================================================================
  // CELL BIOLOGY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that mitochondria are involved in ATP production',
    input_dsl: '@goal hasFunction Mitochondrion ATP_production',
    expected_nl: 'True: Mitochondria produce ATP',
    proof_nl: [
      'By Organelle_Mitochondrion graph: Mitochondrion hasFunction ATP_production',
      'Mitochondria contain the electron transport chain',
      'The electron transport chain generates a proton gradient',
      'ATP synthase uses the proton gradient to produce ATP',
      'This process is called oxidative phosphorylation',
      'Each glucose molecule yields approximately 30-32 ATP via mitochondria',
      'Therefore: Mitochondria are the primary site of ATP production'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that chloroplasts are only found in plant cells',
    input_dsl: '@goal foundIn Chloroplast PlantCell',
    expected_nl: 'True: Chloroplasts are found in plant cells',
    proof_nl: [
      'By Organelle_Chloroplast graph: Chloroplast foundIn PlantCell',
      'Chloroplasts perform photosynthesis',
      'Photosynthesis requires light-harvesting pigments (chlorophyll)',
      'Animal cells do not contain chloroplasts',
      'Animal cells lack the ability to photosynthesize',
      'This is a fundamental distinction between plant and animal cells',
      'Therefore: Chloroplasts are specific to plant cells (and some algae)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that mitosis produces identical daughter cells',
    input_dsl: '@goal producesResult Mitosis two_identical_cells',
    expected_nl: 'True: Mitosis produces two identical daughter cells',
    proof_nl: [
      'By Process_Mitosis graph: Mitosis produces two_identical_cells',
      'During S phase, DNA is replicated',
      'During prophase, chromosomes condense',
      'During metaphase, chromosomes align at the cell equator',
      'During anaphase, sister chromatids separate to opposite poles',
      'During telophase, nuclear envelopes reform',
      'Cytokinesis divides the cytoplasm',
      'Each daughter cell receives identical copies of chromosomes',
      'Therefore: Mitosis produces two genetically identical cells'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that meiosis produces haploid cells',
    input_dsl: '@goal producesResult Meiosis four_haploid_cells',
    expected_nl: 'True: Meiosis produces four haploid cells',
    proof_nl: [
      'By Process_Meiosis graph: Meiosis produces four_haploid_cells',
      'Meiosis involves two rounds of division (Meiosis I and II)',
      'Meiosis I separates homologous chromosomes (reductional)',
      'Meiosis II separates sister chromatids (equational)',
      'One diploid cell (2n) undergoes division twice',
      'Result: 4 cells, each with half the chromosome number (n)',
      'Crossing over during prophase I increases genetic variation',
      'Therefore: Meiosis produces four haploid cells with unique genotypes'
    ]
  },

  // =============================================================================
  // GENETICS PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove the Central Dogma of molecular biology',
    input_dsl: '@goal informationFlow DNA RNA Protein',
    expected_nl: 'True: Information flows from DNA to RNA to Protein',
    proof_nl: [
      'By Central_Dogma graph: informationFlow is DNA→RNA→Protein',
      'DNA stores genetic information in nucleotide sequences',
      'Transcription converts DNA to mRNA in the nucleus',
      'RNA polymerase catalyzes transcription',
      'mRNA is exported to the cytoplasm',
      'Translation converts mRNA to protein at ribosomes',
      'tRNA brings amino acids according to codon sequence',
      'The genetic code specifies amino acid for each codon',
      'Therefore: Information flows DNA → RNA → Protein'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that AUG is the start codon',
    input_dsl: '@goal startCodon GeneticCode AUG',
    expected_nl: 'True: AUG is the start codon',
    proof_nl: [
      'By Genetic_Code graph: startCodon GeneticCode AUG',
      'AUG codes for methionine (Met)',
      'Translation initiation requires AUG recognition',
      'The initiator tRNA carries methionine',
      'AUG sets the reading frame for translation',
      'Nearly all proteins begin with methionine',
      'This is universal across almost all organisms',
      'Therefore: AUG is the universal start codon'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that a frameshift mutation alters the entire protein',
    input_dsl: '@goal hasEffect FrameshiftMutation altered_protein',
    expected_nl: 'True: Frameshift mutations alter the entire protein sequence',
    proof_nl: [
      'By Mutation_Frameshift graph: FrameshiftMutation hasEffect altered_protein',
      'Frameshift is caused by insertion or deletion (not multiple of 3)',
      'The reading frame shifts from the mutation point onward',
      'All subsequent codons are misread',
      'This typically produces a completely different amino acid sequence',
      'Often a premature stop codon is encountered',
      'The resulting protein is usually non-functional',
      'Therefore: Frameshift mutations severely alter protein structure'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that crossing Aa x Aa gives 3:1 phenotype ratio',
    input_dsl: '@goal apply Mendelian_Ratio_Inference Aa Aa',
    expected_nl: 'True: Aa x Aa cross yields 3:1 phenotype ratio',
    proof_nl: [
      'By Mendelian_Inheritance: Aa genotype is heterozygous',
      'Each parent produces gametes: 50% A, 50% a',
      'Punnett square: AA (25%), Aa (50%), aa (25%)',
      'Genotype ratio: 1 AA : 2 Aa : 1 aa',
      'If A is dominant: AA and Aa show dominant phenotype',
      'Only aa shows recessive phenotype',
      'Phenotype ratio: 3 dominant : 1 recessive',
      'This is Mendel\'s famous 3:1 ratio for monohybrid cross'
    ]
  },

  // =============================================================================
  // ECOLOGY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that predation benefits predators and harms prey',
    input_dsl: '@goal effectOnPredator Predation positive',
    expected_nl: 'True: Predation benefits predators (+/-)',
    proof_nl: [
      'By Relationship_Predation graph: effectOnPredator Predation positive',
      'Predators consume prey for energy and nutrients',
      'This provides essential resources for predator survival',
      'By Relationship_Predation: effectOnPrey Predation negative',
      'Prey individuals are killed and consumed',
      'This reduces prey population fitness',
      'Predation is characterized as a +/- interaction',
      'Therefore: Predation benefits predators and harms prey'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that only 10% of energy transfers between trophic levels',
    input_dsl: '@goal energyTransfer TenPercentRule 10_percent',
    expected_nl: 'True: Only 10% of energy transfers between levels',
    proof_nl: [
      'By Energy_Transfer graph: energyTransfer is 10_percent',
      'Organisms use most consumed energy for metabolism',
      'Approximately 90% is lost as heat during cellular respiration',
      'Only about 10% is converted to biomass',
      'This biomass is available to the next trophic level',
      'This explains why food chains are typically 4-5 levels',
      'Energy pyramids show decreasing energy at each level',
      'Therefore: The 10% rule limits ecosystem energy transfer'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that nitrogen fixation converts N2 to ammonia',
    input_dsl: '@goal nitrogenFixation NitrogenCycle N2_to_NH3',
    expected_nl: 'True: Nitrogen fixation converts N2 to NH3',
    proof_nl: [
      'By Nitrogen_Cycle graph: nitrogenFixation converts N2_to_NH3',
      'Atmospheric nitrogen (N2) has a triple bond',
      'Most organisms cannot break this bond',
      'Nitrogen-fixing bacteria (e.g., Rhizobium) have nitrogenase enzyme',
      'Nitrogenase catalyzes: N2 + 8H+ + 8e- → 2NH3 + H2',
      'Some bacteria are free-living, others are symbiotic in root nodules',
      'Ammonia can then be used by plants for amino acid synthesis',
      'Therefore: Nitrogen fixation is essential for biological nitrogen uptake'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that competition leads to competitive exclusion',
    input_dsl: '@goal outcome CompetitiveExclusionPrinciple one_species_excluded',
    expected_nl: 'True: Competition leads to exclusion of one species',
    proof_nl: [
      'By Competitive_Exclusion_Principle graph: outcome is one_species_excluded',
      'Two species competing for the same limited resource',
      'The species with even slight advantage will outcompete',
      'Over time, the inferior competitor is eliminated',
      'This was demonstrated by Gause with Paramecium species',
      'Alternative outcome: niche differentiation allows coexistence',
      'Species partition resources to reduce competition',
      'Therefore: Complete competitors cannot coexist indefinitely'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that primary succession starts on bare rock',
    input_dsl: '@goal startsOn PrimarySuccession bare_substrate',
    expected_nl: 'True: Primary succession starts on bare substrate',
    proof_nl: [
      'By Ecological_Succession_Primary graph: startsOn bare_substrate',
      'Primary succession occurs where no soil exists',
      'Examples: volcanic rock, glacial retreat, bare rock',
      'Pioneer species (lichens, mosses) colonize first',
      'Lichens break down rock, beginning soil formation',
      'As soil develops, larger plants can establish',
      'The process takes hundreds to thousands of years',
      'Climax community eventually develops',
      'Therefore: Primary succession begins on bare, lifeless substrate'
    ]
  },

  // =============================================================================
  // PHYSIOLOGY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that the nervous system uses electrical signals',
    input_dsl: '@goal signalType NervousSystem electrical_and_chemical',
    expected_nl: 'True: The nervous system uses electrical and chemical signals',
    proof_nl: [
      'By System_Nervous graph: signalType is electrical_and_chemical',
      'Neurons generate action potentials (electrical signals)',
      'Action potentials propagate along axons',
      'At synapses, signals convert to chemical (neurotransmitters)',
      'Neurotransmitters cross the synaptic cleft',
      'They bind receptors on the postsynaptic membrane',
      'This can trigger a new action potential',
      'Therefore: Nervous signaling is electrochemical'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that negative feedback maintains homeostasis',
    input_dsl: '@goal reverses NegativeFeedback change_from_setpoint',
    expected_nl: 'True: Negative feedback reverses deviations from setpoint',
    proof_nl: [
      'By Negative_Feedback graph: NegativeFeedback reverses change_from_setpoint',
      'A sensor detects deviation from the normal setpoint',
      'The control center (often hypothalamus) processes the signal',
      'Effectors are activated to counteract the change',
      'If too high, response brings value down',
      'If too low, response brings value up',
      'Example: thermoregulation maintains 37°C body temperature',
      'This is the most common type of biological feedback',
      'Therefore: Negative feedback is essential for homeostasis'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that action potentials follow the all-or-none principle',
    input_dsl: '@goal followsAllOrNone ActionPotential true',
    expected_nl: 'True: Action potentials follow all-or-none principle',
    proof_nl: [
      'By Action_Potential graph: ActionPotential followsAllOrNone true',
      'The threshold potential is approximately -55mV',
      'Subthreshold stimuli do not produce action potentials',
      'Once threshold is reached, full action potential occurs',
      'The amplitude is always the same (about +40mV peak)',
      'Stronger stimuli do not produce larger action potentials',
      'Information is encoded in frequency, not amplitude',
      'Therefore: Action potentials are all-or-none events'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that adaptive immunity has memory',
    input_dsl: '@goal hasMemory AdaptiveImmunity true',
    expected_nl: 'True: Adaptive immunity has immunological memory',
    proof_nl: [
      'By Adaptive_Immunity graph: AdaptiveImmunity hasMemory true',
      'B cells differentiate into plasma cells and memory B cells',
      'T cells differentiate into effector and memory T cells',
      'Memory cells persist long after infection clears',
      'Upon reinfection, memory cells respond faster and stronger',
      'This is the secondary immune response',
      'Vaccines work by creating memory without disease',
      'Therefore: Adaptive immunity provides long-lasting protection'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that insulin lowers blood glucose',
    input_dsl: '@goal highGlucoseResponse GlucoseRegulation insulin_release',
    expected_nl: 'True: High glucose triggers insulin release',
    proof_nl: [
      'By Blood_Glucose_Regulation graph: highGlucoseResponse is insulin_release',
      'Beta cells in pancreatic islets sense blood glucose',
      'High glucose stimulates insulin secretion',
      'Insulin binds receptors on target cells',
      'This increases glucose uptake (especially muscle and fat)',
      'Liver increases glycogen synthesis',
      'Blood glucose levels decrease toward normal (70-100 mg/dL)',
      'Therefore: Insulin is the hormone that lowers blood glucose'
    ]
  },

  // =============================================================================
  // EVOLUTION PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that natural selection requires variation',
    input_dsl: '@goal requires NaturalSelection variation',
    expected_nl: 'True: Natural selection requires variation',
    proof_nl: [
      'By Natural_Selection graph: NaturalSelection requires variation',
      'Without variation, all individuals are identical',
      'Identical individuals have equal fitness',
      'No differential survival or reproduction can occur',
      'Selection cannot favor one form over another',
      'Variation provides the raw material for selection',
      'Mutation and recombination generate variation',
      'Therefore: Variation is essential for natural selection to occur'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that allopatric speciation requires geographic isolation',
    input_dsl: '@goal requiresBarrier AllopatricSpeciation geographic',
    expected_nl: 'True: Allopatric speciation requires geographic barriers',
    proof_nl: [
      'By Speciation_Allopatric graph: requiresBarrier is geographic',
      'A geographic barrier divides the population',
      'Examples: mountains, rivers, ocean, glaciers',
      'The separated populations evolve independently',
      'Gene flow between populations is prevented',
      'Different selection pressures and genetic drift',
      'Over time, reproductive isolation develops',
      'If reunited, they can no longer interbreed',
      'Example: Darwin\'s finches on Galapagos islands',
      'Therefore: Geographic isolation drives allopatric speciation'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that homologous structures indicate common ancestry',
    input_dsl: '@goal homologousStructures ComparativeAnatomy common_ancestry',
    expected_nl: 'True: Homologous structures indicate common ancestry',
    proof_nl: [
      'By Comparative_Anatomy graph: homologousStructures indicate common_ancestry',
      'Homologous structures have similar underlying anatomy',
      'They may have different functions in different species',
      'Example: human arm, whale flipper, bat wing, dog leg',
      'All share the same bone pattern (humerus, radius, ulna)',
      'This pattern is inherited from a common ancestor',
      'Modification occurred as lineages adapted to different niches',
      'The underlying similarity reflects shared evolutionary history',
      'Therefore: Homology is evidence of common descent'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that genetic drift is stronger in small populations',
    input_dsl: '@goal greaterEffectIn GeneticDrift small_populations',
    expected_nl: 'True: Genetic drift has greater effect in small populations',
    proof_nl: [
      'By Genetic_Drift graph: greaterEffectIn is small_populations',
      'Genetic drift is random sampling of alleles',
      'In large populations, random effects average out',
      'In small populations, chance has larger effect',
      'A single death can significantly change allele frequencies',
      'Bottleneck effect: population reduction amplifies drift',
      'Founder effect: new population from few individuals',
      'Both result in reduced genetic diversity',
      'Therefore: Small populations are more susceptible to drift'
    ]
  },

  // =============================================================================
  // BIOLOGICAL LAWS AND PRINCIPLES
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove Cell Theory: all cells come from pre-existing cells',
    input_dsl: '@goal tenet CellTheory cells_arise_from_preexisting_cells',
    expected_nl: 'True: All cells arise from pre-existing cells',
    proof_nl: [
      'By Cell_Theory graph: tenet is cells_arise_from_preexisting_cells',
      'This was established by Rudolf Virchow (1858)',
      'Cells reproduce through division (mitosis or meiosis)',
      'There is no observed spontaneous generation of cells',
      'Pasteur\'s experiments disproved spontaneous generation',
      'The cell division process is highly conserved',
      'DNA replication ensures genetic continuity',
      'Therefore: Omnis cellula e cellula (every cell from a cell)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Hardy-Weinberg requires no selection',
    input_dsl: '@goal requires HardyWeinbergEquilibrium no_selection',
    expected_nl: 'True: Hardy-Weinberg equilibrium requires no selection',
    proof_nl: [
      'By Hardy_Weinberg_Principle graph: requires no_selection',
      'Hardy-Weinberg describes a non-evolving population',
      'Allele frequencies remain constant across generations',
      'The equation is: p² + 2pq + q² = 1',
      'This requires five conditions:',
      'No mutation, no migration, no selection, random mating, large population',
      'If selection occurs, some genotypes are favored',
      'Allele frequencies will change (evolution)',
      'Therefore: Selection violates Hardy-Weinberg equilibrium'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that endotherms are larger at higher latitudes (Bergmann\'s Rule)',
    input_dsl: '@goal states BergmannsRule body_size_increases_with_latitude',
    expected_nl: 'True: Body size increases with latitude in endotherms',
    proof_nl: [
      'By Bergmanns_Rule graph: body_size_increases_with_latitude',
      'Surface area to volume ratio decreases with body size',
      'Larger animals have relatively less surface area',
      'Heat loss occurs through the body surface',
      'In cold climates, reducing heat loss is advantageous',
      'Larger body size helps conserve heat',
      'Example: polar bears are larger than tropical bears',
      'This is an adaptation to thermal regulation',
      'Therefore: Bergmann\'s Rule predicts larger size in colder regions'
    ]
  },

  // =============================================================================
  // NEGATIVE TESTS (should fail)
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Can a mammal photosynthesize? (should fail)',
    input_dsl: '@goal performs Mammalia photosynthesis',
    expected_nl: 'Cannot prove: Mammals do not photosynthesize',
    proof_nl: [
      'Search: Mammalia isA Class in Phylum Chordata',
      'Mammals are heterotrophs (consume organic matter)',
      'Photosynthesis requires chloroplasts',
      'Chloroplasts are only found in plants and algae',
      'Animal cells lack chloroplasts',
      'No pathway from Mammalia to photosynthetic capability',
      'Cannot establish photosynthesis in mammals'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is DNA single stranded? (should fail)',
    input_dsl: '@goal hasStructure DNA single_stranded',
    expected_nl: 'Cannot prove: DNA is double stranded, not single',
    proof_nl: [
      'By DNA_Structure graph: DNA hasStructure double_helix',
      'DNA consists of two antiparallel strands',
      'The strands are held together by hydrogen bonds',
      'Base pairing: A-T and G-C',
      'Watson and Crick model established this in 1953',
      'Single-stranded DNA only exists temporarily during replication',
      'RNA is single stranded, not DNA',
      'Cannot prove DNA is single stranded'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is the nucleus found in prokaryotes? (should fail)',
    input_dsl: '@goal foundIn Nucleus ProkaryoticCell',
    expected_nl: 'Cannot prove: Prokaryotes lack a nucleus',
    proof_nl: [
      'By definition: Prokaryotic means "before nucleus"',
      'Prokaryotic cells lack membrane-bound organelles',
      'The nucleoid region contains DNA but has no membrane',
      'The nucleus is a defining feature of eukaryotes',
      'Eukaryotic means "true nucleus"',
      'This is a fundamental distinction between cell types',
      'Cannot establish nucleus in prokaryotes'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Does meiosis produce identical cells? (should fail)',
    input_dsl: '@goal producesResult Meiosis identical_cells',
    expected_nl: 'Cannot prove: Meiosis produces non-identical cells',
    proof_nl: [
      'By Process_Meiosis graph: Meiosis produces four_haploid_cells',
      'Crossing over during prophase I shuffles genetic material',
      'Independent assortment randomizes chromosome combinations',
      'Each of the four products is genetically unique',
      'This genetic variation is the purpose of sexual reproduction',
      'Mitosis produces identical cells, not meiosis',
      'Cannot prove meiosis produces identical cells'
    ]
  },

  // =============================================================================
  // COMPLEX REASONING CHAINS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove the endosymbiotic origin of mitochondria',
    input_dsl: '@goal hasOrigin Mitochondrion endosymbiotic',
    expected_nl: 'True: Mitochondria originated through endosymbiosis',
    proof_nl: [
      'By Organelle_Mitochondrion graph: hasOrigin is endosymbiotic',
      'Mitochondria have their own circular DNA (like bacteria)',
      'Mitochondrial ribosomes resemble bacterial ribosomes',
      'Mitochondria have double membranes (engulfment signature)',
      'Mitochondria divide by binary fission (bacterial method)',
      'Phylogenetic analysis links mitochondria to alphaproteobacteria',
      'The ancestral host was likely an archaeon',
      'This symbiosis occurred approximately 2 billion years ago',
      'Lynn Margulis championed this theory',
      'Therefore: Mitochondria are descendants of endosymbiotic bacteria'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that vaccines work by creating immunological memory',
    input_dsl: '@goal applications iPSC DiseaseModeling',
    expected_nl: 'True: Vaccines create immunological memory',
    proof_nl: [
      'Vaccines introduce antigens without causing disease',
      'The adaptive immune system recognizes these antigens',
      'B cells produce antibodies against the antigens',
      'T cells develop that can attack infected cells',
      'After the response, memory cells persist',
      'By Adaptive_Immunity graph: hasMemory AdaptiveImmunity true',
      'Upon future exposure, memory cells respond rapidly',
      'The secondary response is faster and stronger',
      'This prevents or reduces disease severity',
      'Therefore: Vaccines exploit immunological memory for protection'
    ]
  },

  // =============================================================================
  // QUERIES (finding multiple results)
  // =============================================================================
  {
    action: 'query',
    input_nl: 'What organelles contain their own DNA?',
    input_dsl: '@q containsDNA ?organelle true',
    expected_nl: 'Nucleus, Mitochondria, and Chloroplasts contain DNA',
    proof_nl: [
      'By Organelle_Nucleus graph: Nucleus containsDNA true',
      'Nuclear DNA encodes most cellular proteins',
      'By Organelle_Mitochondrion graph: Mitochondrion containsDNA true',
      'Mitochondrial DNA encodes some respiratory proteins',
      'By Organelle_Chloroplast graph: Chloroplast containsDNA true',
      'Chloroplast DNA encodes some photosynthetic proteins',
      'Both organellar DNAs are circular (bacterial origin)',
      'This supports the endosymbiotic theory'
    ]
  },
  {
    action: 'query',
    input_nl: 'What are the stages of cellular respiration?',
    input_dsl: '@q hasStages CellularRespiration ?stages',
    expected_nl: 'Glycolysis, Krebs Cycle, and Electron Transport Chain',
    proof_nl: [
      'By Process_Cellular_Respiration graph: hasStages',
      'Glycolysis occurs in the cytoplasm',
      'Glycolysis converts glucose to 2 pyruvate, yielding 2 ATP',
      'Krebs Cycle (Citric Acid Cycle) occurs in mitochondrial matrix',
      'Krebs Cycle oxidizes acetyl-CoA, producing NADH and FADH2',
      'Electron Transport Chain occurs in inner mitochondrial membrane',
      'ETC creates proton gradient for ATP synthesis',
      'Total yield: approximately 30-32 ATP per glucose'
    ]
  },
  {
    action: 'query',
    input_nl: 'What mechanisms drive evolution?',
    input_dsl: '@q isA ?x EvolutionaryMechanism',
    expected_nl: 'Natural Selection, Genetic Drift, Gene Flow, and Mutation',
    proof_nl: [
      'Natural Selection: differential survival and reproduction',
      'Genetic Drift: random changes in allele frequencies',
      'Gene Flow: movement of alleles between populations',
      'Mutation: changes in DNA sequence (ultimate source of variation)',
      'These four mechanisms change allele frequencies over time',
      'Natural selection is the only mechanism that is adaptive',
      'Drift, gene flow, and mutation are non-adaptive'
    ]
  }
];

export default { name, description, cases };

