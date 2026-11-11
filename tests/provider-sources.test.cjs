const { test } = require("node:test");
const assert = require("node:assert/strict");
const { KobisAdapter, PremierLeagueAdapter, IgdbAdapter } = require("../dist/src/collection/adapters/official-sources.js");
const { normalize } = require("../dist/src/collection/domain/provider-record.js");

async function mockProvider(run, response) {
  const original = global.fetch;
  global.fetch = async (...args) => response(...args);
  try { await run(); } finally { global.fetch = original; }
}
function ok(value) { return { ok: true, json: async () => value }; }

test("KOBIS preserves day-only KR theatrical date, ignores undated rows", async () => {
  const previous = process.env.KOBIS_API_KEY;
  process.env.KOBIS_API_KEY = "fake-test-key";
  try {
    await mockProvider(async () => {
      const records = await new KobisAdapter().fetch({category:"movie",market:"KR"}, "daily");
      assert.equal(records.length, 1);
      assert.equal(normalize(records[0], {category:"movie",market:"KR"}).time.value, "2026-11-12");
    }, async () => ok({ movieListResult: { movieList: [
      { movieCd:"20260001", movieNm:"Sample", openDt:"20261112" },
      { movieCd:"20260002", movieNm:"Unknown", openDt:"" },
    ] } }));
  } finally {
    if (previous === undefined) delete process.env.KOBIS_API_KEY;
    else process.env.KOBIS_API_KEY = previous;
  }
});

test("EPL uncertain SCHEDULED kickoff does not become a false exact time", async () => {
  const previous = process.env.FOOTBALL_DATA_API_KEY;
  process.env.FOOTBALL_DATA_API_KEY = "fake-test-key";
  try {
    await mockProvider(async () => {
      const records = await new PremierLeagueAdapter().fetch({category:"epl",market:"WORLD"}, "daily");
      assert.equal(records.length, 2);
      assert.equal(normalize(records.find(x => x.externalId === "1"), {category:"epl",market:"WORLD"}).time.type, "unknown");
      assert.equal(normalize(records.find(x => x.externalId === "2"), {category:"epl",market:"WORLD"}).time.type, "instant");
    }, async () => ok({matches: [
      {id:1, status:"SCHEDULED", utcDate:"2026-12-20T15:00:00Z", homeTeam:{id:10,name:"A"},awayTeam:{id:20,name:"B"}},
      {id:2, status:"TIMED", utcDate:"2026-12-20T15:00:00Z", homeTeam:{id:10,name:"A"},awayTeam:{id:20,name:"B"}},
    ]}));
  } finally {
    if (previous === undefined) delete process.env.FOOTBALL_DATA_API_KEY;
    else process.env.FOOTBALL_DATA_API_KEY = previous;
  }
});

test("EPL skips unpublished future season 404 but keeps current matches", async () => {
  const previous = process.env.FOOTBALL_DATA_API_KEY;
  process.env.FOOTBALL_DATA_API_KEY = "fake-test-key";
  try {
    await mockProvider(async () => {
      const records = await new PremierLeagueAdapter().fetch({category:"epl",market:"WORLD"}, "daily");
      assert.equal(records.length, 1);
    }, async url => url.searchParams.get("season") === "2027"
      ? {ok:false,status:404}
      : ok({matches:[{id:1,status:"TIMED",utcDate:"2026-11-20T12:00:00Z",homeTeam:{id:1,name:"Home"},awayTeam:{id:2,name:"Away"}}]}));
  } finally {
    if (previous === undefined) delete process.env.FOOTBALL_DATA_API_KEY;
    else process.env.FOOTBALL_DATA_API_KEY = previous;
  }
});

