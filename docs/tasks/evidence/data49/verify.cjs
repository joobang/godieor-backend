const fs=require('node:fs');const assert=require('node:assert/strict');const {createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const {Pool}=req('pg');const {NestFactory}=req('@nestjs/core');const {AppModule}=req('./dist/src/app.module');const {configureHttp}=req('./dist/src/common/configure-http');
(async()=>{
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));const mode=process.argv[2];assert.ok(['before','after','repeat'].includes(mode));
 const p=new Pool({connectionString:process.env.DATABASE_URL,max:1});let app;
 try{
  const existing=(await p.query("SELECT src.external_id AS key,to_jsonb(e) AS event FROM event_source src JOIN event e ON e.id=src.event_id WHERE src.provider_key='ott_reviewed' AND src.external_id<>'event-000063' ORDER BY src.external_id")).rows;
  assert.equal(existing.length,62);
  const counts=(await p.query("SELECT (SELECT count(*)::int FROM event_source WHERE provider_key='ott_reviewed') AS events,(SELECT count(*)::int FROM event_change ch JOIN event_source src ON src.event_id=ch.event_id WHERE src.provider_key='ott_reviewed' AND src.external_id='event-000063') AS new_changes")).rows[0];
  const rows=(await p.query("SELECT e.id,src.external_id AS key,e.title,e.kind,e.ott_category,e.precision,e.local_date::text AS date,e.instant_at,e.release_market AS market,ds.season_number AS season,es.service AS platform FROM event e JOIN event_source src ON src.event_id=e.id JOIN event_service es ON es.event_id=e.id LEFT JOIN drama_season ds ON ds.id=e.season_id WHERE src.provider_key='ott_reviewed' AND e.release_market='KR' AND e.local_date>=DATE '2026-11-01' AND e.local_date<DATE '2027-01-01' AND es.service IN ('netflix','tving','disney_plus','coupang_play') ORDER BY date,e.id")).rows;
  const migrations=(await p.query('SELECT migration_name,finished_at IS NOT NULL AS finished FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.ok(migrations.some(m=>m.migration_name==='202611130001_ott_documentary'&&m.finished));
  if(mode==='before'){
   assert.equal(counts.events,62);assert.equal(counts.new_changes,0);assert.equal(rows.length,60);
   fs.writeFileSync('/private/tmp/godieor-data49/db-before.json',JSON.stringify({existing,counts,publishedInWindow:rows.length,migrations},null,2)+'\n');
   console.log('before: window60 / events62 / documentary changes0');return;
  }
  const before=JSON.parse(fs.readFileSync('/private/tmp/godieor-data49/db-before.json'));assert.deepEqual(existing,before.existing);assert.equal(rows.length,61);assert.equal(counts.events,63);assert.equal(counts.new_changes,1);
  const matches=rows.filter(r=>r.key==='event-000063');assert.equal(matches.length,1);const item=matches[0];assert.equal(item.title,'캐런 리드 재판');assert.equal(item.kind,'ott_season_premiere');assert.equal(item.ott_category,'documentary');assert.equal(item.date,'2026-11-23');assert.equal(item.precision,'date_only');assert.equal(item.instant_at,null);assert.equal(item.market,'KR');assert.equal(item.season,1);assert.equal(item.platform,'netflix');
  app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});configureHttp(app);await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function get(path){const response=await fetch(base+'/v1'+path);assert.equal(response.status,200);return response.json();}
  const page=await get('/events?schedule=dated&from=2026-11-01&to=2027-01-01&country=KR&categories=ott&limit=100');assert.equal(page.items.length,61);const api=page.items.find(x=>x.id===item.id);assert.ok(api);assert.equal(api.ottCategory,'documentary');assert.equal(api.time.type,'date_only');assert.equal(api.time.date,'2026-11-23');assert.ok(!api.time.instantUtc);assert.deepEqual(api.services,['netflix']);assert.equal(api.dataOrigin,'provider');
  const detail=await get('/events/'+item.id);assert.equal(detail.event.ottCategory,'documentary');assert.equal(detail.event.season.number,1);assert.ok(detail.sources.some(s=>s.url==='https://about.netflix.com/ko/new-to-watch'));
  const calendar=await get('/calendar?month=2026-11&categories=ott&country=KR');const day=calendar.days.find(d=>d.date==='2026-11-23');assert.ok(day&&day.total>0);
  const options=await get('/catalog/options');assert.equal(options.contractVersion,'0.1.0-draft.4');
  fs.writeFileSync('/private/tmp/godieor-data49/db-http-'+mode+'.json',JSON.stringify({scope:'implementer local SQL and temporary HTTP; not independent approval',existing62Unchanged:true,publishedInWindow:rows.length,netflixInNovember:rows.filter(x=>x.platform==='netflix'&&x.date.startsWith('2026-11')).length,counts,newRow:item,httpStatus:200,httpItems:page.items.length,event:api,detail,calendarDay:day,optionsContractVersion:options.contractVersion,migrations,cloudDeployed:false,iphoneVerified:false},null,2)+'\n');
  console.log(mode+': window61 / events63 / documentary changes1 / existing62 unchanged / HTTP200 and category documentary');
 }finally{if(app)await app.close();await p.end();}
})().catch(e=>{console.error(e.name+': verification failed');process.exitCode=1;});
