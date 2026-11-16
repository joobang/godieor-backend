const fs=require('node:fs');const assert=require('node:assert/strict');const {createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const {Pool}=req('pg');const {NestFactory}=req('@nestjs/core');const {AppModule}=req('./dist/src/app.module');const {configureHttp}=req('./dist/src/common/configure-http');
(async()=>{
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const mode=process.argv[2];assert.ok(['before','after','repeat'].includes(mode));
 const p=new Pool({connectionString:process.env.DATABASE_URL,max:1});let app;
 try {
  const all=(await p.query("SELECT src.external_id AS key,to_jsonb(e) AS event,(SELECT count(*)::int FROM event_change ch WHERE ch.event_id=e.id) AS changes FROM event_source src JOIN event e ON e.id=src.event_id WHERE src.provider_key='ott_reviewed' ORDER BY src.external_id")).rows;
  const rows=(await p.query("SELECT e.id,src.external_id AS key,e.title,e.kind,e.ott_category,e.precision,e.local_date::text AS date,e.instant_at,ds.season_number AS season,es.service AS platform FROM event e JOIN event_source src ON src.event_id=e.id JOIN event_service es ON es.event_id=e.id LEFT JOIN drama_season ds ON ds.id=e.season_id WHERE src.provider_key='ott_reviewed' AND e.release_market='KR' AND e.local_date>=DATE '2026-11-01' AND e.local_date<DATE '2027-01-01' AND es.service IN ('netflix','tving','disney_plus','coupang_play') ORDER BY date,e.id")).rows;
  if(mode==='before') {
   assert.equal(all.length,65);assert.equal(rows.length,63);
   fs.writeFileSync('/private/tmp/godieor-data53/db-before.json',JSON.stringify({all,rows},null,2)+'\n');
   console.log('SQL before: events65/window63');return;
  }
  const before=JSON.parse(fs.readFileSync('/private/tmp/godieor-data53/db-before.json'));
  const artifact=JSON.parse(fs.readFileSync('data/curated/ott-parity-reviewed-2026-11-13.json'));
  const changed=new Set(artifact.updates.map(x=>x.mapping.eventKey));
  assert.equal(all.length,69);assert.equal(rows.length,67);
  for(const old of before.all) {
   const current=all.find(x=>x.key===old.key);assert.equal(current.event.id,old.event.id);
   if(changed.has(old.key)) {
    assert.ok(Date.parse(current.event.updated_at)>=Date.parse(old.event.updated_at));
    assert.deepEqual({...current.event,season_id:old.event.season_id,updated_at:old.event.updated_at},old.event);
    assert.equal(current.changes,old.changes+1);
    assert.equal(rows.find(x=>x.key===old.key).season,1);
   } else assert.deepEqual(current,old);
  }
  for(const item of artifact.additions) {
   const row=rows.find(x=>x.key===item.mapping.eventKey);assert.ok(row);
   assert.equal(row.date,item.review.date);assert.equal(row.platform,item.review.platform);assert.equal(row.season,item.review.seasonNumber);
   assert.equal(row.precision,'date_only');assert.equal(row.instant_at,null);
   assert.equal(all.find(x=>x.key===row.key).changes,1);
  }
  app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});configureHttp(app);await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function get(path){const response=await fetch(base+'/v1'+path);assert.equal(response.status,200);return response.json();}
  const page=await get('/events?schedule=dated&from=2026-11-01&to=2027-01-01&country=KR&categories=ott&limit=100');assert.equal(page.items.length,67);
  const expected=artifact.additions.concat(artifact.updates);
  for(const item of expected) {
   const row=rows.find(x=>x.key===item.mapping.eventKey);const event=page.items.find(x=>x.id===row.id);assert.ok(event);
   assert.equal(event.season.number,item.review.seasonNumber);assert.equal(event.time.type,'date_only');assert.equal(event.time.date,item.review.date);
   assert.ok(event.services.includes(item.review.platform));
   const detail=await get('/events/'+row.id);assert.ok(detail.sources.length);
  }
  if(mode==='repeat')assert.deepEqual(all,JSON.parse(fs.readFileSync('/private/tmp/godieor-data53/db-after-all.json')));
  else fs.writeFileSync('/private/tmp/godieor-data53/db-after-all.json',JSON.stringify(all,null,2)+'\n');
  fs.writeFileSync('docs/tasks/evidence/data53/db-http-'+mode+'.json',JSON.stringify({mode,scope:'implementer local SQL/API, not independent approval',totalReviewedEvents:all.length,publishedWindow:rows.length,existingIDsPreserved:true,other61EventsUnchanged:true,explicitSeasonUpdates:4,additions:4,httpStatus:200,httpItems:page.items.length,verifiedRows:rows.filter(x=>expected.some(y=>y.mapping.eventKey===x.key)),repeatNoChanges:mode==='repeat',cloudDeployed:false,iphoneVerified:false},null,2)+'\n');
  console.log(mode+': SQL69/window67, existing IDs and other61 unchanged, HTTP200/67, 8 changed/new details verified');
 } finally {if(app)await app.close();await p.end();}
})().catch(e=>{fs.writeFileSync('/private/tmp/godieor-data53/verify-failure.txt',e.stack);console.error('DATA53_VERIFY_FAILED:',e.name,e.stack.split('\n').filter(x=>x.trim().startsWith('at ')).join('\n'));process.exitCode=1;});
