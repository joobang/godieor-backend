// Contract artifacts are authored inputs; a local test run must detect a stale fingerprint.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve, relative, isAbsolute } = require('node:path');
const root = resolve(__dirname, '../contracts');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));

test('contract manifest fingerprints and declared version match actual contract files', () => {
  assert.equal(manifest.hashAlgorithm, 'sha256');
  assert.ok(Object.keys(manifest.files).length > 0);
  for (const [name, expected] of Object.entries(manifest.files)) {
    const path = resolve(root, name), rel = relative(root, path);
    assert.ok(rel && !isAbsolute(rel) && !rel.startsWith('..'));
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), expected, name);
  }
  const spec = readFileSync(resolve(root, 'openapi.yaml'), 'utf8');
  assert.equal(/"version":\s*"([^"]+)"/.exec(spec)?.[1], manifest.contractVersion);
});

test('authored event examples include the existing nullable OTT classification field', () => {
  let events = 0;
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && 'kind' in value && 'dataOrigin' in value && 'time' in value) {
      events++;
      assert.ok(Object.hasOwn(value, 'ottCategory'));
      assert.ok(value.ottCategory === null || typeof value.ottCategory === 'string');
      if (value.kind !== 'ott_season_premiere') assert.equal(value.ottCategory, null);
    }
    for (const child of Object.values(value)) inspect(child);
  }
  for (const name of ['calendar.json', 'events-page.json', 'event-detail.json'])
    inspect(JSON.parse(readFileSync(resolve(root, 'examples', name), 'utf8')));
  assert.ok(events > 0);
});

 test('public catalog options advertise the pinned contract version', () => {
  require('reflect-metadata');
  const {CatalogService}=require('../dist/src/catalog/catalog.service');
  assert.equal(new CatalogService({},{}).options().contractVersion,manifest.contractVersion);
});
