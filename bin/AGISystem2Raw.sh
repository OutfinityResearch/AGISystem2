#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/../cli/agisystem2-cli.js"

if [ ! -f "$NODE_SCRIPT" ]; then
  echo "AGISystem2 CLI script not found at $NODE_SCRIPT" >&2
  exit 1
fi

node "$NODE_SCRIPT" "$@"

