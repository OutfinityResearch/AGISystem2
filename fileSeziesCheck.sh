#!/bin/bash
set -euo pipefail

# Scan JavaScript, HTML, and Markdown sources while ignoring most node_modules entries.
# Adjust INCLUDED_NODE_MODULES to keep specific dependencies in the report.

# Color thresholds for line counts
YELLOW_THRESHOLD=500
RED_THRESHOLD=800
# Recursively split only when there are subfolders and the group is too large.
# Note: if all files are in the same folder (no subfolders), we keep them together even if there are many.
MAX_FILES_PER_GROUP=15

# Collected list of "red" files (> RED_THRESHOLD lines)
declare -A RED_FILES_BY_PATH=()

# Color output (only when stdout is a TTY).
if [[ -t 1 ]]; then
  COLOR_RED=$(tput setaf 1 2>/dev/null || true)
  COLOR_YELLOW=$(tput setaf 3 2>/dev/null || true)
  COLOR_RESET=$(tput sgr0 2>/dev/null || true)
else
  COLOR_RED=""
  COLOR_YELLOW=""
  COLOR_RESET=""
fi

# Try to detect terminal width for nicer formatting
TERM_COLS=$(tput cols 2>/dev/null || echo "${COLUMNS:-80}")

# Shorten a path to fit in a given width by keeping only the tail
shorten_path() {
  local path="$1"
  local max="$2"
  local len=${#path}
  if (( len <= max || max <= 4 )); then
    printf "%s" "$path"
    return
  fi
  local keep=$((max - 1))
  if (( keep < 1 )); then
    keep=1
  fi
  printf "…%s" "${path: -keep}"
}

colorize_count() {
  local count="$1"
  local padded="$2"

  if [[ -z "$COLOR_RESET" ]]; then
    printf "%s" "$padded"
    return
  fi

  if (( count > RED_THRESHOLD )); then
    printf "%s%s%s" "$COLOR_RED" "$padded" "$COLOR_RESET"
    return
  fi
  if (( count > YELLOW_THRESHOLD )); then
    printf "%s%s%s" "$COLOR_YELLOW" "$padded" "$COLOR_RESET"
    return
  fi
  printf "%s" "$padded"
}

record_red_file() {
  local count="$1"
  local path="$2"
  if (( count > RED_THRESHOLD )); then
    RED_FILES_BY_PATH["$path"]="$count"
  fi
}

join_display_path() {
  local base="$1"
  local leaf="$2"
  if [[ -z "$base" || "$base" == "." ]]; then
    printf "%s" "$leaf"
    return
  fi
  printf "%s/%s" "$base" "$leaf"
}

render_files_recursive() {
  local label="$1"         # e.g. "JS Files"
  local display_path="$2"  # e.g. "src/runtime"
  local base_path="$3"     # e.g. "./src/runtime"
  shift 3
  local -a files_arr=("$@")

  local count=${#files_arr[@]}
  if (( count == 0 )); then
    return
  fi

  # Base case: small enough to render per-file
  if (( count <= MAX_FILES_PER_GROUP )); then
    local wc_output folder_total
    wc_output=$(printf '%s\0' "${files_arr[@]}" | xargs -0 wc -l | sort -n)
    folder_total=$(echo "$wc_output" | tail -n 1 | awk '{print $1}')
    mapfile -t cat_rows < <(echo "$wc_output" | sed '$d')
    render_category "$label [$display_path] (total: $folder_total lines)" cat_rows
    return
  fi

  # If we can't split further (all files are directly under this base path), render as-is.
  local can_split=0
  for file in "${files_arr[@]}"; do
    local rel="$file"
    if [[ "$base_path" != "." ]]; then
      rel="${file#${base_path}/}"
    else
      rel="${file#./}"
    fi
    if [[ "$rel" == "$file" ]]; then
      rel="$file"
    fi
    if [[ "$rel" == */* ]]; then
      can_split=1
      break
    fi
  done

  if (( can_split == 0 )); then
    local wc_output folder_total
    wc_output=$(printf '%s\0' "${files_arr[@]}" | xargs -0 wc -l | sort -n)
    folder_total=$(echo "$wc_output" | tail -n 1 | awk '{print $1}')
    mapfile -t cat_rows < <(echo "$wc_output" | sed '$d')
    render_category "$label [$display_path] (total: $folder_total lines)" cat_rows
    return
  fi

  # Split by immediate subfolder name.
  local -A groups=()
  for file in "${files_arr[@]}"; do
    local rel="$file"
    if [[ "$base_path" != "." ]]; then
      rel="${file#${base_path}/}"
    else
      rel="${file#./}"
    fi
    local key="${rel%%/*}"
    if [[ "$key" == "$rel" ]]; then
      key="(files)"
    fi
    groups["$key"]=1
  done

  local keys=()
  if [[ -v groups["(files)"] ]]; then
    keys+=("(files)")
  fi
  for k in "${!groups[@]}"; do
    if [[ "$k" != "(files)" ]]; then
      keys+=("$k")
    fi
  done
  if (( ${#keys[@]} > 1 )); then
    local sorted_rest=()
    for k in "${keys[@]}"; do
      if [[ "$k" != "(files)" ]]; then
        sorted_rest+=("$k")
      fi
    done
    if (( ${#sorted_rest[@]} > 0 )); then
      IFS=$'\n' sorted_rest=($(sort <<<"${sorted_rest[*]}")); unset IFS
    fi
    keys=()
    if [[ -v groups["(files)"] ]]; then
      keys+=("(files)")
    fi
    for k in "${sorted_rest[@]}"; do
      keys+=("$k")
    done
  fi

  # Recurse into each key; if a subgroup is still too large, keep splitting.
  for key in "${keys[@]}"; do
    local -a child_files=()
    for file in "${files_arr[@]}"; do
      local rel="$file"
      if [[ "$base_path" != "." ]]; then
        rel="${file#${base_path}/}"
      else
        rel="${file#./}"
      fi
      local file_key="${rel%%/*}"
      if [[ "$file_key" == "$rel" ]]; then
        file_key="(files)"
      fi
      if [[ "$file_key" == "$key" ]]; then
        child_files+=("$file")
      fi
    done

    if (( ${#child_files[@]} == 0 )); then
      continue
    fi

    if [[ "$key" == "(files)" ]]; then
      # Files directly under base path; can't split further for these.
      local wc_output folder_total
      wc_output=$(printf '%s\0' "${child_files[@]}" | xargs -0 wc -l | sort -n)
      folder_total=$(echo "$wc_output" | tail -n 1 | awk '{print $1}')
      mapfile -t cat_rows < <(echo "$wc_output" | sed '$d')
      local show_path
      show_path=$(join_display_path "$display_path" "(files)")
      render_category "$label [$show_path] (total: $folder_total lines)" cat_rows
      continue
    fi

    local next_display next_base
    next_display=$(join_display_path "$display_path" "$key")
    next_base="$base_path/$key"
    render_files_recursive "$label" "$next_display" "$next_base" "${child_files[@]}"
  done
}

# Add module folder names (relative to node_modules) to include in the count.
# Example: INCLUDED_NODE_MODULES=(my-shared-lib another-lib)
INCLUDED_NODE_MODULES=()

# Collect all JS/MJS, HTML, MD and SYS2 files, pruning node_modules entirely for speed.
files_to_process=()
while IFS= read -r -d '' file; do
  files_to_process+=("$file")
done < <(find . -path "*/node_modules" -prune -o -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.md" -o -name "*.sys2" \) -print0)

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
  echo "No JavaScript, HTML, Markdown, or Config files found."
  exit 0
fi

js_files=()
html_files=()
md_files=()
sys2_files=()
for file in "${files_to_process[@]}"; do
  case "$file" in
    *.js|*.mjs) js_files+=("$file") ;;
    *.html) html_files+=("$file") ;;
    *.md) md_files+=("$file") ;;
    *.sys2) sys2_files+=("$file") ;;
  esac
