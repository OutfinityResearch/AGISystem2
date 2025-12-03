# Dimension Catalog (Ontology & Axiology)

ID: DS(/knowledge/dimensions)

Purpose: fixed partition of ontology/axiology axes used across all profiles. Remaining dimensions (>=384) are empirical/latent. Unused axes stay 0.

## Visual: Dimension Partition Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      DIMENSION SPACE LAYOUT (N=512 typical)                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   Int8Array[512] - Each dimension stores value in [-127, +127]                  │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │  ONTOLOGY (0-255)          AXIOLOGY (256-383)     EMPIRICAL (384+)      │   │
│   │  ══════════════════        ═════════════════      ═══════════════       │   │
│   │  Physical/factual          Values/norms           Learned/latent        │   │
│   │  world properties          ethics/deontic         domain-specific       │   │
│   │                                                                         │   │
│   │  ┌───────────────┐        ┌───────────────┐      ┌───────────────┐      │   │
│   │  │ 0-15: Physical│        │256-275: Moral │      │384-511:       │      │   │
│   │  │  matter,solid │        │  good/bad,    │      │  Reserved for │      │   │
│   │  │  mass,temp... │        │  harm,benefit │      │  learned dims │      │   │
│   │  ├───────────────┤        ├───────────────┤      │  (zero until  │      │   │
│   │  │⚡16-31:       │        │276-295: Legal │      │   populated)  │      │   │
│   │  │ COMPUTABLE    │        │  permissible  │      │               │      │   │
│   │  │ (plugins)     │        │  obligation   │      └───────────────┘      │   │
│   │  ├───────────────┤        ├───────────────┤                             │   │
│   │  │32-63: Time    │        │296-319: Util- │                             │   │
│   │  │  duration,    │        │  ity/Value    │                             │   │
│   │  │  sequence...  │        │  profit,cost  │                             │   │
│   │  ├───────────────┤        ├───────────────┤                             │   │
│   │  │64-95: Agency  │        │320-335: Emot- │                             │   │
│   │  │  cognition,   │        │  ion/Affect   │                             │   │
│   │  │  intention... │        │  fear,joy...  │                             │   │
│   │  ├───────────────┤        ├───────────────┤                             │   │
│   │  │96-143: Legal/ │        │336-383:       │                             │   │
│   │  │  Artifact/    │        │  Reserved     │                             │   │
│   │  │  Financial    │        │  (zero)       │                             │   │
│   │  ├───────────────┤        └───────────────┘                             │   │
│   │  │144-223: Know- │                                                      │   │
│   │  │  ledge/Math/  │                                                      │   │
│   │  │  Process/Risk │                                                      │   │
│   │  ├───────────────┤                                                      │   │
│   │  │224-255:       │                                                      │   │
│   │  │  Reserved     │                                                      │   │
│   │  └───────────────┘                                                      │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   dim[0]        dim[255]     dim[256]      dim[383]    dim[384]      dim[511]  │
│   ├──────────────┤           ├──────────────┤          ├──────────────┤        │
│        ONTOLOGY                  AXIOLOGY                 EMPIRICAL            │
│      (256 dims)                (128 dims)               (128+ dims)            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

   EXAMPLE: A concept like "water" might have:
   ═══════════════════════════════════════════

   dim[0]  Physicality:     +80  (highly physical)
   dim[1]  Solidity:        -50  (liquid, not solid)
   dim[4]  Temperature:     +20  (room temp default)
   dim[7]  Phase:           +40  (liquid phase)
   dim[256] Moral valence:    0  (morally neutral)
   dim[272] Legality:         0  (not legally relevant)
   dim[384+] Empirical:       0  (no learned features yet)
