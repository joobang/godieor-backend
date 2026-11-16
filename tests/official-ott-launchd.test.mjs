import test from 'node:test';
import assert from 'node:assert/strict';
import { launchdPlist } from '../scripts/install-official-ott-launchd.mjs';

test('launchd runs local full pipeline at 09:00 without StreamPick comparison', () => {
  const xml = launchdPlist({ node: '/opt/node', root: '/tmp/godieor-app & data', hour: 9 });
  assert.match(xml, /run-official-ott-daily\.mjs/);
  assert.match(xml, /<integer>9<\/integer>/);
  assert.match(xml, /godieor-app &amp; data/);
  assert.doesNotMatch(xml, /streampick|compare-reference/i);
});
