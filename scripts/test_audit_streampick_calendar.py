import importlib.util
import json
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[0] / 'audit_streampick_calendar.py'
spec = importlib.util.spec_from_file_location('audit_streampick_calendar', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CalendarAuditTests(unittest.TestCase):
    def test_extract_rsc_and_classify(self):
        calendar = {'from':'2026-11-01','to':'2026-12-31','events':[
            {'id':'new1','date':'2026-11-03','eventType':'new_release','contentId':'tv-1'},
            {'id':'ep1','date':'2026-11-04','eventType':'episode','contentId':'tv-1'},
            {'id':'new2','date':'2026-11-05','eventType':'new_release','contentId':'tv-2'}],
            'contents':{'tv-1':{'title':'제목 A','platforms':['netflix','tving']},
                        'tv-2':{'title':'제목 B','platforms':[]}}}
        payload = '0:{"calendar":'+json.dumps(calendar,ensure_ascii=False)+'}'
        html = '<script>self.__next_f.push([1,'+json.dumps(payload,ensure_ascii=False)+'])</script>'
        extracted = module.extract_calendar(html)
        result = module.audit(extracted,[{'date':'2026-11-03','platform':'netflix','title':'제목 A'}])
        self.assertEqual(result['allEventsByType'], {'new_release':2,'episode':1})
        self.assertEqual(result['byMonthPlatform']['2026-11/netflix/matched_published'],1)
        self.assertEqual(result['missingCandidateCount'],1)
        self.assertEqual(result['referenceFirstReleaseCount'],2)
        self.assertFalse(result['publishingAllowed'])

    def test_missing_payload_fails(self):
        with self.assertRaisesRegex(ValueError,'not found'):
            module.extract_calendar('<html></html>')

class FirstReleaseReferenceTests(unittest.TestCase):
    def calendar(self):
        return {'events': [
            {'id': 'new', 'date': '2026-11-01', 'eventType': 'new_release', 'contentId': 'a'},
            {'id': 'season', 'date': '2026-11-02', 'eventType': 'episode', 'contentId': 'a',
             'episodes': {'seasonNumber': 2, 'premiere': True}},
            {'id': 'ordinary', 'date': '2026-11-03', 'eventType': 'episode', 'contentId': 'a',
             'episodes': {'seasonNumber': 2, 'premiere': False}}],
            'contents': {'a': {'title': 'Synthetic A', 'platforms': ['netflix', 'tving', 'wavve', 'netflix']}}}

    def test_new_season_is_included_and_normal_episode_excluded(self):
        result = module.build_reference(self.calendar())
        self.assertEqual(result['referenceCount'], 4)
        self.assertEqual({r['releaseType'] for r in result['entries']}, {'new_release', 'season_premiere'})
        self.assertFalse(result['publishingAllowed'])

    def test_duplicate_cards_and_platforms_do_not_inflate_counts(self):
        c = self.calendar(); c['events'] += c['events'][:2]
        self.assertEqual(module.build_reference(c)['referenceCount'], 4)

    def test_unknown_season_is_preserved(self):
        self.assertIsNone(module.build_reference(self.calendar())['entries'][0]['seasonNumber'])

    def test_invalid_season_and_missing_content_fail(self):
        c = self.calendar(); c['events'][1]['episodes']['seasonNumber'] = True
        with self.assertRaisesRegex(ValueError, 'season'): module.build_reference(c)
        c = self.calendar(); c['contents'] = {}
        with self.assertRaisesRegex(ValueError, 'content'): module.build_reference(c)

    def test_source_conflicts_and_new_types_cannot_silently_pass(self):
        c = self.calendar(); duplicate = dict(c['events'][0]); duplicate['date'] = '2026-11-02'; c['events'].append(duplicate)
        with self.assertRaisesRegex(ValueError, 'Conflicting'): module.build_reference(c)
        c = self.calendar(); c['events'][0]['eventType'] = 'changed_source_type'
        with self.assertRaisesRegex(ValueError, 'Unknown'): module.build_reference(c)

    def test_window_boundaries(self):
        self.assertEqual(module.build_reference(self.calendar(), '2026-11-02', '2026-11-03')['referenceCount'], 2)

    def test_monthly_cards_deduplicate_and_reject_conflicts(self):
        c = self.calendar(); pair = {'event': c['events'][1], 'content': c['contents']['a'] | {'id': 'a'}}
        payload = json.dumps([pair, pair], separators=(',', ':'))
        html = '<script>self.__next_f.push([1,' + json.dumps(payload) + '])</script>'
        self.assertEqual(len(module.extract_monthly_calendar(html)['events']), 1)
        conflicting = json.loads(json.dumps(pair)); conflicting['event']['date'] = '2026-11-04'
        payload = json.dumps([pair, conflicting], separators=(',', ':'))
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            module.extract_monthly_calendar('<script>self.__next_f.push([1,' + json.dumps(payload) + '])</script>')

    def test_duplicate_generic_and_season_premiere_on_same_day_is_one_first_release(self):
        c = self.calendar()
        c['events'][0]['date'] = '2026-11-02'
        ref = module.build_reference(c)
        self.assertEqual(ref['referenceCount'], 2)
        self.assertEqual({r['releaseType'] for r in ref['entries']}, {'season_premiere'})
        result = module.audit(c)
        self.assertEqual(result['referenceFirstReleaseCount'], 2)
        self.assertEqual(result['missingCandidateCount'], 2)
        self.assertNotIn('2026-11/netflix/new_release', result['byMonthPlatform'])

    def test_two_different_seasons_or_platform_days_are_distinct(self):
        c = self.calendar()
        c['events'].append({'id': 'season3','date': '2026-11-02', 'eventType':'episode',
                            'contentId':'a','episodes':{'seasonNumber':3,'premiere':True}})
        self.assertEqual(module.build_reference(c)['referenceCount'], 6)

    def test_later_episode_not_counted_even_with_episode_number(self):
        c = self.calendar()
        c['events'][2]['episodes']['episodeNumber'] = 6
        result = module.audit(c)
        self.assertEqual(result['referenceFirstReleaseCount'], 4)
        self.assertEqual(result['missingCandidateCount'], 4)

if __name__=='__main__': unittest.main()
