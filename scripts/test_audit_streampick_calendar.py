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
            {'date':'2026-11-03','eventType':'new_release','contentId':'tv-1'},
            {'date':'2026-11-04','eventType':'episode','contentId':'tv-1'},
            {'date':'2026-11-05','eventType':'new_release','contentId':'tv-2'}],
            'contents':{'tv-1':{'title':'제목 A','platforms':['netflix','tving']},
                        'tv-2':{'title':'제목 B','platforms':[]}}}
        payload = '0:{"calendar":'+json.dumps(calendar,ensure_ascii=False)+'}'
        html = '<script>self.__next_f.push([1,'+json.dumps(payload,ensure_ascii=False)+'])</script>'
        extracted = module.extract_calendar(html)
        result = module.audit(extracted,[{'date':'2026-11-03','platform':'netflix','title':'제목 A'}])
        self.assertEqual(result['allEventsByType'], {'new_release':2,'episode':1})
        self.assertEqual(result['byMonthPlatform']['2026-11/netflix/matched_published'],1)
        self.assertEqual(result['missingCandidateCount'],1)
        self.assertFalse(result['publishingAllowed'])

    def test_missing_payload_fails(self):
        with self.assertRaisesRegex(ValueError,'not found'):
            module.extract_calendar('<html></html>')

if __name__=='__main__': unittest.main()
