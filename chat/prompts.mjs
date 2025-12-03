/**
 * DS(/chat/prompts.mjs) - LLM Prompt Templates
 *
 * Contains all prompt templates used for natural language processing:
 * - Intent detection (what does the user want?)
 * - Fact extraction (convert NL to triples)
 * - Question parsing (convert NL to canonical form)
 * - Response generation (convert results to NL)
 *
 * @module chat/prompts
 */

/**
 * System prompt for the AGISystem2 assistant
 */
export const SYSTEM_PROMPT = `You are AGISystem2. Your ONLY job is translating to Sys2DSL.

FOR EVERY USER MESSAGE:
1. If teaching facts: output @fNNN ASSERT subject RELATION object
2. If asking question: output @qNNN ASK subject RELATION object

NEVER skip DSL generation. NEVER answer directly. ALWAYS output DSL FIRST.

RELATION TABLE:
is/are a/an → IS_A | in/at/located → LOCATED_IN | has/have → HAS
causes → CAUSES | helps → HELPS | requires → REQUIRES | can → CAN

CONCEPT RULES:
- lowercase for types (dog, mammal)
- Capitalized for instances (Fido, Tokyo)
- underscore for multi-word (living_thing)
- no articles (a/an/the)
- singular form

Example response for "Is Tokyo in Europe?":
[DSL Representation]
  @q001 ASK Tokyo LOCATED_IN Europe`;

/**
 * Build prompt to detect user intent
 * @param {string} userMessage - The user's input
 * @returns {string} Prompt for intent detection
 */
export function buildIntentPrompt(userMessage) {
  return `Analyze this user message and determine the intent.

User message: "${userMessage}"

Respond with JSON only:
{
  "intent": "teach" | "ask" | "import" | "manage_theory" | "list" | "help" | "other",
  "confidence": 0.0-1.0,
  "details": {
    // For "teach": {"facts": [{"subject": "X", "relation": "Y", "object": "Z"}, ...]}
    // For "ask": {"question": "canonical form", "type": "yes_no" | "what" | "why" | "how"}
    // For "import": {"filepath": "path if mentioned"}
    // For "manage_theory": {"action": "create" | "switch" | "list" | "delete", "name": "theory name"}
    // For "list": {"what": "facts" | "concepts" | "theories"}
  }
}`;
}

/**
 * Build prompt to extract facts from natural language
 * @param {string} text - Natural language text containing facts
 * @returns {string} Prompt for fact extraction
 */
