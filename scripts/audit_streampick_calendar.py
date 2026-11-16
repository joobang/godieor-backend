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

def extract_monthly_calendar(html):
    """Monthly SSR pages repeat event cards in highlights and date groups."""
    chunks = (json.loads(m.group(1)) for m in re.finditer(r'self\.__next_f\.push\((\[.*?\])\)</script>', html, re.S))
    payload = ''.join(c[1] for c in chunks if len(c) > 1 and isinstance(c[1], str))
    decoder = json.JSONDecoder()
    events, contents = {}, {}
    for match in re.finditer(r'"event"\s*:\s*(?=\{)', payload):
        event, end = decoder.raw_decode(payload, match.end())
        following = re.match(r'\s*,\s*"content"\s*:', payload[end:])
        if not following:
            raise ValueError('Monthly event content missing')
        content, _ = decoder.raw_decode(payload, end + following.end())
        key = event['id']
        if event['contentId'] != content['id']:
            raise ValueError('Monthly content identity mismatch')
        if key in events and events[key] != event:
            raise ValueError('Conflicting monthly event')
        events[key], contents[content['id']] = event, content
    if not events:
        raise ValueError('StreamPick monthly events not found')
    return {'events': list(events.values()), 'contents': contents}

def build_reference(calendar, start='2026-11-01', end='2027-01-01'):
    """Include new titles AND explicitly marked season premieres; never ordinary episodes."""
    from datetime import date
    if date.fromisoformat(start) >= date.fromisoformat(end):
        raise ValueError('Invalid reference window')
    entries, seen = [], set()
    source_events = {}
    for event in calendar['events']:
        if event['eventType'] not in ('new_release', 'episode'):
            raise ValueError('Unknown event type')
        key = event['id']
        if key in source_events and source_events[key] != event:
            raise ValueError('Conflicting calendar event')
        source_events[key] = event
        day = event['date']
        date.fromisoformat(day)
        if not start <= day < end:
            continue
        episodes = event.get('episodes') or {}
        if event['eventType'] != 'new_release' and not (event['eventType'] == 'episode' and episodes.get('premiere') is True):
            continue
        content = calendar['contents'].get(event['contentId'])
        if not content or not content.get('title') or not isinstance(content.get('platforms'), list):
            raise ValueError('Missing first-release content')
        season = episodes.get('seasonNumber')
        if season is not None and (type(season) is not int or season < 1):
            raise ValueError('Invalid reference season')
        for platform in sorted(set(content['platforms']) & set(PLATFORMS)):
            key = (event['contentId'], day, platform, season)
            if key in seen:
                continue
            seen.add(key)
            entries.append({'date': day, 'platform': platform, 'title': content['title'],
                'seasonNumber': season, 'contentId': event['contentId'], 'eventId': event['id'],
                'releaseType': 'new_release' if event['eventType'] == 'new_release' else 'season_premiere',
                'contentType': content.get('type'), 'genreIDs': [g['id'] for g in content.get('genres', [])]})
    entries.sort(key=lambda r: (r['date'], r['platform'], r['contentId'], r['seasonNumber'] or 0))
    return {'source': 'https://streampick.io/calendar/', 'authority': 'third_party_discovery_only',
        'window': {'fromInclusive': start, 'toExclusive': end}, 'scope': 'new_titles_and_season_premieres',
        'referenceCount': len(entries), 'entries': entries,
        'rows': [[r['date'], r['platform'], r['title'], r['seasonNumber']] for r in entries],
        'publishingAllowed': False}

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

if __name__ == '__main__' and '--reference' in sys.argv:
    args = [a for a in sys.argv[1:] if a not in ('--reference', '--monthly')]
    parser = extract_monthly_calendar if '--monthly' in sys.argv else extract_calendar
    reference = build_reference(parser(Path(args[0]).read_text()))
    if len(args) > 1: Path(args[1]).write_text(json.dumps(reference, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'scope': reference['scope'], 'referenceCount': reference['referenceCount']}, ensure_ascii=False))
    sys.exit(0)

if __name__ == '__main__':
    calendar = extract_calendar(Path(sys.argv[1]).read_text())
    published = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv)>2 and sys.argv[2]!='-' else []
    result = audit(calendar,published)
    if len(sys.argv)>3: Path(sys.argv[3]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='missingNewReleaseCandidates'},ensure_ascii=False,indent=2))
