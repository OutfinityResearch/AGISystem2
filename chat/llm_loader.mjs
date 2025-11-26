/**
 * DS(/chat/llm_loader.mjs) - LLM Library Loader
 *
 * Handles dynamic loading of AchillesAgentLib with graceful fallback.
 * Checks NODE_PATH and provides clear error messages if library not found.
 *
 * @module chat/llm_loader
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LIBRARY_NAME = 'achillesAgentLib';

/**
 * Check if library is available
 * @returns {boolean}
 */
export function isLibraryAvailable() {
  try {
    // Try to resolve the module without importing
    import.meta.resolve?.(LIBRARY_NAME);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get helpful error message for missing library
 * @returns {string}
 */
export function getMissingLibraryHelp() {
  const nodePath = process.env.NODE_PATH || '(not set)';

  return `
================================================================================
ERROR: AchillesAgentLib not found
================================================================================

The AGISystem2 chat interface requires the AchillesAgentLib library.

Current NODE_PATH: ${nodePath}

To fix this, you have several options:

1. Set NODE_PATH environment variable:
   export NODE_PATH="/path/to/AchillesAgentLib/parent:$NODE_PATH"

2. Use the AGISystem2.sh launcher script which sets this automatically

3. Install achillesAgentLib in your project:
   npm install achillesAgentLib

4. Link the library:
   npm link achillesAgentLib

Required environment variables for LLM providers (at least one):
  - OPENAI_API_KEY     (for OpenAI models)
  - ANTHROPIC_API_KEY  (for Claude models)
  - GEMINI_API_KEY     (for Google Gemini models)
  - OPENROUTER_API_KEY (for OpenRouter proxy)

You can set these in a .env file in your working directory or parent directories.
================================================================================
`;
}

/**
 * Find AchillesAgentLib in common locations
 * @returns {string|null} Path to index.mjs if found
 */
function findLibraryPath() {
  // Get the chat directory and AGISystem2 root
  const chatDir = path.dirname(new URL(import.meta.url).pathname);
  const agisystemRoot = path.resolve(chatDir, '..');
  const parentDir = path.dirname(agisystemRoot);

  // Candidate paths to search
  const candidates = [
    // Sibling directory
    path.join(parentDir, 'AchillesAgentLib', 'index.mjs'),
    path.join(parentDir, 'achillesAgentLib', 'index.mjs'),
    // Resolved symlink in parent
    path.join(parentDir, 'AchillesAgentLib'),
    // ploinky node_modules
    path.join(parentDir, 'ploinky', 'node_modules', 'achillesAgentLib', 'index.mjs'),
    // Home directory
    path.join(process.env.HOME || '', 'work', 'AchillesAgentLib', 'index.mjs'),
  ];

  // Also check NODE_PATH
  const nodePath = process.env.NODE_PATH || '';
  for (const p of nodePath.split(path.delimiter)) {
    if (p) {
      candidates.push(path.join(p, LIBRARY_NAME, 'index.mjs'));
      candidates.push(path.join(p, 'AchillesAgentLib', 'index.mjs'));
    }
  }

  for (const candidate of candidates) {
    try {
      // Handle symlinks
      let resolved = candidate;
      if (fs.existsSync(candidate)) {
        const stats = fs.lstatSync(candidate);
        if (stats.isSymbolicLink()) {
          resolved = fs.realpathSync(candidate);
        }
        // Check if it's a directory (symlink resolved to dir)
        if (fs.statSync(resolved).isDirectory()) {
          const indexPath = path.join(resolved, 'index.mjs');
          if (fs.existsSync(indexPath)) {
            return indexPath;
          }
        } else if (resolved.endsWith('.mjs') && fs.existsSync(resolved)) {
          return resolved;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Load LLMAgent from AchillesAgentLib
 * @returns {Promise<{LLMAgent: Function, available: boolean, error?: string}>}
 */
export async function loadLLMAgent() {
  // First try direct import (works if properly installed in node_modules)
  try {
    const lib = await import(LIBRARY_NAME);
    if (lib.LLMAgent) {
      return {
        available: true,
        LLMAgent: lib.LLMAgent,
        extractKeyValuePairs: lib.extractKeyValuePairs,
        responseToJSON: lib.responseToJSON
      };
    }
  } catch {
    // Direct import failed, try to find the library manually
  }

  // Try to find the library in common locations
  const libPath = findLibraryPath();
  if (libPath) {
    try {
      const fileUrl = pathToFileURL(libPath).href;
      const lib = await import(fileUrl);

      if (!lib.LLMAgent) {
        return {
          available: false,
          error: `AchillesAgentLib loaded from ${libPath} but LLMAgent not exported`,
          LLMAgent: null
        };
      }

      return {
        available: true,
        LLMAgent: lib.LLMAgent,
        extractKeyValuePairs: lib.extractKeyValuePairs,
        responseToJSON: lib.responseToJSON
      };
    } catch (err) {
      return {
        available: false,
        error: `Found library at ${libPath} but failed to load: ${err.message}`,
        LLMAgent: null
      };
    }
  }

  return {
    available: false,
    error: 'AchillesAgentLib not found in any known location',
    LLMAgent: null
  };
}

/**
 * Check if any LLM API keys are configured
 * @returns {{configured: boolean, providers: string[]}}
 */
export function checkAPIKeys() {
  const providers = [];

  if (process.env.OPENAI_API_KEY) providers.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) providers.push('Anthropic');
  if (process.env.GEMINI_API_KEY) providers.push('Google Gemini');
  if (process.env.OPENROUTER_API_KEY) providers.push('OpenRouter');

  return {
    configured: providers.length > 0,
    providers
  };
}