done

total_js_lines=0
total_html_lines=0
total_md_lines=0
total_sys2_lines=0

# Render a category as a 3-column table, preserving original sort order
render_category() {
  local title="$1"
  local -n lines_arr="$2"

  local cols=3
  local count=${#lines_arr[@]}
  if (( count == 0 )); then
    return
  fi

  # Collect "red" files once per category render
  for entry in "${lines_arr[@]}"; do
    local line_count path
    line_count=$(awk '{print $1}' <<<"$entry")
    path=$(awk '{ $1=""; sub(/^ +/,""); print }' <<<"$entry")
    record_red_file "$line_count" "$path"
  done

  echo "--- $title ---"

  # Compute cell width based on terminal width
  local cell_width=$(( (TERM_COLS - (cols - 1) * 2) / cols ))
  if (( cell_width < 16 )); then
    cell_width=16
  fi
  local path_max=$((cell_width - 8))
  if (( path_max < 8 )); then
    path_max=8
  fi

  local num_rows=$(( (count + cols - 1) / cols ))
  local i c idx

  for ((i = 0; i < num_rows; i++)); do
    local row_line=""
    for ((c = 0; c < cols; c++)); do
      # Column-major assignment: smallest în prima coloană, cele mai mari în ultima
      idx=$((i + c * num_rows))
      local cell=""
      if (( idx < count )); then
        local line="${lines_arr[idx]}"
        # Extract line count and path from wc output
        local line_count path
        line_count=$(awk '{print $1}' <<<"$line")
        path=$(awk '{ $1=""; sub(/^ +/,""); print }' <<<"$line")
        local display_path
        display_path=$(shorten_path "$path" "$path_max")
        local num_padded plain_cell
        printf -v num_padded "%6s" "$line_count"
        printf -v plain_cell "%6s %s" "$line_count" "$display_path"
        plain_cell=$(printf "%-*s" "$cell_width" "$plain_cell")
        local colored_num prefix_len
        colored_num=$(colorize_count "$line_count" "$num_padded")
        prefix_len=${#num_padded}
        cell="${colored_num}${plain_cell:prefix_len}"
      else
        printf -v cell "%-*s" "$cell_width" ""
      fi
      row_line+="$cell"
      if (( c < cols - 1 )); then
        row_line+="  "
      fi
    done
    echo "$row_line"
  done

  echo ""
}

# HTML section first
if [[ ${#html_files[@]} -gt 0 ]]; then
  html_lines_output=$(printf '%s\0' "${html_files[@]}" | xargs -0 wc -l | sort -n)
  total_html_lines_raw=$(echo "$html_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_html_lines_raw" ]]; then
    total_html_lines=$total_html_lines_raw
  fi
  render_files_recursive "HTML Files" "." "." "${html_files[@]}"
fi

# Markdown section second
if [[ ${#md_files[@]} -gt 0 ]]; then
  md_lines_output=$(printf '%s\0' "${md_files[@]}" | xargs -0 wc -l | sort -n)
  total_md_lines_raw=$(echo "$md_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_md_lines_raw" ]]; then
    total_md_lines=$total_md_lines_raw
  fi
  render_files_recursive "Markdown Files" "." "." "${md_files[@]}"
fi

# SYS2 config files section - afișare compactă pe folder
if [[ ${#sys2_files[@]} -gt 0 ]]; then
  render_files_recursive "SYS2 Files" "." "." "${sys2_files[@]}"

  # Calculează totalul SYS2
  sys2_lines_output=$(printf '%s\0' "${sys2_files[@]}" | xargs -0 wc -l | sort -n)
  total_sys2_lines_raw=$(echo "$sys2_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_sys2_lines_raw" ]]; then
    total_sys2_lines=$total_sys2_lines_raw
  fi
fi

# JS section last (cele mai importante) - grupate pe folder din rădăcină
if [[ ${#js_files[@]} -gt 0 ]]; then
  render_files_recursive "JS Files" "." "." "${js_files[@]}"

  # Calculează totalul JS
  js_lines_output=$(printf '%s\0' "${js_files[@]}" | xargs -0 wc -l | sort -n)
  total_js_lines_raw=$(echo "$js_lines_output" | tail -n 1 | awk '{print $1}')
  if [[ -n "$total_js_lines_raw" ]]; then
    total_js_lines=$total_js_lines_raw
  fi
fi

echo "--- Summary ---"
echo "Total HTML lines:   ${total_html_lines:-0}"
echo "Total MD lines:     ${total_md_lines:-0}"
echo "Total Sys2 lines:   ${total_sys2_lines:-0}"
echo "Total JS lines:     ${total_js_lines:-0}"
grand_total=$((total_js_lines + total_html_lines + total_md_lines + total_sys2_lines))
echo "Grand Total lines:  $grand_total"

if (( ${#RED_FILES_BY_PATH[@]} > 0 )); then
  echo ""
  echo "--- Red Files (> ${RED_THRESHOLD} lines) ---"
  {
    for path in "${!RED_FILES_BY_PATH[@]}"; do
      printf "%s %s\n" "${RED_FILES_BY_PATH[$path]}" "$path"
    done
  } | sort -nr | while read -r line_count path; do
    if [[ -n "$COLOR_RED" && -n "$COLOR_RESET" ]]; then
      printf "%s%6s %s%s\n" "$COLOR_RED" "$line_count" "$path" "$COLOR_RESET"
    else
      printf "%6s %s\n" "$line_count" "$path"
    fi
  done
fi