export function buildFactExtractionPrompt(text) {
  return `Extract facts from this text as Subject-Relation-Object triples.

RAW TEXT (may include bullets, headings, separators):
"${text}"

PREPROCESSING RULES (VERY IMPORTANT):
- Ignore purely structural/formatting lines: markdown bullets (-, *, •), numbered lists (1., 2.), headings (#, ##), separators (----, ====), code fences (triple quotes or fenced code blocks), and empty lines.
- Focus ONLY on declarative statements that express relationships between concepts (subject–verb–object).
- If the same fact appears multiple times (e.g., in a bullet list and in prose), only output it ONCE.

IMPORTANT RULES:
1. Each subject and object must be a CONCEPT NAME (single word or underscore_connected)
2. NEVER use descriptions as objects (wrong: "Belongs to my neighbor", correct: "NeighborProperty")
3. For properties/attributes, use IS_A with a concept (e.g., "Water IS_A liquid" not "Water HAS_PROPERTY liquid")
4. For numeric values, create a concept (e.g., "Celsius100" not "100")
5. Concepts should be lowercase for types, Capitalized for instances/individuals
6. Relations are ALWAYS UPPERCASE with underscores
7. ALWAYS normalize types to SINGULAR form (dogs → dog, patients → patient, oameni → om). Treat plural/singular of the same type as the SAME CONCEPT.
8. Prefer using the BASE RELATION SET from Sys2DSL when possible instead of inventing new verbs.
9. CUSTOM VERBS ARE STILL ALLOWED when none of the base relations apply (convert verb to UPPERCASE).
10. Work with ANY language - extract the semantic structure regardless of language.

Common relations (use these when applicable):
- IS_A: category/type membership (e.g., "dog IS_A mammal", "Fido IS_A dog")
- HAS: simple attribute possession (e.g., "car HAS wheel")
- PART_OF: mereological (e.g., "Wheel PART_OF car")
- CAUSES / CAUSED_BY: causation (e.g., "fire CAUSES smoke")
- LOCATED_IN: location (e.g., "Paris LOCATED_IN France")
- REQUIRES: dependencies (e.g., "human REQUIRES water")
- PERMITS / PROHIBITED_BY / PERMITTED_BY: permissions/rules
- DISJOINT_WITH: mutual exclusion (e.g., "mammal DISJOINT_WITH reptile", "mortal DISJOINT_WITH immortal")
- CAN: abilities/capabilities (e.g., "bird CAN fly")
- OWNS / OWNED_BY: ownership

BUT you can also use CUSTOM RELATIONS when the text uses specific verbs:
- "D kills A" → D KILLS A
- "Lion eats Zebra" → Lion EATS Zebra
- "D omoara A" (Romanian for "D kills A") → D OMOARA A or D KILLS A
- "toate X fac Y" (Romanian for "all X do Y") → X DOES Y
- "A loves B" → A LOVES B

For quantifiers like "all/toate/every":
- "All dogs bark" → dog BARKS (the type, not individuals)
- "Toate pisicile mananca soareci" → pisica MANANCA soarece

BAD examples (DO NOT do this):
- "Fido HAS_PROPERTY Belongs to my neighbor" ❌
- "Water HAS_PROPERTY liquid" ❌
- Returning empty facts when there's clearly a verb relating two concepts ❌

GOOD examples (DO this):
- "Fido OWNED_BY Neighbor" ✓
- "Water IS_A liquid" ✓
- "D KILLS A" ✓ (custom verb)
- "Cat CHASES Mouse" ✓ (custom verb)

Respond with JSON only:
{
  "facts": [
    {"subject": "Subject1", "relation": "RELATION", "object": "Object1"},
    ...
  ],
  "ambiguous": ["any phrases that were unclear"],
  "confidence": 0.0-1.0
}`;
}

/**
 * Build prompt to convert natural language question to Sys2DSL query
 *
 * This is a MODULAR prompt with clear structure:
 * 1. TASK - what we want to accomplish
 * 2. KNOWLEDGE CONTEXT - facts from the current theory (if provided)
 * 3. COMMAND TYPE DETECTION - what kind of DSL command to generate
 * 4. CONCEPT NORMALIZATION - how to normalize concepts
 * 5. RELATION MAPPING - how to map verbs to relations
 * 6. OUTPUT FORMAT - exact JSON structure required
 * 7. EXAMPLES - comprehensive examples covering all patterns
 *
 * @param {string} question - Natural language question
 * @param {object} context - Optional context with theory facts
 * @param {string} context.theory - Natural language description of current theory
 * @param {string[]} context.facts - Array of DSL facts in current theory
 * @returns {string} Prompt for DSL generation
 */
