#!/bin/bash
# Scan JavaScript, HTML, and Markdown sources while ignoring most node_modules entries.
# Adjust INCLUDED_NODE_MODULES to keep specific dependencies in the report.

set -euo pipefail

# Add module folder names (relative to node_modules) to include in the count.
# Example: INCLUDED_NODE_MODULES=(my-shared-lib another-lib)
INCLUDED_NODE_MODULES=()

# Collect all JS/MJS, HTML and MD files, pruning node_modules entirely for speed.
files_to_process=()
while IFS= read -r -d '' file; do
  files_to_process+=("$file")
done < <(find . -path "*/node_modules" -prune -o -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.md" \) -print0)

# Collect explicitly included node_modules (if any).
if [[ ${#INCLUDED_NODE_MODULES[@]} -gt 0 ]]; then
  for module in "${INCLUDED_NODE_MODULES[@]}"; do
    while IFS= read -r -d '' module_path; do
      while IFS= read -r -d '' file; do
        files_to_process+=("$file")
      done < <(find "$module_path" -type f -name "*.*js" -print0)
    done < <(find . -type d -path "*/node_modules/${module}" -print0)
  done
fi

if [[ ${#files_to_process[@]} -eq 0 ]]; then
  echo "No JavaScript, HTML, or Markdown files found."
  exit 0
fi

js_files=()
html_files=()
md_files=()
for file in "${files_to_process[@]}"; do
  case "$file" in
    *.js|*.mjs) js_files+=("$file") ;;
    *.html) html_files+=("$file") ;;
    *.md) md_files+=("$file") ;;
  esac
done

total_js_lines=0
total_html_lines=0
total_md_lines=0

if [[ ${#js_files[@]} -gt 0 ]]; then
  echo "--- JS Files ---"
  js_lines_output=$(printf '%s\0' "${js_files[@]}" | xargs -0 wc -l | sort -n)
  echo "$js_lines_output"
  total_js_lines_raw=$(echo "$js_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_js_lines_raw" ]]; then
    total_js_lines=$total_js_lines_raw
  fi
fi

if [[ ${#html_files[@]} -gt 0 ]]; then
  echo ""
  echo "--- HTML Files ---"
  html_lines_output=$(printf '%s\0' "${html_files[@]}" | xargs -0 wc -l | sort -n)
  echo "$html_lines_output"
  total_html_lines_raw=$(echo "$html_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_html_lines_raw" ]]; then
    total_html_lines=$total_html_lines_raw
  fi
fi

if [[ ${#md_files[@]} -gt 0 ]]; then
  echo ""
  echo "--- Markdown Files ---"
  md_lines_output=$(printf '%s\0' "${md_files[@]}" | xargs -0 wc -l | sort -n)
  echo "$md_lines_output"
  total_md_lines_raw=$(echo "$md_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_md_lines_raw" ]]; then
    total_md_lines=$total_md_lines_raw
  fi
fi

echo ""
echo "--- Summary ---"
echo "Total JS lines: ${total_js_lines:-0}"
echo "Total HTML lines: ${total_html_lines:-0}"
echo "Total MD lines: ${total_md_lines:-0}"
grand_total=$((total_js_lines + total_html_lines + total_md_lines))
echo "Grand Total lines: $grand_total"
