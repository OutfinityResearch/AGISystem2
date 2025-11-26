#!/usr/bin/env bash
#
# DS(/bin/AGISystem2.sh) - AGISystem2 Chat Interface Launcher
#
# Launches the natural language chat interface for AGISystem2.
# Automatically configures NODE_PATH to find AchillesAgentLib.
#
# Usage:
#   ./bin/AGISystem2.sh [options]
#
# Options:
#   --help, -h     Show help
#   --debug        Enable debug output
#   --no-color     Disable colored output
#
# Environment Variables:
#   NODE_PATH      Additional paths to search for modules
#   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY
#                  At least one LLM API key is required
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGISYSTEM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CHAT_SCRIPT="$AGISYSTEM_ROOT/chat/index.mjs"

# Check if chat script exists
if [ ! -f "$CHAT_SCRIPT" ]; then
  echo "ERROR: Chat interface not found at $CHAT_SCRIPT" >&2
  exit 1
fi

# Determine AchillesAgentLib location
# Priority:
# 1. Already in NODE_PATH
# 2. Sibling directory (../AchillesAgentLib)
# 3. Parent's symlink (../work/AchillesAgentLib)

ACHILLES_LIB_FOUND=""

# Function to check if library is accessible from a path
check_lib_path() {
  local test_path="$1"
  if [ -d "$test_path" ] && [ -f "$test_path/index.mjs" ]; then
    echo "$test_path"
    return 0
  fi
  return 1
}

# Try common locations
PARENT_DIR="$(dirname "$AGISYSTEM_ROOT")"

# Check sibling directories
for candidate in \
  "$PARENT_DIR/AchillesAgentLib" \
  "$PARENT_DIR/achillesAgentLib" \
  "$PARENT_DIR/ploinky/node_modules/achillesAgentLib" \
  "$HOME/work/AchillesAgentLib" \
  "/usr/local/lib/node_modules/achillesAgentLib"; do

  if [ -d "$candidate" ]; then
    ACHILLES_LIB_FOUND="$candidate"
    break
  fi

  # Also check if it's a symlink
  if [ -L "$candidate" ]; then
    resolved=$(readlink -f "$candidate" 2>/dev/null || echo "")
    if [ -n "$resolved" ] && [ -d "$resolved" ]; then
      ACHILLES_LIB_FOUND="$resolved"
      break
    fi
  fi
done

# Build NODE_PATH
if [ -n "$ACHILLES_LIB_FOUND" ]; then
  ACHILLES_PARENT="$(dirname "$ACHILLES_LIB_FOUND")"
  if [ -n "$NODE_PATH" ]; then
    export NODE_PATH="$ACHILLES_PARENT:$NODE_PATH"
  else
    export NODE_PATH="$ACHILLES_PARENT"
  fi
fi

# Also add AGISystem2 itself to NODE_PATH for internal imports
if [ -n "$NODE_PATH" ]; then
  export NODE_PATH="$AGISYSTEM_ROOT:$NODE_PATH"
else
  export NODE_PATH="$AGISYSTEM_ROOT"
fi

# Check for help flag
for arg in "$@"; do
  if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
    cat << 'HELPTEXT'
AGISystem2 Chat Interface

A natural language interface for AGISystem2 knowledge reasoning.

USAGE:
    AGISystem2.sh [OPTIONS]

OPTIONS:
    --help, -h     Show this help message
    --debug        Enable debug output
    --no-color     Disable colored output

ENVIRONMENT:
    At least one LLM API key must be set:
      OPENAI_API_KEY      For OpenAI models (gpt-4o-mini, etc.)
      ANTHROPIC_API_KEY   For Claude models
      GEMINI_API_KEY      For Google Gemini models
      OPENROUTER_API_KEY  For OpenRouter proxy

    You can put these in a .env file in your working directory.

    NODE_PATH is automatically configured if AchillesAgentLib is found
    in common locations. If not found, you may need to set:
      export NODE_PATH="/path/to/achillesAgentLib/parent"

EXAMPLES:
    # Start interactive chat
    ./bin/AGISystem2.sh

    # With debug output
    ./bin/AGISystem2.sh --debug

    # Without colors (for piping/logging)
    ./bin/AGISystem2.sh --no-color

INSIDE THE CHAT:
    Type naturally to teach facts:
      "Dogs are animals"
      "Fire causes smoke"

    Ask questions:
      "Is a dog an animal?"
      "What causes smoke?"

    Use /commands:
      /help     - Show chat help
      /facts    - List known facts
      /theories - Show theory stack
      /exit     - Exit

HELPTEXT
    exit 0
  fi
done

# Print diagnostic info if in debug mode
for arg in "$@"; do
  if [ "$arg" = "--debug" ]; then
    echo "=== AGISystem2 Debug Info ===" >&2
    echo "Script dir: $SCRIPT_DIR" >&2
    echo "AGISystem2 root: $AGISYSTEM_ROOT" >&2
    echo "Chat script: $CHAT_SCRIPT" >&2
    echo "AchillesAgentLib found: ${ACHILLES_LIB_FOUND:-NOT FOUND}" >&2
    echo "NODE_PATH: $NODE_PATH" >&2
    echo "============================" >&2
    break
  fi
done

# Check if we found the library
if [ -z "$ACHILLES_LIB_FOUND" ]; then
  echo "WARNING: AchillesAgentLib not found in common locations." >&2
  echo "The chat interface may fail to start." >&2
  echo "" >&2
  echo "To fix this, either:" >&2
  echo "  1. Set NODE_PATH to include the library's parent directory:" >&2
  echo "     export NODE_PATH=\"/path/to/achillesAgentLib/parent:\$NODE_PATH\"" >&2
  echo "" >&2
  echo "  2. Or install/link the library:" >&2
  echo "     npm link achillesAgentLib" >&2
  echo "" >&2
  echo "Attempting to start anyway..." >&2
  echo "" >&2
fi

# Run the chat interface
exec node "$CHAT_SCRIPT" "$@"