export function buildQuestionPrompt(question, context = null) {
  // Build context section if provided
  let contextSection = '';
  if (context) {
    contextSection = `
═══════════════════════════════════════════════════════════════════════
CURRENT KNOWLEDGE BASE (use these facts for concrete values):
═══════════════════════════════════════════════════════════════════════
`;
    if (context.theory) {
      contextSection += `\nDescription: ${context.theory}\n`;
    }
    if (context.facts && context.facts.length > 0) {
      contextSection += `\nFacts (DSL format):\n${context.facts.map(f => `  ${f}`).join('\n')}\n`;
    }
    contextSection += `
IMPORTANT: When generating RETRACT or ASSERT commands, use EXACT values from the facts above.
For example, if the facts show "Alice HAS_SALARY 70000", use that exact value in RETRACT.
`;
  }

  return `TASK: Convert this natural language question/command to Sys2DSL.

RAW QUESTION (may contain bullets, headings, separators around it):
"${question}"

PREPROCESSING RULES:
- Ignore markdown bullets, headings, horizontal rules, code fences and other purely formatting lines.
- If the user pasted a whole document, focus on the actual question/instruction, not on table-of-contents, section titles, or decorative separators.
${contextSection}

═══════════════════════════════════════════════════════════════════════
STEP 1: DETECT COMMAND TYPE
═══════════════════════════════════════════════════════════════════════

Identify what type of DSL command(s) is needed. Multiple commands can be combined:

QUERY COMMANDS:
| Pattern                                    | Command         | DSL Format                        |
|--------------------------------------------|-----------------|-----------------------------------|
| Yes/no questions (Is X a Y?)               | ASK             | ASK subject RELATION object       |
| "Find all X" / "List all" / "Who are"      | FACTS_MATCHING  | FACTS_MATCHING subject RELATION object (use ? for wildcards) |
| "What could cause" / "Diagnose"            | ABDUCT          | ABDUCT symptom                    |
| "X is to Y as Z is to ?"                   | ANALOGICAL      | ANALOGICAL A B C                  |

THEORY MANAGEMENT (for hypothetical/what-if scenarios):
| Pattern                                    | Command         | DSL Format                        |
|--------------------------------------------|-----------------|-----------------------------------|
| "What if..." / "Suppose..." / "Imagine..." | THEORY_PUSH     | THEORY_PUSH scenario_name         |
| "Restore" / "Go back" / "Undo hypothesis"  | THEORY_POP      | THEORY_POP                        |
| "Save this scenario" / "Save as..."        | SAVE_THEORY     | SAVE_THEORY name                  |
| "Merge scenario" / "Apply saved..."        | MERGE_THEORY    | MERGE_THEORY name                 |

FACT MANAGEMENT:
| Pattern                                    | Command         | DSL Format                        |
|--------------------------------------------|-----------------|-----------------------------------|
| "Add fact" / "Assert that"                 | ASSERT          | ASSERT subject RELATION object    |
| "Remove fact" / "Retract"                  | RETRACT         | RETRACT subject RELATION object   |
| "Forget about X" / "Remove all about"      | FORGET          | FORGET concept                    |

OUTPUT FORMATTING:
| Pattern                                    | Command         | DSL Format                        |
|--------------------------------------------|-----------------|-----------------------------------|
| "Summarize" / "Write about" / "Generate"   | TO_NATURAL      | TO_NATURAL var1 var2...           |
| "As JSON" / "In JSON format"               | TO_JSON         | TO_JSON var                       |

IMPORTANT: Complex requests require MULTIPLE commands in sequence!

═══════════════════════════════════════════════════════════════════════
STEP 2: CONCEPT NORMALIZATION
═══════════════════════════════════════════════════════════════════════

Extract concepts following these rules:
• Named entities (specific individuals): Capitalized (Fido, Tokyo, Sparky, Tesla)
• Generic types/categories: lowercase (dog, mammal, city, wheel, patient)
• Multi-word concepts: use underscore (software_engineer, living_thing)
• Remove articles: "a/an/the" → (nothing)
• Use singular form: "wheels" → "wheel", "patients" → "patient"
• Wildcards: use ? for unknown values in FACTS_MATCHING

═══════════════════════════════════════════════════════════════════════
STEP 3: RELATION MAPPING
═══════════════════════════════════════════════════════════════════════

| Pattern                          | Relation       | Example                          |
|----------------------------------|----------------|----------------------------------|
| "is/are X a Y"                   | IS_A           | Fido IS_A dog                    |
| "is/are X in/at/located in Y"   | LOCATED_IN     | Tokyo LOCATED_IN Japan           |
| "does X have Y"                  | HAS            | Tesla HAS wheel                  |
| "does X use Y"                   | USES           | DroneA USES MotorX               |
| "does X cause Y"                 | CAUSES         | fire CAUSES smoke                |
| "does X require Y"               | REQUIRES       | human REQUIRES water             |
| "is X part of Y"                 | PART_OF        | wheel PART_OF car                |
| "did X happen before Y"          | BEFORE         | ww1 BEFORE ww2                   |
| "did X come after Y"             | AFTER          | testing AFTER development        |
| "can X do Y" (permission)        | PERMITTED_TO   | nurse PERMITTED_TO prescribe     |
| "is X allowed to Y"              | PERMITTED_TO   | intern PERMITTED_TO access       |
| "is X married to Y"              | MARRIED_TO     | Ion MARRIED_TO Maria             |
| "is X sibling of Y"              | SIBLING_OF     | Ana SIBLING_OF Mihai             |
| "is X child of Y"                | CHILD_OF       | Ana CHILD_OF Maria               |
| "is X parent of Y"               | PARENT_OF      | Maria PARENT_OF Ana              |
| "is X capital of Y"              | CAPITAL_OF     | Paris CAPITAL_OF France          |
| "does X fly/swim/run/etc"        | CAN            | bird CAN fly                     |

═══════════════════════════════════════════════════════════════════════
STEP 4: OUTPUT FORMAT (JSON only)
═══════════════════════════════════════════════════════════════════════

For ASK commands (most common):
{
  "command": "ASK",
  "type": "yes_no",
  "canonical": {
    "subject": "<subject>",
    "relation": "<RELATION>",
    "object": "<object>"
  },
  "confidence": 0.95
}

For FACTS_MATCHING commands (list/find queries):
{
  "command": "FACTS_MATCHING",
  "type": "list",
  "canonical": {
    "subject": "<subject or ?>",
    "relation": "<RELATION>",
    "object": "<object or ?>"
  },
  "confidence": 0.95
}

For ABDUCT commands (diagnosis/cause finding):
{
  "command": "ABDUCT",
  "type": "diagnosis",
  "canonical": {
    "symptom": "<observed symptom>"
  },
  "confidence": 0.95
}

For ANALOGICAL commands (A:B :: C:?):
{
  "command": "ANALOGICAL",
  "type": "analogy",
  "canonical": {
    "a": "<first term>",
    "b": "<second term>",
    "c": "<third term>"
  },
  "confidence": 0.95
}

For SEQUENCE (multiple commands - use for hypotheticals, what-if, multi-step):
{
  "command": "SEQUENCE",
  "type": "multi_step",
  "steps": [
    {"command": "THEORY_PUSH", "name": "scenario_name"},
    {"command": "ASSERT", "subject": "X", "relation": "REL", "object": "Y"},
    {"command": "ASK", "subject": "X", "relation": "REL", "object": "Y"},
    {"command": "THEORY_POP"}
  ],
  "confidence": 0.95
}

For THEORY_PUSH (start hypothetical scenario):
{
  "command": "THEORY_PUSH",
  "type": "hypothetical",
  "canonical": {"name": "scenario_name"},
  "confidence": 0.95
}

For ASSERT/RETRACT (add/remove facts):
{
  "command": "ASSERT",
  "type": "fact_management",
  "canonical": {"subject": "X", "relation": "REL", "object": "Y"},
  "confidence": 0.95
}

For TO_NATURAL (summarize/generate text from facts):
{
  "command": "TO_NATURAL",
  "type": "summarize",
  "canonical": {"vars": ["var1", "var2"]},
  "confidence": 0.95
}

═══════════════════════════════════════════════════════════════════════
EXAMPLES (input → output)
═══════════════════════════════════════════════════════════════════════

ASK EXAMPLES (yes/no questions):

"Is Fido a dog?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"Fido","relation":"IS_A","object":"dog"},"confidence":0.95}

"Does DroneA use MotorX?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"DroneA","relation":"USES","object":"MotorX"},"confidence":0.95}

"Can a nurse prescribe medication?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"nurse","relation":"PERMITTED_TO","object":"prescribe_medication"},"confidence":0.95}

"Did World War 1 happen before World War 2?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"world_war_1","relation":"BEFORE","object":"world_war_2"},"confidence":0.95}

"Does fire cause smoke?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"fire","relation":"CAUSES","object":"smoke"},"confidence":0.95}

"Is Ion married to Maria?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"Ion","relation":"MARRIED_TO","object":"Maria"},"confidence":0.95}

"Does human require water?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"human","relation":"REQUIRES","object":"water"},"confidence":0.95}

"Is approval needed before implementation?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"approval","relation":"BEFORE","object":"implementation"},"confidence":0.95}

"Is patient consent required for treatment?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"treatment","relation":"REQUIRES","object":"patient_consent"},"confidence":0.95}

"Can a customer view their own account?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"customer","relation":"PERMITTED_TO","object":"view_own_account"},"confidence":0.95}

"Does testing come before or after development?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"testing","relation":"AFTER","object":"development"},"confidence":0.95}

"If humans had no water, could they survive?"
{"command":"ASK","type":"yes_no","canonical":{"subject":"human","relation":"REQUIRES","object":"water"},"confidence":0.95}

ABDUCT EXAMPLES (cause/diagnosis questions):

"What could cause John's symptoms?"
{"command":"ABDUCT","type":"diagnosis","canonical":{"symptom":"fever"},"confidence":0.95}

"What could cause headaches?"
{"command":"ABDUCT","type":"diagnosis","canonical":{"symptom":"headache"},"confidence":0.95}


FACTS_MATCHING EXAMPLES (list/find queries with ? wildcards):

"Find all capital-country pairs"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"?","relation":"CAPITAL_OF","object":"?"},"confidence":0.95}

"Who are the children of Ion?"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"Ion","relation":"PARENT_OF","object":"?"},"confidence":0.95}

"Who are Ana's parents?"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"?","relation":"PARENT_OF","object":"Ana"},"confidence":0.95}

"List all things that cause fever"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"?","relation":"CAUSES","object":"fever"},"confidence":0.95}

"What are all the types of vehicles?"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"?","relation":"IS_A","object":"vehicle"},"confidence":0.95}

ABDUCT EXAMPLES (diagnosis/cause finding):

"What could cause John's symptoms?"
{"command":"ABDUCT","type":"diagnosis","canonical":{"symptom":"fever"},"confidence":0.95}

"Could Mary have food poisoning?"
{"command":"ABDUCT","type":"diagnosis","canonical":{"symptom":"stomach_pain"},"confidence":0.95}

ANALOGICAL EXAMPLES (A:B :: C:?):

"Bucharest is to Romania as Paris is to what?"
{"command":"ANALOGICAL","type":"analogy","canonical":{"a":"Bucharest","b":"Romania","c":"Paris"},"confidence":0.95}

"Doctor is to patient as teacher is to what?"
{"command":"ANALOGICAL","type":"analogy","canonical":{"a":"doctor","b":"patient","c":"teacher"},"confidence":0.95}

SEQUENCE EXAMPLES (multi-step hypothetical scenarios):

"What if Alice became a manager? Could she then access all files?"
{"command":"SEQUENCE","type":"multi_step","steps":[{"command":"THEORY_PUSH","name":"alice_manager"},{"command":"ASSERT","subject":"Alice","relation":"IS_A","object":"manager"},{"command":"ASK","subject":"Alice","relation":"CAN_ACCESS","object":"all_files"},{"command":"THEORY_POP"}],"confidence":0.95}

"Suppose we double the Engineering budget to 200000. Save this scenario."
{"command":"SEQUENCE","type":"multi_step","steps":[{"command":"THEORY_PUSH","name":"budget_increase"},{"command":"RETRACT","subject":"Engineering","relation":"HAS_BUDGET","object":"100000"},{"command":"ASSERT","subject":"Engineering","relation":"HAS_BUDGET","object":"200000"},{"command":"SAVE_THEORY","name":"budget_increase_scenario"}],"confidence":0.95}

"If Bob transferred to Engineering, could he access Engineering files? Then restore."
{"command":"SEQUENCE","type":"multi_step","steps":[{"command":"THEORY_PUSH","name":"bob_transfer"},{"command":"RETRACT","subject":"Bob","relation":"WORKS_IN","object":"Sales"},{"command":"ASSERT","subject":"Bob","relation":"WORKS_IN","object":"Engineering"},{"command":"ASK","subject":"Bob","relation":"CAN_ACCESS","object":"department_files"},{"command":"THEORY_POP"}],"confidence":0.95}

"Create a cost-cutting scenario: reduce Alice salary to 60000, save it, then restore."
{"command":"SEQUENCE","type":"multi_step","steps":[{"command":"THEORY_PUSH","name":"cost_cutting"},{"command":"RETRACT","subject":"Alice","relation":"HAS_SALARY","object":"70000"},{"command":"ASSERT","subject":"Alice","relation":"HAS_SALARY","object":"60000"},{"command":"SAVE_THEORY","name":"cost_cutting_plan"},{"command":"THEORY_POP"}],"confidence":0.95}

SUMMARIZE/ESSAY EXAMPLES (TO_NATURAL with FACTS_MATCHING):

"Summarize the economic impacts of climate change."
{"command":"SEQUENCE","type":"summarize","steps":[{"command":"FACTS_MATCHING","var":"jobs","subject":"?","relation":"CREATES","object":"jobs"},{"command":"FACTS_MATCHING","var":"costs","subject":"?","relation":"COSTS","object":"money"},{"command":"FACTS_MATCHING","var":"affects","subject":"?","relation":"AFFECTS","object":"businesses"},{"command":"TO_NATURAL","vars":["jobs","costs","affects"]}],"confidence":0.95}

"Write a brief introduction about what AI can do."
{"command":"SEQUENCE","type":"summarize","steps":[{"command":"FACTS_MATCHING","var":"capabilities","subject":"AI","relation":"CAN","object":"?"},{"command":"FACTS_MATCHING","var":"assists","subject":"AI","relation":"ASSISTS_IN","object":"?"},{"command":"FACTS_MATCHING","var":"enables","subject":"AI","relation":"ENABLES","object":"?"},{"command":"TO_NATURAL","vars":["capabilities","assists","enables"]}],"confidence":0.95}

"What solutions reduce carbon emissions?"
{"command":"FACTS_MATCHING","type":"list","canonical":{"subject":"?","relation":"REDUCES","object":"carbon_emissions"},"confidence":0.95}

"Compare what increases vs decreases carbon emissions."
{"command":"SEQUENCE","type":"compare","steps":[{"command":"FACTS_MATCHING","var":"increases","subject":"?","relation":"INCREASES","object":"carbon_emissions"},{"command":"FACTS_MATCHING","var":"decreases","subject":"?","relation":"REDUCES","object":"carbon_emissions"},{"command":"TO_NATURAL","vars":["increases","decreases"]}],"confidence":0.95}

═══════════════════════════════════════════════════════════════════════
OUTPUT (JSON only, no explanation):`;
}

