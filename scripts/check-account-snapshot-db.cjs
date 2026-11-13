// Deterministic synthetic concurrency checks. Requires a dedicated temporary verifier DB.
const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {Pool}=require('pg');require('reflect-metadata');
const {PrismaService}=require('../dist/src/database/prisma.service');
let Repository=require('../dist/src/users/users.repository').UsersRepository;
if(process.argv[2]==='--baseline'){
 const {execFileSync}=require('node:child_process');const ts=require('typescript');const Module=require('node:module');const path=require('node:path');
 const source=execFileSync('git',['show','703a8e157ba007aa10f2f6f8a63a642cf5e2b051:src/users/users.repository.ts'],{encoding:'utf8'});
 const filename=path.resolve('dist/src/users/users.repository.baseline.cjs');const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
 m._compile(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:true}}).outputText,filename);Repository=m.exports.UsersRepository;
}
function wrap(client, intercept, transactionAfter){return new Proxy(client,{get(target,key){
 if(key==='$transaction')return async (fn,options)=>{const result=await target.$transaction(tx=>fn(wrap(tx,intercept)),options);if(transactionAfter)await transactionAfter();return result;};
 const value=target[key];if(intercept[key])return new Proxy(value,{get(model,method){const original=model[method];return intercept[key][method]?async args=>intercept[key][method](args,()=>original.call(model,args)):typeof original==='function'?original.bind(model):original;}});
 return typeof value==='function'?value.bind(target):value;
}});}
(async()=>{
 const url=process.env.ACCOUNT_SNAPSHOT_TEST_DATABASE_URL;if(!url)throw Error('TEMP_DATABASE_REQUIRED');const parsed=new URL(url);
 if(!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)||parsed.pathname!=='/godieor_vfy')throw Error('TEMP_DATABASE_REQUIRED');
 const pool=new Pool({connectionString:url,max:2});const db=new PrismaService({databaseUrl:url});let failures=0;
 async function seed(){const user=randomUUID(),other=randomUUID(),a=randomUUID(),b=randomUUID(),event=randomUUID();
  await pool.query('INSERT INTO app_user(id,display_name) VALUES ($1,$3),($2,$3)',[user,other,'SYNTHETIC ACCOUNT']);
  await pool.query('INSERT INTO user_settings(user_id) VALUES ($1),($2)',[user,other]);
  await pool.query("INSERT INTO user_enabled_category(user_id,category) VALUES ($1,'movie'),($2,'movie')",[user,other]);
  await pool.query("INSERT INTO content(id,kind,title) VALUES ($1,'movie','SYNTHETIC A'),($2,'movie','SYNTHETIC B')",[a,b]);
  await pool.query("INSERT INTO event(id,kind,content_id,content_type,title,precision,local_date,release_market,origin) VALUES ($1,'theatrical_release',$2,'movie','SYNTHETIC EVENT','date_only','2026-11-13','KR','fixture')",[event,a]);
  await pool.query('INSERT INTO content_favorite(user_id,content_id) VALUES ($1,$2)',[user,a]);return {user,other,a,b,event};}
 async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){if(e.name!=='AssertionError')throw e;failures++;console.log('FAIL '+name);}}
 try{
  await db.$connect();
  await check('favorite items and version use one snapshot during another device write',async()=>{
   const x=await seed();let unblock;const gate=new Promise(resolve=>unblock=resolve);let injected=false;
   const hooked=wrap(db,{content_favorite:{findMany:async(args,read)=>{const rows=await read();if(!injected){injected=true;const w=await pool.connect();try{await w.query('BEGIN');await w.query('INSERT INTO content_favorite(user_id,content_id) VALUES ($1,$2)',[x.user,x.b]);await w.query('INSERT INTO event_favorite(user_id,event_id) VALUES ($1,$2)',[x.user,x.event]);await w.query('UPDATE app_user SET favorites_version=favorites_version+1 WHERE id=$1',[x.user]);await w.query('COMMIT');}finally{w.release();unblock();}}return rows;}},event_favorite:{findMany:async(args,read)=>{await gate;return read();}},app_user:{findUniqueOrThrow:async(args,read)=>{await gate;return read();}}});
   const result=await new Repository(hooked).favorites(x.user);assert.equal(result.favoritesVersion,'1');assert.deepEqual(result.items.map(y=>y.targetId),[x.a]);
   const current=await new Repository(db).favorites(x.user);assert.equal(current.favoritesVersion,'2');assert.equal(current.items.length,3);assert.equal((await new Repository(db).favorites(x.other)).items.length,0);
  });
  await check('settings save response belongs to its write, not the next device write',async()=>{
   const x=await seed();let injected=false;
   const hooked=wrap(db,{},async()=>{if(injected)return;injected=true;const w=await pool.connect();try{await w.query('BEGIN');await w.query("UPDATE user_settings SET version=version+1,view_mode='calendar' WHERE user_id=$1",[x.user]);await w.query('DELETE FROM user_enabled_category WHERE user_id=$1',[x.user]);await w.query("INSERT INTO user_enabled_category(user_id,category) VALUES ($1,'game')",[x.user]);await w.query('COMMIT');}finally{w.release();}});
   const result=await new Repository(hooked).replaceSettings(x.user,{expectedVersion:'1',country:'KR',timeZone:'Asia/Seoul',enabledCategories:['ott'],services:['tving'],devices:[],view:'cards'});
   assert.equal(result.version,'2');assert.deepEqual(result.enabledCategories,['ott']);assert.equal(result.view,'cards');
   const current=await new Repository(db).settings(x.user);assert.equal(current.version,'3');assert.deepEqual(current.enabledCategories,['game']);assert.equal(current.view,'calendar');
   const other=await new Repository(db).settings(x.other);assert.equal(other.version,'1');assert.deepEqual(other.enabledCategories,['movie']);
  });
  console.log('Synthetic concurrency cases: '+(2-failures)+'/2 passed; no product DB or Google/phone access');process.exitCode=failures?1:0;
 }finally{await db.onApplicationShutdown();await pool.end();}
})().catch(()=>{console.error('ACCOUNT_SNAPSHOT_TEMP_CHECK_FAILED');process.exitCode=1;});
