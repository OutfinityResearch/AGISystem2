/**
 * DS(/chat/chat_handlers.mjs) - Chat Intent Handlers
 *
 * Implements handlers for different user intents:
 * - Teaching new facts
 * - Asking questions
 * - Importing files
 * - Theory management
 * - Listing knowledge
 *
 * @module chat/chat_handlers
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  buildFactExtractionPrompt,
  buildQuestionPrompt,
  buildResponsePrompt,
  buildContradictionPrompt,
  buildTheoryNamePrompt
} from './prompts.mjs';

/**
 * Handle teaching new facts
 * @param {object} ctx - Context with llmAgent, session
 * @param {string} message - User message
 * @param {object} details - Intent details
 * @returns {Promise<{response: string, actions: object[]}>}
 */
export async function handleTeach(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  // Extract facts using LLM
  const prompt = buildFactExtractionPrompt(message);
  let facts = [];

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'extract-facts' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      facts = parsed.facts || [];
    }
  } catch (err) {
    if (details?.facts) {
      facts = details.facts;
    }
  }

  if (facts.length === 0) {
    return {
      response: "I couldn't extract any facts from that. Could you rephrase? " +
        "Try something like: 'Dogs are animals' or 'Fire causes smoke'.",
      actions: []
    };
  }

  // Check for contradictions before adding
  const contradictions = await checkContradictions(ctx, facts);
  if (contradictions.length > 0) {
    const suggestion = await suggestTheoryBranch(ctx, facts, contradictions);
    return {
      response: `I noticed potential contradictions with existing knowledge:\n` +
        contradictions.map(c => `- ${c.reason}`).join('\n') +
        `\n\nWould you like me to create a new theory branch? ` +
        `Suggested name: "${suggestion.name}"`,
      actions: [{ type: 'contradiction_detected', contradictions, suggestion }]
    };
  }

  // Add facts to current session
  const added = [];
  for (const fact of facts) {
    try {
      session.run([`@f ASSERT ${fact.subject} ${fact.relation} ${fact.object}`]);
      added.push(fact);
      actions.push({ type: 'fact_added', fact });
    } catch (err) {
      actions.push({ type: 'fact_failed', fact, error: err.message });
    }
  }

  const responseText = added.length > 0
    ? `Got it! I've learned ${added.length} fact(s):\n` +
      added.map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')
    : "I couldn't add any facts. There might have been an issue.";

  return { response: responseText, actions };
}

/**
 * Handle questions
 */
export async function handleAsk(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  const prompt = buildQuestionPrompt(message);
  let parsedQuestion = null;

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'parse-question' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedQuestion = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    // Continue with best effort
  }

  let result;
  try {
    if (parsedQuestion?.type === 'yes_no' && parsedQuestion.canonical) {
      const { subject, relation, object } = parsedQuestion.canonical;
      if (subject && relation && object) {
        const env = session.run([`@q ASK "${subject} ${relation} ${object}?"`]);
        result = env.q || env.result || {};
        actions.push({ type: 'query', query: parsedQuestion.canonical, result });
      }
    } else if (parsedQuestion?.type === 'list') {
      const subject = parsedQuestion.canonical?.subject || '';
      const env = session.run([`@r FACTS_MATCHING ${subject || '?'} ? ?`]);
      result = { facts: env.r || [] };
      actions.push({ type: 'list_facts', result });
    } else {
      const env = session.run([`@q ASK "${message}"`]);
      result = env.q || env.result || {};
      actions.push({ type: 'query', result });
    }
  } catch (err) {
    result = { error: err.message };
    actions.push({ type: 'query_error', error: err.message });
  }

  const nlResponse = await generateResponse(ctx, result, message);
  return { response: nlResponse, actions };
}

/**
 * Handle file imports
 */
