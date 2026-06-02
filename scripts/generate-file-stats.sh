#!/usr/bin/env bash
# Usage: ./generate-file-stats.sh > file-stats.json
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# Find all .html .css .js files (excluding node_modules and .git)
files=$(find . -type f \( -iname "*.html" -o -iname "*.css" -o -iname "*.js" \) -not -path "./.git/*" -not -path "./node_modules/*")

first=true
printf '['
esc(){ python3 -c 'import json,sys; print(json.dumps(sys.argv[1])[1:-1])' "${1:-}"; }
for f in $files; do
  # strip leading ./
  path=${f#./}
  # get last commit touching this file (if repo)
  if [ -d .git ]; then
    info=$(git log -1 --format='%H|%cI|%cn' -- "$path" 2>/dev/null || true)
    if [ -n "$info" ]; then
      IFS='|' read -r hash date author <<< "$info"
    else
      hash=""
      date=""
      author=""
    fi
  else
    hash=""
    date=""
    author=""
  fi
  size=$(stat -c%s "$path" 2>/dev/null || echo 0)
  if [ "$first" = true ]; then first=false; else printf ','; fi
  p_esc=$(esc "$path")
  h_esc=$(esc "$hash")
  d_esc=$(esc "$date")
  a_esc=$(esc "$author")
  printf '\n  {"path":"%s","size":%s,"last_commit":"%s","last_date":"%s","last_author":"%s"}' \
    "$p_esc" "$size" "$h_esc" "$d_esc" "$a_esc"
done
printf '\n]\n'
