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
export const SYSTEM_PROMPT = `You are AGISystem2, a knowledge reasoning assistant.
You help users manage theories (collections of facts), ask questions, and reason about knowledge.

Your capabilities:
1. Learn new facts from natural language
2. Answer questions using stored knowledge
3. Detect contradictions between facts
4. Manage multiple theories (knowledge contexts)
5. Import facts from text files

Facts are stored as Subject-Relation-Object triples.
Common relations: IS_A, HAS_PROPERTY, CAUSES, CAUSED_BY, LOCATED_IN, REQUIRES, PERMITS, PROHIBITED_BY

When the user teaches you something, extract facts as triples.
When the user asks questions, translate to queries and explain results.
If you detect potential contradictions, suggest creating a new theory branch.

Always respond naturally in the user's language.`;

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

Text: "${text}"

Use these relations when appropriate:
- IS_A: category/type (e.g., "Dog IS_A Animal")
- HAS_PROPERTY: attributes (e.g., "Water HAS_PROPERTY liquid")
- CAUSES / CAUSED_BY: causation (e.g., "Fire CAUSES Smoke")
- LOCATED_IN: location (e.g., "Paris LOCATED_IN France")
- REQUIRES: dependencies (e.g., "Driving REQUIRES License")
- PERMITS / PROHIBITED_BY: permissions/rules

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
 * Build prompt to convert natural language question to canonical form
 * @param {string} question - Natural language question
 * @returns {string} Prompt for question parsing
 */
export function buildQuestionPrompt(question) {
  return `Convert this natural language question to a canonical query format.

Question: "${question}"

Determine:
1. Is this a yes/no question about a specific fact?
2. Is this asking "what" something is?
3. Is this asking for causes/effects?
4. Is this asking for a list of related facts?

Respond with JSON only:
{
  "type": "yes_no" | "what_is" | "causes" | "effects" | "list" | "unknown",
  "canonical": {
    "subject": "the subject being asked about",
    "relation": "the relation (if specific)",
    "object": "the object (if specific)"
  },
  "original": "original question",
  "confidence": 0.0-1.0
}`;
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
- If the answer is uncertain, explain why
- If facts support the answer, briefly mention them
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