/**
 * Build prompt to generate natural language response
 * @param {object} result - The result from AGISystem2
 * @param {string} originalQuestion - The user's original question
 * @returns {string} Prompt for response generation
 */
export function buildResponsePrompt(result, originalQuestion) {
  return `Generate a natural language response for this query result.

Original question: "${originalQuestion}"
Result: ${JSON.stringify(result, null, 2)}

Guidelines:
- Be concise but informative
- For TRUE_CERTAIN: Answer affirmatively with confidence
- For FALSE: Answer negatively and explain why (e.g., "No, X is not Y because X is a Z and Z is disjoint with Y")
- For UNKNOWN: Say you don't have enough information
- For PLAUSIBLE: Say it's likely/possible but not certain
- If there's a proof or explanation in the result, use it to explain
- Use the same language as the original question

Respond with the natural language answer only (no JSON).`;
}

/**
 * Build prompt to detect contradictions
 * @param {object} newFact - The new fact being added
 * @param {object[]} existingFacts - Existing facts that might conflict
 * @returns {string} Prompt for contradiction detection
 */
export function buildContradictionPrompt(newFact, existingFacts) {
  return `Check if this new fact contradicts existing knowledge.

New fact: ${newFact.subject} ${newFact.relation} ${newFact.object}

Existing facts:
${existingFacts.map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}

Consider:
1. Direct contradictions (opposite facts)
2. Logical inconsistencies
3. Violations of known constraints

Respond with JSON only:
{
  "contradicts": true | false,
  "severity": "none" | "potential" | "direct",
  "conflicts": [
    {"fact": "Subject REL Object", "reason": "explanation"}
  ],
  "suggestion": "suggest creating new theory if contradiction found"
}`;
}