```

## Computable Partition (16–31) — Reserved for Compute Plugins

The computable partition is a **special reserved range** within the ontology space that enables
external computation plugins (math, physics, chemistry, logic, datetime) to handle formal operations.

**Key Principle**: Concepts remain in the vector space, but some have numeric values encoded in
the computable dimensions. When a relation marked as "computable" is evaluated, the system
delegates to the appropriate plugin rather than using semantic similarity.

### Computable Dimensions Layout

| Index | Name | Description |
|-------|------|-------------|
| 16 | NumericValue | Encoded numeric value (log-scale for wide range) |
| 17 | NumericScale | Order of magnitude (10^n) |
| 18 | UnitDomain | Physical dimension: 0=dimensionless, 1=length, 2=mass, 3=time, 4=temperature... |
| 19 | UnitBase | Base SI unit within domain |
| 20 | UnitPrefix | SI prefix as power of 10: -3=milli, 0=base, 3=kilo, 6=mega... |
| 21 | ComputeDomain | Which plugin: 0=none, 1=math, 2=physics, 3=chemistry, 4=logic, 5=datetime |
| 22 | ComputeOperationType | Type: 0=none, 1=compare, 2=arithmetic, 3=convert, 4=solve |
| 23 | ComputePrecision | Precision: 0=exact, 1=high, 2=medium, 3=approximate |
| 24 | **Existence** | Epistemic status of a fact (see Existence Dimension below) |

### Existence Dimension (Index 24)

The **Existence dimension** tracks the epistemic status of facts - how certain we are that a fact is true.
This enables distinguishing between facts learned from theory vs. facts derived through reasoning.

#### Existence Levels

| Value | Name | Description |
|-------|------|-------------|
| -127 | IMPOSSIBLE | Contradicted by other facts (e.g., DISJOINT_WITH) |
| -64 | UNPROVEN | Asserted but not verified; hypothetical |
| 0 | POSSIBLE | Consistent with knowledge but not established |
| +64 | DEMONSTRATED | Derived via reasoning (transitive chains, inference) |
| +127 | CERTAIN | From theory/axioms; learned directly |

#### IS_A Variants

IS_A relations support existence-level variants that explicitly encode epistemic status:

| Relation | Existence Level | Use Case |
|----------|----------------|----------|
| IS_A | Umbrella | Searches all variants, returns best existence |
| IS_A_CERTAIN | 127 | Axioms, definitions (e.g., "Dog IS_A_CERTAIN Animal") |
| IS_A_PROVEN | 64 | Empirically verified (e.g., "Electron IS_A_PROVEN Lepton") |
| IS_A_POSSIBLE | 0 | Hypothetical (e.g., "Unicorn IS_A_POSSIBLE Horse") |
| IS_A_UNPROVEN | -64 | Unverified claims (e.g., "Bigfoot IS_A_UNPROVEN Primate") |

#### Version Unification

When multiple existence levels exist for the same fact triple, the system uses **version unification**:
- Higher existence always wins (no duplicates created)
- A fact can only be upgraded, never downgraded
- This prevents reasoning from reducing certainty of axioms

#### Transitive Chain Existence

For transitive chains (e.g., A IS_A B, B IS_A C → A IS_A C), existence propagates conservatively:
- **min(existence)** across the chain determines the result
- Example: Unicorn IS_A_POSSIBLE Horse (0), Horse IS_A Animal (127) → Unicorn IS_A Animal with existence=0

### Computable Relations

Relations marked with `computable: "plugin_name"` in dimensions.json are delegated to plugins:

| Relation | Plugin | Description |
|----------|--------|-------------|
| LESS_THAN, GREATER_THAN, EQUALS_VALUE | math | Numeric comparisons |
| PLUS, MINUS, TIMES, DIVIDED_BY | math | Arithmetic operations |
| HAS_VALUE | math | Value extraction |
| CONVERTS_TO, HAS_UNIT | physics | Unit conversions |
| IMPLIES, AND, OR, NOT | logic | Propositional logic |
| BEFORE, AFTER, DURING, DURATION_OF | datetime | Calendar/time |

### How It Works

1. **Fact check**: System first checks if the relation exists as an explicit fact
2. **Plugin delegation**: If not found and relation is computable, extract numeric values and delegate to plugin
3. **Uniform result**: Plugin returns same structure as semantic reasoning: `{ truth, confidence, method: 'computed' }`

Example: `ASK celsius_20 LESS_THAN celsius_50`
- Extracts 20 from "celsius_20", 50 from "celsius_50"
- Math plugin computes: 20 < 50 → TRUE_CERTAIN
- Returns: `{ truth: 'TRUE_CERTAIN', confidence: 1.0, method: 'computed', plugin: 'math' }`

---

## Ontology Axes (0–255)
- 0 Physicality (matter/energy presence)
- 1 Mereological (part-whole relationships)
- 2 Mass/Weight
- 3 Size/Scale (macro vs. micro)
- 4 Temperature (physical; e.g., boiling point of water)
- 5 Pressure
- 6 Density
- 7 Phase (solid/liquid/gas/plasma)
- 8 Spatial Extent (area/volume)
- 9 Location Specificity (anchored vs. abstract)
- 10 Temporality (persistent vs. event)
- 11 Duration
- 12 Frequency/Periodicity
- 13 Causality Strength
- 14 Determinism vs. Stochasticity
- 15 Reversibility
- 16–23 **[COMPUTABLE - see Computable Partition section above]**
- 24 **Existence** (epistemic status - see Computable Partition section)
- 25–31 Reserved for computable expansion
- 32 Time-Order Anchor (sequence position)
- 33 Recency
- 34 Historical/Archaic flag
- 35 Forecast/Projected flag
- 36 Clock/Calendar alignment
- 37 Simultaneity/Concurrency
- 38 Latency/Response time
- 39 Event Granularity
- 40 Spatial Relation Strength (adjacent/inside/over)
- 41 Dimensionality (1D/2D/3D)
- 42 Topology (connectedness)
- 43 Distance Scale (local/global)
- 44 Elevation/Depth
- 45 Navigation/Path constraints
- 46 Reference Frame (relative/absolute)
- 47 Coordinate System tag
- 48 Biological/Living flag
- 49 Species/Taxonomy anchor
- 50 Life Stage (juvenile/adult)
- 51 Health/Vitality
- 52 Metabolism/Energy use
- 53 Reproduction capability
- 54 Sensory capability
- 55 Mobility (biological)
- 56 Growth/Decay rate
- 57 Disease/Pathogen tag
- 58 Cognition baseline (animal/human-level)
- 59 Agency baseline (can initiate actions)
- 60 Sociality (solitary/pack)
- 61 Territoriality
- 62 Adaptability
- 63 Ecosystem role (predator/prey/decomposer)
- 64 Agent identity persistence (same over time)
- 65 Intentionality (goal-directed)
- 66 Communication capability
- 67 Memory/Recall capability
- 68 Learning capability
- 69 Planning/Forecast capability
- 70 Tool use capability
- 71 Emotion-expressivity flag
- 72 Ownership/Stewardship capability
- 73 Obligation capacity (can be bound by norms)
- 74 Authority level (can impose norms)
- 75 Reputation/Trust anchor
- 76 Cooperation/Competition tendency
- 77 Alignment to groups (org/team)
- 78 Role specificity (job/position)
- 79 Accountability/Auditability
- 80 Artifact/Device flag
- 81 Power source (electric/chemical/manual)
- 82 Interface type (API/physical)
- 83 Computation capability
- 84 Storage capability
- 85 Network connectivity
- 86 Autonomy level (manual→fully autonomous)
- 87 Safety mechanisms present
- 88 Certification/Compliance status (ontological)
- 89 Maintainability/Serviceability
- 90 Modularity
- 91 Versioning/Release tag
- 92 Lifecycle phase (prototype/GA/EOL)
- 93 Reliability/MTBF
- 94 Capacity rating (throughput)
- 95 Precision/Accuracy rating
- 96 Legal entity flag
- 97 Jurisdiction anchor
- 98 Contractual capacity
- 99 Liability exposure
- 100 Ownership status
- 101 Registration/ID present
- 102 License/Permit present
- 103 Regulation class (e.g., medical, aviation)
- 104 Evidence/Proof attached
- 105 Audit trail completeness
- 106 Secrecy/Confidentiality requirement
- 107 Traceability requirement
- 108 Classification level (public/secret)
- 109 Authenticity/Integrity guarantee
- 110 Non-repudiation capability
- 111 Consent status
- 112 Financial asset flag
- 113 Monetary value nominal
- 114 Volatility (financial)
- 115 Liquidity
- 116 Fungibility
- 117 Scarcity
- 118 Credit/Debt role
- 119 Risk-weighted value
- 120 Transactional history presence
- 121 Collateral suitability
- 122 Transferability
- 123 Divisibility
- 124 Taxation class
- 125 Insurance coverage
- 126 Investment horizon
- 127 Counterparty risk anchor
- 128 Knowledge/Claim flag (proposition)
- 129 Evidence strength (ontological)
- 130 Source credibility
- 131 Recency of evidence
- 132 Consistency with theory
- 133 Falsifiability
- 134 Uncertainty band
- 135 Measurement method tag
- 136 Model dependency
- 137 Assumption dependency
- 138 Approximation level
- 139 Error bounds
- 140 Curation status (verified/unverified)
- 141 Provenance completeness
- 142 Update cadence
- 143 Conflict count
- 144 Mathematical object flag
- 145 Discreteness/Continuity
- 146 Deterministic mapping presence
- 147 Algebraic structure tag
- 148 Geometric structure tag
- 149 Logical operator embedding
- 150 Constraint presence
- 151 Optimization objective presence
- 152 State-space size
- 153 Symmetry group tag
- 154 Conservation law tag
- 155 Boundary conditions completeness
- 156 Initial conditions completeness
- 157 Invariance under transform
- 158 Dimensional analysis validity
- 159 Units/Scale validity
- 160 Process dynamics flag (workflow/system)
- 161 Input/Output well-defined
- 162 Control points present
- 163 Feedback loops present
- 164 Stability of process
- 165 Throughput/Latency balance
- 166 Queue/Buffer presence
- 167 Resource constraints binding
- 168 Failure modes known
- 169 Recovery/Restart capability
- 170 Observability/Controllability
- 171 Interoperability requirement
- 172 Synchronization requirement
- 173 Deterministic vs. probabilistic transitions
- 174 Trigger/Condition presence
- 175 Termination condition clarity
- 176 Environmental dependency
- 177 Human-in-the-loop dependency
- 178 Safety interlocks present
- 179 Audit checkpoints
- 180 Escalation path presence
- 181 Exception handling completeness
- 182 Temporal SLAs
- 183 Reliability SLAs
- 184 Security controls present
- 185 Data retention requirement
- 186 Privacy requirement
- 187 Availability tier
- 188 Integrity tier
- 189 Confidentiality tier
- 190 Compliance required (yes/no)
- 191 Export control sensitivity
- 192 Risk category anchor (ontological)
- 193 Hazard presence
- 194 Exposure level
- 195 Severity potential
- 196 Likelihood baseline
- 197 Detectability
- 198 Mitigation presence
- 199 Residual risk
- 200 Safety margin
- 201 Tolerance band
- 202 Out-of-distribution flag
- 203 Adversarial susceptibility
- 204 Robustness under perturbation
- 205 Redundancy presence
- 206 Diversity of evidence
- 207 Escalation likelihood
- 208 Social impact flag
- 209 Cultural context sensitivity
- 210 Ethical relevance (ontology side)
- 211 Equity/Accessibility relevance
- 212 Human rights relevance
- 213 Environmental impact
- 214 Sustainability relevance
- 215 Resource consumption intensity
- 216 Pollution/Emission factor
- 217 Waste/Byproduct factor
- 218 Remediation requirement
- 219 Lifecycle footprint completeness
- 220 Supply chain transparency
- 221 Labor practice relevance
- 222 Community impact
- 223 Governance/Stewardship presence
- 224–255 Reserved for domain-specific ontology extensions (leave zero until defined).

## Axiology Axes (256–383)
- 256 Moral valence (good/bad)
- 257 Harmfulness
- 258 Beneficence/Helpfulness
- 259 Fairness/Justice perception
- 260 Autonomy respect
- 261 Dignity/Respect
- 262 Honesty/Truthfulness
- 263 Loyalty/Fidelity
- 264 Care/Compassion
- 265 Responsibility/Accountability (axiological)
- 266 Courage/Risk acceptance
- 267 Prudence/Precaution
- 268 Temperance/Restraint
- 269 Integrity (character)
- 270 Reciprocity/Altruism
- 271 Trustworthiness
- 272 Legality (compliance valence)
- 273 Permissibility
- 274 Obligation weight
- 275 Prohibition strength
- 276 Sanction severity
- 277 Enforcement likelihood
- 278 Due process adherence
- 279 Precedent alignment
- 280 Utility/Efficiency value
- 281 Profit/ROI orientation
- 282 Cost sensitivity
- 283 Resource efficiency
- 284 Time efficiency
- 285 Scalability value
- 286 Innovation/Novelty value
- 287 Resilience value
- 288 Risk appetite (axiology)
- 289 Safety preference
- 290 Security preference
- 291 Privacy preference
- 292 Robustness preference
- 293 Reliability preference
- 294 Transparency preference
- 295 Explainability preference
- 296 Reward/Benefit expectation
- 297 Incentive alignment
- 298 Satisfaction/Comfort
- 299 Reputation impact
- 300 Prestige/Status value
- 301 Convenience/Usability value
- 302 Aesthetics/Beauty value
- 303 Sustainability value (axiology)
- 304 Alignment with policy/mission
- 305 Ideological alignment
- 306 Cultural alignment
- 307 Brand alignment
- 308 Stakeholder priority weight
- 309 Bias/fairness sensitivity (axiological)
- 310 Protected-class sensitivity
- 311 Corrective fairness pressure
- 312 Obligation to disclose
- 313 Permission to act
- 314 Consent strength
- 315 Revocability of consent
- 316 Accountability expectation
- 317 Liability assignment preference
- 318 Remediation/Compensation expectation
- 319 Penalty tolerance
- 320 Emotion: Fear
- 321 Emotion: Anger
- 322 Emotion: Sadness
- 323 Emotion: Joy
- 324 Emotion: Disgust
- 325 Emotion: Surprise
- 326 Empathy/Compassion felt
- 327 Hostility/Antagonism
- 328 Trust/Confidence level
- 329 Suspicion/Doubt
- 330 Attachment/Affiliation
- 331 Aversion/Avoidance
- 332 Curiosity/Engagement
- 333 Motivation/Drive
- 334 Risk aversion/Seeking (emotive)
- 335 Stress/Anxiety
- 336–383 Reserved for domain-specific value axes; default zero.

## Notes
- Axes beyond 383 are empirical/latent and learned; remain zero until populated.
- Reserved ranges must stay zero until explicitly defined in domain extensions.
- The catalog is shared across profiles; avoid renaming to preserve reproducibility.***
