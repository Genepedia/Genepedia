#!/usr/bin/env bash
# Usage: ./scripts/generate-page-history.sh > data/page-history.json
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

files=$(find . -type f \( -iname "*.html" -o -iname "*.css" -o -iname "*.js" \) -not -path "./.git/*" -not -path "./node_modules/*")

esc() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1])[1:-1])' "${1:-}"
}

first_file=true
printf '{'
for f in $files; do
  path=${f#./}
  if [ "$first_file" = true ]; then
    first_file=false
  else
    printf ','
  fi

  path_esc=$(esc "$path")
  printf '\n  "%s": [' "$path_esc"

  if [ -d .git ]; then
  first_commit=true
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    IFS='|' read -r hash date author author_email subject <<< "$line"
    if [ "$first_commit" = true ]; then
      first_commit=false
    else
      printf ','
    fi
    author_login=$(python3 -c 'import re,sys; email=sys.argv[1].strip().lower(); match=re.match(r"^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$", email); print(match.group(1) if match else "")' "${author_email:-}")
    h_esc=$(esc "$hash")
    d_esc=$(esc "$date")
    a_esc=$(esc "$author")
    ae_esc=$(esc "$author_email")
    al_esc=$(esc "$author_login")
    s_esc=$(esc "$subject")
    printf '\n    {"hash":"%s","date":"%s","author":"%s","author_email":"%s","author_login":"%s","subject":"%s"}' \
      "$h_esc" "$d_esc" "$a_esc" "$ae_esc" "$al_esc" "$s_esc"
  done < <(git log --format='%H|%cI|%an|%ae|%s' -- "$path" 2>/dev/null || true)
  fi

  printf '\n  ]'
done
printf '\n}\n'