/**
 * Build prompt to generate facts for missing concepts
 * Used in ontology auto-discovery cycle
 * @param {object[]} missingConcepts - Concepts not in knowledge base
 * @param {string} questionContext - The original question for context
 * @param {object[]} existingFacts - Existing facts for context
 * @returns {string} Prompt for fact generation
 */
export function buildOntologyFactsPrompt(missingConcepts, questionContext, existingFacts = []) {
  const conceptList = missingConcepts.map(c =>
    `- ${c.name} (${c.suggestedType || 'unknown type'})`
  ).join('\n');

  const existingContext = existingFacts.length > 0
    ? `\nExisting facts in knowledge base:\n${existingFacts.slice(0, 20).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}`
    : '';

  return `Generate facts to define these missing concepts in context of a question.

Question context: "${questionContext}"

Missing concepts that need definition:
${conceptList}
${existingContext}

IMPORTANT RULES:
1. Generate 5-15 facts per concept to define it well
2. ALWAYS include an IS_A fact for each concept (e.g., "Doctor IS_A profession")
3. Include relevant properties and relationships
4. Use ONLY these standard relations:
   - IS_A: category/type (REQUIRED for each concept)
   - HAS_PROPERTY: attributes
   - PART_OF / HAS_PART: composition
   - CAUSES / CAUSED_BY: causation
   - LOCATED_IN / CONTAINS: location
   - REQUIRES / REQUIRED_BY: dependencies
   - PERMITS / PERMITTED_BY / PROHIBITS / PROHIBITED_BY: rules
   - CAN / CANNOT: abilities
   - DISJOINT_WITH: mutual exclusion
5. Be consistent with existing facts if provided
6. Focus on facts relevant to answering the question
7. Use lowercase for general types, Capitalized for specific instances

Example for "Doctor" in context "Can a doctor treat a patient?":
- Doctor IS_A profession
- Doctor IS_A medical_professional
- Doctor HAS_PROPERTY medical_license
- Doctor CAN treat
- Doctor CAN diagnose
- Doctor REQUIRES medical_training
- treatment REQUIRES Doctor
- Patient TREATED_BY Doctor

Respond with JSON only:
{
  "facts": [
    {"subject": "Concept", "relation": "RELATION", "object": "OtherConcept"},
    ...
  ],
  "conceptsCovered": ["list of concepts that were defined"],
  "confidence": 0.0-1.0
}`;
}

/**
 * Build prompt to suggest a theory name
 * @param {object[]} facts - Facts in the new theory branch
 * @param {string} reason - Why the branch was created
 * @returns {string} Prompt for theory naming
 */
export function buildTheoryNamePrompt(facts, reason) {
  return `Suggest a descriptive name for a new knowledge theory.

Reason for creating: ${reason}

Key facts:
${facts.slice(0, 5).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}

Respond with JSON only:
{
  "suggested_name": "short_descriptive_name",
  "description": "Brief description of what this theory represents"
}`;
}