export async function handleImport(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  let filepath = details?.filepath;
  if (!filepath) {
    const pathMatch = message.match(/(?:import|load|read)\s+(?:file\s+)?["']?([^\s"']+)["']?/i);
    if (pathMatch) {
      filepath = pathMatch[1];
    }
  }

  if (!filepath) {
    return {
      response: "Please specify a file path, e.g., 'import file theories/my_facts.txt'",
      actions: []
    };
  }

  const resolvedPath = path.isAbsolute(filepath)
    ? filepath
    : path.resolve(process.cwd(), filepath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      response: `File not found: ${resolvedPath}`,
      actions: [{ type: 'import_error', error: 'File not found', path: resolvedPath }]
    };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

    let totalFacts = 0;
    for (const line of lines.slice(0, 100)) {
      const prompt = buildFactExtractionPrompt(line);
      try {
        const response = await llmAgent.complete({
          prompt,
          mode: 'fast',
          context: { intent: 'extract-facts-import' }
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const fact of (parsed.facts || [])) {
            try {
              session.run([`@f ASSERT ${fact.subject} ${fact.relation} ${fact.object}`]);
              totalFacts++;
            } catch {
              // Skip failed facts
            }
          }
        }
      } catch {
        // Skip failed lines
      }
    }

    actions.push({ type: 'import_success', path: resolvedPath, factsImported: totalFacts });
    return {
      response: `Imported ${totalFacts} facts from ${path.basename(resolvedPath)}`,
      actions
    };
  } catch (err) {
    return {
      response: `Error reading file: ${err.message}`,
      actions: [{ type: 'import_error', error: err.message }]
    };
  }
}

/**
 * Handle theory management commands
 */
