const test=require('node:test'),assert=require('node:assert/strict');
const {DateTime}=require('luxon');
const {gameCollectionWindow,movieCollectionYears,premierLeagueSeasons}=require('../dist/src/collection/domain/collection-window');
const {providerOptions,selectProviders}=require('../dist/src/cli/provider-options');
const date=s=>DateTime.fromISO(s,{zone:'utc'});
test('backfill retains product start in future years instead of a rolling lookback',()=>{
 for(const day of ['2026-11-17T12:34:56Z','2027-11-17T00:00:00Z'])assert.equal(new Date(gameCollectionWindow('backfill',date(day)).from*1000).toISOString(),'2026-01-01T00:00:00.000Z');
 assert.deepEqual(movieCollectionYears('backfill',date('2028-01-01')),[2026,2027,2028,2029]);
});
test('daily game range includes complete UTC days and cannot precede product start',()=>{
 const w=gameCollectionWindow('daily',date('2026-02-10T23:59:59Z'));
 assert.equal(new Date(w.from*1000).toISOString(),'2026-01-11T00:00:00.000Z');
 assert.equal(new Date(gameCollectionWindow('daily',date('2026-01-03')).from*1000).toISOString(),'2026-01-01T00:00:00.000Z');
 assert.equal(new Date(w.to*1000).getUTCHours(),0);
});
test('EPL backfill includes 2025 season containing Jan-May2026 after year rollover',()=>{
 assert.deepEqual(premierLeagueSeasons('backfill',date('2026-11-17')).years,[2025,2026,2027]);
 assert.deepEqual(premierLeagueSeasons('backfill',date('2028-01-01')).years,[2025,2026,2027,2028]);
 assert.deepEqual(premierLeagueSeasons('daily',date('2026-06-30')).years,[2025,2026]);
 assert.deepEqual(premierLeagueSeasons('daily',date('2026-07-01')).years,[2026,2027]);
});
test('CLI supports explicit backfill and independent providers while retaining daily defaults',()=>{
 assert.deepEqual(providerOptions([]),{mode:'daily',providers:null,force:false});
 assert.deepEqual(providerOptions(['--mode','backfill','--providers','igdb,football_data_pl','--force']),{mode:'backfill',providers:['igdb','football_data_pl'],force:true});
});
test('invalid or duplicated options never silently fall back to daily or another provider',()=>{
 for(const args of [['--mode'],['--mode','delete'],['--providers',''],['--providers','fixture'],['--providers','igdb,igdb'],['--force','--force'],['--unknown'],['--providers','igdb,']])assert.throws(()=>providerOptions(args));
});
test('requested missing credentials and fixture-only setup fail instead of successful no-op',()=>{
 assert.throws(()=>selectProviders([{key:'igdb'}],['football_data_pl']));
 assert.throws(()=>selectProviders([{key:'fixture'}],null));
 assert.deepEqual(selectProviders([{key:'fixture'},{key:'igdb'},{key:'kobis'}],['igdb']),[{key:'igdb'}]);
});
const {KobisAdapter}=require('../dist/src/collection/adapters/official-sources');
function knownMovie(){return {externalId:'20269999',variantKey:'kr-theatrical',kind:'theatrical_release',title:'가상 영화',content:{externalId:'20269999',kind:'movie',title:'가상 영화'},seasonNumber:null,status:'scheduled',time:{type:'date_only',value:'2026-11-18'},market:'KR',venueCountry:null,services:[],devices:[],home:null,away:null,sourceUrl:'https://www.kobis.or.kr/',sourceUpdatedAt:null};}
test('missing KOBIS movie becomes undated only after same-ID official detail withdraws its day',async()=>{
 const original=global.fetch,key=process.env.KOBIS_API_KEY;process.env.KOBIS_API_KEY='synthetic-key';let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,json:async()=>({movieInfoResult:{movieInfo:{movieCd:'20269999',movieNm:'가상 영화',openDt:''}}})};};
 try{const r=await new KobisAdapter().refreshMissing({category:'movie',market:'KR'},[knownMovie()],[]);assert.equal(calls,1);assert.deepEqual(r[0].time,{type:'unknown',announcedYear:null,announcedPeriod:null});assert.equal(r[0].externalId,'20269999');assert.deepEqual(await new KobisAdapter().refreshMissing({category:'movie',market:'KR'},[knownMovie()],[knownMovie()]),[]);assert.equal(calls,1);}finally{global.fetch=original;if(key===undefined)delete process.env.KOBIS_API_KEY;else process.env.KOBIS_API_KEY=key;}
});
test('wrong KOBIS identity, malformed date or oversized recheck fail without clearing prior dates',async()=>{
 const original=global.fetch,key=process.env.KOBIS_API_KEY;process.env.KOBIS_API_KEY='synthetic-key';
 try{for(const movie of [{movieCd:'other',movieNm:'가상 영화',openDt:''},{movieCd:'20269999',movieNm:'가상 영화',openDt:'20261399'}]){global.fetch=async()=>({ok:true,json:async()=>({movieInfoResult:{movieInfo:movie}})});await assert.rejects(new KobisAdapter().refreshMissing({category:'movie',market:'KR'},[knownMovie()],[]));}
 await assert.rejects(new KobisAdapter().refreshMissing({category:'movie',market:'KR'},Array.from({length:101},knownMovie),[]),/LIMIT/);}finally{global.fetch=original;if(key===undefined)delete process.env.KOBIS_API_KEY;else process.env.KOBIS_API_KEY=key;}
});