test("IGDB collects worldwide and country releases separately without inventing dates", async () => {
  const saved = [process.env.IGDB_CLIENT_ID, process.env.IGDB_CLIENT_SECRET];
  process.env.IGDB_CLIENT_ID = "fake-id";
  process.env.IGDB_CLIENT_SECRET = "fake-secret";
  try {
    await mockProvider(async () => {
      const adapter = new IgdbAdapter();
      assert.deepEqual(adapter.scopes.map(x => x.market), ["WORLD", "KR", "JP", "AU", "NZ", "CN", "BR"]);
      const korean = await adapter.fetch({category:"game",market:"KR"}, "daily");
      assert.equal(korean.length, 3);
      assert.deepEqual(korean.map(x => normalize(x, {category:"game",market:"KR"}).devices[0]), ["pc", "ios", "android"]);
      const worldwide = await adapter.fetch({category:"game",market:"WORLD"}, "daily");
      assert.equal(worldwide.length, 4);
      assert.deepEqual(new Set(worldwide.map(x => x.externalId)), new Set(["5", "7", "8", "9"]));
      assert.equal(normalize(worldwide[0], {category:"game",market:"WORLD"}).market, "WORLD");
      const japanese = await adapter.fetch({category:"game",market:"JP"}, "daily");
      assert.equal(japanese.length, 1);
      assert.equal(normalize(japanese[0], {category:"game",market:"JP"}).market, "JP");
      assert.notEqual(worldwide[0].variantKey, korean[0].variantKey);
    }, async (url, options) => {
      if (url.toString().includes("twitch")) return ok({access_token:"fake-token"});
      const body = options.body;
      const region = Number(body.match(/release_region = (\d+)/)?.[1]);
      const from = Number(body.match(/date >= (\d+)/)?.[1]);
      const to = Number(body.match(/date < (\d+)/)?.[1]);
      const rows = [
          {id:1,date:1795132800,game:{id:99,name:"Sample Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:9,date_format:0,y:2026,m:11},
          {id:3,date:1795132800,game:{id:99,name:"Sample Game",game_type:0},platform:{id:39,name:"iOS"},release_region:9,date_format:0,y:2026,m:11},
          {id:4,date:1795132800,game:{id:99,name:"Sample Game",game_type:0},platform:{id:34,name:"Android"},release_region:9,date_format:0,y:2026,m:11},
          {id:5,date:1795132800,game:{id:99,name:"Sample Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:8,date_format:0,y:2026,m:11},
          {id:6,date:1795132800,game:{id:99,name:"Sample Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:5,date_format:0,y:2026,m:11},
          {id:7,date:1795132800,game:{id:101,name:"US Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:2,date_format:0,y:2026,m:11},
          {id:8,date:1795132800,game:{id:102,name:"EU Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:1,date_format:0,y:2026,m:11},
          {id:9,date:1795132800,game:{id:103,name:"Asia Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:7,date_format:0,y:2026,m:11},
          {id:2,game:{id:99,name:"Sample Game",game_type:0},platform:{id:6,name:"PC (Microsoft Windows)"},release_region:9,date_format:2,y:2026},
        ];
      return ok(rows.filter(row => row.release_region === region && row.date >= from && row.date < to));
    });
  } finally {
    for (const [i, key] of ["IGDB_CLIENT_ID","IGDB_CLIENT_SECRET"].entries()) {
      if (saved[i] === undefined) delete process.env[key];
      else process.env[key] = saved[i];
    }
  }
});

test("OTT category preserves OTT movie distinct from series", () => {
  const input = {
    externalId:"test-movie", variantKey:"kr-netflix", kind:"ott_season_premiere",
    ottCategory:"movie", title:"OTT movie",
    content:{externalId:"movie-1",kind:"movie",title:"OTT movie"},
    seasonNumber:null,status:"scheduled",time:{type:"date_only",value:"2026-11-20"},
    market:"KR",venueCountry:null,services:["netflix"],devices:[],
    home:null,away:null,sourceUrl:"https://www.netflix.com/",sourceUpdatedAt:null,
  };
  assert.equal(normalize(input, {category:"ott",market:"KR"}).ottCategory,"movie");
  assert.throws(() => normalize({...input,seasonNumber:1},{category:"ott",market:"KR"}), /INVALID_OTT_CATEGORY/);
});