export async function handleTheoryManagement(ctx, message, details) {
  const { session, theoriesRoot, setCurrentTheory, currentTheory } = ctx;
  const actions = [];
  const lower = message.toLowerCase();

  if (lower.includes('create') || lower.includes('new')) {
    const nameMatch = message.match(/(?:create|new)\s+(?:theory\s+)?["']?([a-zA-Z0-9_]+)["']?/i);
    const name = nameMatch?.[1] || `theory_${Date.now()}`;

    session.run([`@r THEORY_PUSH name="${name}"`]);
    setCurrentTheory(name);
    actions.push({ type: 'theory_created', name });

    return {
      response: `Created new theory branch: "${name}". All new facts will be added to this context.`,
      actions
    };
  }

  if (lower.includes('pop') || lower.includes('discard')) {
    const env = session.run(['@r THEORY_POP']);
    actions.push({ type: 'theory_popped', result: env.r });

    return {
      response: `Discarded current theory layer. Returned to previous context.`,
      actions
    };
  }

  if (lower.includes('list') || lower.includes('show')) {
    const env = session.run(['@r LIST_THEORIES']);
    const theories = env.r || {};
    actions.push({ type: 'theories_listed', theories });

    return {
      response: `Current theory stack:\n${JSON.stringify(theories, null, 2)}`,
      actions
    };
  }

  if (lower.includes('save')) {
    const nameMatch = message.match(/save\s+(?:as\s+)?["']?([a-zA-Z0-9_]+)["']?/i);
    const name = nameMatch?.[1] || currentTheory;
    const filepath = path.join(theoriesRoot, `${name}.sys2dsl`);

    const env = session.run(['@r FACTS_MATCHING ? ? ?']);
    const facts = env.r || [];
    const content = facts.map(f => `${f.subject} ${f.relation} ${f.object}`).join('\n');
    fs.writeFileSync(filepath, content, 'utf8');

    actions.push({ type: 'theory_saved', name, path: filepath });
    return {
      response: `Saved theory "${name}" to ${filepath}`,
      actions
    };
  }

  return {
    response: `Theory management commands:\n` +
      `- "create new theory [name]" - create a new theory branch\n` +
      `- "pop theory" - discard current layer\n` +
      `- "list theories" - show theory stack\n` +
      `- "save theory [name]" - save current theory to file`,
    actions
  };
}

/**
 * Handle list commands
 */
export async function handleList(ctx, details) {
  const { session } = ctx;
  const what = details?.what || 'facts';
  const actions = [];

  if (what === 'facts' || what === 'all') {
    const env = session.run(['@r FACTS_MATCHING ? ? ?']);
    const facts = env.r || [];
    actions.push({ type: 'facts_listed', facts });

    if (facts.length === 0) {
      return { response: 'No facts stored yet. Teach me something!', actions };
    }

    return {
      response: `Current facts (${facts.length}):\n` +
        facts.slice(0, 20).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n') +
        (facts.length > 20 ? `\n... and ${facts.length - 20} more` : ''),
      actions
    };
  }

  if (what === 'concepts') {
    const conceptStore = session.engine.conceptStore;
    const concepts = conceptStore.listConcepts();
    actions.push({ type: 'concepts_listed', concepts });

    return {
      response: `Known concepts (${concepts.length}):\n${concepts.slice(0, 30).join(', ')}` +
        (concepts.length > 30 ? ` ... and ${concepts.length - 30} more` : ''),
      actions
    };
  }

  if (what === 'theories') {
    return handleTheoryManagement(ctx, 'list theories', {});
  }

  return {
    response: `You can list: facts, concepts, or theories`,
    actions
  };
}

/**
 * Handle help command
 */
export function handleHelp() {
  return {
    response: `AGISystem2 Chat Help

I can help you manage knowledge through natural conversation:

**Teaching facts:**
- "Dogs are animals"
- "Fire causes smoke"
- "Paris is located in France"

**Asking questions:**
- "Is a dog an animal?"
- "What causes smoke?"
- "Tell me about Paris"

**Importing files:**
- "Import file my_facts.txt"

**Managing theories (knowledge contexts):**
- "Create new theory medical_knowledge"
- "List theories"
- "Save theory as my_theory"

**Listing knowledge:**
- "List all facts"
- "Show me the concepts"

I automatically detect contradictions and suggest creating theory branches when needed.`,
    actions: [{ type: 'help_shown' }]
  };
}

/**
 * Check for contradictions with existing facts
 */
export async function checkContradictions(ctx, newFacts) {
  const { llmAgent, session } = ctx;
  const contradictions = [];

  const env = session.run(['@r FACTS_MATCHING ? ? ?']);
  const existingFacts = env.r || [];

  for (const newFact of newFacts) {
    const prompt = buildContradictionPrompt(newFact, existingFacts);

    try {
      const response = await llmAgent.complete({
        prompt,
        mode: 'fast',
        context: { intent: 'check-contradiction' }
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.contradicts && result.severity !== 'none') {
          contradictions.push({
            newFact,
            conflicts: result.conflicts,
            reason: result.conflicts?.[0]?.reason || 'Potential contradiction detected'
          });
        }
      }
    } catch {
      // Continue without contradiction check
    }
  }

  return contradictions;
}

/**
 * Suggest a theory branch name
 */
export async function suggestTheoryBranch(ctx, facts, contradictions) {
  const { llmAgent } = ctx;
  const reason = contradictions.map(c => c.reason).join('; ');
  const prompt = buildTheoryNamePrompt(facts, reason);

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'suggest-theory-name' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        name: result.suggested_name || `alternative_${Date.now()}`,
        description: result.description || 'Alternative theory branch'
      };
    }
  } catch {
    // Fallback
  }

  return {
    name: `alternative_${Date.now()}`,
    description: 'Alternative theory branch'
  };
}

/**
 * Generate natural language response
 */
export async function generateResponse(ctx, result, originalQuestion) {
  const { llmAgent } = ctx;
  const prompt = buildResponsePrompt(result, originalQuestion);

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'generate-response' }
    });
    return response.trim();
  } catch {
    if (result.truth !== undefined) {
      return result.truth === 'TRUE_CERTAIN' || result.truth === true
        ? 'Yes, that appears to be true based on what I know.'
        : result.truth === 'FALSE_CERTAIN' || result.truth === false
          ? 'No, that doesn\'t seem to be the case.'
          : 'I\'m not certain about that.';
    }
    return JSON.stringify(result, null, 2);
  }
}
