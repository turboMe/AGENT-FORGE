#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# AgentForge Skill Search (v2 — auto-detect path)
# Usage: ./search.sh "keyword1 keyword2 keyword3"
#
# Auto-detects .agents directory relative to script location.
# Works both in ~/.agents/ and project-local .agents/
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Auto-detect base path ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Script is at: .agents/skills/skill-librarian/scripts/search.sh
# Base .agents is: 3 levels up
BASE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INDEX_FILE="$BASE_DIR/memory/skill-index.json"

# ─── Validate arguments ───
if [ $# -eq 0 ] || [ -z "$1" ]; then
    echo '{"error": "Usage: search.sh \"keyword1 keyword2 keyword3\""}' >&2
    exit 1
fi

# ─── Validate index file exists ───
if [ ! -f "$INDEX_FILE" ]; then
    echo '{"error": "skill-index.json not found at '"$INDEX_FILE"'"}' >&2
    exit 1
fi

# ─── Run search ───
python3 -c "
import json
import sys

index_path = '$INDEX_FILE'
try:
    with open(index_path, 'r') as f:
        data = json.load(f)
except (json.JSONDecodeError, FileNotFoundError) as e:
    print(json.dumps({'error': f'Failed to read index: {str(e)}'}))
    sys.exit(1)

query_words = list(set(sys.argv[1].lower().split()))

if not query_words:
    print('[]')
    sys.exit(0)

results = []

for skill in data.get('skills', []):
    score = 0.0
    matched_on = []

    name = skill.get('name', '').lower()
    tags = ' '.join(skill.get('tags', [])).lower()
    domain = ' '.join(skill.get('domain', [])).lower()
    description = skill.get('description', '').lower()
    persona = skill.get('persona_summary', '').lower()
    broad_text = f'{description} {persona}'

    for word in query_words:
        if word in name:
            score += 1.0
            matched_on.append(f'name:{word}')
        elif word in tags:
            score += 0.8
            matched_on.append(f'tag:{word}')
        elif word in domain:
            score += 0.7
            matched_on.append(f'domain:{word}')
        elif word in broad_text:
            score += 0.5
            matched_on.append(f'desc:{word}')

    if score > 0:
        normalized_score = round(score / len(query_words), 3)
        results.append({
            'id': skill.get('id', ''),
            'name': skill.get('name', ''),
            'type': skill.get('type', ''),
            'domain': skill.get('domain', []),
            'description': skill.get('description', ''),
            'file_path': skill.get('file_path', ''),
            'use_count': skill.get('use_count', 0),
            'avg_satisfaction': skill.get('avg_satisfaction'),
            'match_score': normalized_score,
            'matched_on': matched_on
        })

results.sort(key=lambda x: (x['match_score'], x['use_count']), reverse=True)

output = results[:3]

for r in output:
    if r['match_score'] >= 0.90:
        r['recommendation'] = 'exact_match — use as-is'
    elif r['match_score'] >= 0.65:
        r['recommendation'] = 'partial_match — may need adaptation'
    else:
        r['recommendation'] = 'weak_match — consider creating new skill'

print(json.dumps(output, indent=2, ensure_ascii=False))
" "$1"
