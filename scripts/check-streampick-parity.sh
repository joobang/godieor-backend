#!/bin/sh
# Read-only 2026 Nov-Dec comparison, including explicitly marked season premieres.
# Exit 2 means incomplete parity; exit 1 means collection/input/query failure.
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_dir"
output_dir=${1:-"work/ott-parity/$(date -u +%Y%m%dT%H%M%SZ)"}
if [ -e "$output_dir" ]; then
  echo '출력 경로가 이미 있습니다. 새 경로를 지정하세요.' >&2
  exit 1
fi
mkdir -p "$output_dir"
if ! curl -fsSL --max-time 40 https://streampick.io/calendar/ -o "$output_dir/calendar.html"; then
  exit 1
fi
python3 scripts/audit_streampick_calendar.py --reference "$output_dir/calendar.html" "$output_dir/reference.json"
set +e
node --env-file-if-exists=.env scripts/audit-ott-published.mjs "$output_dir/reference.json" \
  data/reference/ott-parity-verified-aliases-2026-11-13.json \
  --identity-bindings=data/curated/ott-official-tmdb-bindings-2026-11-13.json --require-parity > "$output_dir/report.json"
result=$?
set -e
if [ "$result" -eq 0 ] || [ "$result" -eq 2 ]; then
  python3 - "$output_dir/report.json" <<'PY'
import json, sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
p = Path(sys.argv[1])
r = json.loads(p.read_text())
html = p.parent / 'calendar.html'
(p.parent / 'observation.json').write_text(json.dumps({
    'observedAt': datetime.now(timezone.utc).isoformat(),
    'source': 'https://streampick.io/calendar/',
    'htmlSHA256': sha256(html.read_bytes()).hexdigest(),
    'referenceRows': r['referenceRows'], 'publishedRows': r['publishedInWindow'],
    'exactMatches': r['statusCounts']['published_match'], 'parity': r['parity']
}, indent=2) + '\n')
print('게시 %d / 참조 %d / 정확 일치 %d / parity=%s' % (
    r['publishedInWindow'], r['referenceRows'], r['statusCounts']['published_match'], r['parity']))
print('보고서: ' + str(p))
PY
fi
if [ "$result" -ne 0 ] && [ "$result" -ne 2 ]; then exit 1; fi
exit "$result"
