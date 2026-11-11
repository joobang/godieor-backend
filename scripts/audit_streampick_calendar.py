#!/usr/bin/env python3
"""Audit StreamPick RSC calendar snapshot. Third-party dates are leads, not KR premiere evidence."""
import json, re, sys
from collections import Counter
from pathlib import Path

PLATFORMS = ('netflix', 'tving', 'disney_plus', 'coupang_play')

def extract_calendar(html):
    chunks = (json.loads(match.group(1)) for match in re.finditer(r'self\.__next_f\.push\((\[.*?\])\)</script>', html, re.S))
    payload = ''.join(chunk[1] for chunk in chunks if len(chunk) > 1 and isinstance(chunk[1], str))
    marker = '"calendar":{"from"'
    offset = payload.find(marker)
    if offset < 0:
        raise ValueError('StreamPick calendar not found in RSC payload')
    decoder = json.JSONDecoder()
    calendar, _ = decoder.raw_decode(payload[offset + len('"calendar":'):])
    if not isinstance(calendar.get('events'), list) or not isinstance(calendar.get('contents'), dict):
        raise ValueError('Invalid StreamPick calendar shape')
    return calendar

def audit(calendar, published=()):
    normalize = lambda s: re.sub(r'[\W_]+', '', s.casefold())
    indexed = {(p['date'], p['platform'], normalize(p['title'])) for p in published}
    by_group = Counter(); types = Counter(); months = Counter(); candidates = []
    for event in calendar['events']:
        date = event['date']; month = date[:7]
        if month not in ('2026-11', '2026-12'): continue
        months[month] += 1; types[event['eventType']] += 1
        content = calendar['contents'].get(event['contentId'], {})
        for platform in content.get('platforms', []):
            if platform not in PLATFORMS: continue
            by_group[(month, platform, event['eventType'])] += 1
            if event['eventType'] == 'new_release':
                match = (date, platform, normalize(content['title'])) in indexed
                if match: by_group[(month, platform, 'matched_published')] += 1
                else: candidates.append({'date':date,'platform':platform,'title':content['title'],
                    'contentId':event['contentId'],'seasonNumber':(event.get('episodes') or {}).get('seasonNumber'),
                    'reason':'third_party_new_release_not_published','verifiedKoreanPremiere':False})
    for row in published:
        if row['date'][:7] in ('2026-11','2026-12') and row['platform'] in PLATFORMS:
            by_group[(row['date'][:7],row['platform'],'published')] += 1
    return {'scope':'2026-11_to_2026-12', 'authority':'third_party_discovery_only',
        'allEventsByMonth':dict(months),'allEventsByType':dict(types),
        'byMonthPlatform':{'/'.join(k):v for k,v in sorted(by_group.items())},
        'missingNewReleaseCandidates':candidates,'missingCandidateCount':len(candidates),
        'publishingAllowed':False,'note':'회차 방영은 신작과 구분하고 KR OTT 최초 공개는 별도 확인 필요.'}

if __name__ == '__main__':
    calendar = extract_calendar(Path(sys.argv[1]).read_text())
    published = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv)>2 and sys.argv[2]!='-' else []
    result = audit(calendar,published)
    if len(sys.argv)>3: Path(sys.argv[3]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='missingNewReleaseCandidates'},ensure_ascii=False,indent=2))
