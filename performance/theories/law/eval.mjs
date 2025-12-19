export default {
    theory: "law",
    test_cases: [
        {
            name: "Contract Formation Basic",
            theorem: "Contract_Formation",
            inputs: {
                Offer: "seller_offer_car",
                Acceptance: "buyer_accepts",
                Consideration: "payment_10000"
            },
            expected_nl: [
                "Party1 makes an offer",
                "Party2 accepts the offer",
                "Party1 provides consideration",
                "Valid contract is formed when offer, acceptance, and consideration are present",
                "A valid contract is legally binding"
            ],
            proof_nl: [
                "The offer was made by Party1",
                "Party2 accepted the offer",
                "Consideration was provided by Party1",
                "These three elements create a valid contract",
                "Therefore, the contract is legally binding"
            ]
        },
        {
            name: "Valid Offer Requirements",
            theorem: "Valid_Offer",
            inputs: {
                DefiniteTerms: "price_quantity_delivery",
                IntentionToBind: "serious_intent",
                CommunicatedToOfferee: "written_communication"
            },
            expected_nl: [
                "Offeror specifies definite terms",
                "Offeror demonstrates intention to bind",
                "Offeror transmits communication to offeree",
                "Valid offer requires definite terms, intent, and communication",
                "A valid offer is capable of acceptance"
            ],
            proof_nl: [
                "The offeror provided definite terms",
                "Intent to be bound was demonstrated",
                "The offer was communicated to the offeree",
                "These elements constitute a valid offer",
                "Therefore, the offer is capable of acceptance"
            ]
        },
        {
            name: "Promissory Estoppel",
            theorem: "Promissory_Estoppel",
            inputs: {
                Promise: "promise_to_donate",
                ReasonableReliance: "construction_begun",
                Injustice: "financial_loss"
            },
            expected_nl: [
                "Promisor makes a promise",
                "Promisee acts in reasonable reliance",
                "Promisee detrimentally changes position",
                "Court prevents injustice",
                "Promise is enforceable without consideration"
            ],
            proof_nl: [
                "A promise was made by the promisor",
                "The promisee reasonably relied on the promise",
                "Detrimental change of position occurred",
                "Court intervention prevents injustice",
                "Therefore, the promise is enforceable without traditional consideration"
            ]
        },
        {
            name: "Mutual Mistake",
            theorem: "Mutual_Mistake",
            inputs: {
                SharedMisconception: "painting_authenticity",
                MaterialFact: "artist_identity",
                ContractVoidable: "rescission_available"
            },
            expected_nl: [
                "Both parties believe a shared misconception",
                "The misconception concerns a material fact",
                "The material fact forms the contract basis",
                "Court allows the contract to be voidable",
                "Rescission is available as a remedy"
            ],
            proof_nl: [
                "Both parties shared a false belief about material facts",
                "This misconception was material to the contract",
                "The material fact formed the basis of the agreement",
                "Courts allow voidability in such cases",
                "Therefore, rescission is the appropriate remedy"
            ]
        },
        {
            name: "Fraudulent Misrepresentation",
            theorem: "Fraudulent_Misrepresentation",
            inputs: {
                FalseStatement: "car_never_in_accident",
                MaterialFact: "vehicle_history",
                IntentToDeceive: "knowingly_false",
                ReasonableReliance: "buyer_relied"
            },
            expected_nl: [
                "Party1 makes a false statement",
                "The false statement concerns a material fact",
                "Party1 has intent to deceive",
                "Party2 acts in reasonable reliance",
                "False statement with material fact and intent constitutes fraud",
                "Fraud with reliance makes the contract voidable"
            ],
            proof_nl: [
                "A false statement was made about a material fact",
                "The statement was made with intent to deceive",
                "The other party reasonably relied on the false statement",
                "These elements constitute fraud",
                "Therefore, the contract is voidable"
            ]
        },
        {
            name: "Statute of Frauds Land Sale",
            theorem: "SOF_Land_Sale",
            inputs: {
                RealProperty: "residential_house",
                SaleContract: "purchase_agreement",
                WritingRequired: "written_contract"
            },
            expected_nl: [
                "Contract involves real property",
                "The land is subject to a sale",
                "Statute of frauds requires writing",
                "Essential terms must be in the writing",
                "The contract is enforceable if written"
            ],
            proof_nl: [
                "The contract involves real property",
                "A sale of the land is being transferred",
                "The statute of frauds mandates a writing",
                "Essential terms must be included",
                "Therefore, the contract is enforceable only if in writing"
            ]
        },
        {
            name: "Material Breach",
            theorem: "Material_Breach",
            inputs: {
                SignificantFailure: "failed_to_deliver",
                GoesToEssence: "core_obligation",
                DischargesOtherParty: "no_further_duty"
            },
            expected_nl: [
                "Party breaches with significant failure",
                "The failure concerns the essence",
                "The failure is a material breach",
                "Material breach discharges other party's performance obligation",
                "Non-breaching party may sue immediately"
            ],
            proof_nl: [
                "A significant failure occurred",
                "The failure went to the essence of the contract",
                "This constitutes a material breach",
                "Material breach discharges the other party's duties",
                "Therefore, immediate suit is available"
            ]
        },
        {
            name: "Anticipatory Repudiation",
            theorem: "Anticipatory_Repudiation",
            inputs: {
                UnequivocalRefusal: "stated_will_not_perform",
                BeforePerformance: "before_due_date",
                ImmediateRemedy: "sue_now"
            },
            expected_nl: [
                "Party announces unequivocal refusal",
                "Refusal occurs before performance is due",
                "Refusal constitutes anticipatory breach",
                "Other party has immediate remedy",
                "Other party may suspend performance",
                "Immediate cause of action arises"
            ],
            proof_nl: [
                "An unequivocal refusal to perform was announced",
                "This occurred before the performance date",
                "The refusal constitutes anticipatory breach",
                "The non-breaching party has immediate remedies",
                "Therefore, immediate cause of action exists"
            ]
        },
        {
            name: "Expectation Damages",
            theorem: "Expectation_Damages",
            inputs: {
                BenefitOfBargain: "expected_profit",
                AsIfPerformed: "full_performance_value",
                PutInPosition: "contract_position"
            },
            expected_nl: [
                "Breach causes party to breach",
                "Non-breaching party is entitled to benefit of bargain",
                "Damages restore position",
                "Court calculates as if performed",
                "Expectancy measure applies"
            ],
            proof_nl: [
                "A breach occurred",
                "The non-breaching party is entitled to the benefit of the bargain",
                "Damages put the party in the position as if performed",
                "This is the expectancy measure",
                "Therefore, expectation damages apply"
            ]
        },
        {
            name: "Specific Performance",
            theorem: "Specific_Performance",
            inputs: {
                UniqueGoods: "rare_painting",
                InadequateLegalRemedy: "money_insufficient",
                CourtOrders: "deliver_painting"
            },
            expected_nl: [
                "Contract involves unique goods",
                "Money damages are inadequate legal remedy",
                "The goods are land or real property",
                "Court grants order for specific performance",
                "Specific performance is the equitable remedy"
            ],
            proof_nl: [
                "The contract involves unique goods",
                "Money damages are inadequate",
                "The subject is unique (like real property)",
                "Court can order specific performance",
                "Therefore, specific performance is granted"
            ]
        },
        {
            name: "Third Party Beneficiary",
            theorem: "Third_Party_Beneficiary",
            inputs: {
                IntendedBeneficiary: "named_person",
                ContractRights: "payment_rights",
                CanSue: "sue_for_breach"
            },
            expected_nl: [
                "Parties intend to create a beneficiary for a third party",
                "Performance benefits flow to the third party",
                "Third party has contract rights",
                "Third party may sue",
                "Third party has enforceable rights"
            ],
            proof_nl: [
                "The parties intended to benefit a third party",
                "Contract performance flows to the third party",
                "The third party has rights under the contract",
                "The third party can sue to enforce",
                "Therefore, third party rights exist"
            ]
        },
        {
            name: "Assignment of Rights",
            theorem: "Assignment",
            inputs: {
                TransferRights: "payment_rights",
                AssignorToAssignee: "creditor_transfer",
                ObligorNotification: "debtor_notified"
            },
            expected_nl: [
                "Assignor conveys and transfers rights",
                "Assignee receives contract rights from the transfer",
                "Assignee informs obligor through notification",
                "Obligor must perform to assignee",
                "Valid assignment is created"
            ],
            proof_nl: [
                "Contract rights were transferred",
                "The assignee received the rights",
                "The obligor was notified",
                "The obligor must now perform for the assignee",
                "Therefore, a valid assignment exists"
            ]
        },
        {
            name: "Impossibility Defense",
            theorem: "Impossibility",
            inputs: {
                ObjectiveImpossibility: "building_destroyed",
                UnforeseenEvent: "earthquake",
                PerformanceExcused: "no_duty"
            },
            expected_nl: [
                "Performance becomes objectively impossible",
                "Unforeseen event occurs after formation",
                "No party is at fault",
                "Court discharges performance as excused",
                "Discharge by impossibility applies"
            ],
            proof_nl: [
                "Objective impossibility occurred",
                "An unforeseeable event happened after contract formation",
                "No party was at fault",
                "Performance is excused by the court",
                "Therefore, discharge by impossibility applies"
            ]
        },
        {
            name: "Common Law System",
            theorem: "Common_Law_System",
            inputs: {
                JudicialPrecedent: "prior_cases",
                CaseBasedReasoning: "analogical_reasoning",
                BindingAuthority: "mandatory_precedent"
            },
            expected_nl: [
                "Court establishes judicial precedent",
                "Lower court requires judicial precedent",
                "Judge applies case-based reasoning",
                "Precedent creates binding authority",
                "Precedent and case reasoning imply stare decisis doctrine"
            ],
            proof_nl: [
                "Courts establish binding precedent",
                "Lower courts must follow this precedent",
                "Case-based reasoning is applied",
                "This creates binding authority",
                "Therefore, the doctrine of stare decisis applies"
            ]
        },
        {
            name: "Constitutional Supremacy",
            theorem: "Constitutional_Supremacy",
            inputs: {
                Constitution: "supreme_law",
                StatuteInvalidity: "unconstitutional_law",
                JudicialReview: "court_review_power"
            },
            expected_nl: [
                "Constitution establishes supreme law",
                "Statute contradicts the constitution",
                "Court exercises judicial review",
                "Review declares statute invalid",
                "Supreme law and conflict imply invalidity"
            ],
            proof_nl: [
                "The constitution is the supreme law",
                "A statute conflicts with the constitution",
                "Courts exercise judicial review",
                "The conflicting statute is declared invalid",
                "Therefore, constitutional supremacy creates a hierarchy"
            ]
        },
        {
            name: "Parol Evidence Rule",
            theorem: "Parol_Evidence_Rule",
            inputs: {
                IntegratedContract: "complete_written_agreement",
                PriorNegotiations: "oral_discussions",
                Excluded: "barred_from_evidence"
            },
            expected_nl: [
                "Contract is an integrated contract",
                "Prior negotiations exist",
                "Integrated contract contains merger clause",
                "Court excludes prior negotiations",
                "Integrated contract with merger clause means no extrinsic terms"
            ],
            proof_nl: [
                "The contract is fully integrated",
                "Prior negotiations existed",
                "A merger clause is present",
                "The court bars prior negotiations",
                "Therefore, no extrinsic terms are admissible"
            ]
        },
        {
            name: "Perfect Tender Rule",
            theorem: "Perfect_Tender_Rule",
            inputs: {
                GoodsSale: "merchandise_contract",
                ExactConformity: "specifications_met",
                RejectionRight: "buyer_may_reject"
            },
            expected_nl: [
                "Contract involves goods sale",
                "UCC requires exact conformity",
                "Seller fails perfect tender",
                "Buyer may exercise rejection right",
                "Goods and deviation mean buyer may reject"
            ],
            proof_nl: [
                "The contract is for sale of goods",
                "The UCC requires exact conformity",
                "The seller deviated from perfect tender",
                "The buyer has the right to reject",
                "Therefore, buyer may reject under the perfect tender rule"
            ]
        },
        {
            name: "Condition Precedent",
            theorem: "Condition_Precedent",
            inputs: {
                EventMustOccur: "inspection_approval",
                BeforePerformanceDue: "before_closing",
                NoOccurrenceNoObligation: "no_duty"
            },
            expected_nl: [
                "Contract specifies event must occur",
                "Event is required before performance due",
                "Event creates performance obligation",
                "Non-occurrence means no obligation",
                "Event before performance creates conditional duty"
            ],
            proof_nl: [
                "A condition precedent is specified",
                "The event must occur before performance",
                "The event triggers the obligation",
                "If it doesn't occur, no duty exists",
                "Therefore, a conditional duty is created"
            ]
        },
        {
            name: "Hadley Foreseeability Rule",
            theorem: "Hadley_Rule",
            inputs: {
                ForeseeableDamages: "lost_profits",
                NaturalConsequence: "business_loss",
                SpecialCircumstances: "unique_situation"
            },
            expected_nl: [
                "Damages flow naturally as consequence",
                "Damages arise from special circumstances",
                "Foreseeable damages limit recovery",
                "Breacher must know at formation",
                "Natural consequence or known special circumstances create recoverable damages"
            ],
            proof_nl: [
                "Damages flow naturally from breach",
                "Special circumstances may also create damages",
                "Recovery is limited to foreseeable damages",
                "The breacher must have known at contract formation",
                "Therefore, recoverable damages follow the Hadley rule"
            ]
        },
        {
            name: "Liquidated Damages",
            theorem: "Liquidated_Damages",
            inputs: {
                PreEstimatedDamages: "50000_clause",
                ReasonableAtFormation: "fair_estimate",
                NotPenalty: "compensatory_purpose"
            },
            expected_nl: [
                "Parties agree on pre-estimated damages",
                "Pre-estimated damages are reasonable at formation",
                "Actual damages are difficult to prove",
                "Court verifies not a penalty",
                "Reasonable pre-estimated damages that are not penalties are enforceable"
            ],
            proof_nl: [
                "The parties pre-estimated damages at formation",
                "The estimate was reasonable",
                "Actual damages would be hard to prove",
                "The court verifies it's not a penalty",
                "Therefore, liquidated damages are enforceable"
            ]
        },
        {
            name: "Creditor Beneficiary",
            theorem: "Creditor_Beneficiary",
            inputs: {
                PreExistingDebt: "loan_owed",
                PromiseToPayDebt: "third_party_payment",
                Enforce: "creditor_can_sue"
            },
            expected_nl: [
                "Promisee owes pre-existing debt",
                "Promisor makes promise to pay debt",
                "Third party is a creditor",
                "Creditor may enforce the promise",
                "Debt and promise create creditor beneficiary"
            ],
            proof_nl: [
                "A pre-existing debt exists",
                "A third party promises to pay the debt",
                "The creditor is a third party beneficiary",
                "The creditor can enforce the promise",
                "Therefore, creditor beneficiary rights exist"
            ]
        },
        {
            name: "Novation",
            theorem: "Novation",
            inputs: {
                NewParty: "substitute_debtor",
                SubstitutePerformance: "new_obligation",
                DischargeOriginal: "old_party_released"
            },
            expected_nl: [
                "Parties introduce new party",
                "New party agrees to substitute performance",
                "Agreement releases original party",
                "All parties require intent to discharge",
                "New party, substitute, and intent create novation"
            ],
            proof_nl: [
                "A new party is introduced",
                "The new party agrees to substitute performance",
                "All parties intend to discharge the original party",
                "The original party is released",
                "Therefore, a novation occurs"
            ]
        },
        {
            name: "Subject Matter Jurisdiction",
            theorem: "Subject_Matter_Jurisdiction",
            inputs: {
                CourtPower: "federal_authority",
                CaseType: "patent_dispute",
                ConstitutionalGrant: "article_III"
            },
            expected_nl: [
                "Court has power",
                "Case involves a specific type",
                "Constitution authorizes grant",
                "Power determines case type match",
                "Constitutional grant and match create subject matter jurisdiction"
            ],
            proof_nl: [
                "The court has constitutional power",
                "The case type falls within that power",
                "The constitution grants this authority",
                "The power matches the case type",
                "Therefore, subject matter jurisdiction exists"
            ]
        },
        {
            name: "Personal Jurisdiction",
            theorem: "Personal_Jurisdiction",
            inputs: {
                MinimumContacts: "business_activities",
                ForumState: "california",
                FairPlay: "substantial_justice"
            },
            expected_nl: [
                "Defendant has minimum contacts",
                "Contacts are with forum state",
                "Contacts satisfy fair play",
                "Exercise meets due process",
                "Contacts, forum, and fair play create personal jurisdiction"
            ],
            proof_nl: [
                "The defendant has minimum contacts",
                "These contacts are with the forum state",
                "The exercise satisfies fair play and substantial justice",
                "Due process requirements are met",
                "Therefore, personal jurisdiction is established"
            ]
        },
        {
            name: "Diversity Jurisdiction",
            theorem: "Diversity_Jurisdiction",
            inputs: {
                DifferentStates: "ny_vs_ca",
                AmountInControversy: "100000",
                FederalCourt: "district_court"
            },
            expected_nl: [
                "Parties are from different states",
                "Claim exceeds amount in controversy",
                "Amount is over 75000",
                "Federal court has jurisdiction",
                "Different states and threshold amount create diversity jurisdiction"
            ],
            proof_nl: [
                "The parties are from different states",
                "The amount in controversy exceeds the threshold",
                "The threshold is over $75,000",
                "Federal court has jurisdiction",
                "Therefore, diversity jurisdiction applies"
            ]
        },
        {
            name: "Standing Requirements",
            theorem: "Standing",
            inputs: {
                InjuryInFact: "financial_loss",
                Causation: "defendant_caused",
                Redressability: "court_can_remedy"
            },
            expected_nl: [
                "Plaintiff suffers injury in fact",
                "Defendant is linked to causing injury",
                "Court can provide redressability",
                "Plaintiff has constitutional standing",
                "Injury, causation, and redressability create proper standing"
            ],
            proof_nl: [
                "The plaintiff suffered an injury in fact",
                "The defendant caused the injury",
                "The court can redress the injury",
                "Constitutional standing exists",
                "Therefore, proper standing is established"
            ]
        },
        {
            name: "Summary Judgment",
            theorem: "Summary_Judgment",
            inputs: {
                NoGenuineIssue: "undisputed_facts",
                MaterialFact: "key_element",
                JudgmentAsLawMatter: "legal_conclusion"
            },
            expected_nl: [
                "No genuine issue exists in discovery",
                "Material fact concerns the case",
                "Court grants judgment as matter of law",
                "Evidence is viewed favorably to non-movant",
                "No issue and material fact lead to summary judgment"
            ],
            proof_nl: [
                "There is no genuine issue of material fact",
                "The facts are undisputed",
                "The court views evidence favorably to the non-movant",
                "Judgment as a matter of law is appropriate",
                "Therefore, summary judgment is granted"
            ]
        },
        {
            name: "Hearsay Rule",
            theorem: "Hearsay",
            inputs: {
                OutOfCourtStatement: "witness_said",
                TruthOfMatter: "prove_content",
                Inadmissible: "excluded"
            },
            expected_nl: [
                "Statement was made out of court",
                "Statement is offered for truth of matter",
                "Out of court for truth is hearsay statement",
                "FRE 802 bars hearsay",
                "Law allows hearsay exceptions",
                "Hearsay without exception is inadmissible"
            ],
            proof_nl: [
                "The statement was made out of court",
                "It is offered to prove the truth of the matter",
                "This is hearsay",
                "Hearsay is inadmissible unless an exception applies",
                "No exception applies here",
                "Therefore, the statement is inadmissible"
            ]
        },
        {
            name: "Excited Utterance Exception",
            theorem: "Excited_Utterance",
            inputs: {
                StartlingEvent: "car_accident",
                StressOfExcitement: "emotional_shock",
                RelatingToEvent: "described_crash"
            },
            expected_nl: [
                "Startling event occurs",
                "Declarant is under stress of excitement",
                "Statement concerns and relates to event",
                "FRE 803(2) allows statement",
                "Startling event, stress, and relation create hearsay exception"
            ],
            proof_nl: [
                "A startling event occurred",
                "The declarant was under stress of excitement",
                "The statement related to the event",
                "FRE 803(2) provides an exception",
                "Therefore, the hearsay exception applies"
            ]
        },
        {
            name: "Expert Testimony Admissibility",
            theorem: "Expert_Testimony",
            inputs: {
                SpecializedKnowledge: "engineering_expertise",
                ReliableMethod: "peer_reviewed_analysis",
                HelpfulToTrier: "beyond_jury_knowledge"
            },
            expected_nl: [
                "Expert has specialized knowledge",
                "Expert uses reliable method",
                "Testimony is helpful to trier of fact",
                "Court determines expert qualification",
                "Specialized knowledge, reliable method, and helpfulness allow expert testimony"
            ],
            proof_nl: [
                "The expert has specialized knowledge",
                "The methods used are reliable",
                "The testimony will help the trier of fact",
                "The court qualifies the expert",
                "Therefore, expert testimony is admitted"
            ]
        },
        {
            name: "Criminal Actus Reus",
            theorem: "Criminal_Actus_Reus",
            inputs: {
                VoluntaryAct: "struck_victim",
                Omission: "failed_duty",
                Causation: "caused_harm"
            },
            expected_nl: [
                "Defendant commits voluntary act",
                "Defendant fails legal duty as omission",
                "Act or omission produces causation",
                "Causation results in prohibited harm",
                "Act or omission with causation is actus reus element"
            ],
            proof_nl: [
                "A voluntary act occurred",
                "Or an omission of legal duty occurred",
                "This caused prohibited harm",
                "The harm resulted from the act",
                "Therefore, the actus reus element is satisfied"
            ]
        },
        {
            name: "Murder Elements",
            theorem: "Murder",
            inputs: {
                UnlawfulKilling: "caused_death",
                Malice: "evil_intent",
                Aforethought: "premeditation",
                Human: "person"
            },
            expected_nl: [
                "Defendant causes unlawful killing",
                "Defendant has malice",
                "Malice demonstrates aforethought",
                "Victim is human",
                "Killing with malice and human victim constitute murder offense"
            ],
            proof_nl: [
                "An unlawful killing occurred",
                "The defendant had malice",
                "Malice aforethought was demonstrated",
                "The victim was a human being",
                "Therefore, the offense is murder"
            ]
        },
        {
            name: "Self-Defense Justification",
            theorem: "Self_Defense",
            inputs: {
                UnlawfulAttack: "aggressor_assault",
                ReasonableBelief: "perceived_danger",
                ProportionalForce: "matching_force"
            },
            expected_nl: [
                "Defendant faces unlawful attack",
                "Defendant has reasonable belief",
                "Defendant uses proportional force",
                "Threat is imminent harm",
                "Attack, belief, force, and imminent threat justify self-defense"
            ],
            proof_nl: [
                "The defendant faced an unlawful attack",
                "The defendant had a reasonable belief of danger",
                "Proportional force was used",
                "The threat was imminent",
                "Therefore, self-defense is justified"
            ]
        },
        {
            name: "Fourth Amendment Protection",
            theorem: "Fourth_Amendment",
            inputs: {
                UnreasonableSearch: "warrantless_search",
                WarrantRequirement: "judicial_authorization",
                ProbableCause: "reasonable_grounds"
            },
            expected_nl: [
                "Police conduct unreasonable search",
                "Police seize evidence",
                "Constitution requires warrant",
                "Warrant needs probable cause",
                "Search without warrant is Fourth Amendment violation"
            ],
            proof_nl: [
                "Police conducted a search",
                "No warrant was obtained",
                "The Constitution requires a warrant",
                "The warrant must be based on probable cause",
                "Therefore, a Fourth Amendment violation occurred"
            ]
        },
        {
            name: "Miranda Rights Requirement",
            theorem: "Miranda_Rights",
            inputs: {
                CustodialInterrogation: "police_questioning",
                WarningRequired: "rights_advisement",
                SelfIncrimination: "confession_obtained"
            },
            expected_nl: [
                "Police hold suspect in custody",
                "Police question during custodial interrogation",
                "Police must warn with required warning",
                "Fifth Amendment protects self-incrimination",
                "Custody, interrogation, and no warning mean statements are excluded"
            ],
            proof_nl: [
                "The suspect was in custody",
                "Interrogation occurred",
                "No Miranda warnings were given",
                "The Fifth Amendment protects against self-incrimination",
                "Therefore, statements must be suppressed"
            ]
        },
        {
            name: "Exclusionary Rule Application",
            theorem: "Exclusionary_Rule",
            inputs: {
                IllegalSearch: "no_warrant",
                SuppressEvidence: "exclude_evidence",
                FruitPoisonousTree: "derivative_evidence"
            },
            expected_nl: [
                "Police conduct illegal search",
                "Court orders suppress evidence",
                "Doctrine extends to fruit of poisonous tree",
                "Rule purposes deterrence",
                "Illegal search and suppression apply exclusionary rule"
            ],
            proof_nl: [
                "An illegal search was conducted",
                "Evidence must be suppressed",
                "Derivative evidence is also excluded",
                "The rule deters police misconduct",
                "Therefore, the exclusionary rule applies"
            ]
        },
        {
            name: "Relevance Standard",
            theorem: "Relevance",
            inputs: {
                TendencyToProve: "makes_more_probable",
                MaterialFact: "disputed_issue",
                Admissible: "can_be_admitted"
            },
            expected_nl: [
                "Evidence has tendency to prove",
                "Fact is material fact",
                "Tendency increases fact probability",
                "Evidence is relevant",
                "FRE 401 requires relevant evidence to be admissible"
            ],
            proof_nl: [
                "The evidence tends to prove a material fact",
                "The fact is material to the case",
                "The evidence makes the fact more or less probable",
                "The evidence is relevant",
                "Therefore, FRE 401 makes it admissible"
            ]
        },
        {
            name: "Fee Simple Absolute",
            theorem: "Fee_Simple_Absolute",
            inputs: {
                UnlimitedDuration: "perpetual",
                FullOwnership: "complete_rights",
                NoConditions: "unconditional"
            },
            expected_nl: [
                "Estate has unlimited duration",
                "Owner exercises full ownership",
                "Estate contains no conditions",
                "Estate is alienable, deviseable, and inheritable",
                "Unlimited duration, full ownership, and no conditions create fee simple absolute"
            ],
            proof_nl: [
                "The estate has unlimited duration",
                "The owner has full ownership rights",
                "There are no conditions",
                "The estate is freely transferable",
                "Therefore, this is a fee simple absolute"
            ]
        },
        {
            name: "Adverse Possession",
            theorem: "Adverse_Possession",
            inputs: {
                ContinuousPossession: "20_years_occupation",
                OpenAndNotorious: "visible_use",
                ExclusiveHostile: "claiming_ownership"
            },
            expected_nl: [
                "Possessor maintains continuous possession",
                "Possession is open and notorious",
                "Possessor holds exclusive hostile possession",
                "Duration exceeds statutory period",
                "Possessor acquires title by possession",
                "Continuous, open, exclusive, and statutory period create adverse possession title"
            ],
            proof_nl: [
                "Possession was continuous",
                "The possession was open and notorious",
                "Possession was exclusive and hostile",
                "The statutory period was exceeded",
                "Therefore, title by adverse possession is acquired"
            ]
        },
        {
            name: "Easement Appurtenant",
            theorem: "Easement_Appurtenant",
            inputs: {
                BenefitsDominant: "access_benefit",
                BurdensServient: "servient_burden",
                RunsWithLand: "transfers_automatically"
            },
            expected_nl: [
                "Easement helps and benefits dominant tenement",
                "Easement restricts and burdens servient tenement",
                "Easement transfers and runs with land",
                "Easement is permanent attachment",
                "Benefit, burden, and runs with land create appurtenant easement"
            ],
            proof_nl: [
                "The easement benefits the dominant estate",
                "The easement burdens the servient estate",
                "The easement runs with the land",
                "It is a permanent attachment",
                "Therefore, this is an easement appurtenant"
            ]
        },
        {
            name: "Implied Warranty of Habitability",
            theorem: "Implied_Warranty_Habitability",
            inputs: {
                ResidentialLease: "apartment_rental",
                FitForHabitation: "safe_livable",
                CannotWaive: "non_waivable"
            },
            expected_nl: [
                "Lease is residential lease",
                "Landlord warrants fit for habitation",
                "Law bars waiver and cannot waive",
                "Landlord violates with breach and substandard conditions",
                "Tenant may repair or leave as remedy",
                "Residential lease, fit requirement, and breach create warranty breach"
            ],
            proof_nl: [
                "This is a residential lease",
                "The landlord warrants the premises are fit for habitation",
                "This warranty cannot be waived",
                "The landlord breached by providing substandard conditions",
                "Therefore, the warranty of habitability was breached"
            ]
        },
        {
            name: "Bona Fide Purchaser Protection",
            theorem: "Bona_Fide_Purchaser",
            inputs: {
                ValuePaid: "market_price",
                GoodFaith: "honest_transaction",
                NoNotice: "unaware_of_claims"
            },
            expected_nl: [
                "Purchaser pays value",
                "Purchaser has good faith",
                "Purchaser has no notice",
                "Law protects BFP status",
                "BFP prevails and defeats prior unrecorded interests",
                "Value, good faith, and no notice create bona fide purchaser"
            ],
            proof_nl: [
                "The purchaser paid value",
                "The purchaser acted in good faith",
                "The purchaser had no notice of prior interests",
                "The law protects bona fide purchaser status",
                "Therefore, the purchaser is a bona fide purchaser"
            ]
        },
        {
            name: "Eminent Domain Power",
            theorem: "Eminent_Domain",
            inputs: {
                TakingProperty: "land_acquisition",
                PublicUse: "highway_construction",
                JustCompensation: "fair_market_value"
            },
            expected_nl: [
                "Government exercises taking of property",
                "Taking serves public use",
                "Constitution requires just compensation",
                "Government may condemn property",
                "Taking, public use, and just compensation create eminent domain power"
            ],
            proof_nl: [
                "The government is taking property",
                "The taking serves a public use",
                "Just compensation is required by the Constitution",
                "The government can condemn property",
                "Therefore, eminent domain power is properly exercised"
            ]
        }
    ]
};
