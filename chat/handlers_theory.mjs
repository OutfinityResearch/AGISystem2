/**
 * DS(/chat/handlers_theory.mjs) - Theory management, import and listing handlers
 *
 * Contains chat intent handlers for:
 * - Importing facts from files (`handleImport`)
 * - Managing theory branches (`handleTheoryManagement`)
 * - Listing facts/concepts/theories (`handleList`)
 * - High-level chat help text (`handleHelp`)
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildFactExtractionPrompt } from './prompts.mjs';

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
    const lines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));

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
          for (const fact of parsed.facts || []) {
            try {
              session.run([`@imp${totalFacts} ${fact.subject} ${fact.relation} ${fact.object}`]);
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

    session.run([`@r ${name} THEORY_PUSH any`]);
    setCurrentTheory(name);
    actions.push({ type: 'theory_created', name });

    return {
      response: `Created new theory branch: "${name}". All new facts will be added to this context.`,
      actions
    };
  }

  if (lower.includes('pop') || lower.includes('discard')) {
    const env = session.run(['@r any THEORY_POP any']);
    actions.push({ type: 'theory_popped', result: env.r });

    return {
      response: 'Discarded current theory layer. Returned to previous context.',
      actions
    };
  }

  if (lower.includes('list') || lower.includes('show')) {
    const env = session.run(['@r any LIST_THEORIES any']);
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

    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];
    const content = facts.map((f) => `${f.subject} ${f.relation} ${f.object}`).join('\n');
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
    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];
    actions.push({ type: 'facts_listed', facts });

    if (facts.length === 0) {
      return { response: 'No facts stored yet. Teach me something!', actions };
    }

    return {
      response: `Current facts (${facts.length}):\n` +
        facts.slice(0, 20).map((f) => `- ${f.subject} ${f.relation} ${f.object}`).join('\n') +
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
    response: 'You can list: facts, concepts, or theories',
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

