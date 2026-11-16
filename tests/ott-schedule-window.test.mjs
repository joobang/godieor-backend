import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleMonths } from '../scripts/ott-schedule-window.mjs';

test('Korean month window rolls over year and uses Korea calendar at UTC boundary', () => {
  assert.deepEqual(scheduleMonths(new Date('2026-11-16T08:00:00Z')), ['2026-11', '2026-12']);
  assert.deepEqual(scheduleMonths(new Date('2026-12-31T15:05:00Z')), ['2027-01', '2027-02']);
  assert.deepEqual(scheduleMonths(new Date('2026-12-31T14:55:00Z')), ['2026-12', '2027-01']);
});
