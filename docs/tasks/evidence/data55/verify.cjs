const fs=require('node:fs'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const{Pool}=req('pg');
(async()=>{assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));const p=new Pool({connectionString:process.env.DATABASE_URL,max:1});let app;
try{
 const all=(await p.query("SELECT src.external_id AS key,to_jsonb(e) AS event,(SELECT count(*)::int FROM event_change ch WHERE ch.event_id=e.id) AS changes FROM event_source src JOIN event e ON e.id=src.event_id WHERE src.provider_key='ott_reviewed' ORDER BY src.external_id")).rows;
 const mode=process.argv[2];
 if(mode==='before'){assert.equal(all.length,69);fs.writeFileSync('/private/tmp/godieor-data55/db-before.json',JSON.stringify(all,null,2));console.log('before69');return;}
 const old=JSON.parse(fs.readFileSync('/private/tmp/godieor-data55/db-before.json'));const artifact=JSON.parse(fs.readFileSync('data/curated/tving-identity-reviewed-2026-11-16.json'));
 assert.equal(all.length,old.length+artifact.additions.length);
 for(const x of old)assert.deepEqual(all.find(y=>y.key===x.key),x);
 if(mode==='repeat')assert.deepEqual(all,JSON.parse(fs.readFileSync('/private/tmp/godieor-data55/db-after.json')));
 else fs.writeFileSync('/private/tmp/godieor-data55/db-after.json',JSON.stringify(all,null,2));
 const{NestFactory}=req('@nestjs/core'),{AppModule}=req('./dist/src/app.module'),{configureHttp}=req('./dist/src/common/configure-http');
 app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});configureHttp(app);await app.listen(0,'127.0.0.1');const base=await app.getUrl();
 const r=await fetch(base+'/v1/events?schedule=dated&from=2026-11-01&to=2027-01-01&country=KR&categories=ott&limit=100');assert.equal(r.status,200);const page=await r.json();assert.equal(page.items.length,68);
 const checked=[];
 for(const a of artifact.additions){const stored=all.find(x=>x.key===a.mapping.eventKey);assert.ok(stored);assert.equal(stored.changes,1);const item=page.items.find(x=>x.id===stored.event.id);assert.ok(item);assert.equal(item.time.type,'date_only');assert.equal(item.time.date,a.review.date);assert.equal(item.season.number,a.review.seasonNumber);assert.ok(item.services.includes('tving'));const d=await fetch(base+'/v1/events/'+stored.event.id);assert.equal(d.status,200);const detail=await d.json();assert.ok(JSON.stringify(detail.sources).includes(a.discovery.url));checked.push({id:item.id,title:item.title,date:item.time.date,season:item.season.number});}
 fs.mkdirSync('docs/tasks/evidence/data55',{recursive:true});fs.writeFileSync('docs/tasks/evidence/data55/db-http-'+mode+'.json',JSON.stringify({scope:'implementer local SQL/API, not independent approval',totalEvents:all.length,windowRows:page.items.length,newEvents:artifact.additions.length,old69FullRowsIDsAndHistoryUnchanged:true,httpStatus:r.status,repeatNoChanges:mode==='repeat',checked},null,2)+'\n');
 console.log(mode+':70total/68window/old69unchanged/new'+checked.length);
}finally{if(app)await app.close();await p.end();}})().catch(e=>{fs.writeFileSync('/private/tmp/godieor-data55/verify-failure.txt',e.stack);console.error('VERIFY_FAILED',e.name);process.exitCode=1;});
